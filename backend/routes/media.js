const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateMedia, validateMediaUpdate } = require('../middleware/validation');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const prisma = new PrismaClient();

// Configuration Multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'uploads/';
    
    if (file.fieldname === 'image') {
      uploadPath += 'media-images/';
    } else if (file.fieldname === 'mediaFile') {
      uploadPath += 'media-files/';
    }
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    // 2GB max pour les fichiers médias
    fileSize: 2 * 1024 * 1024 * 1024
  },
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'image') {
      // Accepter seulement les images
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Seules les images sont autorisées pour l\'image de couverture'));
      }
    } else if (file.fieldname === 'mediaFile') {
      // Accepter les vidéos et audios
      if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Seuls les fichiers vidéo et audio sont autorisés'));
      }
    } else {
      cb(null, true);
    }
  }
});

// GET /api/media - Récupérer tous les médias (public)
router.get('/', async (req, res) => {
  try {
    const media = await prisma.media.findMany({
      where: { isActive: true },
      include: {
        category: true,
        createdBy: {
          select: {
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(media);
  } catch (error) {
    console.error('Erreur lors de la récupération des médias:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des médias' });
  }
});

// GET /api/media/categories - Récupérer toutes les catégories
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.mediaCategory.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { media: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(categories);
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des catégories' });
  }
});

// GET /api/media/category/:categoryName - Récupérer les médias par catégorie
router.get('/category/:categoryName', async (req, res) => {
  try {
    const { categoryName } = req.params;
    
    const media = await prisma.media.findMany({
      where: {
        isActive: true,
        category: {
          name: categoryName,
          isActive: true
        }
      },
      include: {
        category: true,
        createdBy: {
          select: {
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(media);
  } catch (error) {
    console.error('Erreur lors de la récupération des médias par catégorie:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des médias' });
  }
});

// GET /api/media/:id - Récupérer un média spécifique
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const media = await prisma.media.findUnique({
      where: { id },
      include: {
        category: true,
        createdBy: {
          select: {
            email: true,
            role: true
          }
        }
      }
    });

    if (!media) {
      return res.status(404).json({ error: 'Média non trouvé' });
    }

    res.json(media);
  } catch (error) {
    console.error('Erreur lors de la récupération du média:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du média' });
  }
});

// POST /api/media - Créer un nouveau média (ADMIN seulement)
router.post('/', authenticateToken, requireAdmin, validateMedia, async (req, res) => {
  try {
    const mediaData = req.body;
    const userId = req.user.id;

    // Vérifier que la catégorie existe
    const category = await prisma.mediaCategory.findUnique({
      where: { id: mediaData.categoryId }
    });

    if (!category) {
      return res.status(400).json({ error: 'Catégorie non trouvée' });
    }

    const media = await prisma.media.create({
      data: {
        ...mediaData,
        userId
      },
      include: {
        category: true,
        createdBy: {
          select: {
            email: true,
            role: true
          }
        }
      }
    });

    res.status(201).json(media);
  } catch (error) {
    console.error('Erreur lors de la création du média:', error);
    res.status(500).json({ error: 'Erreur lors de la création du média' });
  }
});

// PUT /api/media/:id - Mettre à jour un média (ADMIN seulement)
router.put('/:id', authenticateToken, requireAdmin, validateMediaUpdate, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Vérifier que le média existe
    const existingMedia = await prisma.media.findUnique({
      where: { id }
    });

    if (!existingMedia) {
      return res.status(404).json({ error: 'Média non trouvé' });
    }

    // Vérifier que la catégorie existe si elle est fournie
    if (updateData.categoryId) {
      const category = await prisma.mediaCategory.findUnique({
        where: { id: updateData.categoryId }
      });

      if (!category) {
        return res.status(400).json({ error: 'Catégorie non trouvée' });
      }
    }

    const media = await prisma.media.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        createdBy: {
          select: {
            email: true,
            role: true
          }
        }
      }
    });

    res.json(media);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du média:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du média' });
  }
});

// DELETE /api/media/:id - Supprimer un média (ADMIN seulement)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que le média existe
    const existingMedia = await prisma.media.findUnique({
      where: { id }
    });

    if (!existingMedia) {
      return res.status(404).json({ error: 'Média non trouvé' });
    }

    await prisma.media.delete({
      where: { id }
    });

    res.json({ message: 'Média supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du média:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du média' });
  }
});

// Routes pour la gestion des catégories (ADMIN seulement)

// POST /api/media/categories - Créer une nouvelle catégorie
router.post('/categories', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, displayName, description, icon, color } = req.body;

    const category = await prisma.mediaCategory.create({
      data: {
        name,
        displayName,
        description,
        icon,
        color
      }
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Erreur lors de la création de la catégorie:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Une catégorie avec ce nom existe déjà' });
    } else {
      res.status(500).json({ error: 'Erreur lors de la création de la catégorie' });
    }
  }
});

// PUT /api/media/categories/:id - Mettre à jour une catégorie
router.put('/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const category = await prisma.mediaCategory.update({
      where: { id },
      data: updateData
    });

    res.json(category);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la catégorie:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la catégorie' });
  }
});

// DELETE /api/media/categories/:id - Supprimer une catégorie
router.delete('/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier qu'il n'y a pas de médias dans cette catégorie
    const mediaCount = await prisma.media.count({
      where: { categoryId: id }
    });

    if (mediaCount > 0) {
      return res.status(400).json({ 
        error: 'Impossible de supprimer une catégorie qui contient des médias' 
      });
    }

    await prisma.mediaCategory.delete({
      where: { id }
    });

    res.json({ message: 'Catégorie supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la catégorie:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la catégorie' });
  }
});

// Nouvelles routes pour l'upload de médias avec fichiers

// POST /api/media/admin/create - Créer un média avec upload de fichiers (ADMIN)
router.post('/admin/create', authenticateToken, requireAdmin, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'mediaFile', maxCount: 1 }
]), async (req, res) => {
  try {
    // Logs de debug (à commenter en production)
    // console.log('📝 Données reçues:', req.body);
    // console.log('📁 Fichiers reçus:', req.files);
    
    const mediaData = req.body;
    const userId = req.user.id;
    const files = req.files;

    // Validation des données requises
    if (!mediaData.title || !mediaData.description || !mediaData.type || !mediaData.categoryId) {
      return res.status(400).json({ 
        error: 'Données manquantes',
        required: ['title', 'description', 'type', 'categoryId'],
        received: Object.keys(mediaData)
      });
    }

    // Vérifier que la catégorie existe
    const category = await prisma.mediaCategory.findUnique({
      where: { id: mediaData.categoryId }
    });

    if (!category) {
      return res.status(400).json({ error: 'Catégorie non trouvée' });
    }

    // Préparer les données du média avec validation
    const mediaToCreate = {
      title: mediaData.title,
      description: mediaData.description,
      type: mediaData.type,
      language: mediaData.language || 'Allemand',
      languageLevel: mediaData.languageLevel || 'A1',
      subtitles: mediaData.subtitles || null,
      duration: mediaData.duration || null,
      viewers: mediaData.viewers || null,
      streamingUrl: mediaData.streamingUrl || null,
      platform: mediaData.platform || null,
      director: mediaData.director || null,
      cast: mediaData.cast || null,
      genre: mediaData.genre || null,
      categoryId: mediaData.categoryId,
      userId,
      isActive: true
    };

    // Convertir les champs numériques
    if (mediaData.rating && !isNaN(mediaData.rating)) {
      mediaToCreate.rating = parseFloat(mediaData.rating);
    }
    if (mediaData.year && !isNaN(mediaData.year)) {
      mediaToCreate.year = parseInt(mediaData.year);
    }
    if (mediaData.season && !isNaN(mediaData.season)) {
      mediaToCreate.season = parseInt(mediaData.season);
    }
    if (mediaData.episodes && !isNaN(mediaData.episodes)) {
      mediaToCreate.episodes = parseInt(mediaData.episodes);
    }

    // Ajouter les chemins des fichiers s'ils existent
    if (files && files.image && files.image[0]) {
      mediaToCreate.imageUrl = `/uploads/media-images/${files.image[0].filename}`;
    }
    
    if (files && files.mediaFile && files.mediaFile[0]) {
      mediaToCreate.mediaFileUrl = `/uploads/media-files/${files.mediaFile[0].filename}`;
    }

    const media = await prisma.media.create({
      data: mediaToCreate,
      include: {
        category: true,
        createdBy: {
          select: {
            email: true,
            role: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Média créé avec succès',
      media
    });
  } catch (error) {
    console.error('❌ Erreur lors de la création du média:', error);
    
    // Retourner des détails d'erreur plus spécifiques
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Un média avec ce titre existe déjà' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Référence invalide (catégorie ou utilisateur)' });
    }
    
    res.status(500).json({ 
      error: 'Erreur lors de la création du média',
      details: error.message 
    });
  }
});

// PUT /api/media/admin/:id - Mettre à jour un média avec upload de fichiers (ADMIN)
router.put('/admin/:id', authenticateToken, requireAdmin, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'mediaFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const { id } = req.params;
    const mediaData = req.body;
    const files = req.files;

    console.log('PUT /api/media/admin/:id - Update request for ID:', id);
    console.log('Media data received:', mediaData);
    console.log('Files received:', files ? Object.keys(files) : 'none');

    // Vérifier que le média existe
    const existingMedia = await prisma.media.findUnique({
      where: { id }
    });

    if (!existingMedia) {
      return res.status(404).json({ error: 'Média non trouvé' });
    }

    // Vérifier que la catégorie existe si elle est fournie
    if (mediaData.categoryId) {
      const category = await prisma.mediaCategory.findUnique({
        where: { id: mediaData.categoryId }
      });

      if (!category) {
        return res.status(400).json({ error: 'Catégorie non trouvée' });
      }
    }

    // Préparer les données de mise à jour
    const updateData = { ...mediaData };

    // Ajouter les chemins des nouveaux fichiers s'ils existent
    if (files && files.image && files.image[0]) {
      updateData.imageUrl = `/uploads/media-images/${files.image[0].filename}`;
      
      // Supprimer l'ancienne image si elle existe
      if (existingMedia.imageUrl) {
        const oldImagePath = path.join(__dirname, '..', '..', existingMedia.imageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }
    
    if (files && files.mediaFile && files.mediaFile[0]) {
      updateData.mediaFileUrl = `/uploads/media-files/${files.mediaFile[0].filename}`;
      
      // Supprimer l'ancien fichier média s'il existe
      if (existingMedia.mediaFileUrl) {
        const oldMediaPath = path.join(__dirname, '..', '..', existingMedia.mediaFileUrl);
        if (fs.existsSync(oldMediaPath)) {
          fs.unlinkSync(oldMediaPath);
        }
      }
    }

    // Conversion des types pour Prisma
    if (updateData.rating !== undefined && updateData.rating !== null && updateData.rating !== '') {
      const parsedRating = parseFloat(updateData.rating);
      if (!Number.isNaN(parsedRating)) updateData.rating = parsedRating;
      else delete updateData.rating;
    }
    if (updateData.year !== undefined && updateData.year !== null && updateData.year !== '') {
      const parsedYear = parseInt(updateData.year);
      if (!Number.isNaN(parsedYear)) updateData.year = parsedYear; else delete updateData.year;
    }
    if (updateData.season !== undefined && updateData.season !== null && updateData.season !== '') {
      const parsedSeason = parseInt(updateData.season);
      if (!Number.isNaN(parsedSeason)) updateData.season = parsedSeason; else delete updateData.season;
    }
    if (updateData.episodes !== undefined && updateData.episodes !== null && updateData.episodes !== '') {
      const parsedEpisodes = parseInt(updateData.episodes);
      if (!Number.isNaN(parsedEpisodes)) updateData.episodes = parsedEpisodes; else delete updateData.episodes;
    }
    if (typeof updateData.isActive === 'string') {
      const value = updateData.isActive.toLowerCase();
      updateData.isActive = value === 'true' || value === '1' || value === 'on';
    }

    // Nettoyer les champs vides pour éviter les erreurs Prisma
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === '' || updateData[key] === null) {
        // Ne pas supprimer categoryId car c'est requis
        if (key !== 'categoryId') {
          delete updateData[key];
        }
      }
    });

    // Si categoryId est vide, utiliser la catégorie existante
    if (!updateData.categoryId || updateData.categoryId === '') {
      updateData.categoryId = existingMedia.categoryId;
    }

    console.log('Final update data:', updateData);

    const media = await prisma.media.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        createdBy: {
          select: {
            email: true,
            role: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Média mis à jour avec succès',
      media
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du média:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du média' });
  }
});

// GET /api/media/admin - Récupérer tous les médias pour l'administration
router.get('/admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const media = await prisma.media.findMany({
      include: {
        category: true,
        createdBy: {
          select: {
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(media);
  } catch (error) {
    console.error('Erreur lors de la récupération des médias admin:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des médias' });
  }
});

module.exports = router;
