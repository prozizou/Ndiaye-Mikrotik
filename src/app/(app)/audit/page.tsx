// src/app/audit/page.tsx

import { exigerRole, ErreurAcces } from "@/lib/permissions/permissions";
import { prisma } from "@/lib/database/prisma";

export default async function PageAudit() {
  try {
    await exigerRole("SUPER_ADMIN", "ADMINISTRATEUR");
  } catch (erreur) {
    if (erreur instanceof ErreurAcces) {
      return <p className="p-4 text-sm text-gray-600">Accès refusé.</p>;
    }
    throw erreur;
  }

  const entrees = await prisma.journalAudit.findMany({
    include: { utilisateur: { select: { nom: true } }, routeur: { select: { nom: true } } },
    orderBy: { horodatage: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-lg font-medium">Journal d'audit</h1>
      <div className="mt-4 divide-y divide-gray-200 border border-gray-200">
        {entrees.map((e) => (
          <div key={e.id} className="px-3 py-2 text-sm">
            <div>
              {e.action}
              {e.routeur ? ` — ${e.routeur.nom}` : ""}
            </div>
            <div className="text-xs text-gray-500">
              {e.utilisateur.nom} · {e.horodatage.toLocaleString("fr-FR")} · {e.resultat ?? "—"}
            </div>
          </div>
        ))}
        {entrees.length === 0 && (
          <p className="px-3 py-4 text-sm text-gray-500">Aucune entrée pour l'instant.</p>
        )}
      </div>
    </div>
  );
}
