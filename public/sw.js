// public/sw.js
// Service worker de MikroAssist — stratégie "network-first" partout où des
// données peuvent changer, avec repli hors-ligne. Volontairement PAS un
// cache générique de type "app shell offline complet" : cette appli affiche
// des données clients sensibles (tickets, routeurs, journal d'audit) et il
// n'existe pas encore de bouton de déconnexion qui purgerait le cache — on
// ne met donc JAMAIS en cache le HTML des pages authentifiées ni les
// réponses d'API. Ce qui est mis en cache est soit public (page de
// connexion, page hors-ligne), soit statique et versionné par le build
// (_next/static, icônes).
//
// Ordre des priorités :
//   1. Requêtes qui modifient l'état (tout sauf GET) → jamais interceptées,
//      toujours envoyées directement au réseau.
//   2. Assets statiques hashés (_next/static, /icons) → cache-first : leur
//      URL change à chaque build, donc les servir depuis le cache est sûr et
//      évite un aller-retour réseau inutile.
//   3. Navigations (documents HTML) → network-first ; seule /login est
//      persistée en cache pour un repli hors-ligne utile, tout le reste
//      retombe sur /offline si le réseau est indisponible.
//   4. Tout le reste (API, RSC payloads, etc.) → laissé passer nativement,
//      jamais de cache.

const VERSION = "v4";
const SHELL_CACHE = `mikroassist-shell-${VERSION}`;
const STATIC_CACHE = `mikroassist-static-${VERSION}`;
const CACHES_CONNUS = new Set([SHELL_CACHE, STATIC_CACHE]);

// Pages publiques (sans donnée client) qu'il est sûr de garder en cache
// pour un repli hors-ligne.
const ROUTES_PUBLIQUES_CACHEABLES = new Set(["/login"]);

const PRECACHE_URLS = [
  "/offline",
  "/login",
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
  const url = new URL(request.url);
  const cacheable = ROUTES_PUBLIQUES_CACHEABLES.has(url.pathname);

  try {
    const reponse = await fetch(request);
    if (cacheable && reponse.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, reponse.clone());
    }
    return reponse;
  } catch {
    if (cacheable) {
      const enCache = await caches.match(request);
      if (enCache) return enCache;
    }
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
