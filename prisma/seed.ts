// prisma/seed.ts
// Crée le Super Admin dans Firebase Auth, puis la ligne Postgres
// correspondante liée par firebaseUid.
// Lancer avec : npx prisma db seed

import { PrismaClient } from "@prisma/client";
import { authAdmin } from "../src/lib/firebase/admin";

// Connexion directe (DIRECT_URL), pas Accelerate : un script d'admin ponctuel
// n'a rien à gagner au pooling/cache, et évite de dépendre de l'extension
// Accelerate ici. Voir src/lib/database/prisma.ts pour le client applicatif.
const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

// Mot de passe temporaire — à changer dès la première connexion.
const MOT_DE_PASSE_TEMPORAIRE = "ChangeMoi123!";

async function creerOuRecupererCompteFirebase(email: string, nom: string) {
  try {
    return await authAdmin.getUserByEmail(email);
  } catch {
    return authAdmin.createUser({
      email,
      password: MOT_DE_PASSE_TEMPORAIRE,
      displayName: nom,
    });
  }
}

async function main() {
  const compteSuperAdmin = await creerOuRecupererCompteFirebase(
    "ndiayeMikrotik@gmail.com",
    "Ndiaye",
  );

  const superAdmin = await prisma.utilisateur.upsert({
    where: { email: "ndiayeMikrotik@gmail.com" },
    update: { firebaseUid: compteSuperAdmin.uid },
    create: {
      email: "ndiayeMikrotik@gmail.com",
      firebaseUid: compteSuperAdmin.uid,
      nom: "Ndiaye",
      role: "SUPER_ADMIN",
    },
  });

  console.log("Seed terminé :");
  console.log(`  Super Admin : ${superAdmin.email} / ${MOT_DE_PASSE_TEMPORAIRE}`);
  console.log("  -> à changer dès la première connexion.");
}

main()
  .catch((erreur) => {
    console.error(erreur);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
