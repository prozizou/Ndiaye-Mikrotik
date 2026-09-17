// src/app/page.tsx
// La racine du site n'a pas de contenu propre — redirige vers /routeurs.

import { redirect } from "next/navigation";

export default function PageRacine() {
  redirect("/routeurs");
}
