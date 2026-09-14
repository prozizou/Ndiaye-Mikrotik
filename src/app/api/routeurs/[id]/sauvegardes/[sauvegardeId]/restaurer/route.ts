// src/app/api/routeurs/[id]/sauvegardes/[sauvegardeId]/restaurer/route.ts
// Restauration manuelle d'une sauvegarde — action à haut risque (redémarrage
// + écrasement de la config courante), réservée à ADMINISTRATEUR/SUPER_ADMIN
// (voir PERMISSIONS.restaurerSauvegarde), toujours confirmée côté client.

import { NextResponse } from "next/server";
import { exigerRole, ErreurAcces } from "@/lib/permissions/permissions";
import { restaurerSauvegarde } from "@/services/sauvegarde.service";
import { prisma } from "@/lib/database/prisma";

export async function POST(
  _request: Request,
  { params }: { params: { id: string; sauvegardeId: string } },
) {
  let utilisateur;
  try {
    utilisateur = await exigerRole("SUPER_ADMIN", "ADMINISTRATEUR");
  } catch (erreur) {
    if (erreur instanceof ErreurAcces) {
      return NextResponse.json({ erreur: erreur.message }, { status: 403 });
    }
    throw erreur;
  }

  // La sauvegarde doit bien appartenir au routeur de l'URL — évite qu'un ID
  // de sauvegarde valide mais d'un autre routeur soit utilisé par erreur ou
  // manipulation de l'URL.
  const sauvegarde = await prisma.sauvegardeRouteur.findFirst({
    where: { id: params.sauvegardeId, routeurId: params.id },
  });
  if (!sauvegarde) {
    return NextResponse.json({ erreur: "Sauvegarde introuvable pour ce routeur" }, { status: 404 });
  }

  const resultat = await restaurerSauvegarde(sauvegarde.id, { utilisateurId: utilisateur.id });
  return NextResponse.json(resultat, { status: resultat.ok ? 200 : 502 });
}
