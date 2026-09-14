// src/lib/mikrotik/client.ts
// Appelle l'API REST de RouterOS 7 exclusivement via l'IP VPN du routeur —
// jamais via une IP publique. Usage serveur uniquement (Node runtime).
//
// Cette app tourne sur Vercel, dans des fonctions serverless éphémères :
// elles ne peuvent pas rester membres d'un tunnel WireGuard en permanence,
// donc elles ne peuvent JAMAIS atteindre directement l'IP VPN privée d'un
// routeur, quel que soit le code écrit ici. Tout passe donc par une petite
// passerelle toujours allumée (voir gateway/README.md) : elle, c'est un
// processus permanent sur une VPS, pair WireGuard du parc, qu'on appelle ici
// en HTTPS normal. Elle relaie ensuite l'appel REST vers le routeur visé.

export class ErreurMikrotik extends Error {}

type OptionsRequeteMikrotik = {
  methode?: "GET" | "POST" | "PUT" | "DELETE";
  corps?: unknown;
  timeoutMs?: number;
};

export async function appelerMikrotik(
  ipVpn: string,
  chemin: string,
  identifiants: { utilisateur: string; motDePasse: string },
  options: OptionsRequeteMikrotik = {},
) {
  const { methode = "GET", corps, timeoutMs = 8000 } = options;

  const urlPasserelle = process.env.MIKROTIK_GATEWAY_URL;
  const secretPasserelle = process.env.MIKROTIK_GATEWAY_SECRET;
  if (!urlPasserelle || !secretPasserelle) {
    throw new ErreurMikrotik(
      "MIKROTIK_GATEWAY_URL / MIKROTIK_GATEWAY_SECRET non configurés — voir gateway/README.md",
    );
  }

  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), timeoutMs);

  try {
    const reponse = await fetch(`${urlPasserelle.replace(/\/$/, "")}/relais`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretPasserelle}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ip: ipVpn, chemin, methode, corps, identifiants }),
      signal: controleur.signal,
    });

    const donnees = await reponse.json().catch(() => null);

    if (!reponse.ok) {
      const details =
        donnees && typeof donnees === "object" && "erreur" in donnees
          ? String((donnees as { erreur: unknown }).erreur)
          : `HTTP ${reponse.status}`;
      throw new ErreurMikrotik(`Passerelle/RouterOS en erreur sur ${chemin} : ${details}`);
    }

    return donnees;
  } finally {
    clearTimeout(minuteur);
  }
}
