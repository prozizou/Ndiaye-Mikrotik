// src/app/api/cron/diagnostics/route.ts
// Phase 7 — supervision périodique : relance lancerDiagnostic() sur tout le
// parc, sans attendre qu'un humain clique sur "Lancer un diagnostic". C'est
// ce endpoint que déclenchent à la fois le cron Vercel (vercel.json, une
// fois par jour sur le plan Hobby) et le workflow GitHub Actions
// (.github/workflows/monitoring.yml, ~toutes les 15 min en best-effort).
//
// Toujours protégé par CRON_SECRET : sans cette variable d'environnement
// configurée, la comparaison échoue systématiquement et la route répond
// 401 — comportement fermé par défaut plutôt qu'ouvert par accident.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { lancerDiagnostic } from "@/services/diagnostic.service";

export const maxDuration = 60;

export async function GET(request: Request) {
  const enTete = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || enTete !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const routeurs = await prisma.routeur.findMany({ select: { id: true } });

  // En parallèle plutôt qu'en séquence : le temps total reste borné par le
  // routeur le plus lent, pas par la somme de tous — important vu la durée
  // de fonction limitée. Un routeur qui échoue n'empêche pas les autres
  // (allSettled) ; s'il est coupé par un timeout de fonction, le prochain
  // passage du cron le retentera de toute façon.
  const resultats = await Promise.allSettled(routeurs.map((r) => lancerDiagnostic(r.id)));
  const echecs = resultats.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ routeursTraites: routeurs.length, echecs });
}
