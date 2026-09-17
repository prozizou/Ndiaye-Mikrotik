// src/lib/mikrotik/secrets.ts
// Les identifiants API de chaque routeur sont chiffrés (AES-256-GCM) avant
// d'être écrits dans Firebase RTDB et déchiffrés uniquement ici, côté
// serveur. Fonctions pures, indépendantes du stockage — voir
// services/routeur.service.ts pour la lecture/écriture RTDB elle-même.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

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

/** Usage serveur uniquement — ne jamais sérialiser le résultat dans une réponse API. */
export function dechiffrer(valeur: string): string {
  const [ivHex, chiffreHex, tagHex] = valeur.split(":");
  const dechiffreur = createDecipheriv(ALGORITHME, cleChiffrement(), Buffer.from(ivHex, "hex"));
  dechiffreur.setAuthTag(Buffer.from(tagHex, "hex"));
  const clair = Buffer.concat([
    dechiffreur.update(Buffer.from(chiffreHex, "hex")),
    dechiffreur.final(),
  ]);
  return clair.toString("utf8");
}
