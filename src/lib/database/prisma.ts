// src/lib/database/prisma.ts
// Base hébergée sur Prisma Postgres (Accelerate) — DATABASE_URL est une
// chaîne `prisma+postgres://...`, pas une connexion Postgres classique ;
// l'extension withAccelerate() est ce qui sait parler ce protocole (pooling
// + cache gérés par Prisma). Voir prisma/schema.prisma pour DIRECT_URL,
// utilisée séparément par le CLI pour les migrations.
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

function creerClientPrisma(): PrismaClient {
  // Le typage de $extends() fait perdre l'inférence des méthodes de modèle
  // avec cette combinaison de versions (prisma 5.x + extension-accelerate
  // 3.x — cette dernière vise surtout les versions récentes de Prisma).
  // On recatégorise en PrismaClient : la forme à l'exécution est identique
  // pour tout ce qu'on utilise ici (aucun appel n'exploite les options
  // `cacheStrategy` propres à Accelerate). À revoir si on migre vers une
  // version plus récente de Prisma, ou si on veut du cache par requête.
  return new PrismaClient().$extends(withAccelerate()) as unknown as PrismaClient;
}

const globalPourPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalPourPrisma.prisma ?? creerClientPrisma();

if (process.env.NODE_ENV !== "production") {
  globalPourPrisma.prisma = prisma;
}
