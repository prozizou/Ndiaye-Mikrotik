// src/services/ticket.service.ts

import { prisma } from "@/lib/database/prisma";
import { enregistrerAudit } from "@/lib/audit/journal.service";
import { calculerEcheanceSla } from "@/lib/tickets/sla";
import type { CategorieTicket, PrioriteTicket, StatutTicket } from "@prisma/client";

// Le workflow du cahier des charges est linéaire, mais un technicien doit
// pouvoir revenir en arrière (ex: DIAGNOSTIC -> ASSIGNE si mal aiguillé).
const TRANSITIONS_AUTORISEES: Record<StatutTicket, StatutTicket[]> = {
  NOUVEAU: ["ASSIGNE"],
  ASSIGNE: ["DIAGNOSTIC"],
  DIAGNOSTIC: ["INTERVENTION", "ASSIGNE"],
  INTERVENTION: ["EN_ATTENTE_CLIENT", "RESOLU", "DIAGNOSTIC"],
  EN_ATTENTE_CLIENT: ["INTERVENTION", "RESOLU"],
  RESOLU: ["FERME", "INTERVENTION"],
  FERME: [],
};

export class ErreurTransitionInvalide extends Error {}

// Numérotation simple par comptage — suffisant pour le volume attendu au
// MVP. À revoir avec une séquence Postgres dédiée si la concurrence devient
// un problème (deux tickets créés à la même milliseconde).
async function genererNumero(): Promise<string> {
  const total = await prisma.ticket.count();
  return `T-${String(total + 1).padStart(4, "0")}`;
}

export async function creerTicket(params: {
  clientId: string;
  sujet: string;
  description?: string;
  categorie: CategorieTicket;
  routeurId?: string;
  priorite?: PrioriteTicket;
}) {
  const numero = await genererNumero();
  const priorite = params.priorite ?? "NORMALE";
  const creeLe = new Date();

  return prisma.ticket.create({
    data: {
      numero,
      clientId: params.clientId,
      sujet: params.sujet,
      description: params.description,
      categorie: params.categorie,
      routeurId: params.routeurId,
      priorite,
      creeLe,
      echeanceSla: calculerEcheanceSla(priorite, creeLe),
    },
  });
}

export async function assignerTechnicien(
  ticketId: string,
  technicienId: string,
  utilisateurId: string,
) {
  const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });

  const misAJour = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      technicienId,
      statut: ticket.statut === "NOUVEAU" ? "ASSIGNE" : ticket.statut,
    },
  });

  await enregistrerAudit({
    utilisateurId,
    action: `Assignation du ticket ${ticket.numero}`,
    nouvelleValeur: technicienId,
    resultat: "Succès",
  });

  return misAJour;
}

export async function changerStatutTicket(
  ticketId: string,
  nouveauStatut: StatutTicket,
  utilisateurId: string,
) {
  const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });

  if (!TRANSITIONS_AUTORISEES[ticket.statut].includes(nouveauStatut)) {
    throw new ErreurTransitionInvalide(
      `Impossible de passer de ${ticket.statut} à ${nouveauStatut}`,
    );
  }

  const misAJour = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      statut: nouveauStatut,
      resoluLe: nouveauStatut === "RESOLU" ? new Date() : ticket.resoluLe,
      fermeLe: nouveauStatut === "FERME" ? new Date() : ticket.fermeLe,
    },
  });

  await enregistrerAudit({
    utilisateurId,
    action: `Changement de statut du ticket ${ticket.numero}`,
    ancienneValeur: ticket.statut,
    nouvelleValeur: nouveauStatut,
    resultat: "Succès",
  });

  return misAJour;
}
