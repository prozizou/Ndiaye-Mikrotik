// src/lib/audit/journal.service.ts
// Toute action jugée sensible (intervention sur un routeur, changement de
// statut de ticket, création d'un routeur...) doit passer par cette fonction.
// Ne jamais écrire directement dans la table JournalAudit ailleurs : c'est
// la seule façon de garder une définition cohérente de "ce qui est sensible".

import { prisma } from "@/lib/database/prisma";

type EntreeAudit = {
  utilisateurId: string;
  routeurId?: string;
  action: string;
  ancienneValeur?: string;
  nouvelleValeur?: string;
  resultat?: string;
};

export async function enregistrerAudit(entree: EntreeAudit) {
  await prisma.journalAudit.create({
    data: {
      utilisateurId: entree.utilisateurId,
      routeurId: entree.routeurId,
      action: entree.action,
      ancienneValeur: entree.ancienneValeur,
      nouvelleValeur: entree.nouvelleValeur,
      resultat: entree.resultat,
    },
  });
}
