// src/app/api/cron/supervision/route.ts
// Appelée par un cron externe (cron-job.org) à intervalle régulier — pas de
// session utilisateur possible ici (personne n'est connecté), donc protégée
// par un secret partagé (CRON_SECRET) envoyé en en-tête Authorization par le
// job cron, plutôt que par le cookie de session habituel.
//
// Vérifie chaque routeur du parc en parallèle via la passerelle (voir
// lib/mikrotik/client.ts — même chemin que le bouton "Tester la connexion"),
// et enregistre le résultat dans routeurSupervision/{id} (voir
// services/routeur.service.ts). Un routeur injoignable n'empêche jamais le
// contrôle des autres (Promise.allSettled).
//
// Non protégée par src/middleware.ts (son matcher ne couvre pas /api) — la
// vérification du secret ci-dessous est la seule barrière, c'est voulu.

import { NextRequest, NextResponse } from "next/server";
import {
  listerRouteurs,
  recupererIdentifiantsMikrotik,
  enregistrerSupervision,
} from "@/services/routeur.service";
import { appelerMikrotik, ErreurMikrotik } from "@/lib/mikrotik/client";

export async function GET(request: NextRequest) {
  const secretAttendu = process.env.CRON_SECRET;
  if (!secretAttendu) {
    return NextResponse.json({ erreur: "CRON_SECRET non configuré côté serveur" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secretAttendu}`) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const routeurs = await listerRouteurs();

  await Promise.allSettled(
    routeurs.map(async (routeur) => {
      try {
        const identifiants = await recupererIdentifiantsMikrotik(routeur.id);
        const donnees = (await appelerMikrotik(routeur.ipVpn, "/system/resource", identifiants)) as Record<
          string,
          unknown
        > | null;

        await enregistrerSupervision(routeur.id, {
          ok: true,
          verifieLe: Date.now(),
          version: String(donnees?.version ?? "?"),
          tempsActivite: String(donnees?.uptime ?? "?"),
        });
      } catch (err) {
        await enregistrerSupervision(routeur.id, {
          ok: false,
          verifieLe: Date.now(),
          erreur: err instanceof ErreurMikrotik ? err.message : "Connexion impossible pour le moment.",
        });
      }
    }),
  );

  return NextResponse.json({ ok: true, routeursVerifies: routeurs.length });
}
