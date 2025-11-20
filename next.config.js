/** @type {import('next').NextConfig} */
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public', // Dossier de destination des fichiers PWA
  cacheOnFrontEndNav: true, // Rend la navigation instantanée
  aggressiveFrontEndNavCaching: true, // Cache agressif pour la vitesse
  reloadOnOnline: true, // Recharge l'app si on retrouve la connexion
  swcMinify: true, // Minification pour plus de performance

  // Mettre 'false' ici force le mode PWA même en localhost (pour tester)
  // Une fois en production, tu pourras mettre : process.env.NODE_ENV === "development"
  disable: false,

  workboxOptions: {
    disableDevLogs: true, // Garde la console propre
  },
});

const nextConfig = {
  // Tes autres configurations Next.js iront ici si besoin
  // Par exemple pour les images externes :
  // images: { domains: ['example.com'] },
};

module.exports = withPWA(nextConfig);
