// src/app/layout.tsx
// Fusionne ceci avec ton layout racine existant si tu en as déjà un
// (garde tes propres métadonnées, ne garde que la partie polices ici).

import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: "Centre d'assistance MikroTik",
  description: "Supervision et assistance à distance du parc MikroTik",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
