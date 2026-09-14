// src/app/(app)/assistance/page.tsx
// Point d'entrée de l'assistance à distance : pour l'équipe technique, la
// file des sessions à mener (un ticket ouvert = une session potentielle) —
// chacune ouvre le parcours guidé (./[ticketId]). Plus une redirection vers
// la liste des routeurs : on part maintenant du ticket, pas du routeur.

import Link from "next/link";
import { prisma } from "@/lib/database/prisma";
import { utilisateurConnecte } from "@/lib/permissions/permissions";
import { estEnRetard } from "@/lib/tickets/sla";

const PRIORITE_STYLE: Record<string, string> = {
  BASSE: "border-border-strong text-ink-faint",
  NORMALE: "border-border-strong text-ink-muted",
  HAUTE: "border-warning/30 text-warning",
  URGENTE: "border-critical/30 text-critical",
};

export default async function PageAssistance() {
  const utilisateur = await utilisateurConnecte();
  const estStaff = utilisateur.role !== "CLIENT";

  if (!estStaff) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <h1 className="font-display text-lg font-semibold tracking-tight">Assistance à distance</h1>
        <p className="text-sm text-ink-muted">
          L'assistance à distance est réalisée par notre équipe technique. Ouvre un ticket si tu
          rencontres un problème.
        </p>
        <Link
          href="/tickets/nouveau"
          className="block w-full border border-brand bg-brand/10 px-4 py-3 text-center text-sm font-medium text-ink hover:bg-brand/20"
        >
          Ouvrir un ticket
        </Link>
      </div>
    );
  }

  const tickets = await prisma.ticket.findMany({
    where: { statut: { notIn: ["RESOLU", "FERME"] }, routeurId: { not: null } },
    include: { client: { select: { nom: true } }, routeur: { select: { nom: true } } },
    orderBy: [{ priorite: "desc" }, { creeLe: "asc" }],
    take: 50,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div>
        <h1 className="font-display text-lg font-semibold tracking-tight">Assistance à distance</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Une session guidée par ticket ouvert : connexion, diagnostic, intervention, vérification,
          rapport.
        </p>
      </div>

      <div className="divide-y divide-border/70 border border-border/70 bg-surface">
        {tickets.map((t) => (
          <Link
            key={t.id}
            href={`/assistance/${t.id}`}
            className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-surface-raised"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-ink-faint">{t.numero}</span>
                <span
                  className={`rounded-sm border px-1.5 py-0.5 text-[10px] ${PRIORITE_STYLE[t.priorite]}`}
                >
                  {t.priorite}
                </span>
                {estEnRetard(t.echeanceSla, t.statut) && (
                  <span className="rounded-sm border border-critical/30 px-1.5 py-0.5 text-[10px] text-critical">
                    SLA dépassé
                  </span>
                )}
              </div>
              <div className="mt-1 text-sm text-ink">{t.sujet}</div>
              <div className="text-xs text-ink-muted">
                {t.client.nom} · {t.routeur?.nom}
              </div>
            </div>
            <span className="shrink-0 text-xs text-ink-faint">{t.statut}</span>
          </Link>
        ))}
        {tickets.length === 0 && (
          <p className="px-4 py-6 text-sm text-ink-muted">Aucune session en cours — tout est traité.</p>
        )}
      </div>
    </div>
  );
}
