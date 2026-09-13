// src/lib/firebase/admin.ts
// Firebase Admin — utilisé uniquement côté serveur (Node runtime), jamais
// dans le middleware (incompatible edge) ni envoyé au navigateur.

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

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
  });
}

const app = initFirebaseAdmin();

export const authAdmin = getAuth(app);
