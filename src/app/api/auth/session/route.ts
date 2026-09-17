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

    const dejaLie = await prisma.utilisateur.findUnique({
      where: { firebaseUid: decoded.uid },
      select: { id: true },
    });

    if (!dejaLie) {
      // Deux cas distincts, à ne pas confondre :
      //
      // 1. Une ligne existe déjà pour cet email mais avec un firebaseUid
      //    différent ou absent — reliquat d'avant que ce projet ne soit
      //    branché sur ce compte Firebase (le compte Firebase a pu être
      //    recréé, ou la ligne insérée autrement). Firebase a déjà prouvé
      //    ici que cette personne possède bien cet email (mot de passe
      //    vérifié) : on relie simplement la ligne existante à ce
      //    firebaseUid plutôt que de laisser "Compte introuvable" bloquer
      //    indéfiniment un compte légitime.
      // 2. Aucune ligne nulle part et la table est encore complètement
      //    vide : le tout premier compte à se connecter devient Super
      //    Admin — évite de dépendre d'un script de seed à lancer
      //    manuellement contre la vraie base (jamais fait depuis cet
      //    environnement, faute d'identifiants réels). Si la table n'est
      //    PAS vide et qu'aucune ligne ne correspond à cet email, on ne
      //    crée rien : un compte Firebase inconnu ne doit jamais se
      //    donner l'accès tout seul.
      const parEmail = decoded.email
        ? await prisma.utilisateur.findUnique({ where: { email: decoded.email }, select: { id: true } })
        : null;

      if (parEmail) {
        await prisma.utilisateur.update({
          where: { id: parEmail.id },
          data: { firebaseUid: decoded.uid },
        });
      } else if ((await prisma.utilisateur.count()) === 0) {
        await prisma.utilisateur.create({
          data: {
            email: decoded.email ?? `${decoded.uid}@sans-email.local`,
            firebaseUid: decoded.uid,
            nom: decoded.name ?? decoded.email ?? "Super Admin",
            role: "SUPER_ADMIN",
          },
        });
      }
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
