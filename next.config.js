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

// Configuration PWA — même comportement en dev et prod (évite les écarts Clerk, notifications)
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: false,
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