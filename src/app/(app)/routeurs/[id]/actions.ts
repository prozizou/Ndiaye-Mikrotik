// src/app/(app)/routeurs/[id]/actions.ts
// Premier appel réel vers un routeur : relaie /system/resource via la
// passerelle (voir gateway/README.md et src/lib/mikrotik/client.ts). Ne
// renvoie jamais le mot de passe déchiffré au navigateur — seulement un
// résumé de ce que RouterOS a répondu, ou un message d'erreur.

"use server";

import { obtenirRouteur, recupererIdentifiantsMikrotik } from "@/services/routeur.service";
import { appelerMikrotik, ErreurMikrotik } from "@/lib/mikrotik/client";
import { exigerUtilisateur } from "@/lib/auth/session";

export type ResultatTestConnexion =
  | { ok: true; identite: string; version: string; tempsActivite: string }
  | { ok: false; erreur: string };

export async function testerConnexion(routeurId: string): Promise<ResultatTestConnexion> {
  await exigerUtilisateur();

  const routeur = await obtenirRouteur(routeurId);
  if (!routeur) return { ok: false, erreur: "Routeur introuvable." };

  try {
    const identifiants = await recupererIdentifiantsMikrotik(routeurId);
    const donnees = (await appelerMikrotik(routeur.ipVpn, "/system/resource", identifiants)) as Record<
      string,
      unknown
    > | null;

    return {
      ok: true,
      identite: String(donnees?.["board-name"] ?? "Routeur MikroTik"),
      version: String(donnees?.version ?? "?"),
      tempsActivite: String(donnees?.uptime ?? "?"),
    };
  } catch (err) {
    const message = err instanceof ErreurMikrotik ? err.message : "Connexion impossible pour le moment.";
    return { ok: false, erreur: message };
  }
}
