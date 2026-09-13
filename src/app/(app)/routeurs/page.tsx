// src/app/routeurs/page.tsx

import Link from "next/link";
import { prisma } from "@/lib/database/prisma";
import { utilisateurConnecte } from "@/lib/permissions/permissions";

export default async function PageRouteurs() {
  const utilisateur = await utilisateurConnecte();

  const routeurs = await prisma.routeur.findMany({
    where:
      utilisateur.role === "CLIENT"
        ? { site: { clientId: utilisateur.clientId! } }
        : undefined,
    include: { site: { include: { client: { select: { nom: true } } } } },
    orderBy: { nom: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Routeurs</h1>
        {utilisateur.role !== "CLIENT" && (
          <Link href="/routeurs/nouveau" className="text-sm underline">
            Ajouter un routeur
          </Link>
        )}
      </div>

      <div className="mt-4 divide-y divide-gray-200 border border-gray-200">
        {routeurs.map((r) => (
          <Link
            key={r.id}
            href={`/routeurs/${r.id}`}
            className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50"
          >
            <div>
              <div className="text-sm">{r.nom}</div>
              <div className="text-xs text-gray-500">
                {r.site.client.nom} — {r.site.nom}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm ${r.enLigne ? "text-emerald-600" : "text-red-600"}`}>
                {r.enLigne ? "En ligne" : "Hors ligne"}
              </div>
              <div className="font-mono text-xs text-gray-500">{r.ipVpn}</div>
            </div>
          </Link>
        ))}

        {routeurs.length === 0 && (
          <p className="px-3 py-4 text-sm text-gray-500">Aucun routeur pour l'instant.</p>
        )}
      </div>
    </div>
  );
}
