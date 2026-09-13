// src/middleware.ts
// Le middleware tourne en edge runtime : il ne peut PAS vérifier le cookie
// de session avec Firebase Admin (incompatible edge). Il ne fait donc qu'une
// redirection de confort basée sur la présence du cookie. La vérification
// réelle (cookie valide + rôle) se fait dans permissions.ts, côté Node,
// sur chaque route/server action — c'est ça la vraie barrière de sécurité.

import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const aUneSession = request.cookies.has("session");
  const surLogin = request.nextUrl.pathname.startsWith("/login");

  if (!aUneSession && !surLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (aUneSession && surLogin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
