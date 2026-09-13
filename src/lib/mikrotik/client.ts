// src/lib/mikrotik/client.ts
// Appelle l'API REST de RouterOS 7 exclusivement via l'IP VPN du routeur —
// jamais via une IP publique. Usage serveur uniquement (Node runtime).

import { Agent } from "undici";

export class ErreurMikrotik extends Error {}

type OptionsRequeteMikrotik = {
  methode?: "GET" | "POST" | "PUT" | "DELETE";
  corps?: unknown;
  timeoutMs?: number;
};

// RouterOS présente un certificat auto-signé par défaut. Le trafic est de
// toute façon confiné au tunnel WireGuard, mais idéalement on distribue une
// CA interne aux routeurs et on retire ce contournement.
const agentAutoSigne = new Agent({ connect: { rejectUnauthorized: false } });

export async function appelerMikrotik(
  ipVpn: string,
  chemin: string,
  identifiants: { utilisateur: string; motDePasse: string },
  options: OptionsRequeteMikrotik = {},
) {
  const { methode = "GET", corps, timeoutMs = 8000 } = options;

  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), timeoutMs);

  try {
    const reponse = await fetch(`https://${ipVpn}/rest${chemin}`, {
      method: methode,
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${identifiants.utilisateur}:${identifiants.motDePasse}`).toString("base64"),
        "Content-Type": "application/json",
      },
      body: corps ? JSON.stringify(corps) : undefined,
      signal: controleur.signal,
      // @ts-expect-error -- option undici, non présente dans le type RequestInit standard
      dispatcher: agentAutoSigne,
    });

    if (!reponse.ok) {
      throw new ErreurMikrotik(`RouterOS a répondu ${reponse.status} sur ${chemin}`);
    }

    return await reponse.json();
  } finally {
    clearTimeout(minuteur);
  }
}
