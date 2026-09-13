// src/app/tickets/page.tsx

import Link from "next/link";
import { prisma } from "@/lib/database/prisma";
import { utilisateurConnecte } from "@/lib/permissions/permissions";

const STATUT_LABEL: Record<string, string> = {
  NOUVEAU: "Nouveau",
  ASSIGNE: "Assigné",
  DIAGNOSTIC: "Diagnostic",
  INTERVENTION: "Intervention",
  RESOLU: "Résolu",
  FERME: "Fermé",
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
        {tickets.map((t) => (
          <Link
            key={t.id}
            href={`/tickets/${t.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-surface-raised"
          >
            <div>
              <div className="text-sm text-ink">{t.sujet}</div>
              <div className="text-xs text-ink-muted">
                <span className="font-mono">{t.numero}</span> · {t.client.nom}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-ink">{STATUT_LABEL[t.statut]}</div>
              <div className="text-xs text-ink-muted">{t.technicien?.nom ?? "non assigné"}</div>
            </div>
          </Link>
        ))}
        {tickets.length === 0 && (
          <p className="px-4 py-6 text-sm text-ink-muted">Aucun ticket.</p>
        )}
      </div>
    </div>
  );
}
