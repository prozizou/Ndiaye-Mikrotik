// gateway/server.js
// Relais HTTPS <-> WireGuard. Tourne en permanence sur une VPS qui est
// elle-même pair WireGuard du parc de routeurs (voir README.md). L'app
// Next.js (sur Vercel, fonctions serverless éphémères, jamais membres d'un
// tunnel WireGuard) appelle ce service en HTTPS normal ; ce service relaie
// ensuite l'appel vers l'IP VPN interne du routeur visé.
//
// Ce service ne stocke aucun identifiant routeur : il ne fait que relayer ce
// que l'app lui envoie (déjà déchiffré côté app, via lib/mikrotik/secrets.ts)
// vers l'IP demandée, à condition qu'elle appartienne au réseau VPN autorisé.

const express = require("express");
const { Agent, fetch: undiciFetch } = require("undici");

const PORT = process.env.PORT || 8080;
const SECRET = process.env.GATEWAY_SECRET;
const RESEAU_VPN_CIDR = process.env.RESEAU_VPN_CIDR || "10.100.0.0/24";

if (!SECRET) {
  console.error("GATEWAY_SECRET manquant dans l'environnement — arrêt.");
  process.exit(1);
}

// RouterOS présente un certificat auto-signé par défaut. Le trafic est de
// toute façon confiné au tunnel WireGuard depuis cette machine — même
// compromis que documenté côté app (src/lib/mikrotik/client.ts).
const agentAutoSigne = new Agent({ connect: { rejectUnauthorized: false } });

function ipVersEntier(ip) {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function ipDansReseau(ip, cidr) {
  const [base, bits] = cidr.split("/");
  const masque = bits === "32" ? 0xffffffff : ~((1 << (32 - Number(bits))) - 1) >>> 0;
  return (ipVersEntier(ip) & masque) === (ipVersEntier(base) & masque);
}

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/sante", (_req, res) => res.json({ ok: true }));

app.post("/relais", async (req, res) => {
  if (req.headers.authorization !== `Bearer ${SECRET}`) {
    return res.status(401).json({ erreur: "Non autorisé" });
  }

  const { ip, chemin, methode, corps, identifiants } = req.body || {};
  if (
    typeof ip !== "string" ||
    typeof chemin !== "string" ||
    !identifiants ||
    typeof identifiants.utilisateur !== "string"
  ) {
    return res.status(400).json({ erreur: "Requête invalide" });
  }
  if (!ipDansReseau(ip, RESEAU_VPN_CIDR)) {
    return res.status(400).json({ erreur: `IP hors du réseau VPN autorisé (${RESEAU_VPN_CIDR})` });
  }

  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), 8000);

  try {
    const reponse = await undiciFetch(`https://${ip}/rest${chemin}`, {
      method: methode || "GET",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${identifiants.utilisateur}:${identifiants.motDePasse || ""}`).toString(
            "base64",
          ),
        "Content-Type": "application/json",
      },
      body: corps !== undefined ? JSON.stringify(corps) : undefined,
      signal: controleur.signal,
      dispatcher: agentAutoSigne,
    });

    const texte = await reponse.text();
    res.status(reponse.ok ? 200 : 502);
    res.type("application/json").send(texte.length > 0 ? texte : "null");
  } catch (erreur) {
    res.status(504).json({ erreur: erreur instanceof Error ? erreur.message : "Erreur inconnue" });
  } finally {
    clearTimeout(minuteur);
  }
});

app.listen(PORT, () => {
  console.log(`Passerelle MikroTik en écoute sur :${PORT} (réseau VPN autorisé : ${RESEAU_VPN_CIDR})`);
});
