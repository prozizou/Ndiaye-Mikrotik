# Analyse — Faiblesses et améliorations

Revue du code de la plateforme (Next.js 14 / Prisma / PostgreSQL / Firebase Auth
/ API REST RouterOS). Le socle est propre : les points sensibles (secrets
chiffrés, séparation Firebase/Postgres pour les rôles, audit systématique,
TLS auto-signé confiné au VPN) sont déjà identifiés et commentés dans le code.
Cette revue liste ce qui reste à traiter, du plus important au plus
cosmétique.

## 1. Manques fonctionnels bloquants

- **Aucune déconnexion possible depuis l'interface.**
  `DELETE /api/auth/session` existe (`src/app/api/auth/session/route.ts:42`)
  mais rien dans l'UI ne l'appelle — ni `AppShell`
  (`src/components/layout/app-shell.tsx`) ni aucune page. Un utilisateur ne
  peut pas se déconnecter tant que le cookie de session (5 jours) n'expire pas.
- **Le tableau de bord est une maquette statique, pas une page connectée.**
  `src/app/(app)/dashboard/page.tsx` définit `ROUTEURS`, `ALERTES`, `TICKETS`
  et les taux de disponibilité en dur (tableaux `const` en tête de fichier) au
  lieu d'interroger Prisma. Conséquence directe : c'est la première page vue
  après connexion, et elle affiche des données inventées comme si elles
  étaient réelles. C'est aussi la seule page du groupe `(app)` qui n'appelle
  **pas** `utilisateurConnecte()` — elle rend donc son contenu (certes factice
  pour l'instant) pour n'importe quelle requête portant un cookie nommé
  `session`, même invalide, tant que le middleware edge laisse passer.

## 2. Sécurité / contrôle d'accès

- **Aucune validation de schéma sur les entrées utilisateur.** Ni `zod` ni
  équivalent n'est utilisé. Les server actions et routes API font des
  `String(formData.get(...))` / `await request.json()` puis passent
  directement les valeurs à Prisma :
  - `creerRouteur` (`src/app/(app)/routeurs/nouveau/actions.ts:19`) n'valide ni
    le format de `ipVpn`, ni celui de `clePubliqueWg`, ni que `siteId` existe.
  - `creerTicket` / `creerTicketAction` n'valident pas que `categorie` est une
    valeur de l'enum `CategorieTicket` ni que `sujet` est non vide.
  - Une valeur malformée remonte comme une exception Prisma non interceptée
    → 500 générique, sans message utilisable pour l'utilisateur.
  Recommandation : un schéma `zod` par endpoint/server action, validé avant
  tout accès à `prisma`.
- **Pas de limitation de débit (rate limiting).** Ni sur
  `/api/auth/session` (bruteforce de mot de passe côté Firebase reste
  possible à un rythme non contrôlé par l'appli), ni sur les interventions
  sensibles (`/api/routeurs/[id]/interventions` — un compte TECHNICIEN
  compromis ou un script buggé côté client peut spammer des redémarrages de
  routeurs en boucle). Le `confirmation: true` envoyé par le bouton
  (`src/app/(app)/routeurs/[id]/boutons-intervention.tsx:30`) est une
  confirmation UI, pas une protection serveur contre la répétition.
- **`TECHNICIEN` peut agir sur n'importe quel routeur/ticket, sans notion de
  périmètre.** `exigerRole("...","TECHNICIEN")` (utilisé dans
  `src/app/api/routeurs/[id]/diagnostic/route.ts`,
  `.../interventions/route.ts`, `.../tickets/[id]/statut/route.ts`) ne vérifie
  jamais que le technicien est bien celui assigné au ticket, ni qu'il a un
  lien avec le client concerné. C'est peut-être un choix produit assumé
  (équipe technique mutualisée), mais ce n'est documenté nulle part comme tel
  — à trancher explicitement et, si volontaire, à commenter comme les autres
  décisions de sécurité du repo.
- **TLS auto-signé accepté globalement** (`rejectUnauthorized: false` dans
  `src/lib/mikrotik/client.ts:18`) — déjà noté dans le code comme un
  compromis temporaire. À planifier : CA interne distribuée aux routeurs +
  suppression du contournement, avant la sortie du stade MVP.

## 3. Robustesse / gestion d'erreurs

- **`findUniqueOrThrow` utilisé sans distinction 404 vs 500.**
  `diagnostic.service.ts:77`, `intervention.service.ts:41/69`,
  `secrets.ts:38`, `ticket.service.ts:54/79` : si le routeur, le ticket ou le
  secret associé n'existe pas (ID invalide, ligne supprimée entre-temps), ces
  fonctions lèvent, et les routes API attrapantes (ex:
  `diagnostic/route.ts:24`) renvoient un 500 générique ("Échec du
  diagnostic") au lieu d'un 404 explicite.
- **Le heuristique de succès du ping est implicite et non documenté.**
  `pingDepuisRouteur` (`src/services/diagnostic.service.ts:39`) déduit un
  succès de l'absence du champ `status` dans chaque paquet retourné par
  `/ping` de RouterOS. C'est probablement correct (RouterOS marque les pertes
  avec `status: "timeout"`), mais rien ne le vérifie contre une vraie
  instance, et un changement de format de réponse entre versions RouterOS
  romprait silencieusement le diagnostic (faux "ok"). Vaut la peine d'ajouter
  un test d'intégration contre un routeur de test, ou au moins un commentaire
  sourcé.
- **Numérotation des tickets par `count()`** (`ticket.service.ts:23-26`) :
  déjà signalé dans le commentaire du fichier comme un point à revoir avec
  une séquence Postgres dédiée si la concurrence pose problème — à faire
  avant la mise en prod si plusieurs créations de tickets simultanées sont
  probables (deux tickets peuvent recevoir le même numéro `T-000N`).

## 4. Qualité / maintenabilité

- **Aucun test automatisé.** Pas de framework de test dans `package.json`
  (pas de `jest`/`vitest`), aucun fichier `*.test.*`/`*.spec.*`. Pour une
  application qui déclenche des actions physiques sur des routeurs en
  production (redémarrage, sauvegarde), l'absence totale de tests — même
  seulement sur `permissions.ts`, `ticket.service.ts` (transitions de statut)
  et `secrets.ts` (chiffrement/déchiffrement) — est le risque le plus
  structurel du projet.
- **Aucune CI.** Pas de dossier `.github/workflows` : ni lint, ni
  `tsc --noEmit`, ni build ne sont vérifiés automatiquement avant merge.
- **Incohérences de chemins dans les commentaires d'en-tête.** Plusieurs
  fichiers commentent un chemin qui ne correspond plus à leur emplacement
  réel après le passage sous le groupe de routes `(app)/` (ex:
  `src/app/(app)/routeurs/[id]/bouton-diagnostic.tsx:1` commente
  `// src/app/routeurs/[id]/bouton-diagnostic.tsx`, idem pour
  `boutons-intervention.tsx`, `routeurs/nouveau/actions.ts`,
  `routeurs/[id]/page.tsx`, `tickets/[id]/page.tsx`,
  `tickets/[id]/workflow-ticket.tsx`, `tickets/nouveau/actions.ts`,
  `tickets/page.tsx`, `routeurs/page.tsx`, `audit/page.tsx`). Cosmétique,
  mais induit en erreur quiconque cherche un fichier par son commentaire.
- **Duplication du bloc try/catch de contrôle d'accès.** Le motif
  ```ts
  try {
    await exigerRole(...);
  } catch (erreur) {
    if (erreur instanceof ErreurAcces) {
      return NextResponse.json({ erreur: erreur.message }, { status: 403 });
    }
    throw erreur;
  }
  ```
  est répété à l'identique dans 6 routes API. Un petit wrapper
  (`avecRole(roles, handler)` ou middleware Next) l'éliminerait et
  réduirait le risque d'oubli sur une future route.
- **`README.md` réduit à une ligne** (`# Ndiaye-Mikrotik`). Pour un projet
  avec autant de décisions d'architecture déjà documentées en commentaires
  (VPN-only, edge middleware limité, chiffrement des secrets), un README qui
  reprend ces points, plus la procédure de setup (`.env`, `prisma db seed`,
  `prisma migrate`), ferait gagner du temps à quiconque reprend le projet.
  Il n'y a pas non plus de fichier de migration Prisma commité
  (`prisma/migrations/` absent) — seul le `schema.prisma` existe, donc
  l'historique des migrations n'est pas reconstituable.

## 5. UX / fonctionnel (mineur)

- **Les transitions arrière de ticket existent côté service mais pas côté
  UI.** `TRANSITIONS_AUTORISEES` (`ticket.service.ts:9-16`) autorise
  `DIAGNOSTIC → ASSIGNE`, `INTERVENTION → DIAGNOSTIC`,
  `RESOLU → INTERVENTION`, mais `WorkflowTicket`
  (`workflow-ticket.tsx:9-15`) n'propose que le statut suivant
  (`PROCHAIN_STATUT`). Un technicien qui s'est trompé d'étape ne peut pas
  revenir en arrière depuis l'interface, alors que le backend le permettrait.
- **Pas de pagination** sur `/tickets`, `/routeurs`, `/audit` (`take: 100`
  fixe sur l'audit, aucune limite sur tickets/routeurs). Non bloquant tant
  que le parc reste petit, mais à prévoir avant la montée en charge.

## Priorisation suggérée

| Priorité | Action |
|---|---|
| Haute | Ajouter un bouton de déconnexion (appel à `DELETE /api/auth/session`) |
| Haute | Brancher le tableau de bord sur Prisma (ou marquer clairement "démo" tant que ce n'est pas fait) et lui appliquer `utilisateurConnecte()` |
| Haute | Introduire une validation de schéma (`zod`) sur toutes les entrées serveur |
| Haute | Ajouter des tests sur `permissions.ts`, `ticket.service.ts` (transitions), `secrets.ts` (chiffrement) |
| Moyenne | Rate limiting sur `/api/auth/session` et les interventions dangereuses |
| Moyenne | CI minimale (lint + `tsc --noEmit` + build) |
| Moyenne | Remplacer `findUniqueOrThrow` par une gestion 404 explicite dans les routes API |
| Basse | Wrapper commun pour le contrôle de rôle dans les routes API |
| Basse | Corriger les chemins dans les commentaires d'en-tête, étoffer le README |
| Basse | Boutons de transition arrière sur le ticket, pagination des listes |
