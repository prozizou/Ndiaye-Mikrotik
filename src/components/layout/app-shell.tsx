// src/components/layout/app-shell.tsx
// Navigation à 5 entrées (Accueil / Routeurs / Assistance / Tickets / Plus) —
// barre inférieure fixe sur mobile (pattern natif, plus découvrable qu'un
// menu hamburger), barre latérale sur desktop. Les deux lisent la même
// liste NAVIGATION pour ne jamais diverger.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconeAccueil,
  IconeAssistance,
  IconePlus,
  IconeRouteurs,
  IconeTickets,
} from "./nav-icons";

const NAVIGATION = [
  { href: "/dashboard", label: "Accueil", Icone: IconeAccueil },
  { href: "/routeurs", label: "Routeurs", Icone: IconeRouteurs },
  { href: "/assistance", label: "Assistance", Icone: IconeAssistance },
  { href: "/tickets", label: "Tickets", Icone: IconeTickets },
  { href: "/plus", label: "Plus", Icone: IconePlus },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Topbar — mobile uniquement, marque seule : la navigation vit dans
          la barre inférieure, plus aucun menu à ouvrir. */}
      <header className="flex items-center border-b border-border/70 px-4 py-3 md:hidden">
        <span className="font-display text-[15px] font-semibold tracking-tight">MikroAssist</span>
      </header>

      <div className="md:flex">
        <aside className="hidden border-border/70 bg-surface md:sticky md:top-0 md:block md:h-screen md:w-60 md:shrink-0 md:border-r">
          <div className="px-5 py-6">
            <span className="font-display text-[17px] font-semibold tracking-tight">
              MikroAssist
            </span>
          </div>

          <nav className="space-y-0.5 px-3 py-3">
            {NAVIGATION.map(({ href, label, Icone }) => {
              const actif = pathname?.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2.5 border-l-2 px-3 py-2 text-sm transition-colors ${
                    actif
                      ? "border-brand text-ink"
                      : "border-transparent text-ink-muted hover:text-ink"
                  }`}
                >
                  <Icone className="h-[18px] w-[18px] shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
      </div>

      {/* Barre de navigation inférieure — mobile uniquement */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border/70 bg-surface md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAVIGATION.map(({ href, label, Icone }) => {
          const actif = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${
                actif ? "text-brand-strong" : "text-ink-faint"
              }`}
            >
              <Icone className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
