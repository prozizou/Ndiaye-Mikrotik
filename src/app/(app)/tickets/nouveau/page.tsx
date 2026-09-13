// src/app/tickets/nouveau/page.tsx

import { utilisateurConnecte } from "@/lib/permissions/permissions";
import { prisma } from "@/lib/database/prisma";
import { creerTicketAction } from "./actions";

const CATEGORIES = [
  ["INTERNET_COUPE", "Internet coupé"],
  ["INTERNET_LENT", "Internet lent"],
  ["WIFI_INACCESSIBLE", "Wi-Fi inaccessible"],
  ["DNS", "Problème DNS"],
  ["APPAREIL_NON_CONNECTE", "Appareil non connecté"],
  ["HOTSPOT", "Hotspot"],
  ["VPN", "VPN"],
  ["AUTRE", "Autre problème"],
] as const;

const CHAMP =
  "w-full border border-border-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none";

export default async function PageNouveauTicket() {
  const utilisateur = await utilisateurConnecte();

  const clients =
    utilisateur.role !== "CLIENT"
      ? await prisma.client.findMany({ orderBy: { nom: "asc" } })
      : null;

  const routeurs = await prisma.routeur.findMany({
    where:
      utilisateur.role === "CLIENT" ? { site: { clientId: utilisateur.clientId! } } : undefined,
    include: { site: true },
    orderBy: { nom: "asc" },
  });

  return (
    <form action={creerTicketAction} className="mx-auto max-w-lg space-y-3 p-4">
      <h1 className="font-display text-lg font-semibold tracking-tight">Nouveau ticket</h1>

      {clients && (
        <div>
          <label className="mb-1 block text-sm text-ink-muted">Client</label>
          <select name="clientId" required className={CHAMP}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm text-ink-muted">Routeur concerné (optionnel)</label>
        <select name="routeurId" className={CHAMP}>
          <option value="">—</option>
          {routeurs.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nom} ({r.site.nom})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm text-ink-muted">Catégorie</label>
        <select name="categorie" required className={CHAMP}>
          {CATEGORIES.map(([valeur, libelle]) => (
            <option key={valeur} value={valeur}>
              {libelle}
            </option>
          ))}
        </select>
      </div>

      <input name="sujet" placeholder="Sujet" required className={CHAMP} />
      <textarea name="description" placeholder="Description (optionnel)" rows={4} className={CHAMP} />

      <button
        type="submit"
        className="w-full border border-brand bg-brand/10 px-3 py-2 text-sm font-medium text-ink hover:bg-brand/20"
      >
        Créer le ticket
      </button>
    </form>
  );
}
