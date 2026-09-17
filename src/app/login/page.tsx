// src/app/login/page.tsx
// Écran de connexion — email + code d'accès à 6 chiffres, vérifié par
// Firebase Authentication (voir login-flow.tsx pour le détail du flux).
// Hors du groupe (app)/ : pas de sidebar/barre de navigation, plein écran.

import { redirect } from "next/navigation";
import { utilisateurConnecte } from "@/lib/auth/session";
import { LoginFlow } from "./login-flow";

export const metadata = {
  title: "Connexion — Ndiaye Mikrotik",
};

export default async function PageConnexion() {
  const utilisateur = await utilisateurConnecte();
  if (utilisateur) redirect("/routeurs");

  return <LoginFlow />;
}
