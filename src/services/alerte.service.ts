// src/services/alerte.service.ts
// Ouvre/referme les alertes selon les seuils fixes (lib/monitoring/seuils.ts),
// à partir des résultats du diagnostic le plus récent — voir
// diagnostic.service.ts pour l'appelant. Au plus une alerte "ouverte"
// (resolueLe = null) par (routeurId, type) : si la condition est encore
// vraie, on ne duplique pas ; si elle ne l'est plus, on referme.

import { prisma } from "@/lib/database/prisma";
import { enregistrerAudit } from "@/lib/audit/journal.service";
import type { NiveauAlerte, TypeAlerte } from "@prisma/client";

export type ConditionAlerte = {
  type: TypeAlerte;
  active: boolean;
  niveau: NiveauAlerte;
  message: string;
  valeurMesuree?: number;
};

export async function evaluerAlertes(routeurId: string, conditions: ConditionAlerte[]) {
  for (const condition of conditions) {
    const ouverte = await prisma.alerte.findFirst({
      where: { routeurId, type: condition.type, resolueLe: null },
    });

    if (condition.active && !ouverte) {
      await prisma.alerte.create({
        data: {
          routeurId,
          type: condition.type,
          niveau: condition.niveau,
          message: condition.message,
          valeurMesuree: condition.valeurMesuree,
        },
      });
    } else if (!condition.active && ouverte) {
      await prisma.alerte.update({
        where: { id: ouverte.id },
        data: { resolueLe: new Date() },
      });
    }
    // Sinon (active && déjà ouverte, ou inactive && déjà absente) : rien à
    // faire — on garde la date d'ouverture d'origine plutôt que de la
    // rafraîchir à chaque diagnostic.
  }
}

/** Acquittement manuel — distinct de la résolution automatique ci-dessus. */
export async function acquitterAlerte(alerteId: string, utilisateurId: string) {
  const alerte = await prisma.alerte.update({
    where: { id: alerteId },
    data: { acquitteeLe: new Date(), acquitteeParId: utilisateurId },
  });

  await enregistrerAudit({
    utilisateurId,
    routeurId: alerte.routeurId,
    action: `Acquittement de l'alerte ${alerte.type}`,
    resultat: "Succès",
  });

  return alerte;
}
