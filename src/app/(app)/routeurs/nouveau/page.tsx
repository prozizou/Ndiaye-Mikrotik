// src/app/routeurs/nouveau/page.tsx
// Formulaire volontairement sobre — même logique que login/page.tsx, le
// design sera repris avec le reste de l'app une fois le MVP fonctionnel.

import { exigerRole, ErreurAcces } from "@/lib/permissions/permissions";
import { prisma } from "@/lib/database/prisma";
import { creerRouteur } from "./actions";

export default async function PageNouveauRouteur() {
  try {
    await exigerRole("SUPER_ADMIN", "ADMINISTRATEUR");
  } catch (erreur) {
    if (erreur instanceof ErreurAcces) {
      return <p className="p-4 text-sm text-gray-600">Accès refusé.</p>;
    }
    throw erreur;
  }

  const sites = await prisma.site.findMany({
    include: { client: { select: { nom: true } } },
    orderBy: { nom: "asc" },
  });

  return (
    <form action={creerRouteur} className="mx-auto mt-12 max-w-lg space-y-3 p-4">
      <h1 className="text-lg font-medium">Ajouter un routeur</h1>

      <div>
        <label className="block text-sm text-gray-600">Site</label>
        <select name="siteId" required className="w-full border p-2">
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.client.nom} — {site.nom}
            </option>
          ))}
        </select>
      </div>

      <input name="nom" placeholder="Nom du routeur (ex: Entrepôt Nord)" required className="w-full border p-2" />
      <input name="modele" placeholder="Modèle (ex: RB4011)" className="w-full border p-2" />
      <input name="versionRouterOs" placeholder="Version RouterOS (ex: 7.15)" className="w-full border p-2" />
      <input name="numeroSerie" placeholder="Numéro de série" className="w-full border p-2" />

      <hr className="border-gray-200" />

      <input name="ipVpn" placeholder="IP VPN (ex: 10.100.0.24)" required className="w-full border p-2" />
      <input
        name="clePubliqueWg"
        placeholder="Clé publique WireGuard du routeur"
        required
        className="w-full border p-2"
      />

      <hr className="border-gray-200" />

      <input
        name="utilisateurApi"
        placeholder="Utilisateur API RouterOS"
        required
        className="w-full border p-2"
      />
      <input
        name="motDePasseApi"
        type="password"
        placeholder="Mot de passe API RouterOS"
        required
        className="w-full border p-2"
      />

      <button type="submit" className="w-full border p-2">
        Créer le routeur
      </button>
    </form>
  );
}
