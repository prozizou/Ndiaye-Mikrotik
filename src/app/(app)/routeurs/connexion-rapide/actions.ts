// src/app/routeurs/connexion-rapide/actions.ts
// Seule façon d'ajouter un routeur pour l'instant : IP, utilisateur, mot de
// passe. Rien d'autre — pas de client, pas de site, pas de diagnostic
// automatique (reviendra progressivement, voir prisma/schema.prisma).

"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/database/prisma";
import { exigerRole } from "@/lib/permissions/permissions";
import { chiffrer } from "@/lib/mikrotik/secrets";

export async function connexionRapide(formData: FormData) {
  await exigerRole("SUPER_ADMIN", "ADMINISTRATEUR");

  const ip = String(formData.get("ip")).trim();
  const utilisateurApi = String(formData.get("utilisateurApi")).trim();
  const motDePasseApi = String(formData.get("motDePasseApi"));
  const nomSaisi = String(formData.get("nom") ?? "").trim();
  const nom = nomSaisi.length > 0 ? nomSaisi : ip;

  const routeur = await prisma.$transaction(async (tx) => {
    const routeurCree = await tx.routeur.create({ data: { nom, ipVpn: ip } });

    await tx.routeurSecret.create({
      data: {
        routeurId: routeurCree.id,
        utilisateurApi,
        motDePasseChiffre: chiffrer(motDePasseApi),
      },
    });

    return routeurCree;
  });

  redirect(`/routeurs/${routeur.id}`);
}
