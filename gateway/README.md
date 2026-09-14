# Passerelle MikroTik — pourquoi et comment

## Pourquoi ce service existe

L'app MikroAssist tourne sur Vercel, dans des fonctions **serverless
éphémères**. Une fonction serverless ne peut pas rester membre d'un tunnel
WireGuard en permanence — elle démarre, répond, s'arrête. Elle ne pourra donc
**jamais** atteindre directement l'IP VPN privée d'un routeur (`10.100.0.x`),
avec ou sans CHR, avec ou sans matériel physique.

Il faut donc un processus qui, lui, reste allumé en permanence et qui, lui,
peut être pair WireGuard du parc de routeurs. C'est ce que fait ce dossier
`gateway/` : un petit relais HTTP qu'on héberge sur une VPS bon marché (ou
gratuite), qui :

1. reste connecté en WireGuard à tous les routeurs (réels ou CHR de test),
2. expose une seule route HTTPS authentifiée (`POST /relais`),
3. relaie chaque appel vers l'IP VPN demandée.

Schéma :

```
Vercel (app Next.js)  --HTTPS-->  Passerelle (VPS, toujours allumée)  --WireGuard-->  Routeur (CHR ou physique)
```

## Option recommandée : Oracle Cloud "Always Free"

Gratuit **sans limite de temps** (contrairement à AWS/GCP qui sont gratuits
12 mois puis facturent), suffisant pour 2 VM et pour importer une image
disque personnalisée — ce qui permet d'y démarrer directement RouterOS CHR.

Compte : https://www.oracle.com/cloud/free/ (carte bancaire demandée pour
vérification d'identité, mais le palier "Always Free" n'est jamais facturé
tant qu'on reste dedans).

On crée **deux instances Always Free** :

- `passerelle` — VM.Standard.E2.1.Micro (AMD, 1 Go RAM) ou Ampere A1 —
  Ubuntu 22.04. C'est elle qui fait tourner `gateway/server.js`.
- `chr-test` — importe l'image disque RouterOS CHR à la place d'Ubuntu (voir
  plus bas). C'est le routeur de test.

## 1. Préparer la VM `passerelle`

```bash
sudo apt update && sudo apt install -y wireguard nodejs npm

# Clés WireGuard du serveur
wg genkey | sudo tee /etc/wireguard/privatekey | wg pubkey | sudo tee /etc/wireguard/publickey
```

`/etc/wireguard/wg0.conf` :

```ini
[Interface]
Address = 10.100.0.1/24
ListenPort = 51820
PrivateKey = <contenu de /etc/wireguard/privatekey>

# Un bloc [Peer] par routeur — CHR de test ou routeur physique plus tard.
[Peer]
PublicKey = <clé publique WireGuard du CHR, générée à l'étape 2>
AllowedIPs = 10.100.0.2/32
```

```bash
sudo systemctl enable --now wg-quick@wg0
```

Ouvrir dans la "Security List" / "Network Security Group" Oracle (équivalent
d'un firewall cloud) :
- UDP 51820 (WireGuard)
- TCP 443 (passerelle HTTPS — voir TLS plus bas)

## 2. Préparer `chr-test` (RouterOS CHR)

1. Télécharger l'image CHR (`.qcow2` ou `.vmdk` selon l'hyperviseur cible)
   sur https://mikrotik.com/download — c'est un système d'exploitation
   complet, gratuit en usage illimité mais bridé à 1 Mbit/s de débit WAN (sans
   incidence pour tester diagnostic/intervention).
2. Sur Oracle Cloud : *Compute → Custom Images → Import image*, format
   QCOW2, puis créer une instance à partir de cette image personnalisée au
   lieu d'Ubuntu.
3. Une fois démarré, se connecter en `admin` (pas de mot de passe par défaut)
   via la console série Oracle (pas besoin de VPN pour cette étape) et
   configurer WireGuard côté RouterOS :

```
/interface wireguard add name=wg0 listen-port=13231
/interface wireguard peer add interface=wg0 \
  public-key="<clé publique du serveur passerelle>" \
  endpoint-address=<IP publique de la VM passerelle> \
  endpoint-port=51820 allowed-address=10.100.0.1/32 persistent-keepalive=25s
/ip address add address=10.100.0.2/24 interface=wg0
```

Récupérer la clé publique générée côté CHR (`/interface wireguard print`) et
l'ajouter dans le `[Peer]` du `wg0.conf` de la passerelle (étape 1), puis
recharger : `sudo wg-quick down wg0 && sudo wg-quick up wg0`.

4. Activer l'API REST **uniquement sur l'interface WireGuard**, jamais sur
   l'interface publique :

```
/ip service disable api,api-ssl
/ip service set www-ssl address=10.100.0.0/24 disabled=no
```

(RouterOS 7 sert son API REST via `www-ssl` sous `/rest/...` — voir la
documentation MikroTik "HTTP API" pour la version exacte de votre CHR.)

5. Créer l'utilisateur API dédié utilisé par l'app (`utilisateurApi` /
   `motDePasseApi` du formulaire "Ajouter un routeur") :

```
/user add name=api-mikroassist group=full password=<mot de passe fort>
```

## 3. TLS pour la passerelle sans nom de domaine

Oracle donne une IP publique fixe à l'instance. Pour obtenir un certificat
Let's Encrypt valide sans acheter de domaine, on utilise un service de DNS
gratuit qui résout automatiquement `<ip>.sslip.io` vers cette IP (aucune
inscription requise) :

```bash
sudo apt install -y caddy
```

`/etc/caddy/Caddyfile` (remplacer l'IP) :

```
203-0-113-10.sslip.io {
  reverse_proxy localhost:8080
}
```

```bash
sudo systemctl restart caddy
```

Caddy obtient et renouvelle seul le certificat HTTPS. `MIKROTIK_GATEWAY_URL`
côté Vercel devient `https://203-0-113-10.sslip.io`.

## 4. Démarrer la passerelle

```bash
cd gateway
npm install
GATEWAY_SECRET=$(openssl rand -hex 32) RESEAU_VPN_CIDR=10.100.0.0/24 npm start
```

Notez le `GATEWAY_SECRET` généré — c'est la valeur à mettre dans
`MIKROTIK_GATEWAY_SECRET` sur Vercel (variables d'environnement du projet).

Pour la production, tourner en service permanent plutôt qu'au premier plan :

`/etc/systemd/system/mikroassist-gateway.service` :

```ini
[Unit]
Description=Passerelle MikroTik MikroAssist
After=network.target wg-quick@wg0.service

[Service]
WorkingDirectory=/home/ubuntu/mikroassist-gateway
Environment=GATEWAY_SECRET=<le secret généré ci-dessus>
Environment=RESEAU_VPN_CIDR=10.100.0.0/24
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now mikroassist-gateway
```

## 5. Vérifier bout en bout

Depuis la VM `passerelle` elle-même (teste WireGuard + API REST du CHR) :

```bash
curl -k -u api-mikroassist:<mot de passe> https://10.100.0.2/rest/system/resource
```

Depuis n'importe où (teste la passerelle publique) :

```bash
curl -X POST https://203-0-113-10.sslip.io/relais \
  -H "Authorization: Bearer <GATEWAY_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"ip":"10.100.0.2","chemin":"/system/resource","methode":"GET","identifiants":{"utilisateur":"api-mikroassist","motDePasse":"<mot de passe>"}}'
```

Si ça répond avec les infos système RouterOS : la chaîne complète
fonctionne. Il ne reste plus qu'à créer le routeur `chr-test` dans l'app
(`/routeurs/nouveau`) avec `ipVpn = 10.100.0.2`, définir
`MIKROTIK_GATEWAY_URL`/`MIKROTIK_GATEWAY_SECRET` sur Vercel, et lancer un
diagnostic depuis l'interface — première validation réelle du pipeline
diagnostic/intervention jamais faite sur ce projet.

## Notes

- Un routeur physique, plus tard, rejoint exactement le même `wg0.conf` de la
  passerelle (un `[Peer]` de plus) — rien à changer côté app ni côté
  passerelle.
- Ce service ne stocke aucun secret : il relaie ce que l'app lui envoie déjà
  déchiffré, dans la même requête HTTPS. Le confiner au réseau VPN (variable
  `RESEAU_VPN_CIDR`) empêche de s'en servir comme proxy HTTPS ouvert vers
  n'importe quelle IP.
