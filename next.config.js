/** @type {import('next').NextConfig} */

// Configuration de base propre
const nextConfig = {
  // Security headers (E.2 — OWASP)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
  // Optimisation des images pour Clerk (avatars)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
    ],
  },
};

// Configuration PWA intelligente
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  // IMPORTANT : On désactive le PWA en mode développement pour éviter les bugs de cache
  disable: process.env.NODE_ENV === "development", 
  register: true,
  skipWaiting: true,
});

module.exports = withPWA(nextConfig);