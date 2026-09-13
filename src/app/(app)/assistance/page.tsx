// src/app/(app)/assistance/page.tsx
// Étape 1 du parcours cible (Connexion sécurisée → Diagnostic →
// Intervention → Vérification → Rapport) : la page existe et oriente vers
// ce qui fonctionne déjà aujourd'hui (diagnostic/intervention sur la fiche
// routeur). Le parcours guidé en étapes est un chantier séparé — mieux vaut
// annoncer honnêtement l'état actuel que simuler un flux qui n'agit pas
// réellement.

import Link from "next/link";
import { utilisateurConnecte } from "@/lib/permissions/permissions";

const ETAPES = [
  { titre: "Connexion sécurisée", description: "Vérification du tunnel VPN vers le routeur" },
  { titre: "Diagnostic", description: "Ping, WAN, DNS — déjà disponible sur la fiche routeur" },
  { titre: "Intervention", description: "Redémarrage, sauvegarde de configuration" },
  { titre: "Vérification", description: "Confirmation que le problème est résolu" },
  { titre: "Rapport", description: "Historisé automatiquement dans le journal d'audit" },
] as const;

export default async function PageAssistance() {
  const utilisateur = await utilisateurConnecte();
  const estStaff = utilisateur.role !== "CLIENT";

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div>
        <h1 className="font-display text-lg font-semibold tracking-tight">Assistance à distance</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {estStaff
            ? "Le parcours guidé complet arrive bientôt. En attendant, le diagnostic et l'intervention sont disponibles directement sur la fiche de chaque routeur."
            : "L'assistance à distance est réalisée par notre équipe technique. Ouvre un ticket si tu rencontres un problème."}
        </p>
      </div>

      <section className="border border-border/70 bg-surface">
        {ETAPES.map((etape, i) => (
          <div
            key={etape.titre}
            className={`flex items-start gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-border/70" : ""}`}
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border-strong font-mono text-[11px] text-ink-muted">
              {i + 1}
            </span>
            <div>
              <div className="text-sm text-ink">{etape.titre}</div>
              <div className="text-xs text-ink-muted">{etape.description}</div>
            </div>
          </div>
        ))}
      </section>

      {estStaff ? (
        <Link
          href="/routeurs"
          className="block w-full border border-brand bg-brand/10 px-4 py-3 text-center text-sm font-medium text-ink hover:bg-brand/20"
        >
          Choisir un routeur
        </Link>
      ) : (
        <Link
          href="/tickets/nouveau"
          className="block w-full border border-brand bg-brand/10 px-4 py-3 text-center text-sm font-medium text-ink hover:bg-brand/20"
        >
          Ouvrir un ticket
        </Link>
      )}
    </div>
  );
}
