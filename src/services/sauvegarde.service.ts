// src/services/sauvegarde.service.ts
// Backup + Rollback — fondation de sécurité avant toute modification
// sensible d'un routeur, manuelle aujourd'hui, pilotée par l'IA plus tard
// (Phase 11 : couche d'outils MikroTik) sans que ce mécanisme ait besoin de
// changer.
//
// Choix volontaire : la sauvegarde est l'instantané binaire natif de
// RouterOS (/system/backup/save, restauré par /system/backup/load — le
// routeur redémarre pour l'appliquer). On ne tente pas de "défaire" une
// modification commande par commande : générer et rejouer l'inverse exact
// d'un changement RouterOS quelconque est fragile et invérifiable en
// général. Revenir à un instantané complet, validé par RouterOS lui-même,
// est le seul mécanisme de rollback qu'on peut garantir correct.
//
// Le fichier de sauvegarde reste stocké sur le routeur pour ce MVP, comme
// c'était déjà le cas avant cette phase (voir intervention.service.ts).
// Le rapatrier vers un stockage central est une amélioration à ajouter
// ensuite, pas un blocage pour cette première version.

import { prisma } from "@/lib/database/prisma";
import { appelerMikrotik } from "@/lib/mikrotik/client";
import { recupererIdentifiantsMikrotik } from "@/lib/mikrotik/secrets";
import { enregistrerAudit } from "@/lib/audit/journal.service";
import { lancerDiagnostic } from "./diagnostic.service";

// Le routeur a besoin de quelques secondes pour appliquer un changement
// réseau (DHCP, interface, routage) avant qu'un diagnostic de vérification
// ait un sens — sinon on risque de déclencher un rollback sur un état
// simplement pas encore stabilisé, pas réellement en échec.
const DELAI_STABILISATION_MS = 3000;

export async function creerSauvegarde(params: {
  routeurId: string;
  raison: string;
  utilisateurId: string;
  interventionId?: string;
}) {
  const routeur = await prisma.routeur.findUniqueOrThrow({ where: { id: params.routeurId } });
  const identifiants = await recupererIdentifiantsMikrotik(routeur.id);

  const nomFichier = `sauvegarde-${routeur.id}-${Date.now()}`;
  await appelerMikrotik(routeur.ipVpn, "/system/backup/save", identifiants, {
    methode: "POST",
    corps: { name: nomFichier },
  });

  const sauvegarde = await prisma.sauvegardeRouteur.create({
    data: {
      routeurId: routeur.id,
      nomFichier,
      raison: params.raison,
      declencheeParId: params.utilisateurId,
      interventionId: params.interventionId,
    },
  });

  await enregistrerAudit({
    utilisateurId: params.utilisateurId,
    routeurId: routeur.id,
    action: `Sauvegarde avant : ${params.raison}`,
    nouvelleValeur: nomFichier,
    resultat: "Succès",
  });

  return sauvegarde;
}

export async function restaurerSauvegarde(sauvegardeId: string, params: { utilisateurId: string }) {
  const sauvegarde = await prisma.sauvegardeRouteur.findUniqueOrThrow({
    where: { id: sauvegardeId },
    include: { routeur: true },
  });

  const identifiants = await recupererIdentifiantsMikrotik(sauvegarde.routeurId);

  try {
    // Redémarre automatiquement le routeur pour appliquer l'instantané —
    // coupure de connexion attendue le temps du redémarrage.
    await appelerMikrotik(sauvegarde.routeur.ipVpn, "/system/backup/load", identifiants, {
      methode: "POST",
      corps: { name: sauvegarde.nomFichier },
    });

    await prisma.sauvegardeRouteur.update({
      where: { id: sauvegardeId },
      data: { statut: "RESTAUREE", restaureeLe: new Date() },
    });

    await enregistrerAudit({
      utilisateurId: params.utilisateurId,
      routeurId: sauvegarde.routeurId,
      action: `Restauration de la sauvegarde (${sauvegarde.raison})`,
      resultat: "Succès",
    });

    return { ok: true as const };
  } catch (erreur) {
    const details = erreur instanceof Error ? erreur.message : "Erreur inconnue";

    await prisma.sauvegardeRouteur.update({
      where: { id: sauvegardeId },
      data: { statut: "ECHEC" },
    });

    await enregistrerAudit({
      utilisateurId: params.utilisateurId,
      routeurId: sauvegarde.routeurId,
      action: `Restauration de la sauvegarde (${sauvegarde.raison})`,
      resultat: `Échec — ${details}`,
    });

    return { ok: false as const, details };
  }
}

type ResultatProtection<T> =
  | { ok: true; resultat: T; sauvegardeId: string }
  | { ok: false; details: string; restauree: boolean; sauvegardeId: string };

/**
 * Enveloppe de sécurité pour toute modification sensible d'un routeur :
 * sauvegarde → action → vérification → restauration automatique en cas
 * d'échec. C'est le pipeline attendu autour de toute action IA plus tard
 * (analyser, préparer, sauvegarder, exécuter, vérifier, rollback si échec) —
 * à appeler pour toute future intervention qui modifie réellement la
 * configuration (pas les tests en lecture seule, pas un simple redémarrage :
 * un redémarrage coupe la connexion par nature, ce n'est pas un signal
 * d'échec exploitable par cette vérification).
 */
export async function executerAvecProtection<T>(params: {
  routeurId: string;
  raison: string;
  utilisateurId: string;
  interventionId?: string;
  action: () => Promise<T>;
}): Promise<ResultatProtection<T>> {
  const sauvegarde = await creerSauvegarde(params);

  let resultatAction: T | undefined;
  let erreurAction: string | undefined;
  try {
    resultatAction = await params.action();
  } catch (erreur) {
    erreurAction = erreur instanceof Error ? erreur.message : "Erreur inconnue";
  }

  await new Promise((resolve) => setTimeout(resolve, DELAI_STABILISATION_MS));

  const verification = await lancerDiagnostic(params.routeurId);
  const routeurEnBonneSante = verification.routeurAccessible.ok && verification.wan.ok;

  if (!routeurEnBonneSante) {
    await restaurerSauvegarde(sauvegarde.id, { utilisateurId: params.utilisateurId });
    return {
      ok: false,
      details: erreurAction
        ? `Action en échec (${erreurAction}) et vérification post-action négative — configuration restaurée.`
        : "Vérification post-action négative — configuration restaurée.",
      restauree: true,
      sauvegardeId: sauvegarde.id,
    };
  }

  if (erreurAction) {
    return { ok: false, details: erreurAction, restauree: false, sauvegardeId: sauvegarde.id };
  }

  return { ok: true, resultat: resultatAction as T, sauvegardeId: sauvegarde.id };
}
