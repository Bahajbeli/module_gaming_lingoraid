const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Créer le dossier uploads s'il n'existe pas
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration du stockage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Générer un nom de fichier unique avec timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtre pour les types de fichiers autorisés
const fileFilter = (req, file, cb) => {
  // Images autorisées
  if (file.fieldname === 'image') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées pour ce champ'), false);
    }
  }
  // Vidéos autorisées
  else if (file.fieldname === 'video') {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les vidéos sont autorisées pour ce champ'), false);
    }
  }
  // PDF autorisé
  else if (file.fieldname === 'pdf') {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF sont autorisés pour ce champ'), false);
    }
  }
  // Fichiers génériques
  else {
    cb(null, true);
  }
};

// Configuration de Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    // Permet de surcharger via .env MAX_FILE_SIZE (en bytes). Par défaut 2GB.
    fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || (2 * 1024 * 1024 * 1024),
  }
});

// Middleware pour upload d'image
const uploadImage = upload.single('image');

// Middleware pour upload de vidéo
const uploadVideo = upload.single('video');

// Middleware pour upload multiple (image + vidéo + pdf)
const uploadFiles = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'pdf', maxCount: 1 }
]);

module.exports = {
  uploadImage,
  uploadVideo,
  uploadFiles
};
