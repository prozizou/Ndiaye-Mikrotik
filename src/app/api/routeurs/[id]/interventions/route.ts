// src/app/api/routeurs/[id]/interventions/route.ts

import { NextResponse } from "next/server";
import { exigerRole, ErreurAcces } from "@/lib/permissions/permissions";
import { redemarrerRouteur, sauvegarderConfiguration } from "@/services/intervention.service";

// Liste volontairement explicite plutôt que déduite : une opération devient
// "dangereuse" par décision humaine, pas par accident de nommage.
const TYPES_DANGEREUX = ["REDEMARRER_ROUTEUR"];

export async function POST(request: Request, { params }: { params: { id: string } }) {
  let technicien;
  try {
    technicien = await exigerRole("SUPER_ADMIN", "ADMINISTRATEUR", "TECHNICIEN");
  } catch (erreur) {
    if (erreur instanceof ErreurAcces) {
      return NextResponse.json({ erreur: erreur.message }, { status: 403 });
    }
    throw erreur;
  }

  const corps = await request.json().catch(() => ({}));
  const { type, ticketId, confirmation } = corps as {
    type?: string;
    ticketId?: string;
    confirmation?: boolean;
  };

  if (type && TYPES_DANGEREUX.includes(type) && confirmation !== true) {
    return NextResponse.json(
      { erreur: "Confirmation requise pour cette opération" },
      { status: 400 },
    );
  }

  const parametres = { routeurId: params.id, technicienId: technicien.id, ticketId };

  switch (type) {
    case "REDEMARRER_ROUTEUR":
      return NextResponse.json(await redemarrerRouteur(parametres));
    case "SAUVEGARDER_CONFIGURATION":
      return NextResponse.json(await sauvegarderConfiguration(parametres));
    default:
      return NextResponse.json({ erreur: "Type d'intervention inconnu" }, { status: 400 });
  }
}
