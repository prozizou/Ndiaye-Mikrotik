// src/app/routeurs/nouveau/page.tsx

import { exigerRole, ErreurAcces } from "@/lib/permissions/permissions";
import { prisma } from "@/lib/database/prisma";
import { creerRouteur } from "./actions";

const CHAMP =
  "w-full border border-border-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none";

export default async function PageNouveauRouteur() {
  try {
    await exigerRole("SUPER_ADMIN", "ADMINISTRATEUR");
  } catch (erreur) {
    if (erreur instanceof ErreurAcces) {
      return <p className="p-4 text-sm text-ink-muted">Accès refusé.</p>;
    }
    throw erreur;
  }

  const sites = await prisma.site.findMany({
    include: { client: { select: { nom: true } } },
    orderBy: { nom: "asc" },
  });

  return (
    <form action={creerRouteur} className="mx-auto max-w-lg space-y-3 p-4">
      <h1 className="font-display text-lg font-semibold tracking-tight">Ajouter un routeur</h1>

      <div>
        <label className="mb-1 block text-sm text-ink-muted">Site</label>
        <select name="siteId" required className={CHAMP}>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.client.nom} — {site.nom}
            </option>
          ))}
        </select>
      </div>

      <input name="nom" placeholder="Nom du routeur (ex: Entrepôt Nord)" required className={CHAMP} />
      <input name="modele" placeholder="Modèle (ex: RB4011)" className={CHAMP} />
      <input name="versionRouterOs" placeholder="Version RouterOS (ex: 7.15)" className={CHAMP} />
      <input name="numeroSerie" placeholder="Numéro de série" className={CHAMP} />

      <hr className="border-border/70" />

      <input name="ipVpn" placeholder="IP VPN (ex: 10.100.0.24)" required className={CHAMP} />
      <input name="clePubliqueWg" placeholder="Clé publique WireGuard du routeur (facultatif)" className={CHAMP} />

      <hr className="border-border/70" />

      <input name="utilisateurApi" placeholder="Utilisateur API RouterOS" required className={CHAMP} />
      <input
        name="motDePasseApi"
        type="password"
        placeholder="Mot de passe API RouterOS"
        required
        className={CHAMP}
      />

      <button
        type="submit"
        className="w-full border border-brand bg-brand/10 px-3 py-2 text-sm font-medium text-ink hover:bg-brand/20"
      >
        Créer le routeur
      </button>
    </form>
  );
}
