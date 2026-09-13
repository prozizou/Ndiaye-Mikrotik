/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Jamais mis en cache par le navigateur/CDN : sinon un déploiement
        // peut rester invisible pendant des heures, le navigateur continuant
        // à croire que sw.js n'a pas changé.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Content-Type", value: "application/manifest+json" }],
      },
    ];
  },
};

export default nextConfig;
