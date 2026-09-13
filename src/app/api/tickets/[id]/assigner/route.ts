// src/app/api/tickets/[id]/assigner/route.ts

import { NextResponse } from "next/server";
import { exigerRole, ErreurAcces } from "@/lib/permissions/permissions";
import { assignerTechnicien } from "@/services/ticket.service";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  let utilisateur;
  try {
    utilisateur = await exigerRole("SUPER_ADMIN", "ADMINISTRATEUR");
  } catch (erreur) {
    if (erreur instanceof ErreurAcces) {
      return NextResponse.json({ erreur: erreur.message }, { status: 403 });
    }
    throw erreur;
  }

  const { technicienId } = await request.json();
  const ticket = await assignerTechnicien(params.id, technicienId, utilisateur.id);
  return NextResponse.json(ticket);
}
