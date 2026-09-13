// src/app/(app)/plus/deconnexion-bouton.tsx
// L'app n'avait jusqu'ici aucun moyen de se déconnecter depuis l'interface
// (le cookie de session dure 5 jours). DELETE /api/auth/session existait
// déjà côté serveur, rien ne l'appelait.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeconnexionBouton() {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);

  async function deconnecter() {
    setEnCours(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <button
      onClick={deconnecter}
      disabled={enCours}
      className="w-full border border-critical/30 px-4 py-3 text-left text-sm text-critical transition-colors hover:bg-critical/10 disabled:opacity-50"
    >
      {enCours ? "Déconnexion..." : "Se déconnecter"}
    </button>
  );
}
