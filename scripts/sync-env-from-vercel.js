/**
 * Copie le fichier créé par `vercel env pull` vers .env
 * pour garder .env et .env.local identiques.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, '.env.local');
const dst = path.join(root, '.env');

if (!fs.existsSync(src)) {
  console.error('Fichier .env.local introuvable. Lance d’abord : npx vercel env pull .env.local');
  process.exit(1);
}

fs.copyFileSync(src, dst);
console.log('OK — variables copiées .env.local → .env');
