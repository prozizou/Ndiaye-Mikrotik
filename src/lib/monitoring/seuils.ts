// src/lib/monitoring/seuils.ts
// Seuils de déclenchement des alertes automatiques (voir
// services/alerte.service.ts). En dur pour l'instant : les rendre
// configurables depuis un écran Administration est un chantier séparé
// (Phase 6+), pas quelque chose à improviser ici.

// CPU au-dessus de ce seuil → AVERTISSEMENT. Le cahier des charges parle
// d'un seuil "pendant 10 minutes" — impossible à évaluer tant que le
// diagnostic est déclenché à la main plutôt que par une supervision
// continue (Phase 7) : on déclenche donc dès la lecture unique au-dessus du
// seuil, et l'alerte se referme au diagnostic suivant si la charge est
// redescendue.
export const SEUIL_CPU_AVERTISSEMENT = 85;

// Latence moyenne du ping WAN au-dessus de ce seuil (ms) → AVERTISSEMENT.
export const SEUIL_LATENCE_AVERTISSEMENT_MS = 150;
