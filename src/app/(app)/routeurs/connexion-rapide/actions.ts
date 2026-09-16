// src/app/routeurs/connexion-rapide/actions.ts
// Version courte du formulaire "Ajouter un routeur" : seulement l'IP,
// l'utilisateur et le mot de passe API — le strict nécessaire pour se
// connecter et diagnostiquer. Le modèle Client/Site reste en place derrière
// (rien d'autre n'en dépend), mais on n'oblige pas l'utilisateur à en créer
// un exprès : on réutilise ou on crée un site "boîte à outils" dédié à ces
// connexions rapides.

"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/database/prisma";
import { exigerRole } from "@/lib/permissions/permissions";
import { chiffrer } from "@/lib/mikrotik/secrets";
import { enregistrerAudit } from "@/lib/audit/journal.service";
import { lancerDiagnostic } from "@/services/diagnostic.service";

const NOM_CLIENT_PAR_DEFAUT = "Connexions rapides";
const NOM_SITE_PAR_DEFAUT = "Non classé";

async function obtenirSiteParDefaut() {
  const client = await prisma.client.upsert({
    where: { id: "connexion-rapide" },
    update: {},
    create: { id: "connexion-rapide", nom: NOM_CLIENT_PAR_DEFAUT },
  });

  const site = await prisma.site.findFirst({ where: { clientId: client.id } });
  if (site) return site;

  return prisma.site.create({ data: { nom: NOM_SITE_PAR_DEFAUT, clientId: client.id } });
}

export async function connexionRapide(formData: FormData) {
  const utilisateur = await exigerRole("SUPER_ADMIN", "ADMINISTRATEUR");

  const ip = String(formData.get("ip")).trim();
  const utilisateurApi = String(formData.get("utilisateurApi")).trim();
  const motDePasseApi = String(formData.get("motDePasseApi"));
  const nomSaisi = String(formData.get("nom") ?? "").trim();
  const nom = nomSaisi.length > 0 ? nomSaisi : ip;

  const site = await obtenirSiteParDefaut();

  const routeur = await prisma.$transaction(async (tx) => {
    const routeurCree = await tx.routeur.create({
      data: { siteId: site.id, nom, ipVpn: ip },
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
    action: `Connexion rapide au routeur ${routeur.nom}`,
    resultat: "Succès",
  });

  // Diagnostic immédiat : l'utilisateur arrive sur la fiche routeur avec un
  // premier résultat déjà là, pas une page vide à devoir déclencher soi-même.
  // Ne bloque jamais la création si le routeur ou la passerelle n'est pas
  // encore joignable — l'échec est simplement visible sur la fiche.
  try {
    await lancerDiagnostic(routeur.id);
  } catch {
    // Le diagnostic est facultatif ici : sa propre gestion d'erreur
    // (lancerDiagnostic) trace déjà l'échec sur le routeur lui-même.
  }

  redirect(`/routeurs/${routeur.id}`);
}
