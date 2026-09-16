// src/app/layout.tsx
// Fusionne ceci avec ton layout racine existant si tu en as déjà un
// (garde tes propres métadonnées, ne garde que la partie polices ici).

import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { PwaClient } from "@/components/pwa/pwa-client";

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
  title: "Ndiaye Mikrotik — Centre d'assistance MikroTik",
  description: "Supervision et assistance à distance du parc MikroTik",
  applicationName: "Ndiaye Mikrotik",
  manifest: "/manifest.webmanifest",
  // PWA installable (Android/desktop via l'invite personnalisée dans
  // pwa-client.tsx, iOS via "Sur l'écran d'accueil") — voir public/sw.js
  // pour la stratégie de cache (network-first, rien de sensible persisté).
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ndiaye Mikrotik",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [{ rel: "mask-icon", url: "/icons/safari-pinned-tab.svg", color: "#2563eb" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#eef2f8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
      <body>
        {children}
        <PwaClient />
      </body>
    </html>
  );
}
