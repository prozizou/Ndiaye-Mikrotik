// src/components/pwa/pwa-client.tsx
// Monté une seule fois dans le layout racine. Regroupe tout ce qui touche au
// PWA côté navigateur : enregistrement du service worker (public/sw.js),
// bannière de mise à jour, et invite d'installation personnalisée (Chrome/
// Edge/Android via `beforeinstallprompt`, iOS Safari via une astuce
// manuelle puisque l'événement n'y existe pas).
//
// Reste silencieux si le navigateur ne supporte pas les service workers
// (aucune erreur, l'appli fonctionne normalement sans PWA).

"use client";

import { useEffect, useState } from "react";

const CLE_INSTALL_MASQUEE = "mikroassist:install-masque";

type EvenementInstallation = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function dejaInstallee(): boolean {
  if (typeof window === "undefined") return false;
  const standaloneIOS = (window.navigator as { standalone?: boolean }).standalone === true;
  return window.matchMedia("(display-mode: standalone)").matches || standaloneIOS;
}

function estIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function lireMasquage(): boolean {
  try {
    return localStorage.getItem(CLE_INSTALL_MASQUEE) === "1";
  } catch {
    return false; // stockage indisponible (navigation privée, etc.) → on affiche par défaut
  }
}

function memoriserMasquage() {
  try {
    localStorage.setItem(CLE_INSTALL_MASQUEE, "1");
  } catch {
    // pas grave si ça ne persiste pas — au pire l'invite réapparaît
  }
}

export function PwaClient() {
  const [miseAJourDisponible, setMiseAJourDisponible] = useState(false);
  const [worker, setWorker] = useState<ServiceWorker | null>(null);

  const [invite, setInvite] = useState<EvenementInstallation | null>(null);
  const [afficherHintIOS, setAfficherHintIOS] = useState(false);

  // --- Enregistrement du service worker + détection de mise à jour --------
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let annule = false;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const installation = registration.installing;
          if (!installation) return;
          installation.addEventListener("statechange", () => {
            // "installed" + un controller déjà actif = vraie mise à jour
            // (pas la toute première installation du service worker).
            if (installation.state === "installed" && navigator.serviceWorker.controller) {
              if (!annule) {
                setWorker(installation);
                setMiseAJourDisponible(true);
              }
            }
          });
        });
      })
      .catch((erreur) => console.warn("[pwa] échec d'enregistrement du service worker", erreur));

    let dejaRecharge = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (dejaRecharge) return;
      dejaRecharge = true;
      window.location.reload();
    });

    return () => {
      annule = true;
    };
  }, []);

  function appliquerMiseAJour() {
    worker?.postMessage("SKIP_WAITING");
    setMiseAJourDisponible(false);
  }

  // --- Invite d'installation ------------------------------------------------
  useEffect(() => {
    if (dejaInstallee() || lireMasquage()) return;

    function surInviteDisponible(e: Event) {
      e.preventDefault();
      setInvite(e as EvenementInstallation);
    }
    window.addEventListener("beforeinstallprompt", surInviteDisponible);

    // iOS Safari ne déclenche jamais beforeinstallprompt : on affiche une
    // astuce manuelle à la place, une seule fois par appareil.
    if (estIOS()) setAfficherHintIOS(true);

    return () => window.removeEventListener("beforeinstallprompt", surInviteDisponible);
  }, []);

  async function installer() {
    if (!invite) return;
    await invite.prompt();
    await invite.userChoice;
    setInvite(null);
  }

  function masquerInvite() {
    setInvite(null);
    setAfficherHintIOS(false);
    memoriserMasquage();
  }

  return (
    <>
      {miseAJourDisponible && (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 border-b border-border-strong bg-surface-raised px-4 py-2 text-sm text-ink shadow-lg">
          <span>Une nouvelle version de Ndiaye Mikrotik est disponible.</span>
          <button
            onClick={appliquerMiseAJour}
            className="border border-brand bg-brand/10 px-2.5 py-1 text-xs font-medium text-ink hover:bg-brand/20"
          >
            Actualiser
          </button>
        </div>
      )}

      {(invite || afficherHintIOS) && (
        <div className="fixed bottom-4 right-4 z-40 w-72 border border-border-strong bg-surface-raised p-3.5 text-sm text-ink shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <p className="font-display font-medium">Installer Ndiaye Mikrotik</p>
            <button
              onClick={masquerInvite}
              aria-label="Fermer"
              className="text-ink-faint hover:text-ink-muted"
            >
              ✕
            </button>
          </div>

          {invite ? (
            <>
              <p className="mt-1.5 text-xs text-ink-muted">
                Ajoutez l&apos;application à votre écran d&apos;accueil pour un accès rapide,
                même en mode fenêtré.
              </p>
              <button
                onClick={installer}
                className="mt-3 w-full border border-brand bg-brand/10 px-3 py-1.5 text-sm text-ink hover:bg-brand/20"
              >
                Installer
              </button>
            </>
          ) : (
            <p className="mt-1.5 text-xs text-ink-muted">
              Appuyez sur <span className="font-medium text-ink">Partager</span> puis{" "}
              <span className="font-medium text-ink">Sur l&apos;écran d&apos;accueil</span>{" "}
              pour installer l&apos;application.
            </p>
          )}
        </div>
      )}
    </>
  );
}
