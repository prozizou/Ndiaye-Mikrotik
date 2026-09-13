// prisma/seed.ts
// Crée le Super Admin et un client de test dans Firebase Auth, puis les
// lignes Postgres correspondantes liées par firebaseUid.
// Lancer avec : npx prisma db seed

import { PrismaClient } from "@prisma/client";
import { authAdmin } from "../src/lib/firebase/admin";

const prisma = new PrismaClient();

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
  // --- Super Admin --------------------------------------------------------
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

  // --- Client de test + site + compte de connexion client ----------------
  const clientTest = await prisma.client.upsert({
    where: { id: "client-test-seed" },
    update: {},
    create: {
      id: "client-test-seed",
      nom: "Client de test",
      email: "prozizou298@gmail.com",
    },
  });

  await prisma.site.upsert({
    where: { id: "site-test-seed" },
    update: {},
    create: {
      id: "site-test-seed",
      nom: "Site principal",
      clientId: clientTest.id,
    },
  });

  const compteClient = await creerOuRecupererCompteFirebase(
    "prozizou298@gmail.com",
    "Client de test",
  );

  const utilisateurClient = await prisma.utilisateur.upsert({
    where: { email: "prozizou298@gmail.com" },
    update: { firebaseUid: compteClient.uid },
    create: {
      email: "prozizou298@gmail.com",
      firebaseUid: compteClient.uid,
      nom: "Client de test",
      role: "CLIENT",
      clientId: clientTest.id,
    },
  });

  console.log("Seed terminé :");
  console.log(`  Super Admin : ${superAdmin.email} / ${MOT_DE_PASSE_TEMPORAIRE}`);
  console.log(`  Client      : ${utilisateurClient.email} / ${MOT_DE_PASSE_TEMPORAIRE}`);
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
