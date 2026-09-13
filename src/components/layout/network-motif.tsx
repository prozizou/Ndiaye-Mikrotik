// src/components/layout/network-motif.tsx
// Filigrane décoratif évoquant une topologie réseau (nœuds/liens) — c'est
// l'unique élément "signature" du design, tout le reste reste sobre.
// Purement décoratif : aria-hidden, aucune information portée.

export function NetworkMotif({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 480 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="currentColor" strokeWidth="1">
        <line x1="40" y1="40" x2="140" y2="30" />
        <line x1="140" y1="30" x2="230" y2="70" />
        <line x1="230" y1="70" x2="340" y2="40" />
        <line x1="230" y1="70" x2="260" y2="140" />
        <line x1="340" y1="40" x2="430" y2="60" />
        <line x1="340" y1="40" x2="400" y2="120" />
        <line x1="140" y1="30" x2="90" y2="110" />
      </g>
      <g fill="currentColor">
        <circle cx="40" cy="40" r="3.5" />
        <circle cx="140" cy="30" r="3.5" />
        <circle cx="230" cy="70" r="4.5" />
        <circle cx="340" cy="40" r="3.5" />
        <circle cx="430" cy="60" r="3.5" />
        <circle cx="260" cy="140" r="3.5" />
        <circle cx="400" cy="120" r="3.5" />
        <circle cx="90" cy="110" r="3.5" />
      </g>
    </svg>
  );
}
