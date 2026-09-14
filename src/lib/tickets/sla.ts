// src/lib/tickets/sla.ts
// Délai de résolution attendu selon la priorité, calculé une fois à la
// création du ticket. En dur pour l'instant (même logique que
// lib/monitoring/seuils.ts) — un SLA par client/contrat est un chantier
// séparé, pas quelque chose à improviser ici.

import type { PrioriteTicket } from "@prisma/client";

const DELAI_HEURES: Record<PrioriteTicket, number> = {
  URGENTE: 4,
  HAUTE: 8,
  NORMALE: 24,
  BASSE: 72,
};

export function calculerEcheanceSla(priorite: PrioriteTicket, depuis: Date): Date {
  return new Date(depuis.getTime() + DELAI_HEURES[priorite] * 60 * 60 * 1000);
}

const STATUTS_TERMINES = new Set(["RESOLU", "FERME"]);

/** Un ticket resté ouvert au-delà de son échéance est en retard. */
export function estEnRetard(echeanceSla: Date | null, statut: string): boolean {
  if (!echeanceSla || STATUTS_TERMINES.has(statut)) return false;
  return Date.now() > echeanceSla.getTime();
}
