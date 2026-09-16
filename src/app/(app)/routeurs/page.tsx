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
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg font-semibold tracking-tight">Routeurs</h1>
        {utilisateur.role !== "CLIENT" && (
          <div className="flex items-center gap-3 text-sm">
            <Link href="/routeurs/nouveau" className="text-ink-faint hover:underline">
              Ajout complet
            </Link>
            <Link
              href="/routeurs/connexion-rapide"
              className="border border-brand bg-brand/10 px-3 py-1.5 font-medium text-ink hover:bg-brand/20"
            >
              Connexion rapide
            </Link>
          </div>
        )}
      </div>

      <div className="divide-y divide-border/70 border border-border/70 bg-surface">
        {routeurs.map((r) => (
          <Link
            key={r.id}
            href={`/routeurs/${r.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-surface-raised"
          >
            <div>
              <div className="text-sm text-ink">{r.nom}</div>
              <div className="text-xs text-ink-muted">
                {r.site.client.nom} — {r.site.nom}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm ${r.enLigne ? "text-signal" : "text-critical"}`}>
                {r.enLigne ? "En ligne" : "Hors ligne"}
              </div>
              <div className="font-mono text-xs text-ink-faint">{r.ipVpn}</div>
            </div>
          </Link>
        ))}

        {routeurs.length === 0 && (
          <p className="px-4 py-6 text-sm text-ink-muted">Aucun routeur pour l'instant.</p>
        )}
      </div>
    </div>
  );
}
