// src/components/layout/nav-icons.tsx
// Pictogrammes de la navigation principale — même langage que le motif
// réseau : traits fins, currentColor, aucun remplissage plein sauf le point
// de signal. Un seul jeu de tracés, utilisé à la fois dans la barre
// inférieure (mobile) et la barre latérale (desktop).

type IconeProps = { className?: string };

const PROPS_COMMUNES = {
  width: 20,
  height: 20,
  viewBox: "0 0 20 20",
  fill: "none",
} as const;

const TRAIT = {
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function IconeRouteurs({ className }: IconeProps) {
  return (
    <svg {...PROPS_COMMUNES} className={className} aria-hidden="true">
      <rect x="3" y="4" width="14" height="5" rx="1.2" {...TRAIT} />
      <rect x="3" y="11" width="14" height="5" rx="1.2" {...TRAIT} />
      <circle cx="6.2" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="6.2" cy="13.5" r="0.9" fill="currentColor" stroke="none" />
      <path d="M9.5 6.5H13.5M9.5 13.5H13.5" {...TRAIT} />
    </svg>
  );
}

export function IconePlus({ className }: IconeProps) {
  return (
    <svg {...PROPS_COMMUNES} className={className} aria-hidden="true">
      <rect x="3.5" y="3.5" width="5" height="5" rx="1" {...TRAIT} />
      <rect x="11.5" y="3.5" width="5" height="5" rx="1" {...TRAIT} />
      <rect x="3.5" y="11.5" width="5" height="5" rx="1" {...TRAIT} />
      <rect x="11.5" y="11.5" width="5" height="5" rx="1" {...TRAIT} />
    </svg>
  );
}
