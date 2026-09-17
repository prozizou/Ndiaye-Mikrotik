// src/app/routeurs/connexion-rapide/page.tsx
// Unique porte d'entrée de l'app pour l'instant : IP + identifiant + mot de
// passe, rien d'autre. Diagnostic et intervention reviendront
// progressivement.

import { connexionRapide } from "./actions";

const CHAMP =
  "w-full border border-border-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none";

export default function PageConnexionRapide() {
  return (
    <form action={connexionRapide} className="mx-auto max-w-md space-y-3 p-4">
      <div>
        <h1 className="font-display text-lg font-semibold tracking-tight">Ajouter un routeur</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Adresse IP, identifiant, mot de passe — le strict nécessaire pour l&apos;instant.
        </p>
      </div>

      <input
        name="ip"
        placeholder="Adresse IP du MikroTik (ex: 10.100.0.2)"
        required
        className={`${CHAMP} font-mono`}
      />
      <input name="utilisateurApi" placeholder="Identifiant" required className={CHAMP} />
      <input
        name="motDePasseApi"
        type="password"
        placeholder="Mot de passe"
        required
        className={CHAMP}
      />
      <input name="nom" placeholder="Nom (facultatif — sinon l'IP sera utilisée)" className={CHAMP} />

      <button
        type="submit"
        className="w-full border border-brand bg-brand/10 px-3 py-2 text-sm font-medium text-ink hover:bg-brand/20"
      >
        Ajouter
      </button>

      <p className="text-xs text-ink-faint">
        L&apos;IP doit être joignable par la passerelle (réseau VPN) — voir gateway/README.md.
      </p>
    </form>
  );
}
