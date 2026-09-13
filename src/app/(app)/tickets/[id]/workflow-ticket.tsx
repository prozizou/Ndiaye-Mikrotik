// src/app/tickets/[id]/workflow-ticket.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StatutTicket } from "@prisma/client";

const PROCHAIN_STATUT: Partial<Record<StatutTicket, StatutTicket>> = {
  NOUVEAU: "ASSIGNE",
  ASSIGNE: "DIAGNOSTIC",
  DIAGNOSTIC: "INTERVENTION",
  INTERVENTION: "RESOLU",
  RESOLU: "FERME",
};

const STATUT_LABEL: Record<StatutTicket, string> = {
  NOUVEAU: "Nouveau",
  ASSIGNE: "Assigné",
  DIAGNOSTIC: "Diagnostic",
  INTERVENTION: "Intervention",
  RESOLU: "Résolu",
  FERME: "Fermé",
};

export function WorkflowTicket({
  ticketId,
  statutActuel,
  techniciens,
}: {
  ticketId: string;
  statutActuel: StatutTicket;
  techniciens: { id: string; nom: string }[];
}) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const prochain = PROCHAIN_STATUT[statutActuel];

  async function assigner(technicienId: string) {
    if (!technicienId) return;
    setEnCours(true);
    setErreur(null);
    try {
      const reponse = await fetch(`/api/tickets/${ticketId}/assigner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicienId }),
      });
      if (!reponse.ok) throw new Error((await reponse.json()).erreur ?? "Échec");
      router.refresh();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setEnCours(false);
    }
  }

  async function avancerStatut() {
    if (!prochain) return;
    setEnCours(true);
    setErreur(null);
    try {
      const reponse = await fetch(`/api/tickets/${ticketId}/statut`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: prochain }),
      });
      if (!reponse.ok) throw new Error((await reponse.json()).erreur ?? "Échec");
      router.refresh();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="space-y-3 border border-border/70 bg-surface p-4">
      {techniciens.length > 0 && (
        <div>
          <label className="mb-1 block text-sm text-ink-muted">Assigner à</label>
          <select
            onChange={(e) => assigner(e.target.value)}
            disabled={enCours}
            defaultValue=""
            className="w-full border border-border-strong bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
          >
            <option value="" disabled>
              Choisir un technicien
            </option>
            {techniciens.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nom}
              </option>
            ))}
          </select>
        </div>
      )}

      {prochain && (
        <button
          onClick={avancerStatut}
          disabled={enCours}
          className="border border-brand bg-brand/10 px-3 py-1.5 text-sm font-medium text-ink hover:bg-brand/20 disabled:opacity-50"
        >
          {enCours ? "..." : `Passer à « ${STATUT_LABEL[prochain]} »`}
        </button>
      )}

      {erreur && <p className="text-sm text-critical">{erreur}</p>}
    </div>
  );
}
