// src/app/(app)/plus/page.tsx
// Hub des sections secondaires. Regroupe ce qui existe déjà (journal
// d'audit) et annonce honnêtement ce qui ne l'est pas encore (Clients,
// Techniciens, VPN, Paramètres) plutôt que de pointer vers des pages
// vides — voir ANALYSE-FAIBLESSES-AMELIORATIONS.md pour le principe.

import Link from "next/link";
import { utilisateurConnecte, peut } from "@/lib/permissions/permissions";
import { DeconnexionBouton } from "./deconnexion-bouton";

export default async function PagePlus() {
  const utilisateur = await utilisateurConnecte();
  const voitAudit = await peut("voirJournalAudit");

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div>
        <h1 className="font-display text-lg font-semibold tracking-tight">Plus</h1>
        <p className="text-sm text-ink-muted">
          {utilisateur.nom} · {LIBELLE_ROLE[utilisateur.role]}
        </p>
      </div>

      <section className="divide-y divide-border/70 border border-border/70 bg-surface">
        {voitAudit && (
          <CarteLien href="/audit" titre="Journal d'audit" description="Historique des actions sensibles" />
        )}
        <CarteBientot titre="Clients" description="Fiches clients, sites et contacts" />
        <CarteBientot titre="Techniciens" description="Équipe technique et disponibilité" />
        <CarteBientot titre="VPN" description="Tunnels WireGuard et supervision réseau" />
        <CarteBientot titre="Paramètres" description="Préférences et configuration du compte" />
      </section>

      <DeconnexionBouton />
    </div>
  );
}

const LIBELLE_ROLE: Record<string, string> = {
  SUPER_ADMIN: "Super admin",
  ADMINISTRATEUR: "Administrateur",
  TECHNICIEN: "Technicien",
  CLIENT: "Client",
};

function CarteLien({ href, titre, description }: { href: string; titre: string; description: string }) {
  return (
    <Link href={href} className="flex items-center justify-between px-4 py-3.5 hover:bg-surface-raised">
      <div>
        <div className="text-sm text-ink">{titre}</div>
        <div className="text-xs text-ink-muted">{description}</div>
      </div>
      <span className="text-ink-faint">→</span>
    </Link>
  );
}

function CarteBientot({ titre, description }: { titre: string; description: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div>
        <div className="text-sm text-ink-muted">{titre}</div>
        <div className="text-xs text-ink-faint">{description}</div>
      </div>
      <span className="rounded-sm border border-border-strong px-1.5 py-0.5 text-[10px] text-ink-faint">
        Bientôt
      </span>
    </div>
  );
}
