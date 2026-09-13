// src/lib/firebase/client.ts
// Firebase côté navigateur — sert uniquement à obtenir un idToken après
// connexion. Ce fichier peut être importé dans un composant client.

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(config);

export const authClient = getAuth(app);
