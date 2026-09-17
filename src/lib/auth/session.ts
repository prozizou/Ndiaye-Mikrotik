// src/lib/auth/session.ts
// Aide côté serveur pour la session d'authentification. Le cookie httpOnly
// "session" (créé par /api/auth/session) contient un session cookie
// Firebase — pas le jeton brut — vérifiable ici sans appel réseau vers
// Firebase (authAdmin.verifySessionCookie). La preuve que l'utilisateur
// existe dans la base Firebase Authentication a déjà été apportée côté
// client : signInWithEmailAndPassword échoue sinon (voir
// src/app/login/login-flow.tsx) — il n'y a donc pas de liste blanche
// séparée à vérifier ici.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authAdmin } from "@/lib/firebase/admin";

export const NOM_COOKIE_SESSION = "session";
export const DUREE_SESSION_MS = 1000 * 60 * 60 * 24 * 14; // 14 jours — maximum autorisé par Firebase

export type UtilisateurSession = { uid: string; email: string | null };

export async function utilisateurConnecte(): Promise<UtilisateurSession | null> {
  const cookie = cookies().get(NOM_COOKIE_SESSION)?.value;
  if (!cookie) return null;

  try {
    const decode = await authAdmin.verifySessionCookie(cookie, true);
    return { uid: decode.uid, email: decode.email ?? null };
  } catch {
    return null;
  }
}

/** À appeler en tête des pages/actions protégées — redirige vers /login si absent. */
export async function exigerUtilisateur(): Promise<UtilisateurSession> {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) redirect("/login");
  return utilisateur;
}
