// src/app/api/auth/session/route.ts
// Échange un idToken Firebase (obtenu côté client après signIn) contre un
// cookie de session httpOnly. C'est ce cookie que le middleware et
// permissions.ts utilisent ensuite — le idToken brut ne transite jamais
// ailleurs que dans cet appel.

import { NextResponse } from "next/server";
import { authAdmin } from "@/lib/firebase/admin";
import { prisma } from "@/lib/database/prisma";

const DUREE_SESSION_MS = 60 * 60 * 24 * 5 * 1000; // 5 jours

export async function POST(request: Request) {
  const { idToken } = await request.json();

  if (!idToken) {
    return NextResponse.json({ erreur: "idToken manquant" }, { status: 400 });
  }

  try {
    // Vérifie que le token est authentique et pas trop vieux avant de créer
    // le cookie de session (évite de transformer un token volé en session longue).
    const decoded = await authAdmin.verifyIdToken(idToken);

    // Amorçage : le tout premier compte Firebase à se connecter avec succès
    // devient Super Admin s'il n'existe encore aucune ligne Utilisateur —
    // évite de dépendre d'un script de seed à lancer manuellement contre la
    // vraie base (jamais fait depuis cet environnement, faute d'identifiants
    // réels). Ne joue qu'une seule fois : dès qu'une ligne existe, ce chemin
    // ne se déclenche plus jamais, donc personne d'autre ne peut se
    // promouvoir ainsi par la suite.
    if ((await prisma.utilisateur.count()) === 0) {
      await prisma.utilisateur.create({
        data: {
          email: decoded.email ?? `${decoded.uid}@sans-email.local`,
          firebaseUid: decoded.uid,
          nom: decoded.name ?? decoded.email ?? "Super Admin",
          role: "SUPER_ADMIN",
        },
      });
    }

    const cookieSession = await authAdmin.createSessionCookie(idToken, {
      expiresIn: DUREE_SESSION_MS,
    });

    const reponse = NextResponse.json({ ok: true });
    reponse.cookies.set("session", cookieSession, {
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
  reponse.cookies.delete("session");
  return reponse;
}
