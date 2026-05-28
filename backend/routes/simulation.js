const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { generateConversationResponse } = require('../services/geminiService');
const { authenticateToken } = require('../middleware/auth');
const heartsService = require('../services/simulationHeartsService');

const prisma = new PrismaClient();

// ——— Cœurs de vie simulation (2 max, +1 / 24h) ———
router.get('/hearts', authenticateToken, async (req, res) => {
  try {
    const status = await heartsService.syncRecordAfterRegen(req.user.id);
    res.json({ success: true, ...status });
  } catch (error) {
    console.error('Erreur GET /hearts:', error);
    res.status(500).json({ error: 'Impossible de récupérer les cœurs' });
  }
});

router.post('/hearts/lose', authenticateToken, async (req, res) => {
  try {
    const status = await heartsService.recordLoss(req.user.id);
    res.json({ success: true, ...status });
  } catch (error) {
    console.error('Erreur POST /hearts/lose:', error);
    res.status(500).json({ error: 'Impossible d\'enregistrer la perte' });
  }
});

// Configuration Multer pour les images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'simulation-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

// Créer un nouveau jeu de simulation
router.post('/create', upload.single('image'), async (req, res) => {
  try {
    const { title, description, theme, difficulty } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Image requise' });
    }

    // Trouver un utilisateur existant (admin ou premier utilisateur disponible)
    let owner = await prisma.user.findFirst();
    if (!owner) {
      // Créer un utilisateur par défaut si la base est vide
      owner = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          passwordHash: 'changeme', // Placeholder; non utilisé pour la connexion ici
          role: 'ADMIN'
        }
      });
    }

    // Créer le jeu dans la base de données
    const game = await prisma.game.create({
      data: {
        type: 'simulation',
        mode: 'solo', // Mode par défaut pour les simulations
        title: title || 'Simulation Conversationnelle',
        description: description || 'Conversation orale avec IA',
        difficulty: difficulty || 'medium',
        isActive: true,
        status: 'unlocked',
        userId: owner.id, // Lier au propriétaire existant
        metadata: JSON.stringify({
          image: req.file.filename,
          theme: theme || 'Conversation générale',
          imagePath: `/uploads/${req.file.filename}`
        })
      }
    });

    res.json({ 
      success: true, 
      game,
      message: 'Jeu de simulation créé avec succès' 
    });
  } catch (error) {
    console.error('Erreur lors de la création du jeu de simulation:', error);
    res.status(500).json({ error: 'Erreur lors de la création du jeu', details: error?.message });
  }
});

// Récupérer tous les jeux de simulation
router.get('/admin', async (req, res) => {
  try {
    const simulations = await prisma.game.findMany({
      where: {
        type: 'simulation'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(simulations);
  } catch (error) {
    console.error('Erreur lors de la récupération des simulations:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des simulations' });
  }
});

// Récupérer un jeu de simulation spécifique
router.get('/latest/active', async (req, res) => {
  try {
    const latestSimulation = await prisma.game.findFirst({
      where: {
        type: 'simulation',
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!latestSimulation) {
      return res.status(404).json({ error: 'Aucune simulation active trouvée' });
    }

    res.json(latestSimulation);
  } catch (error) {
    console.error('Erreur lors de la récupération de la dernière simulation:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la simulation' });
  }
});

// Récupérer un jeu de simulation spécifique (après les routes fixes)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const simulation = await prisma.game.findUnique({
      where: { id: id }
    });

    if (!simulation) {
      return res.status(404).json({ error: 'Simulation non trouvée' });
    }

    res.json(simulation);
  } catch (error) {
    console.error('Erreur lors de la récupération de la simulation:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la simulation' });
  }
});

// Gérer la conversation avec l'IA utilisant Gemini
router.post('/conversation', async (req, res) => {
  try {
    const { message, conversationId, gameId, conversationHistory, scenario } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message requis' });
    }

    // Get game details if gameId is provided
    let gameDetails = {};
    if (gameId) {
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        select: { metadata: true }
      });
      if (game) {
        gameDetails = JSON.parse(game.metadata || '{}');
      }
    }

    // Generate response using Gemini
    const aiResponse = await generateConversationResponse(
      message,
      conversationHistory,
      scenario || (gameDetails.theme || 'General conversation practice')
    );
    
    const response = {
      text: aiResponse,
      conversationId: conversationId || `conv-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Erreur lors de la conversation avec Gemini:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la conversation avec l\'IA',
      details: error.message
    });
  }
});

// Mettre à jour un jeu de simulation
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, theme, difficulty } = req.body;
    
    const updateData = {
      title: title || 'Simulation Conversationnelle',
      description: description || 'Conversation orale avec IA',
      difficulty: difficulty || 'medium'
    };

    // Si une nouvelle image est uploadée
    if (req.file) {
      updateData.metadata = JSON.stringify({
        image: req.file.filename,
        theme: theme || 'Conversation générale',
        imagePath: `/uploads/${req.file.filename}`
      });
    } else if (theme) {
      // Mettre à jour seulement le thème si pas de nouvelle image
      const existingGame = await prisma.game.findUnique({
        where: { id: id }
      });
      
      if (existingGame && existingGame.metadata) {
        const metadata = JSON.parse(existingGame.metadata);
        metadata.theme = theme;
        updateData.metadata = JSON.stringify(metadata);
      }
    }

    const updatedGame = await prisma.game.update({
      where: { id: id },
      data: updateData
    });

    res.json({ 
      success: true, 
      game: updatedGame,
      message: 'Simulation mise à jour avec succès' 
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la simulation:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la simulation' });
  }
});

// Supprimer un jeu de simulation
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer l'image avant suppression
    const simulation = await prisma.game.findUnique({
      where: { id: id }
    });

    if (simulation && simulation.metadata) {
      try {
        const metadata = JSON.parse(simulation.metadata);
        if (metadata.image) {
          const imagePath = path.join(__dirname, '../uploads', metadata.image);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        }
      } catch (parseError) {
        console.error('Erreur lors du parsing des métadonnées:', parseError);
      }
    }

    await prisma.game.delete({
      where: { id: id }
    });

    res.json({ 
      success: true, 
      message: 'Simulation supprimée avec succès' 
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la simulation:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la simulation' });
  }
});

// Récupérer le dernier jeu de simulation actif pour les joueurs
// (route déplacée plus haut)

module.exports = router;
