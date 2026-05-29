const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireUser } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/game-progress/:gameType
// Récupérer la progression pour un type de jeu
router.get('/:gameType', authenticateToken, requireUser, async (req, res) => {
  try {
    const { gameType } = req.params;
    const userId = req.user.id;

    let progress = await prisma.gameProgress.findUnique({
      where: {
        userId_gameType: {
          userId,
          gameType
        }
      }
    });

    if (!progress) {
      // Si aucune progression n'existe, on retourne l'état initial sans forcément le créer
      return res.json({
        currentStage: 1,
        completedStages: []
      });
    }

    let completedStages = [];
    try {
      completedStages = JSON.parse(progress.completedStages);
    } catch (e) {
      completedStages = [];
    }

    res.json({
      currentStage: progress.currentStage,
      completedStages
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la progression du jeu:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/game-progress/:gameType/complete
// Marquer une étape comme complétée et avancer le niveau
router.post('/:gameType/complete', authenticateToken, requireUser, async (req, res) => {
  try {
    const { gameType } = req.params;
    const { stageNumber } = req.body;
    const userId = req.user.id;

    if (!stageNumber || isNaN(stageNumber)) {
      return res.status(400).json({ error: 'Numéro d\'étape invalide' });
    }

    const numericStage = parseInt(stageNumber, 10);

    // Chercher la progression existante
    let progress = await prisma.gameProgress.findUnique({
      where: {
        userId_gameType: {
          userId,
          gameType
        }
      }
    });

    let completedStages = [];
    let currentStage = 1;

    if (progress) {
      try {
        completedStages = JSON.parse(progress.completedStages);
      } catch (e) {
        completedStages = [];
      }
      currentStage = progress.currentStage;
      
      // Si l'étape n'est pas encore complétée, on l'ajoute
      if (!completedStages.includes(numericStage)) {
        completedStages.push(numericStage);
      }
      
      // Si l'utilisateur vient de compléter le niveau actuel ou un niveau précédent, on avance son niveau max
      // Le niveau actuel devient le maximum entre l'actuel et le niveau complété + 1
      currentStage = Math.max(currentStage, numericStage + 1);

      progress = await prisma.gameProgress.update({
        where: { id: progress.id },
        data: {
          completedStages: JSON.stringify(completedStages),
          currentStage
        }
      });
    } else {
      // S'il n'y avait pas de progression, on la crée
      completedStages = [numericStage];
      currentStage = numericStage + 1;

      progress = await prisma.gameProgress.create({
        data: {
          userId,
          gameType,
          currentStage,
          completedStages: JSON.stringify(completedStages)
        }
      });
    }

    res.json({
      message: 'Progression sauvegardée avec succès',
      currentStage: progress.currentStage,
      completedStages
    });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la progression du jeu:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;
