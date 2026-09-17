// src/lib/permissions/permissions.ts
// Plus de base séparée pour les comptes/rôles : Google gère l'identité
// (qui es-tu ?), cette liste blanche gère l'autorisation (as-tu le droit
// d'utiliser cette app ?) — ADMIN_EMAILS, une liste d'emails séparés par
// des virgules. Vérifiée à chaque requête (pas seulement à la connexion) :
// retirer un email de la liste coupe l'accès immédiatement, même si son
// cookie de session (5 jours) est encore valide.

import { cookies } from "next/headers";
import { authAdmin } from "@/lib/firebase/admin";

export class ErreurAcces extends Error {
  constructor(message = "Accès refusé") {
    super(message);
    this.name = "ErreurAcces";
  }
}

function emailsAutorises(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function emailEstAutorise(email: string | null | undefined): boolean {
  if (!email) return false;
  return emailsAutorises().includes(email.toLowerCase());
}

/** Vérifie le cookie de session Firebase et que l'email est sur la liste blanche. */
export async function utilisateurConnecte() {
  const cookieSession = (await cookies()).get("session")?.value;
  if (!cookieSession) throw new ErreurAcces("Non authentifié");

  let decoded;
  try {
    // `true` = vérifie aussi que le compte Firebase n'a pas été révoqué
    decoded = await authAdmin.verifySessionCookie(cookieSession, true);
  } catch {
    throw new ErreurAcces("Session invalide ou expirée");
  }

  if (!emailEstAutorise(decoded.email)) {
    throw new ErreurAcces("Compte non autorisé");
  }

  return { uid: decoded.uid, email: decoded.email!, nom: decoded.name ?? decoded.email! };
}
