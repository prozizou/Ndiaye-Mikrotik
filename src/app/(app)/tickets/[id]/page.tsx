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
      return <p className="p-4 text-sm text-gray-600">Accès refusé.</p>;
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
        <h1 className="text-lg font-medium">{ticket.sujet}</h1>
        <p className="text-sm text-gray-500">
          {ticket.numero} · {ticket.client.nom}
          {ticket.routeur && ` · ${ticket.routeur.nom}`}
        </p>
      </div>

      {ticket.description && <p className="text-sm">{ticket.description}</p>}

      <div className="border border-gray-200 p-3 text-sm">
        <div>Statut : {STATUT_LABEL[ticket.statut]}</div>
        <div>Technicien : {ticket.technicien?.nom ?? "non assigné"}</div>
      </div>

      {peutGerer && (
        <WorkflowTicket
          ticketId={ticket.id}
          statutActuel={ticket.statut}
          techniciens={techniciens}
        />
      )}

      <section>
        <h2 className="mb-2 text-sm text-gray-500">Diagnostics liés</h2>
        <div className="divide-y divide-gray-200 border border-gray-200">
          {ticket.diagnostics.map((d) => (
            <div key={d.id} className="px-3 py-2 text-sm">
              {d.problemeProbable ?? "Aucun problème détecté"} —{" "}
              {d.lanceLe.toLocaleString("fr-FR")}
            </div>
          ))}
          {ticket.diagnostics.length === 0 && (
            <p className="px-3 py-4 text-sm text-gray-500">Aucun.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm text-gray-500">Interventions liées</h2>
        <div className="divide-y divide-gray-200 border border-gray-200">
          {ticket.interventions.map((i) => (
            <div key={i.id} className="px-3 py-2 text-sm">
              {i.type} — {i.resultat ?? "en cours"} — {i.demarreeLe.toLocaleString("fr-FR")}
            </div>
          ))}
          {ticket.interventions.length === 0 && (
            <p className="px-3 py-4 text-sm text-gray-500">Aucune.</p>
          )}
        </div>
      </section>
    </div>
  );
}
