/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');

// Configuration de base propre
const nextConfig = {
  // Réduit fortement le JS client pour les paquets “barrel” (icônes, etc.)
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@nivo/core', '@nivo/sankey'],
  },
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

// Configuration PWA — désactivé en dev pour éviter les bugs de cache
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  customWorkerSrc: "worker",
});

// E.5 — Sentry : wrap après PWA pour instrumenter le build final
const configWithPWA = withPWA(nextConfig);
module.exports = withSentryConfig(configWithPWA, {
  org: process.env.SENTRY_ORG ?? 'mon-coach-financier',
  project: process.env.SENTRY_PROJECT ?? 'mon-coach-financier',
  silent: !process.env.CI,
  authToken: process.env.SENTRY_AUTH_TOKEN,
});