// src/app/api/alertes/[id]/acquitter/route.ts

import { NextResponse } from "next/server";
import { exigerRole, ErreurAcces } from "@/lib/permissions/permissions";
import { acquitterAlerte } from "@/services/alerte.service";

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

  try {
    const alerte = await acquitterAlerte(params.id, utilisateur.id);
    return NextResponse.json(alerte);
  } catch {
    return NextResponse.json({ erreur: "Alerte introuvable" }, { status: 404 });
  }
}
