// src/app/page.tsx
// La racine du site n'a pas de contenu propre — redirige vers /routeurs
// (le middleware renvoie ensuite vers /login si pas de session).

import { redirect } from "next/navigation";

export default function PageRacine() {
  redirect("/routeurs");
}
