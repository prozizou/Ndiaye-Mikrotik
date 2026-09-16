// src/app/(app)/layout.tsx
// Place routeurs/ et plus/ SOUS ce groupe (app)/ pour qu'ils héritent
// automatiquement de la sidebar — les autres sections (tickets, audit,
// assistance...) reviendront progressivement au même endroit.

import { AppShell } from "@/components/layout/app-shell";

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
