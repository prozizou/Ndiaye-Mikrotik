// src/lib/firebase/admin.ts
// Firebase Admin — utilisé uniquement côté serveur (Node runtime).
// Donne accès à la Realtime Database (données de l'app). Toute
// authentification a été retirée pour l'instant (voir historique git) —
// ce module ne sert donc plus qu'à ça, plus de vérification de session ici.

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
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

export const dbAdmin = getDatabase(app);
