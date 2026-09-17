// src/lib/firebase/client.ts
// SDK Firebase côté navigateur — uniquement pour l'authentification (écran
// de connexion email + code à 6 chiffres, voir src/app/login). Ce client
// n'a jamais accès à la Realtime Database : les données de l'app
// (routeurs, secrets) passent uniquement par le serveur, voir
// src/lib/firebase/admin.ts.

import { initializeApp, getApps, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";

const config: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = getApps()[0] ?? initializeApp(config);

export const authClient = getAuth(app);
