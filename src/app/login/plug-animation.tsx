// src/app/login/plug-animation.tsx
// Animation de succès : un câble qui se branche dans une prise murale,
// jouée une fois après une connexion réussie (voir login-flow.tsx) avant la
// redirection vers /routeurs. Dessin main (SVG), même langage que
// network-motif.tsx — aucune dépendance d'animation externe, les keyframes
// (animate-plug-*) sont définies dans globals.css.

export function PlugAnimation() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-7 px-8 py-10 sm:min-h-[560px]">
      <div className="relative flex h-28 w-full max-w-[280px] items-center justify-center">
        <svg viewBox="0 0 280 120" className="h-full w-full" aria-hidden="true">
          {/* Prise murale */}
          <g>
            <rect
              x="176"
              y="20"
              width="72"
              height="80"
              rx="14"
              fill="var(--color-surface-raised)"
              stroke="var(--color-border-strong)"
              strokeWidth="2"
            />
            <rect x="198" y="42" width="8" height="20" rx="3" fill="var(--color-ink-faint)" />
            <rect x="218" y="42" width="8" height="20" rx="3" fill="var(--color-ink-faint)" />
            <circle cx="212" cy="76" r="5" fill="none" stroke="var(--color-ink-faint)" strokeWidth="2" />
          </g>

          {/* Étincelle de contact */}
          <circle
            cx="188"
            cy="60"
            r="16"
            fill="var(--color-brand)"
            className="animate-plug-spark"
            style={{ transformOrigin: "188px 60px" }}
          />

          {/* Câble + fiche */}
          <g className="animate-plug-in" style={{ transformOrigin: "190px 60px" }}>
            <path
              d="M0 60 C 50 60, 70 20, 120 24"
              fill="none"
              stroke="var(--color-brand-strong)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <rect x="118" y="42" width="40" height="36" rx="8" fill="var(--color-brand)" />
            <rect x="150" y="52" width="10" height="6" rx="2" fill="var(--color-surface)" />
            <rect x="150" y="64" width="10" height="6" rx="2" fill="var(--color-surface)" />
          </g>
        </svg>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 animate-plug-check items-center justify-center rounded-full bg-signal/15">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-signal" fill="none" aria-hidden="true">
            <path
              d="M5 12.5 10 17 19 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="font-display text-lg font-semibold tracking-tight text-ink">Connexion réussie</p>
        <p className="text-sm text-ink-muted">Accès au parc en cours…</p>
      </div>
    </div>
  );
}
