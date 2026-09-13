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
    <form action={creerTicketAction} className="mx-auto mt-12 max-w-lg space-y-3 p-4">
      <h1 className="text-lg font-medium">Nouveau ticket</h1>

      {clients && (
        <div>
          <label className="block text-sm text-gray-600">Client</label>
          <select name="clientId" required className="w-full border p-2">
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm text-gray-600">Routeur concerné (optionnel)</label>
        <select name="routeurId" className="w-full border p-2">
          <option value="">—</option>
          {routeurs.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nom} ({r.site.nom})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-600">Catégorie</label>
        <select name="categorie" required className="w-full border p-2">
          {CATEGORIES.map(([valeur, libelle]) => (
            <option key={valeur} value={valeur}>
              {libelle}
            </option>
          ))}
        </select>
      </div>

      <input name="sujet" placeholder="Sujet" required className="w-full border p-2" />
      <textarea
        name="description"
        placeholder="Description (optionnel)"
        rows={4}
        className="w-full border p-2"
      />

      <button type="submit" className="w-full border p-2">
        Créer le ticket
      </button>
    </form>
  );
}
