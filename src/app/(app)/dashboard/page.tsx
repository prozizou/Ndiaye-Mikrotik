// src/app/(app)/dashboard/page.tsx

import { NetworkMotif } from "@/components/layout/network-motif";

type EtatRouteur = "en_ligne" | "hors_ligne" | "alerte";

type Routeur = {
  id: string;
  nom: string;
  client: string;
  etat: EtatRouteur;
  depuis: string;
};

type Alerte = {
  id: string;
  routeur: string;
  client: string;
  message: string;
  severite: "critique" | "moyenne" | "faible";
  heure: string;
};

type Ticket = {
  id: string;
  client: string;
  sujet: string;
  statut: "nouveau" | "assigne" | "diagnostic" | "intervention";
  technicien: string | null;
};

const ROUTEURS: Routeur[] = [
  { id: "MT-014", nom: "Siège — R1", client: "Sarl Kanté BTP", etat: "hors_ligne", depuis: "18 min" },
  { id: "MT-071", nom: "Entrepôt Nord", client: "Quinca Diallo", etat: "alerte", depuis: "2 h" },
  { id: "MT-102", nom: "Agence Plateau", client: "École Les Flamboyants", etat: "hors_ligne", depuis: "3 h" },
];

const ALERTES: Alerte[] = [
  { id: "a1", routeur: "MT-071", client: "Quinca Diallo", message: "CPU au dessus de 85 % depuis 20 min", severite: "moyenne", heure: "15:22" },
  { id: "a2", routeur: "MT-014", client: "Sarl Kanté BTP", message: "WAN indisponible — perte du lien FAI", severite: "critique", heure: "15:41" },
  { id: "a3", routeur: "MT-102", client: "École Les Flamboyants", message: "VPN déconnecté", severite: "critique", heure: "12:58" },
  { id: "a4", routeur: "MT-039", client: "Sarl Kanté BTP", message: "Résolution DNS instable", severite: "faible", heure: "09:03" },
];

const TICKETS: Ticket[] = [
  { id: "T-2231", client: "École Les Flamboyants", sujet: "Wi-Fi inaccessible salle des profs", statut: "diagnostic", technicien: "S. Traoré" },
  { id: "T-2230", client: "Quinca Diallo", sujet: "Internet lent en fin de journée", statut: "assigne", technicien: "A. Koné" },
  { id: "T-2228", client: "Sarl Kanté BTP", sujet: "Coupure Internet totale", statut: "nouveau", technicien: null },
];

const KPI_RESOLUTION = [38, 42, 35, 51, 29, 33, 27];
const KPI_INCIDENTS = [4, 6, 3, 8, 5, 2, 3];

function Pastille({ etat }: { etat: EtatRouteur }) {
  const couleurs: Record<EtatRouteur, string> = {
    en_ligne: "bg-signal",
    hors_ligne: "bg-critical",
    alerte: "bg-warning",
  };
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${couleurs[etat]}`} />;
}

function Sparkline({ values, couleur }: { values: number[]; couleur: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 30 - ((v - min) / range) * 24 - 3;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" className="h-8 w-full" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={couleur} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const SEVERITE_LABEL: Record<Alerte["severite"], string> = {
  critique: "Critique",
  moyenne: "Moyenne",
  faible: "Faible",
};

const SEVERITE_STYLE: Record<Alerte["severite"], string> = {
  critique: "text-critical border-critical/30",
  moyenne: "text-warning border-warning/30",
  faible: "text-ink-faint border-border-strong",
};

const STATUT_LABEL: Record<Ticket["statut"], string> = {
  nouveau: "Nouveau",
  assigne: "Assigné",
  diagnostic: "Diagnostic",
  intervention: "Intervention",
};

export default function DashboardPage() {
  const enLigne = 125;
  const horsLigne = 7;
  const disponibilite = 96.4;

  return (
    <div>
      {/* En-tête avec le motif réseau en filigrane */}
      <div className="relative overflow-hidden border-b border-border px-6 py-8 md:px-10 md:py-12">
        <NetworkMotif className="pointer-events-none absolute -right-10 -top-6 h-40 w-[420px] text-border-strong opacity-60 md:h-48 md:w-[520px]" />
        <div className="relative">
          <p className="text-sm text-ink-muted">Vue d&apos;ensemble</p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight md:text-3xl">
            Centre d&apos;assistance
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[13px]">
            <span className="flex items-center gap-2 text-signal">
              <Pastille etat="en_ligne" /> {enLigne} en ligne
            </span>
            <span className="flex items-center gap-2 text-critical">
              <Pastille etat="hors_ligne" /> {horsLigne} hors ligne
            </span>
            <span className="text-warning">{ALERTES.length} alertes</span>
            <span className="text-ink-muted">{TICKETS.length} tickets ouverts</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-8 px-6 py-8 md:px-10">
        {/* Disponibilité — métrique héro */}
        <section className="border border-border bg-surface p-5">
          <div className="flex items-end justify-between">
            <span className="text-sm text-ink-muted">Disponibilité du parc</span>
            <span className="font-display text-3xl font-semibold text-signal">{disponibilite}%</span>
          </div>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-signal" style={{ width: `${disponibilite}%` }} />
          </div>
        </section>

        {/* KPI */}
        <section className="grid grid-cols-2 gap-4">
          <div className="border border-border bg-surface p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-ink-muted">Résolution moy.</span>
              <span className="font-mono text-sm">{KPI_RESOLUTION.at(-1)} min</span>
            </div>
            <Sparkline values={KPI_RESOLUTION} couleur="var(--color-signal)" />
          </div>
          <div className="border border-border bg-surface p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-ink-muted">Incidents / jour</span>
              <span className="font-mono text-sm">{KPI_INCIDENTS.at(-1)}</span>
            </div>
            <Sparkline values={KPI_INCIDENTS} couleur="var(--color-warning)" />
          </div>
        </section>

        {/* Routeurs à surveiller */}
        <section>
          <h2 className="mb-3 text-sm text-ink-muted">Routeurs à surveiller</h2>
          <div className="divide-y divide-border border border-border bg-surface">
            {ROUTEURS.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Pastille etat={r.etat} />
                  <div>
                    <div className="text-sm">{r.nom}</div>
                    <div className="text-xs text-ink-muted">{r.client}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs text-ink-muted">{r.id}</div>
                  <div className="font-mono text-[11px] text-ink-faint">depuis {r.depuis}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Alertes récentes */}
        <section>
          <h2 className="mb-3 text-sm text-ink-muted">Alertes récentes</h2>
          <div className="divide-y divide-border border border-border bg-surface">
            {ALERTES.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div>
                  <div className="text-sm">{a.message}</div>
                  <div className="mt-1 font-mono text-[11px] text-ink-faint">
                    {a.routeur} · {a.client}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className={`rounded-sm border px-1.5 py-0.5 text-[10px] ${SEVERITE_STYLE[a.severite]}`}>
                    {SEVERITE_LABEL[a.severite]}
                  </span>
                  <span className="font-mono text-[11px] text-ink-faint">{a.heure}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tickets ouverts */}
        <section className="pb-6">
          <h2 className="mb-3 text-sm text-ink-muted">Tickets ouverts</h2>
          <div className="divide-y divide-border border border-border bg-surface">
            {TICKETS.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm">{t.sujet}</div>
                  <div className="mt-1 font-mono text-[11px] text-ink-faint">
                    {t.id} · {t.client}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-warning">{STATUT_LABEL[t.statut]}</div>
                  <div className="font-mono text-[11px] text-ink-faint">
                    {t.technicien ?? "non assigné"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
