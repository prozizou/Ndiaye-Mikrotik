// src/app/tickets/[id]/page.tsx

import { notFound } from "next/navigation";
import { prisma } from "@/lib/database/prisma";
import { utilisateurConnecte, exigerAccesClient, ErreurAcces } from "@/lib/permissions/permissions";
import { WorkflowTicket } from "./workflow-ticket";

const STATUT_LABEL: Record<string, string> = {
  NOUVEAU: "Nouveau",
  ASSIGNE: "Assigné",
  DIAGNOSTIC: "Diagnostic",
  INTERVENTION: "Intervention",
  RESOLU: "Résolu",
  FERME: "Fermé",
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

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div>
        <h1 className="font-display text-lg font-semibold tracking-tight">{ticket.sujet}</h1>
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
      </div>

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
