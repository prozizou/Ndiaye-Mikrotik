// src/app/(app)/routeurs/[id]/tester-connexion.tsx
// Bouton "Tester la connexion" — première preuve visible que le pipeline
// app → passerelle → WireGuard → routeur fonctionne bout en bout (voir
// gateway/README.md). Tant que MIKROTIK_GATEWAY_URL/SECRET ne sont pas
// configurés sur Vercel, ou que la passerelle n'est pas encore déployée, le
// résultat affiché est simplement le message d'erreur clair renvoyé par
// appelerMikrotik() — ce n'est pas un bug, c'est l'état attendu avant que
// l'infra (Oracle Cloud) soit en place.

"use client";

import { useState } from "react";
import { testerConnexion, type ResultatTestConnexion } from "./actions";

export function TesterConnexionBouton({ routeurId }: { routeurId: string }) {
  const [enCours, setEnCours] = useState(false);
  const [resultat, setResultat] = useState<ResultatTestConnexion | null>(null);

  async function lancerTest() {
    setEnCours(true);
    setResultat(null);
    const r = await testerConnexion(routeurId);
    setResultat(r);
    setEnCours(false);
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={lancerTest}
        disabled={enCours}
        className="w-full rounded-xl border border-brand bg-brand/10 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-brand/20 disabled:opacity-50"
      >
        {enCours ? "Test en cours…" : "Tester la connexion"}
      </button>

      {resultat &&
        (resultat.ok ? (
          <div className="rounded-xl border border-signal/30 bg-signal/10 p-3 text-sm">
            <div className="font-medium text-signal">Connexion réussie</div>
            <div className="mt-1 text-xs text-ink-muted">
              {resultat.identite} — RouterOS {resultat.version} — actif depuis {resultat.tempsActivite}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-critical/30 bg-critical/10 p-3 text-sm text-critical">
            {resultat.erreur}
          </div>
        ))}
    </div>
  );
}
