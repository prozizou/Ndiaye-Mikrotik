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
    <form onSubmit={connecter} className="mx-auto mt-24 max-w-sm space-y-3 p-4">
      <h1 className="text-lg font-medium">Connexion</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full border p-2"
      />
      <input
        type="password"
        placeholder="Mot de passe"
        value={motDePasse}
        onChange={(e) => setMotDePasse(e.target.value)}
        required
        className="w-full border p-2"
      />

      {erreur && <p className="text-sm text-red-600">{erreur}</p>}

      <button type="submit" disabled={enCours} className="w-full border p-2">
        {enCours ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
