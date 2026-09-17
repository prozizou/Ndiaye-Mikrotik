// src/lib/firebase/admin.ts
// Firebase Admin — utilisé uniquement côté serveur (Node runtime), jamais
// dans le middleware (incompatible edge) ni envoyé au navigateur.
// authAdmin : vérifie les sessions (Firebase Auth).
// dbAdmin   : lit/écrit les données de l'app (Firebase Realtime Database) —
// remplace Postgres/Prisma, retiré pour ne dépendre que de Firebase.

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

function initFirebaseAdmin(): App {
  const appsExistants = getApps();
  if (appsExistants.length > 0) return appsExistants[0];

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Les retours à la ligne sont échappés dans les variables d'env (.env)
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const app = initFirebaseAdmin();

export const authAdmin = getAuth(app);
export const dbAdmin = getDatabase(app);
