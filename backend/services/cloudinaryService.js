/**
 * Upload des scènes créativité vers Cloudinary (CDN).
 * Nécessite CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET dans .env
 */

const fs = require('fs');
const path = require('path');

let configured = false;

function isCloudinaryConfigured() {
  if (process.env.CLOUDINARY_URL) return true;
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function getCloudinary() {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary non configuré — CLOUDINARY_URL ou CLOUDINARY_CLOUD_NAME + API_KEY + API_SECRET dans backend/.env'
    );
  }
  const cloudinary = require('cloudinary').v2;
  if (!configured) {
    if (process.env.CLOUDINARY_URL) {
      cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL, secure: true });
    } else {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
      });
    }
    configured = true;
  }
  return cloudinary;
}

/**
 * Upload un fichier image (SVG/PNG) vers Cloudinary.
 * @returns {Promise<string>} URL HTTPS publique
 */
async function uploadImageFile(localPath, { publicId, folder = 'lingoraid/creativity' } = {}) {
  const cloudinary = getCloudinary();
  const options = {
    folder,
    resource_type: 'image',
    overwrite: true,
    invalidate: true,
  };
  if (publicId) options.public_id = publicId;

  const result = await cloudinary.uploader.upload(localPath, options);
  return result.secure_url;
}

/**
 * Upload SVG en mémoire (évite un fichier temporaire si déjà écrit).
 */
async function uploadSvgContent(svgString, { publicId, folder = 'lingoraid/creativity' } = {}) {
  const cloudinary = getCloudinary();
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(svgString, 'utf8').toString('base64')}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    public_id: publicId,
    resource_type: 'image',
    overwrite: true,
    invalidate: true,
  });
  return result.secure_url;
}

/**
 * Écrit le SVG localement puis upload Cloudinary si configuré.
 * @returns {{ imageUrl: string, localPath?: string, cloudinary: boolean }}
 */
function toPublicUploadPath(localPath) {
  const norm = String(localPath || '').replace(/\\/g, '/');
  const i = norm.indexOf('/uploads/');
  return i >= 0 ? norm.slice(i) : norm;
}

async function publishSceneImage({ localPath, svgContent, slug }) {
  if (!isCloudinaryConfigured()) {
    return { imageUrl: toPublicUploadPath(localPath), cloudinary: false };
  }

  try {
    const url = svgContent
      ? await uploadSvgContent(svgContent, { publicId: slug })
      : await uploadImageFile(localPath, { publicId: slug });

    if (process.env.CLOUDINARY_DELETE_LOCAL === 'true' && localPath && fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }

    return { imageUrl: url, localPath, cloudinary: true };
  } catch (err) {
    console.warn(`  ⚠️  Cloudinary upload (${slug}):`, err.message);
    return { imageUrl: toPublicUploadPath(localPath), cloudinary: false };
  }
}

module.exports = {
  isCloudinaryConfigured,
  uploadImageFile,
  uploadSvgContent,
  publishSceneImage,
};
