// src/app/routeurs/[id]/page.tsx

import { notFound } from "next/navigation";
import { prisma } from "@/lib/database/prisma";
import { utilisateurConnecte, exigerAccesClient, ErreurAcces } from "@/lib/permissions/permissions";
import { BoutonDiagnostic } from "./bouton-diagnostic";
import { BoutonsIntervention } from "./boutons-intervention";

export default async function PageDetailRouteur({ params }: { params: { id: string } }) {
  const utilisateur = await utilisateurConnecte();

  const routeur = await prisma.routeur.findUnique({
    where: { id: params.id },
    include: {
      site: { include: { client: { select: { id: true, nom: true } } } },
      diagnostics: { orderBy: { lanceLe: "desc" }, take: 10 },
      interventions: { orderBy: { demarreeLe: "desc" }, take: 10 },
      tickets: { orderBy: { creeLe: "desc" }, take: 5 },
    },
  });

  if (!routeur) notFound();

  try {
    await exigerAccesClient(routeur.site.client.id);
  } catch (erreur) {
    if (erreur instanceof ErreurAcces) {
      return <p className="p-4 text-sm text-gray-600">Accès refusé.</p>;
    }
    throw erreur;
  }

  const peutIntervenir = ["SUPER_ADMIN", "ADMINISTRATEUR", "TECHNICIEN"].includes(utilisateur.role);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div>
        <h1 className="text-lg font-medium">{routeur.nom}</h1>
        <p className="text-sm text-gray-500">
          {routeur.site.client.nom} — {routeur.site.nom}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 border border-gray-200 p-3 text-sm">
        <Champ label="État" valeur={routeur.enLigne ? "En ligne" : "Hors ligne"} />
        <Champ label="IP VPN" valeur={routeur.ipVpn} mono />
        <Champ label="Modèle" valeur={routeur.modele ?? "—"} />
        <Champ label="RouterOS" valeur={routeur.versionRouterOs ?? "—"} />
        <Champ label="Numéro de série" valeur={routeur.numeroSerie ?? "—"} mono />
        <Champ
          label="Dernière communication"
          valeur={
            routeur.derniereCommunication
              ? routeur.derniereCommunication.toLocaleString("fr-FR")
              : "jamais"
          }
        />
      </div>

      {peutIntervenir && (
        <div className="space-y-3">
          <BoutonDiagnostic routeurId={routeur.id} />
          <BoutonsIntervention routeurId={routeur.id} />
        </div>
      )}

      <section>
        <h2 className="mb-2 text-sm text-gray-500">Dernières interventions</h2>
        <div className="divide-y divide-gray-200 border border-gray-200">
          {routeur.interventions.map((i) => (
            <div key={i.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div>{i.type.replaceAll("_", " ").toLowerCase()}</div>
              <div className="text-xs text-gray-500">
                {i.resultat ?? "en cours"} · {i.demarreeLe.toLocaleString("fr-FR")}
              </div>
            </div>
          ))}
          {routeur.interventions.length === 0 && (
            <p className="px-3 py-4 text-sm text-gray-500">Aucune intervention pour l'instant.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm text-gray-500">Derniers diagnostics</h2>
        <div className="divide-y divide-gray-200 border border-gray-200">
          {routeur.diagnostics.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div>
                <div>{d.problemeProbable ?? "Aucun problème détecté"}</div>
                <div className="font-mono text-xs text-gray-500">
                  ping {libelleBooleen(d.pingOk)} · wan {libelleBooleen(d.wanOk)} · dns{" "}
                  {libelleBooleen(d.dnsOk)}
                </div>
              </div>
              <div className="whitespace-nowrap text-xs text-gray-500">
                {d.lanceLe.toLocaleString("fr-FR")}
              </div>
            </div>
          ))}
          {routeur.diagnostics.length === 0 && (
            <p className="px-3 py-4 text-sm text-gray-500">Aucun diagnostic lancé pour l'instant.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm text-gray-500">Tickets liés</h2>
        <div className="divide-y divide-gray-200 border border-gray-200">
          {routeur.tickets.map((t) => (
            <div key={t.id} className="px-3 py-2 text-sm">
              <div>{t.sujet}</div>
              <div className="text-xs text-gray-500">
                {t.numero} · {t.statut}
              </div>
            </div>
          ))}
          {routeur.tickets.length === 0 && (
            <p className="px-3 py-4 text-sm text-gray-500">Aucun ticket lié.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Champ({ label, valeur, mono }: { label: string; valeur: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={mono ? "font-mono" : ""}>{valeur}</div>
    </div>
  );
}

function libelleBooleen(valeur: boolean | null) {
  if (valeur === null) return "—";
  return valeur ? "ok" : "échec";
}
