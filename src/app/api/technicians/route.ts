// src/app/api/technicians/route.ts
// Exemple d'usage de permissions.ts : la vérification est ici, dans le
// handler, pas seulement dans un `if (role === "ADMIN")` côté composant.

import { NextResponse } from "next/server";
import { exigerRole, ErreurAcces } from "@/lib/permissions/permissions";
import { prisma } from "@/lib/database/prisma";

export async function GET() {
  try {
    await exigerRole("SUPER_ADMIN", "ADMINISTRATEUR");
  } catch (erreur) {
    if (erreur instanceof ErreurAcces) {
      return NextResponse.json({ erreur: erreur.message }, { status: 403 });
    }
    throw erreur;
  }

  const techniciens = await prisma.utilisateur.findMany({
    where: { role: "TECHNICIEN" },
    select: { id: true, nom: true, email: true, actif: true },
  });

  return NextResponse.json(techniciens);
}
