// src/app/routeurs/[id]/bouton-diagnostic.tsx
// Composant client : appelle l'endpoint de diagnostic et affiche le résultat
// sans recharger toute la page. router.refresh() met à jour l'historique et
// l'état en ligne/hors ligne affichés au-dessus, qui viennent du serveur.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ResultatDiagnostic = {
  routeurAccessible: { ok: boolean; details?: string };
  wan: { ok: boolean; details?: string };
  dns: { ok: boolean; details?: string };
  problemeProbable: string | null;
  severite: string | null;
};

export function BoutonDiagnostic({ routeurId, ticketId }: { routeurId: string; ticketId?: string }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [resultat, setResultat] = useState<ResultatDiagnostic | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function lancer() {
    setEnCours(true);
    setErreur(null);
    setResultat(null);

    try {
      const reponse = await fetch(`/api/routeurs/${routeurId}/diagnostic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
      });
      if (!reponse.ok) {
        const corps = await reponse.json().catch(() => ({}));
        throw new Error(corps.erreur ?? "Échec du diagnostic");
      }
      setResultat((await reponse.json()) as ResultatDiagnostic);
      router.refresh();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="border border-border/70 bg-surface p-4">
      <button
        onClick={lancer}
        disabled={enCours}
        className="border border-border-strong px-3 py-1.5 text-sm text-ink hover:bg-surface-raised disabled:opacity-50"
      >
        {enCours ? "Diagnostic en cours..." : "Lancer un diagnostic"}
      </button>

      {erreur && <p className="mt-2 text-sm text-critical">{erreur}</p>}

      {resultat && (
        <div className="mt-3 space-y-1 text-sm">
          <Ligne label="Routeur" ok={resultat.routeurAccessible.ok} />
          <Ligne label="WAN" ok={resultat.wan.ok} />
          <Ligne label="DNS" ok={resultat.dns.ok} />
          {resultat.problemeProbable && (
            <p className="mt-2 text-warning">{resultat.problemeProbable}</p>
          )}
        </div>
      )}
    </div>
  );
}

function Ligne({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={ok ? "text-signal" : "text-critical"}>{ok ? "✓" : "✕"}</span>
      <span className="text-ink">{label}</span>
    </div>
  );
}
