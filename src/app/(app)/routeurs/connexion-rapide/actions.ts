// src/app/routeurs/connexion-rapide/actions.ts
// Seule façon d'ajouter un routeur pour l'instant : IP, utilisateur, mot de
// passe. Rien d'autre.

"use server";

import { redirect } from "next/navigation";
import { creerRouteur } from "@/services/routeur.service";
import { exigerUtilisateur } from "@/lib/auth/session";

export async function connexionRapide(formData: FormData) {
  await exigerUtilisateur();

  const ip = String(formData.get("ip")).trim();
  const utilisateurApi = String(formData.get("utilisateurApi")).trim();
  const motDePasseApi = String(formData.get("motDePasseApi"));
  const nomSaisi = String(formData.get("nom") ?? "").trim();
  const nom = nomSaisi.length > 0 ? nomSaisi : ip;

  const routeur = await creerRouteur({ nom, ipVpn: ip, utilisateurApi, motDePasseApi });

  redirect(`/routeurs/${routeur.id}`);
}
