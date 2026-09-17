#!/bin/sh
# scripts/build.sh
# Ne pousse le schéma (prisma db push) que sur un vrai build de Production.
# DIRECT_URL n'est configuré que sur l'environnement Production côté Vercel
# — un déploiement Preview (branche de travail) échouait donc toujours dès
# cette étape, sans rapport avec le code, juste bruyant et déroutant.
#
# C'est aussi la bonne pratique : un déploiement Preview ne devrait jamais
# pouvoir pousser un changement de schéma non revu vers la base partagée de
# production (risque déjà identifié dans ce projet, voir git log sur
# prisma/schema.prisma).
set -e

if [ "$VERCEL_ENV" = "production" ]; then
  npx prisma db push --skip-generate --accept-data-loss
else
  echo "Build Preview/local — prisma db push ignoré (réservé à Production)."
fi

npx next build
