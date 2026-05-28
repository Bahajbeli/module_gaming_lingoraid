#!/usr/bin/env node
/** Teste la connexion Cloudinary (upload SVG minimal). */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { isCloudinaryConfigured, uploadSvgContent } = require('../services/cloudinaryService');

async function main() {
  if (!isCloudinaryConfigured()) {
    console.error('❌ Cloudinary non configuré.');
    console.error('   Ajoutez dans backend/.env :');
    console.error('   CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@VOTRE_CLOUD_NAME');
    console.error('   (cloud name = console.cloudinary.com → Dashboard → Product environment)');
    process.exit(1);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect width="100" height="60" fill="#3b82f6"/><text x="10" y="35" fill="white" font-size="12">LingoRaid OK</text></svg>`;

  try {
    const url = await uploadSvgContent(svg, { publicId: 'lingoraid/ping-test' });
    console.log('✅ Cloudinary OK');
    console.log('   URL:', url);
  } catch (e) {
    console.error('❌ Échec:', e.message);
    process.exit(1);
  }
}

main();
