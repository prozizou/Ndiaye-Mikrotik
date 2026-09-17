// src/app/(app)/plus/page.tsx
// Hub des sections secondaires. Presque tout annonce honnêtement "Bientôt"
// pour l'instant — le gros du produit revient progressivement plutôt que
// d'être reconstruit d'un bloc. Pas d'authentification pour l'instant
// (retirée volontairement, voir historique git) — donc rien à afficher ici
// sur "qui est connecté", ni de bouton de déconnexion.

export default function PagePlus() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div>
        <h1 className="font-display text-lg font-semibold tracking-tight">Plus</h1>
      </div>

      <section className="divide-y divide-border/70 rounded-xl border border-border/70 bg-surface shadow-sm">
        <CarteBientot titre="Authentification" description="Connexion et gestion des accès" />
        <CarteBientot titre="Diagnostic & intervention" description="Analyser et agir sur un routeur" />
        <CarteBientot titre="Tickets" description="Suivi des demandes d'assistance" />
        <CarteBientot titre="Clients & sites" description="Organisation multi-client" />
        <CarteBientot titre="Journal d'audit" description="Historique des actions sensibles" />
        <CarteBientot titre="Paramètres" description="Préférences et configuration du compte" />
      </section>
    </div>
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
