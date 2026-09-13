// src/app/(app)/layout.tsx
// Place dashboard/, routeurs/, tickets/ et audit/ SOUS ce groupe (app)/ pour
// qu'ils héritent automatiquement de la sidebar — voir note d'explication.

import { AppShell } from "@/components/layout/app-shell";

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
