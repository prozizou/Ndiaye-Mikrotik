// src/app/login/page.tsx
// Composant client : Firebase Auth s'exécute dans le navigateur. Une fois
// connecté, on échange le idToken contre le cookie de session httpOnly
// via /api/auth/session, puis on redirige.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { authClient } from "@/lib/firebase/client";

export default function PageConnexion() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function connecter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    try {
      const identifiants = await signInWithEmailAndPassword(authClient, email, motDePasse);
      const idToken = await identifiants.user.getIdToken();

      const reponse = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!reponse.ok) throw new Error("Session refusée");

      router.push("/dashboard");
      router.refresh();
    } catch {
      setErreur("Email ou mot de passe incorrect");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 text-ink">
      <form onSubmit={connecter} className="w-full max-w-sm space-y-3">
        <div className="mb-4 text-center">
          <span className="font-display text-[17px] font-semibold tracking-tight">MikroAssist</span>
          <p className="mt-1 text-sm text-ink-muted">Centre d'assistance MikroTik</p>
        </div>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border border-border-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          required
          className="w-full border border-border-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
        />

        {erreur && <p className="text-sm text-critical">{erreur}</p>}

        <button
          type="submit"
          disabled={enCours}
          className="w-full border border-brand bg-brand/10 px-3 py-2 text-sm font-medium text-ink hover:bg-brand/20 disabled:opacity-50"
        >
          {enCours ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
