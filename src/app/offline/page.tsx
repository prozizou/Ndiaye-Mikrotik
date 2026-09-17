// src/app/offline/page.tsx
// Page de repli servie par le service worker (public/sw.js) quand une
// navigation échoue faute de réseau. Volontairement statique et légère :
// elle doit pouvoir être mise en cache telle quelle à l'installation du
// service worker, sans dépendre de Firebase RTDB ni d'une session valide — les
// données du parc (routeurs, identifiants) ne sont jamais mises en cache,
// donc cette page ne peut rien afficher de plus qu'un message.

import { NetworkMotif } from "@/components/layout/network-motif";
import { ReessayerBouton } from "./reessayer-bouton";

export const metadata = {
  title: "Hors connexion — Ndiaye Mikrotik",
};

export default function PageHorsConnexion() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-6 text-ink">
      <NetworkMotif className="pointer-events-none absolute -right-16 top-10 h-40 w-[420px] text-border-strong opacity-40 md:h-48 md:w-[520px]" />

      <div className="relative max-w-sm space-y-4 text-center">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-critical" aria-hidden="true" />
        <h1 className="font-display text-xl font-semibold tracking-tight">Hors connexion</h1>
        <p className="text-sm text-ink-muted">
          Ndiaye Mikrotik a besoin du réseau pour accéder au parc en temps réel — par
          sécurité, aucune donnée de routeur n'est jamais conservée hors ligne sur cet
          appareil.
        </p>
        <p className="text-sm text-ink-muted">
          Reconnectez-vous puis réessayez.
        </p>

        <div className="flex justify-center gap-3 pt-2">
          <ReessayerBouton />
        </div>
      </div>
    </div>
  );
}

