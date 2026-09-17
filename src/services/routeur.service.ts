// src/services/routeur.service.ts
// Accès RTDB pour les routeurs — remplace prisma.routeur / prisma.routeurSecret.
// Deux nœuds séparés dans Firebase Realtime Database :
//   /routeurs/{id}        : { nom, ipVpn, creeLe }        — lisible tel quel
//   /routeurSecrets/{id}  : { utilisateurApi, motDePasseChiffre } — jamais
//                            renvoyé à une fonction qui répond au navigateur
//
// RTDB n'a pas de contrainte d'unicité native (contrairement à ipVpn @unique
// sous Prisma) : creerRouteur() vérifie l'absence de doublon avant d'écrire.
// Acceptable tant que le parc reste petit (quelques routeurs, un seul
// administrateur) — à revoir si ça grossit.

import { dbAdmin } from "@/lib/firebase/admin";
import { chiffrer, dechiffrer } from "@/lib/mikrotik/secrets";

export type Routeur = {
  id: string;
  nom: string;
  ipVpn: string;
  creeLe: number;
};

export async function listerRouteurs(): Promise<Routeur[]> {
  const snap = await dbAdmin.ref("routeurs").get();
  if (!snap.exists()) return [];

  const valeurs = snap.val() as Record<string, Omit<Routeur, "id">>;
  return Object.entries(valeurs)
    .map(([id, r]) => ({ id, ...r }))
    .sort((a, b) => a.nom.localeCompare(b.nom));
}

export async function obtenirRouteur(id: string): Promise<Routeur | null> {
  const snap = await dbAdmin.ref(`routeurs/${id}`).get();
  if (!snap.exists()) return null;
  return { id, ...(snap.val() as Omit<Routeur, "id">) };
}

export async function creerRouteur(params: {
  nom: string;
  ipVpn: string;
  utilisateurApi: string;
  motDePasseApi: string;
}): Promise<Routeur> {
  const doublon = (await listerRouteurs()).find((r) => r.ipVpn === params.ipVpn);
  if (doublon) throw new Error(`Un routeur utilise déjà l'IP ${params.ipVpn}`);

  const ref = dbAdmin.ref("routeurs").push();
  const id = ref.key!;
  const creeLe = Date.now();

  // Écriture multi-chemins : les deux nœuds (public + secret) s'écrivent
  // ensemble, sans laisser de fenêtre où l'un existe sans l'autre.
  await dbAdmin.ref().update({
    [`routeurs/${id}`]: { nom: params.nom, ipVpn: params.ipVpn, creeLe },
    [`routeurSecrets/${id}`]: {
      utilisateurApi: params.utilisateurApi,
      motDePasseChiffre: chiffrer(params.motDePasseApi),
    },
  });

  return { id, nom: params.nom, ipVpn: params.ipVpn, creeLe };
}

/** Identifiants en clair — usage serveur uniquement, ne jamais sérialiser dans une réponse API. */
export async function recupererIdentifiantsMikrotik(routeurId: string) {
  const snap = await dbAdmin.ref(`routeurSecrets/${routeurId}`).get();
  if (!snap.exists()) throw new Error(`Identifiants introuvables pour le routeur ${routeurId}`);

  const secret = snap.val() as { utilisateurApi: string; motDePasseChiffre: string };
  return {
    utilisateur: secret.utilisateurApi,
    motDePasse: dechiffrer(secret.motDePasseChiffre),
  };
}
