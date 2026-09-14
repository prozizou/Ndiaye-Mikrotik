// src/app/routeurs/[id]/restaurer-sauvegarde-bouton.tsx
// Action à haut risque : redémarre le routeur et écrase sa config actuelle
// par celle de la sauvegarde choisie. Confirmation obligatoire côté client,
// vérification de rôle refaite côté serveur (voir la route appelée).

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RestaurerSauvegardeBouton({
  routeurId,
  sauvegardeId,
}: {
  routeurId: string;
  sauvegardeId: string;
}) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function restaurer() {
    const confirme = window.confirm(
      "Restaurer cette sauvegarde va écraser la configuration actuelle du routeur et le redémarrer. Continuer ?",
    );
    if (!confirme) return;

    setEnCours(true);
    setErreur(null);
    try {
      const reponse = await fetch(
        `/api/routeurs/${routeurId}/sauvegardes/${sauvegardeId}/restaurer`,
        { method: "POST" },
      );
      const donnees = (await reponse.json()) as { ok: boolean; details?: string; erreur?: string };
      if (!reponse.ok || !donnees.ok) {
        throw new Error(donnees.erreur ?? donnees.details ?? "Échec de la restauration");
      }
      router.refresh();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={restaurer}
        disabled={enCours}
        className="shrink-0 rounded-sm border border-critical/40 px-1.5 py-0.5 text-[10px] text-critical hover:bg-critical/10 disabled:opacity-50"
      >
        {enCours ? "Restauration..." : "Restaurer"}
      </button>
      {erreur && <span className="text-[10px] text-critical">{erreur}</span>}
    </div>
  );
}
