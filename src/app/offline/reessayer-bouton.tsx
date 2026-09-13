// src/app/offline/reessayer-bouton.tsx
"use client";

export function ReessayerBouton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="border border-brand bg-brand/10 px-3 py-1.5 text-sm text-ink hover:bg-brand/20"
    >
      Réessayer
    </button>
  );
}
