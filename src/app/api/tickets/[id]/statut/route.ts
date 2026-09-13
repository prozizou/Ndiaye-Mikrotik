// src/app/api/tickets/[id]/statut/route.ts

import { NextResponse } from "next/server";
import { exigerRole, ErreurAcces } from "@/lib/permissions/permissions";
import { changerStatutTicket, ErreurTransitionInvalide } from "@/services/ticket.service";
import type { StatutTicket } from "@prisma/client";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  let utilisateur;
  try {
    utilisateur = await exigerRole("SUPER_ADMIN", "ADMINISTRATEUR", "TECHNICIEN");
  } catch (erreur) {
    if (erreur instanceof ErreurAcces) {
      return NextResponse.json({ erreur: erreur.message }, { status: 403 });
    }
    throw erreur;
  }

  const { statut } = (await request.json()) as { statut: StatutTicket };

  try {
    const ticket = await changerStatutTicket(params.id, statut, utilisateur.id);
    return NextResponse.json(ticket);
  } catch (erreur) {
    if (erreur instanceof ErreurTransitionInvalide) {
      return NextResponse.json({ erreur: erreur.message }, { status: 400 });
    }
    throw erreur;
  }
}
