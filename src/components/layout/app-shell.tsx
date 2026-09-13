// src/components/layout/app-shell.tsx

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAVIGATION = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/routeurs", label: "Routeurs" },
  { href: "/tickets", label: "Tickets" },
  { href: "/audit", label: "Journal d'audit" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ouvert, setOuvert] = useState(false);

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Topbar — mobile uniquement */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
        <span className="font-display text-[15px] font-semibold tracking-tight">MikroAssist</span>
        <button onClick={() => setOuvert(!ouvert)} className="text-ink-muted" aria-label="Ouvrir le menu">
          <IconeMenu ouvert={ouvert} />
        </button>
      </header>

      <div className="md:flex">
        <aside
          className={`border-border bg-surface md:sticky md:top-0 md:block md:h-screen md:w-60 md:shrink-0 md:border-r ${
            ouvert ? "block" : "hidden"
          }`}
        >
          <div className="hidden px-5 py-6 md:block">
            <span className="font-display text-[17px] font-semibold tracking-tight">
              MikroAssist
            </span>
          </div>

          <nav className="space-y-0.5 px-3 py-3">
            {NAVIGATION.map((item) => {
              const actif = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOuvert(false)}
                  className={`block border-l-2 px-3 py-2 text-sm transition-colors ${
                    actif
                      ? "border-brand text-ink"
                      : "border-transparent text-ink-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function IconeMenu({ ouvert }: { ouvert: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      {ouvert ? (
        <path d="M5 5L17 17M17 5L5 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      ) : (
        <path d="M4 6H18M4 11H18M4 16H18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      )}
    </svg>
  );
}
