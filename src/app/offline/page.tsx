// src/app/offline/page.tsx
// Page de repli servie par le service worker (public/sw.js) quand une
// navigation échoue faute de réseau. Volontairement statique et légère :
// elle doit pouvoir être mise en cache telle quelle à l'installation du
// service worker, sans dépendre de Prisma ni d'une session valide — les
// données du parc (routeurs, tickets, diagnostics) ne sont jamais mises en
// cache, donc cette page ne peut rien afficher de plus qu'un message.

import Link from "next/link";
import { NetworkMotif } from "@/components/layout/network-motif";
import { ReessayerBouton } from "./reessayer-bouton";

export const metadata = {
  title: "Hors connexion — MikroAssist",
};

export default function PageHorsConnexion() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-6 text-ink">
      <NetworkMotif className="pointer-events-none absolute -right-16 top-10 h-40 w-[420px] text-border-strong opacity-40 md:h-48 md:w-[520px]" />

      <div className="relative max-w-sm space-y-4 text-center">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-critical" aria-hidden="true" />
        <h1 className="font-display text-xl font-semibold tracking-tight">Hors connexion</h1>
        <p className="text-sm text-ink-muted">
          MikroAssist a besoin du réseau pour diagnostiquer et intervenir sur le
          parc en temps réel — par sécurité, aucune donnée de routeur, ticket
          ou audit n'est jamais conservée hors ligne sur cet appareil.
        </p>
        <p className="text-sm text-ink-muted">
          Reconnectez-vous puis réessayez.
        </p>

        <div className="flex justify-center gap-3 pt-2">
          <ReessayerBouton />
          <Link
            href="/login"
            className="border border-border-strong px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
          >
            Écran de connexion
          </Link>
        </div>
      </div>
    </div>
  );
}

