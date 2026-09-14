// src/app/(app)/assistance/[ticketId]/page.tsx
// Parcours guidé de la Phase 5 : Connexion sécurisée → Diagnostic →
// Intervention → Vérification → Rapport. N'invente aucun nouveau mécanisme —
// orchestre les briques qui existent déjà (diagnostic, intervention, workflow
// de ticket) autour d'un seul ticket, dans l'ordre où un technicien les
// utilise réellement. L'historique de session demandé par le produit est
// simplement les Diagnostic/Intervention déjà rattachés à ce ticket : pas
// besoin d'un nouveau modèle pour ça.

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/database/prisma";
import { exigerRole, ErreurAcces } from "@/lib/permissions/permissions";
import { estEnRetard } from "@/lib/tickets/sla";
import { WorkflowTicket } from "@/app/(app)/tickets/[id]/workflow-ticket";
import { BoutonDiagnostic } from "@/app/(app)/routeurs/[id]/bouton-diagnostic";
import { BoutonsIntervention } from "@/app/(app)/routeurs/[id]/boutons-intervention";
import type { StatutTicket } from "@prisma/client";

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

// À quelle étape du parcours ce statut correspond-il — sert uniquement à
// mettre en avant l'étape en cours, pas à verrouiller les autres : un
// technicien qui rouvre un ticket doit pouvoir relancer un diagnostic ou une
// intervention sans attendre un ordre strict.
const ETAPE_COURANTE: Record<StatutTicket, number> = {
  NOUVEAU: 0,
  ASSIGNE: 0,
  DIAGNOSTIC: 1,
  INTERVENTION: 2,
  EN_ATTENTE_CLIENT: 3,
  RESOLU: 4,
  FERME: 4,
};

export default async function PageAssistanceGuidee({ params }: { params: { ticketId: string } }) {
  // Session guidée = outil d'équipe technique. Un client suit ça via ses
  // propres tickets, pas via ce parcours (mêmes rôles que les autres actions
  // sensibles sur routeur).
  let utilisateur;
  try {
    utilisateur = await exigerRole("SUPER_ADMIN", "ADMINISTRATEUR", "TECHNICIEN");
  } catch (erreur) {
    if (erreur instanceof ErreurAcces) {
      return <p className="p-4 text-sm text-ink-muted">Accès refusé.</p>;
    }
    throw erreur;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.ticketId },
    include: {
      client: { select: { nom: true } },
      routeur: { select: { id: true, nom: true, enLigne: true, derniereCommunication: true } },
      technicien: { select: { id: true, nom: true } },
      diagnostics: { orderBy: { lanceLe: "asc" } },
      interventions: { orderBy: { demarreeLe: "asc" } },
    },
  });

  if (!ticket) notFound();

  const techniciens = await prisma.utilisateur.findMany({
    where: { role: "TECHNICIEN", actif: true },
    select: { id: true, nom: true },
  });

  const enRetard = estEnRetard(ticket.echeanceSla, ticket.statut);
  const etapeCourante = ETAPE_COURANTE[ticket.statut];

  // Chronologie unifiée pour le rapport : diagnostics et interventions
  // entremêlés par date, seule vue qui donne le déroulé réel de la session.
  const chronologie = [
    ...ticket.diagnostics.map((d) => ({
      quand: d.lanceLe,
      libelle: d.problemeProbable ?? "Diagnostic — aucun problème détecté",
      details: `ping ${lib(d.pingOk)} · wan ${lib(d.wanOk)} · dns ${lib(d.dnsOk)}`,
    })),
    ...ticket.interventions.map((i) => ({
      quand: i.demarreeLe,
      libelle: `Intervention — ${i.type.replaceAll("_", " ").toLowerCase()}`,
      details: i.resultat ?? "en cours",
    })),
  ].sort((a, b) => a.quand.getTime() - b.quand.getTime());

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-lg font-semibold tracking-tight">
            Session — {ticket.sujet}
          </h1>
          <span className={`rounded-sm border px-1.5 py-0.5 text-[10px] ${PRIORITE_STYLE[ticket.priorite]}`}>
            {PRIORITE_LABEL[ticket.priorite]}
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          <span className="font-mono">{ticket.numero}</span> · {ticket.client.nom}
          {ticket.routeur && ` · ${ticket.routeur.nom}`}
        </p>
        {ticket.echeanceSla && (
          <p className={`mt-1 text-xs ${enRetard ? "text-critical" : "text-ink-faint"}`}>
            SLA : {enRetard ? "dépassé depuis le" : "échéance le"} {ticket.echeanceSla.toLocaleString("fr-FR")}
          </p>
        )}
        <Link href={`/tickets/${ticket.id}`} className="mt-1 inline-block text-xs text-ink-faint underline">
          Voir la fiche ticket complète
        </Link>
      </div>

      {!ticket.routeur ? (
        <p className="border border-border/70 bg-surface p-4 text-sm text-ink-muted">
          Ce ticket n'est rattaché à aucun routeur — le parcours guidé a besoin d'un routeur pour
          lancer un diagnostic ou une intervention.
        </p>
      ) : (
        <>
          <Etape numero={1} titre="Connexion sécurisée" active={etapeCourante === 0}>
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${ticket.routeur.enLigne ? "bg-signal" : "bg-critical"}`}
              />
              <span className="text-ink">{ticket.routeur.enLigne ? "Routeur en ligne" : "Routeur hors ligne"}</span>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Dernière communication :{" "}
              {ticket.routeur.derniereCommunication
                ? ticket.routeur.derniereCommunication.toLocaleString("fr-FR")
                : "jamais"}{" "}
              — vérifiée par le diagnostic ci-dessous et par la supervision périodique du parc.
            </p>
          </Etape>

          <Etape numero={2} titre="Diagnostic" active={etapeCourante === 1}>
            <BoutonDiagnostic routeurId={ticket.routeur.id} ticketId={ticket.id} />
          </Etape>

          <Etape numero={3} titre="Intervention" active={etapeCourante === 2}>
            <BoutonsIntervention routeurId={ticket.routeur.id} ticketId={ticket.id} />
          </Etape>

          <Etape numero={4} titre="Vérification" active={etapeCourante === 3}>
            <p className="mb-2 text-xs text-ink-muted">
              Relancez un diagnostic pour confirmer que le problème est résolu.
            </p>
            <BoutonDiagnostic routeurId={ticket.routeur.id} ticketId={ticket.id} />
          </Etape>
        </>
      )}

      <Etape numero={5} titre="Rapport" active={etapeCourante === 4}>
        <div className="mb-3">
          <WorkflowTicket ticketId={ticket.id} statutActuel={ticket.statut} techniciens={techniciens} />
        </div>
        <div className="divide-y divide-border/70 border border-border/70 bg-surface">
          {chronologie.map((e, i) => (
            <div key={i} className="px-4 py-3 text-sm">
              <div className="text-ink">{e.libelle}</div>
              <div className="font-mono text-xs text-ink-muted">
                {e.details} · {e.quand.toLocaleString("fr-FR")}
              </div>
            </div>
          ))}
          {chronologie.length === 0 && (
            <p className="px-4 py-6 text-sm text-ink-muted">
              Rien d'enregistré pour l'instant — le rapport se remplit au fil du diagnostic et de
              l'intervention ci-dessus.
            </p>
          )}
        </div>
      </Etape>
    </div>
  );
}

function Etape({
  numero,
  titre,
  active,
  children,
}: {
  numero: number;
  titre: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] ${
            active ? "border-brand text-brand" : "border-border-strong text-ink-muted"
          }`}
        >
          {numero}
        </span>
        <h2 className="text-sm text-ink-muted">{titre}</h2>
      </div>
      {children}
    </section>
  );
}

function lib(valeur: boolean | null) {
  if (valeur === null) return "—";
  return valeur ? "ok" : "échec";
}
