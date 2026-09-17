// src/app/login/page.tsx
// Composant client : Firebase Auth s'exécute dans le navigateur. Une fois
// connecté via Google, on échange le idToken contre le cookie de session
// httpOnly via /api/auth/session, puis on redirige. L'autorisation réelle
// (qui a le droit d'utiliser l'app) se joue côté serveur, sur la liste
// blanche ADMIN_EMAILS — se connecter avec un compte Google ne suffit pas
// à lui seul.

"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { authClient, fournisseurGoogle } from "@/lib/firebase/client";

export default function PageConnexion() {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function connecter() {
    setErreur(null);
    setEnCours(true);

    try {
      const identifiants = await signInWithPopup(authClient, fournisseurGoogle);
      const idToken = await identifiants.user.getIdToken();

      const reponse = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!reponse.ok) {
        const donnees = await reponse.json().catch(() => null);
        throw new Error(donnees?.erreur ?? "Session refusée");
      }

      router.push("/routeurs");
      router.refresh();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Connexion impossible");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 text-ink">
      <div className="w-full max-w-sm space-y-4 border border-border bg-surface p-8 shadow-sm">
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

        {erreur && <p className="text-center text-sm text-critical">{erreur}</p>}

        <button
          onClick={connecter}
          disabled={enCours}
          className="flex w-full items-center justify-center gap-2.5 border border-border-strong bg-surface px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-raised disabled:opacity-50"
        >
          <LogoGoogle className="h-[18px] w-[18px]" />
          {enCours ? "Connexion..." : "Se connecter avec Google"}
        </button>
      </div>
    </div>
  );
}

function LogoGoogle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-3.1-.4-4.6H24v9h11.8c-.5 2.7-2 5-4.4 6.6v5.4h7.1c4.1-3.8 6.6-9.4 6.6-16.4z"
      />
      <path
        fill="#34A853"
        d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.4c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.6-3.8-12.4-9.1H4.3v5.6C7.9 41.1 15.3 46 24 46z"
      />
      <path fill="#FBBC05" d="M11.6 28.2c-.5-1.3-.7-2.7-.7-4.2s.3-2.9.7-4.2v-5.6H4.3C2.8 17.1 2 20.5 2 24s.8 6.9 2.3 9.8z" />
      <path
        fill="#EA4335"
        d="M24 10.7c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C34.9 4.1 30 2 24 2 15.3 2 7.9 6.9 4.3 14.2l7.3 5.6c1.8-5.3 6.6-9.1 12.4-9.1z"
      />
    </svg>
  );
}
