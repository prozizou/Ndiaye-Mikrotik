// src/app/tickets/[id]/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/database/prisma";
import { utilisateurConnecte, exigerAccesClient, ErreurAcces } from "@/lib/permissions/permissions";
import { estEnRetard } from "@/lib/tickets/sla";
import { WorkflowTicket } from "./workflow-ticket";

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

export default async function PageDetailTicket({ params }: { params: { id: string } }) {
  const utilisateur = await utilisateurConnecte();

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      routeur: { select: { id: true, nom: true } },
      technicien: { select: { id: true, nom: true } },
      diagnostics: { orderBy: { lanceLe: "desc" } },
      interventions: { orderBy: { demarreeLe: "desc" } },
    },
  });

  if (!ticket) notFound();

  try {
    await exigerAccesClient(ticket.clientId);
  } catch (erreur) {
    if (erreur instanceof ErreurAcces) {
      return <p className="p-4 text-sm text-ink-muted">Accès refusé.</p>;
    }
    throw erreur;
  }

  const techniciens =
    utilisateur.role !== "CLIENT"
      ? await prisma.utilisateur.findMany({
          where: { role: "TECHNICIEN", actif: true },
          select: { id: true, nom: true },
        })
      : [];

  const peutGerer = ["SUPER_ADMIN", "ADMINISTRATEUR", "TECHNICIEN"].includes(utilisateur.role);
  const enRetard = estEnRetard(ticket.echeanceSla, ticket.statut);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-lg font-semibold tracking-tight">{ticket.sujet}</h1>
          <span
            className={`rounded-sm border px-1.5 py-0.5 text-[10px] ${PRIORITE_STYLE[ticket.priorite]}`}
          >
            {PRIORITE_LABEL[ticket.priorite]}
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          <span className="font-mono">{ticket.numero}</span> · {ticket.client.nom}
          {ticket.routeur && ` · ${ticket.routeur.nom}`}
        </p>
      </div>

      {ticket.description && <p className="text-sm text-ink">{ticket.description}</p>}

      <div className="border border-border/70 bg-surface p-4 text-sm">
        <div className="text-ink">Statut : {STATUT_LABEL[ticket.statut]}</div>
        <div className="mt-1 text-ink-muted">
          Technicien : {ticket.technicien?.nom ?? "non assigné"}
        </div>
        {ticket.echeanceSla && (
          <div className={`mt-1 ${enRetard ? "text-critical" : "text-ink-muted"}`}>
            SLA : {enRetard ? "dépassé depuis le" : "échéance le"} {ticket.echeanceSla.toLocaleString("fr-FR")}
          </div>
        )}
      </div>

      {peutGerer && ticket.routeur && (
        <div className="space-y-2">
          <Link
            href={`/assistance/${ticket.id}`}
            className="block w-full border border-brand bg-brand/10 px-4 py-2.5 text-center text-sm font-medium text-ink hover:bg-brand/20"
          >
            Ouvrir la session guidée
          </Link>
          <Link
            href={`/routeurs/${ticket.routeur.id}?ticketId=${ticket.id}`}
            className="block text-center text-xs text-ink-faint underline"
          >
            Voir la fiche technique de {ticket.routeur.nom}
          </Link>
        </div>
      )}

      {peutGerer && (
        <WorkflowTicket
          ticketId={ticket.id}
          statutActuel={ticket.statut}
          techniciens={techniciens}
        />
      )}

      <section>
        <h2 className="mb-2 text-sm text-ink-muted">Diagnostics liés</h2>
        <div className="divide-y divide-border/70 border border-border/70 bg-surface">
          {ticket.diagnostics.map((d) => (
            <div key={d.id} className="px-4 py-3 text-sm text-ink">
              {d.problemeProbable ?? "Aucun problème détecté"} —{" "}
              <span className="text-ink-muted">{d.lanceLe.toLocaleString("fr-FR")}</span>
            </div>
          ))}
          {ticket.diagnostics.length === 0 && (
            <p className="px-4 py-6 text-sm text-ink-muted">Aucun.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm text-ink-muted">Interventions liées</h2>
        <div className="divide-y divide-border/70 border border-border/70 bg-surface">
          {ticket.interventions.map((i) => (
            <div key={i.id} className="px-4 py-3 text-sm text-ink">
              {i.type} — {i.resultat ?? "en cours"} —{" "}
              <span className="text-ink-muted">{i.demarreeLe.toLocaleString("fr-FR")}</span>
            </div>
          ))}
          {ticket.interventions.length === 0 && (
            <p className="px-4 py-6 text-sm text-ink-muted">Aucune.</p>
          )}
        </div>
      </section>
    </div>
  );
}
