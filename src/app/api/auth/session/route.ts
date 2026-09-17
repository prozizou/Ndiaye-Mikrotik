// src/app/api/auth/session/route.ts
// Échange un jeton d'identité Firebase (obtenu côté client après un
// signInWithEmailAndPassword réussi — voir login-flow.tsx) contre un cookie
// de session httpOnly. La connexion côté client a déjà prouvé que
// l'utilisateur existe dans Firebase Authentication ; verifyIdToken ici ne
// fait que confirmer que le jeton reçu est authentique et récent avant de
// créer le cookie.

import { NextRequest, NextResponse } from "next/server";
import { authAdmin } from "@/lib/firebase/admin";
import { NOM_COOKIE_SESSION, DUREE_SESSION_MS } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const corps = await request.json().catch(() => null);
  const idToken = corps?.idToken;
  if (typeof idToken !== "string" || idToken.length === 0) {
    return NextResponse.json({ erreur: "Jeton manquant" }, { status: 400 });
  }

  try {
    await authAdmin.verifyIdToken(idToken);
    const cookie = await authAdmin.createSessionCookie(idToken, { expiresIn: DUREE_SESSION_MS });

    const reponse = NextResponse.json({ ok: true });
    reponse.cookies.set(NOM_COOKIE_SESSION, cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: DUREE_SESSION_MS / 1000,
      path: "/",
    });
    return reponse;
  } catch {
    return NextResponse.json({ erreur: "Jeton invalide" }, { status: 401 });
  }
}

export async function DELETE() {
  const reponse = NextResponse.json({ ok: true });
  reponse.cookies.set(NOM_COOKIE_SESSION, "", { maxAge: 0, path: "/" });
  return reponse;
}
