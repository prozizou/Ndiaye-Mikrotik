// src/app/(app)/plus/deconnexion-bouton.tsx
// Efface le cookie de session serveur et l'état Firebase persisté côté
// client, puis renvoie vers /login.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { authClient } from "@/lib/firebase/client";

export function DeconnexionBouton() {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);

  async function deconnecter() {
    setEnCours(true);
    await Promise.all([
      fetch("/api/auth/session", { method: "DELETE" }),
      signOut(authClient).catch(() => {}),
    ]);
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={deconnecter}
      disabled={enCours}
      className="mt-3 border border-border-strong px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-critical disabled:opacity-50"
    >
      {enCours ? "Déconnexion…" : "Se déconnecter"}
    </button>
  );
}
