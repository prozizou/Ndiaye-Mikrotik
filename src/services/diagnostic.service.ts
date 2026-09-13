// src/services/diagnostic.service.ts
// MVP : trois contrôles — le routeur répond-il ? le WAN sort-il ? le DNS
// résout-il ? Suffisant pour couvrir la majorité des tickets "Internet coupé"
// et poser la structure ; Wi-Fi/DHCP/Gateway s'ajouteront de la même façon.
// Sert aussi de point d'entrée aux alertes automatiques (evaluerAlertes).
// Déclenché soit par un clic ("Lancer un diagnostic"), soit périodiquement
// par /api/cron/diagnostics (Phase 7 — voir ce fichier pour la fréquence
// réelle, qui n'a rien de temps réel).

import { prisma } from "@/lib/database/prisma";
import { appelerMikrotik } from "@/lib/mikrotik/client";
import { recupererIdentifiantsMikrotik } from "@/lib/mikrotik/secrets";
import { evaluerAlertes, type ConditionAlerte } from "./alerte.service";
import { SEUIL_CPU_AVERTISSEMENT, SEUIL_LATENCE_AVERTISSEMENT_MS } from "@/lib/monitoring/seuils";
import type { SeveriteDiagnostic } from "@prisma/client";

const HOTE_TEST_WAN = "1.1.1.1"; // ping brut, sans résolution DNS
const HOTE_TEST_DNS = "google.com"; // si ça échoue alors que WAN est ok, le problème est le DNS
const NOMBRE_PAQUETS = "4";

type ResultatEtape = { ok: boolean; details?: string };
type ResultatPing = ResultatEtape & { latenceMs?: number; perteWanPourcent?: number };

export type ResultatDiagnostic = {
  routeurAccessible: ResultatEtape;
  wan: ResultatEtape;
  dns: ResultatEtape;
  problemeProbable: string | null;
  severite: SeveriteDiagnostic | null;
};

type PaquetPing = { status?: string; time?: string };

// RouterOS renvoie les durées façon "1ms200us" / "12ms" / "500us" — on ne
// garde que la précision milliseconde, suffisante pour un seuil d'alerte.
// Format non garanti d'une version à l'autre : en cas de doute, on renvoie
// null plutôt que de deviner (la latence est alors simplement ignorée).
function parseDureeMs(valeur: string | undefined): number | null {
  if (!valeur) return null;
  const ms = valeur.match(/(\d+(?:\.\d+)?)ms/);
  if (ms) return parseFloat(ms[1]);
  const us = valeur.match(/(\d+(?:\.\d+)?)us/);
  if (us) return parseFloat(us[1]) / 1000;
  return null;
}

function extraireLatenceMoyenneMs(paquets: PaquetPing[]): number | undefined {
  const temps = paquets.map((p) => parseDureeMs(p.time)).filter((v): v is number => v !== null);
  if (temps.length === 0) return undefined;
  return temps.reduce((a, b) => a + b, 0) / temps.length;
}

// cpu-load est un champ stable de /system/resource depuis longtemps sur
// RouterOS — contrairement à uptime (formats trop variables d'une version à
// l'autre) on ne tente pas de parser ram/uptime ici, remis à plus tard
// (Phase 4) une fois testé contre un vrai routeur.
function extraireCpuPourcent(ressource: unknown): number | undefined {
  if (!ressource || typeof ressource !== "object") return undefined;
  const valeur = (ressource as Record<string, unknown>)["cpu-load"];
  const nombre = typeof valeur === "string" ? Number(valeur) : typeof valeur === "number" ? valeur : NaN;
  return Number.isFinite(nombre) ? nombre : undefined;
}

async function pingDepuisRouteur(
  ipVpn: string,
  identifiants: { utilisateur: string; motDePasse: string },
  cible: string,
): Promise<ResultatPing> {
  try {
    const resultats = (await appelerMikrotik(ipVpn, "/ping", identifiants, {
      methode: "POST",
      corps: { address: cible, count: NOMBRE_PAQUETS },
    })) as PaquetPing[];

    const paquets = Array.isArray(resultats) ? resultats : [];
    const auMoinsUneReponse = paquets.some((p) => p.status === undefined);
    const echecs = paquets.filter((p) => p.status !== undefined).length;

    return {
      ok: auMoinsUneReponse,
      details: `${paquets.length} paquet(s) envoyé(s) vers ${cible}`,
      latenceMs: extraireLatenceMoyenneMs(paquets),
      perteWanPourcent: paquets.length > 0 ? (echecs / paquets.length) * 100 : undefined,
    };
  } catch (erreur) {
    return {
      ok: false,
      details: erreur instanceof Error ? erreur.message : "Erreur inconnue",
    };
  }
}

function interpreterResultats(
  routeurAccessible: ResultatEtape,
  wan: ResultatEtape,
  dns: ResultatEtape,
): { problemeProbable: string | null; severite: SeveriteDiagnostic | null } {
  if (!routeurAccessible.ok) {
    return {
      problemeProbable: "Routeur injoignable — VPN déconnecté ou routeur hors ligne",
      severite: "CRITIQUE",
    };
  }
  if (!wan.ok) {
    return { problemeProbable: "Connexion WAN indisponible", severite: "CRITIQUE" };
  }
  if (!dns.ok) {
    return { problemeProbable: "Configuration DNS incorrecte", severite: "MOYENNE" };
  }
  return { problemeProbable: null, severite: null };
}

export async function lancerDiagnostic(
  routeurId: string,
  ticketId?: string,
): Promise<ResultatDiagnostic> {
  const routeur = await prisma.routeur.findUniqueOrThrow({ where: { id: routeurId } });
  const identifiants = await recupererIdentifiantsMikrotik(routeur.id);

  // Étape 1 : le routeur répond-il du tout (VPN + API REST) ?
  let routeurAccessible: ResultatEtape;
  let cpuPourcent: number | undefined;
  try {
    const ressource = await appelerMikrotik(routeur.ipVpn, "/system/resource", identifiants, {
      timeoutMs: 5000,
    });
    routeurAccessible = { ok: true };
    cpuPourcent = extraireCpuPourcent(ressource);
  } catch (erreur) {
    routeurAccessible = {
      ok: false,
      details: erreur instanceof Error ? erreur.message : "Injoignable",
    };
  }

  let wan: ResultatPing = { ok: false, details: "Non testé — routeur injoignable" };
  let dns: ResultatEtape = { ok: false, details: "Non testé — routeur injoignable" };

  if (routeurAccessible.ok) {
    wan = await pingDepuisRouteur(routeur.ipVpn, identifiants, HOTE_TEST_WAN);
    dns = await pingDepuisRouteur(routeur.ipVpn, identifiants, HOTE_TEST_DNS);
  }

  const { problemeProbable, severite } = interpreterResultats(routeurAccessible, wan, dns);

  await prisma.diagnostic.create({
    data: {
      routeurId: routeur.id,
      ticketId: ticketId ?? null,
      pingOk: routeurAccessible.ok,
      wanOk: wan.ok,
      dnsOk: dns.ok,
      latenceMs: wan.latenceMs,
      perteWanPourcent: wan.perteWanPourcent,
      problemeProbable,
      severite,
    },
  });

  await prisma.routeur.update({
    where: { id: routeur.id },
    data: {
      enLigne: routeurAccessible.ok,
      derniereCommunication: new Date(),
      cpuPourcent,
    },
  });

  const conditions: ConditionAlerte[] = [
    {
      type: "ROUTEUR_INJOIGNABLE",
      active: !routeurAccessible.ok,
      niveau: "CRITIQUE",
      message: "Routeur injoignable — VPN déconnecté ou routeur hors ligne",
    },
    {
      type: "WAN_INDISPONIBLE",
      active: routeurAccessible.ok && !wan.ok,
      niveau: "CRITIQUE",
      message: "Connexion WAN indisponible",
    },
    {
      type: "DNS_INSTABLE",
      active: routeurAccessible.ok && wan.ok && !dns.ok,
      niveau: "AVERTISSEMENT",
      message: "Résolution DNS instable",
    },
    {
      type: "CPU_ELEVE",
      active: cpuPourcent !== undefined && cpuPourcent > SEUIL_CPU_AVERTISSEMENT,
      niveau: "AVERTISSEMENT",
      message: `Charge CPU élevée (${cpuPourcent}%)`,
      valeurMesuree: cpuPourcent,
    },
    {
      type: "LATENCE_ELEVEE",
      active: wan.latenceMs !== undefined && wan.latenceMs > SEUIL_LATENCE_AVERTISSEMENT_MS,
      niveau: "AVERTISSEMENT",
      message: `Latence WAN élevée (${wan.latenceMs?.toFixed(0)} ms)`,
      valeurMesuree: wan.latenceMs,
    },
  ];
  await evaluerAlertes(routeur.id, conditions);

  return { routeurAccessible, wan, dns, problemeProbable, severite };
}
