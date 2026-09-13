// src/app/audit/page.tsx

import { exigerRole, ErreurAcces } from "@/lib/permissions/permissions";
import { prisma } from "@/lib/database/prisma";

export default async function PageAudit() {
  try {
    await exigerRole("SUPER_ADMIN", "ADMINISTRATEUR");
  } catch (erreur) {
    if (erreur instanceof ErreurAcces) {
      return <p className="p-4 text-sm text-ink-muted">Accès refusé.</p>;
    }
    throw erreur;
  }

  const entrees = await prisma.journalAudit.findMany({
    include: { utilisateur: { select: { nom: true } }, routeur: { select: { nom: true } } },
    orderBy: { horodatage: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="font-display text-lg font-semibold tracking-tight">Journal d'audit</h1>
      <div className="divide-y divide-border/70 border border-border/70 bg-surface">
        {entrees.map((e) => (
          <div key={e.id} className="px-4 py-3 text-sm">
            <div className="text-ink">
              {e.action}
              {e.routeur ? ` — ${e.routeur.nom}` : ""}
            </div>
            <div className="text-xs text-ink-muted">
              {e.utilisateur.nom} · {e.horodatage.toLocaleString("fr-FR")} · {e.resultat ?? "—"}
            </div>
          </div>
        ))}
        {entrees.length === 0 && (
          <p className="px-4 py-6 text-sm text-ink-muted">Aucune entrée pour l'instant.</p>
        )}
      </div>
    </div>
  );
}
