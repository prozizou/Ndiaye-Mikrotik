// src/middleware.ts
// Garde de première ligne : redirige vers /login si aucun cookie de
// session n'est présent. Tourne sur l'edge runtime (Next 14) — ne peut donc
// pas vérifier la signature du cookie Firebase (ça a besoin de
// firebase-admin, Node uniquement). Cette vérification forte a lieu côté
// serveur dans exigerUtilisateur() (src/lib/auth/session.ts), appelée par
// chaque page/action protégée. Ce middleware n'est qu'un filtre rapide qui
// évite d'afficher une page protégée sans aucun cookie.

import { NextResponse, type NextRequest } from "next/server";

const NOM_COOKIE_SESSION = "session";

export function middleware(request: NextRequest) {
  if (request.cookies.has(NOM_COOKIE_SESSION)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/", "/routeurs/:path*", "/plus/:path*"],
};
