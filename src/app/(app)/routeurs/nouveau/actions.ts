// src/app/routeurs/nouveau/actions.ts
// Le mot de passe API transite une seule fois, en HTTPS, du formulaire à ce
// server action — il est chiffré avant d'être écrit en base et jamais relu
// en clair ailleurs que dans lib/mikrotik/secrets.ts.

"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/database/prisma";
import { exigerRole } from "@/lib/permissions/permissions";
import { chiffrer } from "@/lib/mikrotik/secrets";
import { enregistrerAudit } from "@/lib/audit/journal.service";

function optionnel(valeur: FormDataEntryValue | null): string | undefined {
  const chaine = valeur ? String(valeur).trim() : "";
  return chaine.length > 0 ? chaine : undefined;
}

export async function creerRouteur(formData: FormData) {
  const utilisateur = await exigerRole("SUPER_ADMIN", "ADMINISTRATEUR");

  const siteId = String(formData.get("siteId"));
  const nom = String(formData.get("nom"));
  const ipVpn = String(formData.get("ipVpn"));
  const clePubliqueWg = String(formData.get("clePubliqueWg"));
  const utilisateurApi = String(formData.get("utilisateurApi"));
  const motDePasseApi = String(formData.get("motDePasseApi"));

  const modele = optionnel(formData.get("modele"));
  const versionRouterOs = optionnel(formData.get("versionRouterOs"));
  const numeroSerie = optionnel(formData.get("numeroSerie"));

  const routeur = await prisma.$transaction(async (tx) => {
    const routeurCree = await tx.routeur.create({
      data: { siteId, nom, ipVpn, clePubliqueWg, modele, versionRouterOs, numeroSerie },
    });

    await tx.routeurSecret.create({
      data: {
        routeurId: routeurCree.id,
        utilisateurApi,
        motDePasseChiffre: chiffrer(motDePasseApi),
      },
    });

    return routeurCree;
  });

  await enregistrerAudit({
    utilisateurId: utilisateur.id,
    routeurId: routeur.id,
    action: `Création du routeur ${routeur.nom}`,
    resultat: "Succès",
  });

  // La page de détail existe maintenant (src/app/routeurs/[id]/page.tsx)
  redirect(`/routeurs/${routeur.id}`);
}
