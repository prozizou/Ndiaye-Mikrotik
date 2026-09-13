// src/lib/mikrotik/secrets.ts
// Les identifiants API de chaque routeur sont chiffrés en base (AES-256-GCM)
// et déchiffrés uniquement ici, côté serveur. Ne jamais `select` la table
// routeur_secrets depuis un endpoint qui répond au navigateur.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { prisma } from "@/lib/database/prisma";

const ALGORITHME = "aes-256-gcm";

function cleChiffrement() {
  const cle = process.env.MIKROTIK_SECRET_KEY;
  if (!cle) throw new Error("MIKROTIK_SECRET_KEY manquant dans l'environnement");
  return Buffer.from(cle, "hex"); // clé de 32 octets, générée une fois pour l'infra
}

export function chiffrer(valeur: string): string {
  const iv = randomBytes(12);
  const chiffreur = createCipheriv(ALGORITHME, cleChiffrement(), iv);
  const chiffre = Buffer.concat([chiffreur.update(valeur, "utf8"), chiffreur.final()]);
  const tag = chiffreur.getAuthTag();
  return [iv.toString("hex"), chiffre.toString("hex"), tag.toString("hex")].join(":");
}

function dechiffrer(valeur: string): string {
  const [ivHex, chiffreHex, tagHex] = valeur.split(":");
  const dechiffreur = createDecipheriv(ALGORITHME, cleChiffrement(), Buffer.from(ivHex, "hex"));
  dechiffreur.setAuthTag(Buffer.from(tagHex, "hex"));
  const clair = Buffer.concat([
    dechiffreur.update(Buffer.from(chiffreHex, "hex")),
    dechiffreur.final(),
  ]);
  return clair.toString("utf8");
}

/** Identifiants en clair — usage serveur uniquement, ne jamais sérialiser dans une réponse API. */
export async function recupererIdentifiantsMikrotik(routeurId: string) {
  const secret = await prisma.routeurSecret.findUniqueOrThrow({ where: { routeurId } });
  return {
    utilisateur: secret.utilisateurApi,
    motDePasse: dechiffrer(secret.motDePasseChiffre),
  };
}
