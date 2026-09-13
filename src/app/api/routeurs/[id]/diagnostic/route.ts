// src/app/api/routeurs/[id]/diagnostic/route.ts
// Bouton "Lancer un diagnostic" côté UI → cet endpoint.

import { NextResponse } from "next/server";
import { exigerRole, ErreurAcces } from "@/lib/permissions/permissions";
import { lancerDiagnostic } from "@/services/diagnostic.service";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await exigerRole("SUPER_ADMIN", "ADMINISTRATEUR", "TECHNICIEN");
  } catch (erreur) {
    if (erreur instanceof ErreurAcces) {
      return NextResponse.json({ erreur: erreur.message }, { status: 403 });
    }
    throw erreur;
  }

  const corps = await request.json().catch(() => ({}));
  const ticketId: string | undefined = corps.ticketId;

  try {
    const resultat = await lancerDiagnostic(params.id, ticketId);
    return NextResponse.json(resultat);
  } catch {
    return NextResponse.json({ erreur: "Échec du diagnostic" }, { status: 500 });
  }
}
