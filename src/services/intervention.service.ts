// src/services/intervention.service.ts
// Chaque intervention est enregistrée AVANT l'appel MikroTik (on garde la
// trace même si ça échoue), puis close avec le résultat réel, et journalisée
// dans l'audit dans les deux cas — succès ou échec.

import { prisma } from "@/lib/database/prisma";
import { appelerMikrotik } from "@/lib/mikrotik/client";
import { recupererIdentifiantsMikrotik } from "@/lib/mikrotik/secrets";
import { enregistrerAudit } from "@/lib/audit/journal.service";
import type { TypeIntervention, ResultatIntervention } from "@prisma/client";

type ParametresIntervention = {
  routeurId: string;
  technicienId: string;
  ticketId?: string;
};

async function creerIntervention(params: ParametresIntervention & { type: TypeIntervention }) {
  return prisma.intervention.create({
    data: {
      routeurId: params.routeurId,
      technicienId: params.technicienId,
      ticketId: params.ticketId ?? null,
      type: params.type,
    },
  });
}

async function cloturerIntervention(
  interventionId: string,
  resultat: ResultatIntervention,
  details?: string,
) {
  return prisma.intervention.update({
    where: { id: interventionId },
    data: { resultat, details, terminaLe: new Date() },
  });
}

export async function redemarrerRouteur(params: ParametresIntervention) {
  const routeur = await prisma.routeur.findUniqueOrThrow({ where: { id: params.routeurId } });
  const identifiants = await recupererIdentifiantsMikrotik(routeur.id);
  const intervention = await creerIntervention({ ...params, type: "REDEMARRER_ROUTEUR" });

  try {
    await appelerMikrotik(routeur.ipVpn, "/system/reboot", identifiants, { methode: "POST" });
    await cloturerIntervention(intervention.id, "SUCCES");
    await enregistrerAudit({
      utilisateurId: params.technicienId,
      routeurId: routeur.id,
      action: "Redémarrage du routeur",
      resultat: "Succès",
    });
    return { ok: true as const };
  } catch (erreur) {
    const details = erreur instanceof Error ? erreur.message : "Erreur inconnue";
    await cloturerIntervention(intervention.id, "ECHEC", details);
    await enregistrerAudit({
      utilisateurId: params.technicienId,
      routeurId: routeur.id,
      action: "Redémarrage du routeur",
      resultat: `Échec — ${details}`,
    });
    return { ok: false as const, details };
  }
}

export async function sauvegarderConfiguration(params: ParametresIntervention) {
  const routeur = await prisma.routeur.findUniqueOrThrow({ where: { id: params.routeurId } });
  const identifiants = await recupererIdentifiantsMikrotik(routeur.id);
  const intervention = await creerIntervention({ ...params, type: "SAUVEGARDER_CONFIGURATION" });

  try {
    // Sauvegarde stockée sur le routeur lui-même pour le MVP. Rapatrier le
    // fichier vers un stockage central (via /rest/file) est une amélioration
    // à ajouter ensuite, pas un blocage pour cette première version.
    const nomFichier = `sauvegarde-${routeur.id}-${Date.now()}`;
    await appelerMikrotik(routeur.ipVpn, "/system/backup/save", identifiants, {
      methode: "POST",
      corps: { name: nomFichier },
    });

    await cloturerIntervention(intervention.id, "SUCCES", nomFichier);
    await enregistrerAudit({
      utilisateurId: params.technicienId,
      routeurId: routeur.id,
      action: "Sauvegarde de la configuration",
      nouvelleValeur: nomFichier,
      resultat: "Succès",
    });
    return { ok: true as const, nomFichier };
  } catch (erreur) {
    const details = erreur instanceof Error ? erreur.message : "Erreur inconnue";
    await cloturerIntervention(intervention.id, "ECHEC", details);
    await enregistrerAudit({
      utilisateurId: params.technicienId,
      routeurId: routeur.id,
      action: "Sauvegarde de la configuration",
      resultat: `Échec — ${details}`,
    });
    return { ok: false as const, details };
  }
}
