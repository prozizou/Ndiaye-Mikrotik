// src/app/tickets/page.tsx

import Link from "next/link";
import { prisma } from "@/lib/database/prisma";
import { utilisateurConnecte } from "@/lib/permissions/permissions";
import { estEnRetard } from "@/lib/tickets/sla";

const STATUT_LABEL: Record<string, string> = {
  NOUVEAU: "Nouveau",
  ASSIGNE: "Assigné",
  DIAGNOSTIC: "Diagnostic",
  INTERVENTION: "Intervention",
  EN_ATTENTE_CLIENT: "En attente client",
  RESOLU: "Résolu",
  FERME: "Fermé",
};

const PRIORITE_LABEL: Record<string, string> = {
  BASSE: "Basse",
  NORMALE: "Normale",
  HAUTE: "Haute",
  URGENTE: "Urgente",
};

const PRIORITE_STYLE: Record<string, string> = {
  BASSE: "border-border-strong text-ink-faint",
  NORMALE: "border-border-strong text-ink-muted",
  HAUTE: "border-warning/30 text-warning",
  URGENTE: "border-critical/30 text-critical",
};

export default async function PageTickets() {
  const utilisateur = await utilisateurConnecte();

  const where =
    utilisateur.role === "CLIENT"
      ? { clientId: utilisateur.clientId! }
      : utilisateur.role === "TECHNICIEN"
        ? { technicienId: utilisateur.id }
        : undefined;

  const tickets = await prisma.ticket.findMany({
    where,
    include: { client: { select: { nom: true } }, technicien: { select: { nom: true } } },
    orderBy: { creeLe: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg font-semibold tracking-tight">Tickets</h1>
        <Link href="/tickets/nouveau" className="text-sm text-brand-strong hover:underline">
          Nouveau ticket
        </Link>
      </div>

      <div className="divide-y divide-border/70 border border-border/70 bg-surface">
        {tickets.map((t) => {
          const enRetard = estEnRetard(t.echeanceSla, t.statut);
          return (
            <Link
              key={t.id}
              href={`/tickets/${t.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-raised"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] ${PRIORITE_STYLE[t.priorite]}`}
                  >
                    {PRIORITE_LABEL[t.priorite]}
                  </span>
                  <div className="truncate text-sm text-ink">{t.sujet}</div>
                </div>
                <div className="mt-1 text-xs text-ink-muted">
                  <span className="font-mono">{t.numero}</span> · {t.client.nom}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm text-ink">{STATUT_LABEL[t.statut]}</div>
                <div className="text-xs text-ink-muted">{t.technicien?.nom ?? "non assigné"}</div>
                {enRetard && <div className="mt-0.5 text-[10px] text-critical">SLA dépassé</div>}
              </div>
            </Link>
          );
        })}
        {tickets.length === 0 && (
          <p className="px-4 py-6 text-sm text-ink-muted">Aucun ticket.</p>
        )}
      </div>
    </div>
  );
}
