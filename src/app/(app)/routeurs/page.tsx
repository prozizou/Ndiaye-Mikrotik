// src/app/routeurs/page.tsx
// Point d'entrée unique de l'app pour l'instant : la liste des routeurs
// ajoutés, et un lien pour en ajouter un nouveau (IP + identifiant + mot de
// passe, rien d'autre — voir connexion-rapide/).

import Link from "next/link";
import { prisma } from "@/lib/database/prisma";
import { peut } from "@/lib/permissions/permissions";

export default async function PageRouteurs() {
  const peutGerer = await peut("gererRouteurs");

  const routeurs = await prisma.routeur.findMany({ orderBy: { nom: "asc" } });

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg font-semibold tracking-tight">Routeurs</h1>
        {peutGerer && (
          <Link
            href="/routeurs/connexion-rapide"
            className="border border-brand bg-brand/10 px-3 py-1.5 text-sm font-medium text-ink hover:bg-brand/20"
          >
            Ajouter un routeur
          </Link>
        )}
      </div>

      <div className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70 bg-surface shadow-sm">
        {routeurs.map((r) => (
          <Link
            key={r.id}
            href={`/routeurs/${r.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-surface-raised"
          >
            <div className="text-sm text-ink">{r.nom}</div>
            <div className="font-mono text-xs text-ink-faint">{r.ipVpn}</div>
          </Link>
        ))}

        {routeurs.length === 0 && (
          <p className="px-4 py-6 text-sm text-ink-muted">
            Aucun routeur pour l&apos;instant
            {peutGerer && (
              <>
                {" "}
                —{" "}
                <Link href="/routeurs/connexion-rapide" className="text-brand-strong hover:underline">
                  en ajouter un
                </Link>
                .
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
