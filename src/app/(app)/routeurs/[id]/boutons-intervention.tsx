// src/app/routeurs/[id]/boutons-intervention.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ResultatIntervention = { ok: boolean; details?: string; nomFichier?: string; erreur?: string };

export function BoutonsIntervention({ routeurId }: { routeurId: string }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function lancer(type: "REDEMARRER_ROUTEUR" | "SAUVEGARDER_CONFIGURATION") {
    if (type === "REDEMARRER_ROUTEUR") {
      const confirme = window.confirm(
        "Redémarrer ce routeur va couper la connexion du client pendant environ une minute. Continuer ?",
      );
      if (!confirme) return;
    }

    setEnCours(type);
    setMessage(null);

    try {
      const reponse = await fetch(`/api/routeurs/${routeurId}/interventions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, confirmation: type === "REDEMARRER_ROUTEUR" }),
      });

      const donnees = (await reponse.json()) as ResultatIntervention;
      if (!reponse.ok) throw new Error(donnees.erreur ?? "Échec de l'intervention");

      setMessage(donnees.ok ? "Opération réussie." : `Échec : ${donnees.details}`);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setEnCours(null);
    }
  }

  return (
    <div className="space-y-2 border border-gray-200 p-3">
      <div className="flex gap-2">
        <button
          onClick={() => lancer("SAUVEGARDER_CONFIGURATION")}
          disabled={enCours !== null}
          className="border px-3 py-1.5 text-sm"
        >
          {enCours === "SAUVEGARDER_CONFIGURATION" ? "Sauvegarde..." : "Sauvegarder la configuration"}
        </button>
        <button
          onClick={() => lancer("REDEMARRER_ROUTEUR")}
          disabled={enCours !== null}
          className="border border-red-300 px-3 py-1.5 text-sm text-red-700"
        >
          {enCours === "REDEMARRER_ROUTEUR" ? "Redémarrage..." : "Redémarrer le routeur"}
        </button>
      </div>
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </div>
  );
}
