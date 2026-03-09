/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');

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
  // I.3 — Custom worker pour push notifications
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