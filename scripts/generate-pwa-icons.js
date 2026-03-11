/**
 * Génère les icônes PWA (icon-192.png, icon-512.png)
 * Exécuter : node scripts/generate-pwa-icons.js
 * Nécessite : npm install sharp --save-dev
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#4f46e5"/>
  <path d="M256 96L128 160v96c0 88 64 168 128 208 64-40 128-120 128-208v-96L256 96z" fill="white" opacity="0.95"/>
</svg>`;

async function generate() {
  try {
    const sharp = require('sharp');
    const svgBuffer = Buffer.from(svgContent);

    for (const size of [192, 512]) {
      const outPath = path.join(publicDir, `icon-${size}.png`);
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outPath);
      console.log(`Icône générée: icon-${size}.png`);
    }
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.log('Installe sharp : npm install sharp --save-dev');
      console.log('Puis relance : node scripts/generate-pwa-icons.js');
      process.exit(1);
    }
    throw err;
  }
}

generate().catch((e) => {
  console.error(e);
  process.exit(1);
});
