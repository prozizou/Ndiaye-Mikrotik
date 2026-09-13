// src/app/api/tickets/route.ts

import { NextResponse } from "next/server";
import { utilisateurConnecte, exigerAccesClient, ErreurAcces } from "@/lib/permissions/permissions";
import { creerTicket } from "@/services/ticket.service";

export async function POST(request: Request) {
  const utilisateur = await utilisateurConnecte();
  const corps = await request.json();

  const clientId = utilisateur.role === "CLIENT" ? utilisateur.clientId! : corps.clientId;
  if (!clientId) {
    return NextResponse.json({ erreur: "clientId requis" }, { status: 400 });
  }

  try {
    await exigerAccesClient(clientId);
  } catch (erreur) {
    if (erreur instanceof ErreurAcces) {
      return NextResponse.json({ erreur: erreur.message }, { status: 403 });
    }
    throw erreur;
  }

  const ticket = await creerTicket({
    clientId,
    sujet: corps.sujet,
    description: corps.description,
    categorie: corps.categorie,
    routeurId: corps.routeurId,
  });

  return NextResponse.json(ticket, { status: 201 });
}
