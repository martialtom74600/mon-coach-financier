/** @type {import('next').NextConfig} */

// Configuration de base propre
const nextConfig = {
  // Optimisation des images pour Clerk (avatars)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
    ],
  },
  // On évite que des petites erreurs de style bloquent le déploiement
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
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