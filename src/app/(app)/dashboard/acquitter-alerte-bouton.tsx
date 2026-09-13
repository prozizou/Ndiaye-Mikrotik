// src/app/(app)/dashboard/acquitter-alerte-bouton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AcquitterAlerteBouton({ alerteId }: { alerteId: string }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);

  async function acquitter() {
    setEnCours(true);
    try {
      const reponse = await fetch(`/api/alertes/${alerteId}/acquitter`, { method: "POST" });
      if (reponse.ok) router.refresh();
    } finally {
      setEnCours(false);
    }
  }

  return (
    <button
      onClick={acquitter}
      disabled={enCours}
      className="rounded-sm border border-border-strong px-1.5 py-0.5 text-[10px] text-ink-muted hover:bg-surface-raised disabled:opacity-50"
    >
      {enCours ? "..." : "Acquitter"}
    </button>
  );
}
