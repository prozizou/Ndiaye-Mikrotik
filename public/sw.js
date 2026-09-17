// public/sw.js
// Service worker de Ndiaye Mikrotik — stratégie "network-first" partout où des
// données peuvent changer, avec repli hors-ligne. Volontairement PAS un
// cache générique de type "app shell offline complet" : cette appli affiche
// des données de routeurs (potentiellement sensibles) — on ne met donc
// JAMAIS en cache le HTML des pages de l'app ni les réponses d'API. Ce qui
// est mis en cache est soit statique et versionné par le build (_next/
// static, icônes), soit la page /offline elle-même.
//
// Aucune page "publique" à précacher pour l'instant : pas d'authentification
// (retirée volontairement, voir historique git), donc pas d'écran de
// connexion distinct des pages qui montrent des données.
//
// Ordre des priorités :
//   1. Requêtes qui modifient l'état (tout sauf GET) → jamais interceptées,
//      toujours envoyées directement au réseau.
//   2. Assets statiques hashés (_next/static, /icons) → cache-first : leur
//      URL change à chaque build, donc les servir depuis le cache est sûr et
//      évite un aller-retour réseau inutile.
//   3. Navigations (documents HTML) → network-first ; retombe sur /offline
//      si le réseau est indisponible.
//   4. Tout le reste (API, RSC payloads, etc.) → laissé passer nativement,
//      jamais de cache.

const VERSION = "v9";
const SHELL_CACHE = `mikroassist-shell-${VERSION}`;
const STATIC_CACHE = `mikroassist-static-${VERSION}`;
const CACHES_CONNUS = new Set([SHELL_CACHE, STATIC_CACHE]);

const PRECACHE_URLS = [
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/favicon-32.png",
  "/icons/favicon-16.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // addAll échouerait entièrement si une seule URL est en erreur (ex:
      // réseau capricieux pendant le déploiement) — on préfère un
      // précache best-effort, url par url.
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((erreur) => console.warn("[sw] précache échouée pour", url, erreur)),
        ),
      );
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const noms = await caches.keys();
      await Promise.all(
        noms.filter((nom) => !CACHES_CONNUS.has(nom)).map((nom) => caches.delete(nom)),
      );
      await self.clients.claim();
    })(),
  );
});

// Permet à la page de déclencher l'activation immédiate du nouveau service
// worker (bannière "nouvelle version disponible" → clic → reload). Voir
// src/components/pwa/pwa-client.tsx.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function estAssetStatique(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  );
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const enCache = await cache.match(request);
  if (enCache) return enCache;

  try {
    const reponse = await fetch(request);
    if (reponse.ok) cache.put(request, reponse.clone());
    return reponse;
  } catch (erreur) {
    if (enCache) return enCache;
    throw erreur;
  }
}

async function networkFirstNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    const repli = await caches.match("/offline");
    return repli ?? Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // jamais intercepter les mutations

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // pas de cross-origin (Firebase, etc.)

  if (estAssetStatique(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // API, RSC payloads (?_rsc=...), etc. : réseau natif, sans interception —
  // ces réponses peuvent porter des données sensibles et ne doivent jamais
  // être mises en cache.
});
