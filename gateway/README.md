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

Deux façons de faire tourner ce processus permanent :

- **Oracle Cloud "Always Free"** (section suivante) — gratuit, toujours allumé,
  c'est l'option à viser pour un vrai déploiement (l'assistance doit marcher
  même quand personne n'a d'ordinateur allumé exprès pour ça).
- **Votre PC** (section "Option locale" plus bas) — zéro compte cloud à créer,
  idéal pour un premier test rapide, mais ne fonctionne que pendant que
  l'ordinateur reste allumé et connecté : à réserver à la validation du
  pipeline, pas à un usage en production.

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

## Option locale (test rapide, sans cloud) : Windows

Même schéma, sauf que la "VPS passerelle" est votre PC Windows, et que
l'exposition HTTPS publique passe par un tunnel gratuit (ngrok) plutôt que
par une IP publique fixe + Caddy. **Uniquement pour valider que le pipeline
diagnostic/intervention fonctionne** — dès que l'écran de veille ou une
coupure réseau arrive, l'assistance s'arrête. Pour un vrai déploiement,
revenir à l'option Oracle Cloud ci-dessus.

```
Vercel (app)  --HTTPS-->  ngrok (tunnel public)  --HTTPS-->  gateway (votre PC)  --WireGuard-->  CHR (VM VirtualBox)
```

### 1. Télécharger CHR

Sur https://mikrotik.com/download/chr : choisir le canal **Stable** (pas
"Development"), puis dans *INSTALL IMAGES* télécharger **OVA** — ce format
s'importe directement dans VirtualBox sans configuration manuelle. (Ne pas
télécharger "RouterOS" sous *SYSTEM PACKAGE* — c'est un `.npk`, un paquet de
mise à jour, pas une image de démarrage.)

### 2. Installer VirtualBox et importer CHR

1. Installer VirtualBox : https://www.virtualbox.org/wiki/Downloads
2. `Fichier → Importer un appareil virtuel` → sélectionner le `.ova`
   téléchargé → Suivant → Importer.
3. Une fois la VM créée, ouvrir ses réglages → **Réseau** → Carte 1 →
   `Mode d'accès réseau` = **Accès par pont (Bridged Adapter)**. Ainsi le CHR
   obtient une IP sur votre réseau local (comme n'importe quel appareil de la
   maison), directement joignable en WireGuard sans bidouille NAT.
4. Démarrer la VM.

### 3. Configurer WireGuard côté CHR

Dans la fenêtre VirtualBox (console série, pas besoin de réseau pour cette
étape), se connecter avec `admin` / (mot de passe vide) puis :

```
/interface wireguard add name=wg0 listen-port=13231
/ip address add address=10.100.0.2/24 interface=wg0
/interface wireguard print
```

Notez la clé publique affichée (`public-key=...`) — elle sera collée dans
l'app WireGuard Windows à l'étape suivante. On complète le `/interface
wireguard peer add` du CHR une fois qu'on a la clé publique et l'IP locale du
PC Windows (étape 4).

Puis, comme dans l'option Oracle, restreindre l'API à l'interface WireGuard
et créer l'utilisateur dédié :

```
/ip service disable api,api-ssl
/ip service set www-ssl address=10.100.0.0/24 disabled=no
/user add name=api-mikroassist group=full password=<mot de passe fort>
```

### 4. Installer WireGuard sur Windows

1. Télécharger et installer : https://www.wireguard.com/install/ (app
   officielle Windows).
2. `Ajouter un tunnel → Ajouter un tunnel vide` — une paire de clés est
   générée automatiquement et la clé publique s'affiche dans la fenêtre :
   copiez-la, c'est celle à mettre dans le `/interface wireguard peer add`
   du CHR (étape 3).
3. Trouver l'IP locale du PC (`ipconfig` dans une invite de commandes,
   ligne "Adresse IPv4" de la carte Wi-Fi/Ethernet active, ex.
   `192.168.1.50`).
4. Retourner dans la console CHR et ajouter le pair :

```
/interface wireguard peer add interface=wg0 \
  public-key="<clé publique WireGuard Windows>" \
  endpoint-address=192.168.1.50 endpoint-port=51820 \
  allowed-address=10.100.0.1/32 persistent-keepalive=25s
```

5. Dans l'app WireGuard Windows, remplacer le contenu du tunnel par :

```ini
[Interface]
PrivateKey = <déjà rempli automatiquement par l'app>
Address = 10.100.0.1/24
ListenPort = 51820

[Peer]
PublicKey = <clé publique du CHR, depuis /interface wireguard print>
AllowedIPs = 10.100.0.2/32
```

6. Cliquer **Activer** dans l'app. Le tunnel doit passer au vert.

### 5. Démarrer le gateway sur Windows

1. Installer Node.js LTS : https://nodejs.org
2. Récupérer le dossier `gateway/` (via `git clone` du dépôt, ou en copiant
   simplement les 3 fichiers `package.json`, `server.js`, `README.md`).
3. Dans une invite de commandes, dans ce dossier :

```powershell
npm install
set GATEWAY_SECRET=<sortie de : openssl rand -hex 32, ou n'importe quelle chaîne longue aléatoire>
set RESEAU_VPN_CIDR=10.100.0.0/24
npm start
```

Notez la valeur de `GATEWAY_SECRET` — c'est `MIKROTIK_GATEWAY_SECRET` côté
Vercel.

### 6. Exposer le gateway publiquement avec ngrok

1. Créer un compte gratuit sur https://ngrok.com et installer le client
   Windows.
2. `ngrok config add-authtoken <token affiché sur le dashboard ngrok>`
3. Dans le dashboard ngrok → *Domains*, réclamer un domaine statique gratuit
   (ex. `votre-nom.ngrok-free.app`) — reste stable entre les redémarrages,
   pas besoin de reconfigurer Vercel à chaque fois.
4. Lancer, dans une nouvelle invite de commandes (laisser tourner en
   parallèle du gateway) :

```powershell
ngrok http 8080 --domain=votre-nom.ngrok-free.app
```

`MIKROTIK_GATEWAY_URL` côté Vercel devient `https://votre-nom.ngrok-free.app`.

### 7. Vérifier bout en bout

Depuis le PC (teste WireGuard + API REST du CHR) :

```powershell
curl.exe -k -u api-mikroassist:<mot de passe> https://10.100.0.2/rest/system/resource
```

Depuis n'importe où (teste le tunnel ngrok public) :

```powershell
curl.exe -X POST https://votre-nom.ngrok-free.app/relais ^
  -H "Authorization: Bearer <GATEWAY_SECRET>" ^
  -H "Content-Type: application/json" ^
  -d "{\"ip\":\"10.100.0.2\",\"chemin\":\"/system/resource\",\"methode\":\"GET\",\"identifiants\":{\"utilisateur\":\"api-mikroassist\",\"motDePasse\":\"<mot de passe>\"}}"
```

Si ça répond avec les infos système RouterOS : la chaîne complète fonctionne.
Reste à créer le routeur `chr-test` dans l'app (`ipVpn = 10.100.0.2`),
définir `MIKROTIK_GATEWAY_URL`/`MIKROTIK_GATEWAY_SECRET` sur Vercel, et
lancer un diagnostic depuis l'interface.

## Notes

- Un routeur physique, plus tard, rejoint exactement le même `wg0.conf` de la
  passerelle (un `[Peer]` de plus) — rien à changer côté app ni côté
  passerelle.
- Ce service ne stocke aucun secret : il relaie ce que l'app lui envoie déjà
  déchiffré, dans la même requête HTTPS. Le confiner au réseau VPN (variable
  `RESEAU_VPN_CIDR`) empêche de s'en servir comme proxy HTTPS ouvert vers
  n'importe quelle IP.
