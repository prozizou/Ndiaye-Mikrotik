// src/app/routeurs/[id]/page.tsx
// Fiche routeur : ce qu'il est (nom, IP), et un bouton pour vérifier qu'on
// peut vraiment lui parler (voir tester-connexion.tsx) — ça passe par la
// passerelle WireGuard, voir gateway/README.md. Diagnostic, intervention,
// historique, etc. reviendront progressivement.

import { notFound } from "next/navigation";
import { obtenirRouteur, obtenirSupervision } from "@/services/routeur.service";
import { exigerUtilisateur } from "@/lib/auth/session";
import { TesterConnexionBouton } from "./tester-connexion";

export default async function PageDetailRouteur({ params }: { params: { id: string } }) {
  await exigerUtilisateur();
  const routeur = await obtenirRouteur(params.id);
  if (!routeur) notFound();
  const supervision = await obtenirSupervision(routeur.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="font-display text-lg font-semibold tracking-tight">{routeur.nom}</h1>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-border/70 bg-surface p-4 text-sm shadow-sm">
        <Champ label="IP VPN" valeur={routeur.ipVpn} mono />
        <Champ label="Ajouté le" valeur={new Date(routeur.creeLe).toLocaleString("fr-FR")} />
      </div>

      {supervision && (
        <div
          className={`rounded-xl border p-3 text-sm ${
            supervision.ok ? "border-signal/30 bg-signal/10" : "border-critical/30 bg-critical/10"
          }`}
        >
          <div className={`font-medium ${supervision.ok ? "text-signal" : "text-critical"}`}>
            {supervision.ok ? "Contrôle automatique OK" : "Contrôle automatique en échec"}
          </div>
          <div className="mt-1 text-xs text-ink-muted">
            {supervision.ok
              ? `RouterOS ${supervision.version} — actif depuis ${supervision.tempsActivite}`
              : supervision.erreur}
            {" — "}
            {new Date(supervision.verifieLe).toLocaleString("fr-FR")}
          </div>
        </div>
      )}

      <TesterConnexionBouton routeurId={routeur.id} />
    </div>
  );
}

function Champ({ label, valeur, mono }: { label: string; valeur: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-ink-muted">{label}</div>
      <div className={`text-ink ${mono ? "font-mono" : ""}`}>{valeur}</div>
    </div>
  );
}
