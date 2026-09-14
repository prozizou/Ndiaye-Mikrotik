// src/app/(app)/dashboard/page.tsx
// Phase 3 : "À traiter maintenant" s'appuie désormais sur de vraies alertes
// typées (table Alerte, ouvertes/refermées par lancerDiagnostic — voir
// services/alerte.service.ts et diagnostic.service.ts), pas seulement sur
// enLigne=false. Depuis la Phase 7, ce diagnostic tourne aussi tout seul
// (/api/cron/diagnostics), mais un routeur ajouté puis jamais encore
// diagnostiqué (premier passage du cron pas encore effectué) n'aurait
// toujours aucune alerte : on le garde donc en repli, sans le compter deux
// fois s'il a déjà une alerte ouverte.

import Link from "next/link";
import { NetworkMotif } from "@/components/layout/network-motif";
import { prisma } from "@/lib/database/prisma";
import { utilisateurConnecte } from "@/lib/permissions/permissions";
import { AcquitterAlerteBouton } from "@/components/alertes/acquitter-alerte-bouton";
import type { StatutTicket, TypeAlerte } from "@prisma/client";

const STATUT_LABEL: Record<StatutTicket, string> = {
  NOUVEAU: "Nouveau",
  ASSIGNE: "Assigné",
  DIAGNOSTIC: "Diagnostic",
  INTERVENTION: "Intervention",
  EN_ATTENTE_CLIENT: "En attente client",
  RESOLU: "Résolu",
  FERME: "Fermé",
};

const PRIORITE_LABEL_COURT: Record<string, string> = {
  BASSE: "Basse",
  NORMALE: "Normale",
  HAUTE: "Haute",
  URGENTE: "Urgente",
};

const TYPE_ALERTE_LABEL: Record<TypeAlerte, string> = {
  ROUTEUR_INJOIGNABLE: "Hors ligne",
  WAN_INDISPONIBLE: "WAN indisponible",
  DNS_INSTABLE: "DNS instable",
  CPU_ELEVE: "CPU élevé",
  LATENCE_ELEVEE: "Latence élevée",
};

const SEPT_JOURS_MS = 7 * 24 * 60 * 60 * 1000;

function formatDepuis(date: Date | null): string {
  if (!date) return "jamais";
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `${heures} h`;
  return `${Math.floor(heures / 24)} j`;
}

// Répartit une liste de dates dans N compartiments quotidiens, le dernier
// représentant aujourd'hui — sert à la courbe "tickets créés / jour".
function serieParJour(dates: Date[], jours: number): number[] {
  const compartiments = new Array(jours).fill(0);
  for (const date of dates) {
    const diffJours = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
    const index = jours - 1 - diffJours;
    if (index >= 0 && index < jours) compartiments[index]++;
  }
  return compartiments;
}

function Sparkline({ values, couleur }: { values: number[]; couleur: string }) {
  const max = Math.max(...values, 1);
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1 || 1)) * 100;
      const y = 30 - (v / max) * 24 - 3;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" className="h-8 w-full" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={couleur} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function formatDuree(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const heures = minutes / 60;
  if (heures < 24) return `${heures.toFixed(1)} h`;
  return `${(heures / 24).toFixed(1)} j`;
}

type ItemATraiter = {
  cle: string;
  href: string;
  titre: string;
  sousTitre: string;
  badge: string;
  detail: string;
  urgent: boolean;
  alerteId?: string;
  acquitteeParNom?: string | null;
};

export default async function DashboardPage() {
  const utilisateur = await utilisateurConnecte();
  const estStaff = utilisateur.role !== "CLIENT";

  const filtreRouteurs =
    utilisateur.role === "CLIENT" ? { site: { clientId: utilisateur.clientId! } } : undefined;
  const filtreTickets =
    utilisateur.role === "CLIENT"
      ? { clientId: utilisateur.clientId! }
      : utilisateur.role === "TECHNICIEN"
        ? { technicienId: utilisateur.id }
        : undefined;

  const depuis7Jours = new Date(Date.now() - SEPT_JOURS_MS);

  const [routeurs, tickets, alertesOuvertes] = await Promise.all([
    prisma.routeur.findMany({
      where: filtreRouteurs,
      include: { site: { include: { client: { select: { nom: true } } } } },
      orderBy: { nom: "asc" },
    }),
    prisma.ticket.findMany({
      where: filtreTickets,
      include: { client: { select: { nom: true } } },
      orderBy: { creeLe: "desc" },
    }),
    prisma.alerte.findMany({
      where: { resolueLe: null, ...(filtreRouteurs ? { routeur: filtreRouteurs } : {}) },
      include: {
        routeur: { include: { site: { include: { client: { select: { nom: true } } } } } },
        acquitteePar: { select: { nom: true } },
      },
    }),
  ]);

  const totalRouteurs = routeurs.length;
  const routeursEnLigne = routeurs.filter((r) => r.enLigne);
  const routeursHorsLigne = routeurs.filter((r) => !r.enLigne);
  const disponibilite = totalRouteurs > 0 ? (routeursEnLigne.length / totalRouteurs) * 100 : null;

  const ticketsOuverts = tickets.filter((t) => t.statut !== "FERME");
  const POIDS_PRIORITE: Record<string, number> = { URGENTE: 0, HAUTE: 1, NORMALE: 2, BASSE: 3 };
  const ticketsATraiter = ticketsOuverts
    .filter((t) => t.statut === "NOUVEAU" || t.statut === "ASSIGNE")
    .sort((a, b) => {
      const ecartPriorite = POIDS_PRIORITE[a.priorite] - POIDS_PRIORITE[b.priorite];
      return ecartPriorite !== 0 ? ecartPriorite : a.creeLe.getTime() - b.creeLe.getTime();
    });

  const ticketsCreesRecents = tickets.filter((t) => t.creeLe >= depuis7Jours);
  const serieTickets = serieParJour(
    ticketsCreesRecents.map((t) => t.creeLe),
    7,
  );

  const dureesResolution = tickets
    .filter((t) => t.resoluLe && t.resoluLe >= depuis7Jours)
    .map((t) => (t.resoluLe!.getTime() - t.creeLe.getTime()) / 60000);
  const resolutionMoyenne =
    dureesResolution.length > 0
      ? dureesResolution.reduce((a, b) => a + b, 0) / dureesResolution.length
      : null;

  const alertesTriees = [...alertesOuvertes].sort((a, b) => {
    if (a.niveau !== b.niveau) return a.niveau === "CRITIQUE" ? -1 : 1;
    return a.creeLe.getTime() - b.creeLe.getTime();
  });

  // Un routeur hors ligne mais jamais re-diagnostiqué depuis n'a pas encore
  // d'alerte ROUTEUR_INJOIGNABLE — on le garde en repli pour ne rien passer
  // sous silence, sans le doubler s'il a déjà une alerte ouverte.
  const routeurIdsAvecAlerte = new Set(alertesOuvertes.map((a) => a.routeurId));
  const routeursHorsLigneSansAlerte = routeursHorsLigne.filter((r) => !routeurIdsAvecAlerte.has(r.id));

  const aTraiter: ItemATraiter[] = [
    ...alertesTriees.map((a) => ({
      cle: `alerte-${a.id}`,
      href: `/routeurs/${a.routeurId}`,
      titre: a.routeur.nom,
      sousTitre: `${a.routeur.site.client.nom} — ${a.routeur.site.nom}`,
      badge: TYPE_ALERTE_LABEL[a.type],
      detail: `depuis ${formatDepuis(a.creeLe)}`,
      urgent: a.niveau === "CRITIQUE",
      alerteId: a.id,
      acquitteeParNom: a.acquitteePar?.nom ?? null,
    })),
    ...routeursHorsLigneSansAlerte.map((r) => ({
      cle: `routeur-${r.id}`,
      href: `/routeurs/${r.id}`,
      titre: r.nom,
      sousTitre: `${r.site.client.nom} — ${r.site.nom}`,
      badge: "Hors ligne",
      detail: `depuis ${formatDepuis(r.derniereCommunication)}`,
      urgent: true,
    })),
    ...ticketsATraiter.map((t) => ({
      cle: `ticket-${t.id}`,
      href: `/tickets/${t.id}`,
      titre: t.sujet,
      sousTitre: `${t.numero} · ${t.client.nom}`,
      badge: `${STATUT_LABEL[t.statut]} · ${PRIORITE_LABEL_COURT[t.priorite]}`,
      detail: `depuis ${formatDepuis(t.creeLe)}`,
      urgent: t.statut === "NOUVEAU" || t.priorite === "URGENTE" || t.priorite === "HAUTE",
    })),
  ];

  return (
    <div>
      {/* En-tête avec le motif réseau en filigrane */}
      <div className="relative overflow-hidden border-b border-border/70 px-6 py-8 md:px-10 md:py-12">
        <NetworkMotif className="pointer-events-none absolute -right-10 -top-6 h-40 w-[420px] text-border-strong opacity-60 md:h-48 md:w-[520px]" />
        <div className="relative">
          <p className="text-sm text-ink-muted">Vue d&apos;ensemble</p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight md:text-3xl">
            Centre d&apos;assistance
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
            <span className="text-ink-muted">
              <span className="font-mono">{totalRouteurs}</span> routeurs
            </span>
            <span className="flex items-center gap-2 text-signal">
              <Pastille couleur="bg-signal" /> <span className="font-mono">{routeursEnLigne.length}</span> en ligne
            </span>
            <span className="flex items-center gap-2 text-critical">
              <Pastille couleur="bg-critical" /> <span className="font-mono">{routeursHorsLigne.length}</span> hors
              ligne
            </span>
            <span className="text-ink-muted">
              <span className="font-mono">{ticketsOuverts.length}</span> tickets ouverts
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-8 px-6 py-8 md:px-10">
        {/* À traiter maintenant — avant toute statistique secondaire */}
        <section>
          <h2 className="mb-3 text-sm text-ink-muted">À traiter maintenant</h2>
          <div className="divide-y divide-border/70 border border-border/70 bg-surface">
            {aTraiter.map((item) => (
              <div key={item.cle} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-surface-raised">
                <Link href={item.href} className="flex min-w-0 items-center gap-3">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.urgent ? "bg-critical" : "bg-warning"}`}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm text-ink">{item.titre}</div>
                    <div className="truncate text-xs text-ink-muted">{item.sousTitre}</div>
                  </div>
                </Link>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`rounded-sm border px-1.5 py-0.5 text-[10px] ${
                      item.urgent ? "border-critical/30 text-critical" : "border-warning/30 text-warning"
                    }`}
                  >
                    {item.badge}
                  </span>
                  <div className="text-[11px] text-ink-faint">{item.detail}</div>
                  {item.alerteId &&
                    estStaff &&
                    (item.acquitteeParNom ? (
                      <span className="text-[10px] text-ink-faint">Acquittée par {item.acquitteeParNom}</span>
                    ) : (
                      <AcquitterAlerteBouton alerteId={item.alerteId} />
                    ))}
                </div>
              </div>
            ))}
            {aTraiter.length === 0 && (
              <p className="px-4 py-6 text-sm text-ink-muted">
                Rien à traiter pour l&apos;instant — tout le parc est en ligne et aucun ticket n&apos;attend
                d&apos;affectation.
              </p>
            )}
          </div>
        </section>

        {/* Disponibilité — métrique héro */}
        <section className="border border-border/70 bg-surface p-5">
          <div className="flex items-end justify-between">
            <span className="text-sm text-ink-muted">Disponibilité du parc</span>
            {disponibilite !== null ? (
              <span className="font-display text-3xl font-semibold text-signal">
                {disponibilite.toFixed(1)}%
              </span>
            ) : (
              <span className="text-sm text-ink-faint">Aucun routeur enregistré</span>
            )}
          </div>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-signal"
              style={{ width: `${disponibilite ?? 0}%` }}
            />
          </div>
        </section>

        {/* KPI — toujours pas de sélecteur de période (24h/7j/30j) : la
            Phase 7 fait désormais s'accumuler un historique de diagnostics
            réguliers, mais pas encore assez profond ni exploité pour un
            vrai graphique de disponibilité dans le temps. */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="border border-border/70 bg-surface p-4">
            <span className="text-xs text-ink-muted">Résolution moyenne (7 j)</span>
            <div className="mt-1 font-display text-xl font-semibold text-ink">
              {resolutionMoyenne !== null ? formatDuree(resolutionMoyenne) : "—"}
            </div>
            <div className="text-[11px] text-ink-faint">
              {dureesResolution.length > 0
                ? `sur ${dureesResolution.length} ticket${dureesResolution.length > 1 ? "s" : ""} résolu${dureesResolution.length > 1 ? "s" : ""}`
                : "aucun ticket résolu sur 7 jours"}
            </div>
          </div>
          <div className="border border-border/70 bg-surface p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-ink-muted">Tickets créés / jour</span>
              <span className="font-mono text-sm text-ink">{serieTickets.at(-1)}</span>
            </div>
            <Sparkline values={serieTickets} couleur="var(--color-warning)" />
          </div>
        </section>

        {/* Derniers tickets */}
        <section className="pb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm text-ink-muted">Derniers tickets</h2>
            <Link href="/tickets" className="text-xs text-brand-strong hover:underline">
              Tout voir
            </Link>
          </div>
          <div className="divide-y divide-border/70 border border-border/70 bg-surface">
            {tickets.slice(0, 5).map((t) => (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-surface-raised"
              >
                <div>
                  <div className="text-sm text-ink">{t.sujet}</div>
                  <div className="mt-1 text-[11px] text-ink-faint">
                    <span className="font-mono">{t.numero}</span> · {t.client.nom}
                  </div>
                </div>
                <div className="text-xs text-ink-muted">{STATUT_LABEL[t.statut]}</div>
              </Link>
            ))}
            {tickets.length === 0 && (
              <p className="px-4 py-6 text-sm text-ink-muted">Aucun ticket pour l&apos;instant.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Pastille({ couleur }: { couleur: string }) {
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${couleur}`} />;
}
