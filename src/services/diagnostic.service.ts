// src/services/diagnostic.service.ts
// MVP : trois contrôles — le routeur répond-il ? le WAN sort-il ? le DNS
// résout-il ? Suffisant pour couvrir la majorité des tickets "Internet coupé"
// et poser la structure ; Wi-Fi/DHCP/Gateway s'ajouteront de la même façon.

import { prisma } from "@/lib/database/prisma";
import { appelerMikrotik } from "@/lib/mikrotik/client";
import { recupererIdentifiantsMikrotik } from "@/lib/mikrotik/secrets";
import type { SeveriteDiagnostic } from "@prisma/client";

const HOTE_TEST_WAN = "1.1.1.1"; // ping brut, sans résolution DNS
const HOTE_TEST_DNS = "google.com"; // si ça échoue alors que WAN est ok, le problème est le DNS
const NOMBRE_PAQUETS = "4";

type ResultatEtape = { ok: boolean; details?: string };

export type ResultatDiagnostic = {
  routeurAccessible: ResultatEtape;
  wan: ResultatEtape;
  dns: ResultatEtape;
  problemeProbable: string | null;
  severite: SeveriteDiagnostic | null;
};

type PaquetPing = { status?: string };

async function pingDepuisRouteur(
  ipVpn: string,
  identifiants: { utilisateur: string; motDePasse: string },
  cible: string,
): Promise<ResultatEtape> {
  try {
    const resultats = (await appelerMikrotik(ipVpn, "/ping", identifiants, {
      methode: "POST",
      corps: { address: cible, count: NOMBRE_PAQUETS },
    })) as PaquetPing[];

    const paquets = Array.isArray(resultats) ? resultats : [];
    const auMoinsUneReponse = paquets.some((p) => p.status === undefined);

    return {
      ok: auMoinsUneReponse,
      details: `${paquets.length} paquet(s) envoyé(s) vers ${cible}`,
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
  try {
    await appelerMikrotik(routeur.ipVpn, "/system/resource", identifiants, { timeoutMs: 5000 });
    routeurAccessible = { ok: true };
  } catch (erreur) {
    routeurAccessible = {
      ok: false,
      details: erreur instanceof Error ? erreur.message : "Injoignable",
    };
  }

  let wan: ResultatEtape = { ok: false, details: "Non testé — routeur injoignable" };
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
      problemeProbable,
      severite,
    },
  });

  await prisma.routeur.update({
    where: { id: routeur.id },
    data: { enLigne: routeurAccessible.ok, derniereCommunication: new Date() },
  });

  return { routeurAccessible, wan, dns, problemeProbable, severite };
}
