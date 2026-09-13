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

export function IconeAccueil({ className }: IconeProps) {
  return (
    <svg {...PROPS_COMMUNES} className={className} aria-hidden="true">
      <path d="M3 9.5L10 3.5L17 9.5" {...TRAIT} />
      <path d="M5 8.5V16.5H15V8.5" {...TRAIT} />
      <path d="M8 16.5V12H12V16.5" {...TRAIT} />
    </svg>
  );
}

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

export function IconeAssistance({ className }: IconeProps) {
  return (
    <svg {...PROPS_COMMUNES} className={className} aria-hidden="true">
      <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" {...TRAIT} />
      <path d="M6 8.5L8.5 10.5L6 12.5" {...TRAIT} />
      <path d="M10.5 12.5H13.5" {...TRAIT} />
    </svg>
  );
}

export function IconeTickets({ className }: IconeProps) {
  return (
    <svg {...PROPS_COMMUNES} className={className} aria-hidden="true">
      <path
        d="M3 7.5C3 6.12 4.12 5 5.5 5H14.5C15.88 5 17 6.12 17 7.5V8.2C16.06 8.2 15.3 8.96 15.3 9.9C15.3 10.84 16.06 11.6 17 11.6V12.5C17 13.88 15.88 15 14.5 15H5.5C4.12 15 3 13.88 3 12.5V11.6C3.94 11.6 4.7 10.84 4.7 9.9C4.7 8.96 3.94 8.2 3 8.2V7.5Z"
        {...TRAIT}
      />
      <path d="M8 5V15" {...TRAIT} strokeDasharray="1.6 1.8" />
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
