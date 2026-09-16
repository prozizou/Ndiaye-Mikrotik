// src/app/login/page.tsx
// Composant client : Firebase Auth s'exécute dans le navigateur. Une fois
// connecté, on échange le idToken contre le cookie de session httpOnly
// via /api/auth/session, puis on redirige.

"use client";

import { useState } from "react";
import Image from "next/image";
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

      router.push("/routeurs");
      router.refresh();
    } catch {
      setErreur("Email ou mot de passe incorrect");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 text-ink">
      <form
        onSubmit={connecter}
        className="w-full max-w-sm space-y-4 border border-border bg-surface p-8 shadow-sm"
      >
        <div className="mb-2 text-center">
          <Image
            src="/logo.png"
            alt="Ndiaye Mikrotik"
            width={72}
            height={72}
            className="mx-auto rounded-full"
            priority
          />
          <span className="mt-3 block font-display text-lg font-semibold tracking-tight">
            Ndiaye Mikrotik
          </span>
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
          className="w-full bg-brand px-3 py-2.5 text-sm font-medium text-white hover:bg-brand-strong disabled:opacity-50"
        >
          {enCours ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
