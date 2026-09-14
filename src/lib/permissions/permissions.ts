// src/lib/permissions/permissions.ts
// Postgres reste la source de vérité pour le rôle et le clientId — Firebase
// ne sert qu'à prouver "qui est connecté". Chaque route/server action
// sensible doit appeler l'une de ces fonctions avant d'agir.

import { cookies } from "next/headers";
import { authAdmin } from "@/lib/firebase/admin";
import { prisma } from "@/lib/database/prisma";
import type { Role } from "@prisma/client";

export class ErreurAcces extends Error {
  constructor(message = "Accès refusé") {
    super(message);
    this.name = "ErreurAcces";
  }
}

/**
 * Vérifie le cookie de session Firebase, puis va chercher le rôle et le
 * clientId dans Postgres (jamais dans le token Firebase lui-même).
 */
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

  const utilisateur = await prisma.utilisateur.findUnique({
    where: { firebaseUid: decoded.uid },
  });

  if (!utilisateur || !utilisateur.actif) {
    throw new ErreurAcces("Compte introuvable ou désactivé");
  }

  return utilisateur;
}

/** Vérifie que l'utilisateur connecté a l'un des rôles fournis. */
export async function exigerRole(...roles: Role[]) {
  const utilisateur = await utilisateurConnecte();
  if (!roles.includes(utilisateur.role)) {
    throw new ErreurAcces(`Rôle requis : ${roles.join(", ")}`);
  }
  return utilisateur;
}

/** Un compte CLIENT ne peut agir que sur ses propres données. */
export async function exigerAccesClient(clientId: string) {
  const utilisateur = await utilisateurConnecte();
  if (utilisateur.role === "CLIENT" && utilisateur.clientId !== clientId) {
    throw new ErreurAcces("Accès refusé à ce client");
  }
  return utilisateur;
}

/**
 * Source unique de vérité pour "qui peut faire quoi". Utilisée côté serveur
 * pour bloquer, et côté client uniquement pour décider quoi afficher.
 */
export const PERMISSIONS = {
  gererTechniciens: ["SUPER_ADMIN", "ADMINISTRATEUR"],
  gererClients: ["SUPER_ADMIN", "ADMINISTRATEUR"],
  gererRouteurs: ["SUPER_ADMIN", "ADMINISTRATEUR"],
  accederTerminal: ["SUPER_ADMIN", "ADMINISTRATEUR", "TECHNICIEN"],
  lancerDiagnostic: ["SUPER_ADMIN", "ADMINISTRATEUR", "TECHNICIEN"],
  lancerIntervention: ["SUPER_ADMIN", "ADMINISTRATEUR", "TECHNICIEN"],
  // Restaurer une sauvegarde redémarre le routeur et écrase sa config
  // actuelle — réservé aux rôles qui peuvent déjà gérer des routeurs, pas
  // ouvert au technicien qui peut seulement en créer (via une intervention).
  restaurerSauvegarde: ["SUPER_ADMIN", "ADMINISTRATEUR"],
  voirJournalAudit: ["SUPER_ADMIN", "ADMINISTRATEUR"],
  creerTicket: ["SUPER_ADMIN", "ADMINISTRATEUR", "TECHNICIEN", "CLIENT"],
} satisfies Record<string, Role[]>;

export async function peut(action: keyof typeof PERMISSIONS) {
  const utilisateur = await utilisateurConnecte();
  return (PERMISSIONS[action] as Role[]).includes(utilisateur.role);
}
