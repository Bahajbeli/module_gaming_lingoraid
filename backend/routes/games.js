const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/games - Récupérer tous les jeux pour l'utilisateur connecté
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Récupérer les jeux existants de l'utilisateur
    const userGames = await prisma.game.findMany({
      where: { userId },
      orderBy: [
        { type: 'asc' },
        { mode: 'asc' }
      ]
    });

    // Définir tous les types de jeux disponibles
    const gameTypes = ['quiz', 'mots-croises', 'creativite', 'simulation'];
    const gameModes = ['online', 'solo'];
    
    // Organiser les jeux par type et mode
    const organizedGames = {};
    
    gameTypes.forEach(type => {
      organizedGames[type] = {};
      gameModes.forEach(mode => {
        // Chercher si l'utilisateur a déjà un jeu de ce type et mode
        const existingGame = userGames.find(g => g.type === type && g.mode === mode);
        
        if (existingGame) {
          // Si le jeu existe, utiliser ses données
          organizedGames[type][mode] = existingGame;
        } else {
          // Si le jeu n'existe pas, créer un jeu par défaut "unlocked"
          organizedGames[type][mode] = {
            id: `default-${type}-${mode}`,
            type,
            mode,
            status: 'unlocked', // Par défaut, tous les jeux sont déverrouillés
            userId,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
      });
    });

    res.json(organizedGames);
  } catch (error) {
    console.error('Erreur lors de la récupération des jeux:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des jeux' });
  }
});

// GET /api/games/quiz/nouns - Fournir la liste des noms pour le quiz (articles der/die/das)
router.get('/quiz/nouns', authenticateToken, async (req, res) => {
  try {
    const nouns = await prisma.germanNoun.findMany();
    res.json(nouns);
  } catch (error) {
    console.error('Error loading nouns from DB:', error);
    res.status(500).json({ error: 'Failed to load nouns' });
  }
});

// GET /api/games/admin - Récupérer tous les jeux pour l'administration
router.get('/admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const games = await prisma.game.findMany({
      include: {
        user: {
          select: {
            email: true,
            role: true
          }
        }
      },
      orderBy: [
        { type: 'asc' },
        { mode: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json(games);
  } catch (error) {
    console.error('Erreur lors de la récupération des jeux admin:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des jeux' });
  }
});

// GET /api/games/templates - Récupérer les modèles de jeux pour l'administration
router.get('/templates', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const gameTypes = ['quiz', 'mots-croises', 'creativite', 'simulation'];
    const gameModes = ['online', 'solo'];
    const difficulties = ['easy', 'medium', 'hard'];

    const templates = [];
    
    for (const type of gameTypes) {
      for (const mode of gameModes) {
        for (const difficulty of difficulties) {
          templates.push({
            type,
            mode,
            difficulty,
            title: `${type} - ${mode} - ${difficulty}`,
            description: `Modèle de jeu ${type} en mode ${mode} avec difficulté ${difficulty}`,
            isActive: true,
            status: 'unlocked'
          });
        }
      }
    }

    res.json(templates);
  } catch (error) {
    console.error('Erreur lors de la récupération des modèles:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des modèles' });
  }
});

// POST /api/games/admin/create - Créer un nouveau jeu (ADMIN)
router.post('/admin/create', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type, mode, difficulty, title, description, isActive, status } = req.body;

    // Validation des données
    if (!type || !mode || !difficulty || !title || !description) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    // Créer le jeu
    const game = await prisma.game.create({
      data: {
        type,
        mode,
        difficulty,
        title,
        description,
        isActive: isActive !== undefined ? isActive : true,
        status: status || 'unlocked',
        userId: req.user.id // L'admin qui crée le jeu
      }
    });

    res.status(201).json({ message: 'Jeu créé avec succès', game });
  } catch (error) {
    console.error('Erreur lors de la création du jeu:', error);
    res.status(500).json({ error: 'Erreur lors de la création du jeu' });
  }
});

// PUT /api/games/admin/:id - Mettre à jour un jeu (ADMIN)
router.put('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, mode, difficulty, title, description, isActive, status } = req.body;

    const updatedGame = await prisma.game.update({
      where: { id },
      data: {
        type,
        mode,
        difficulty,
        title,
        description,
        isActive,
        status,
        updatedAt: new Date()
      }
    });

    res.json({ message: 'Jeu mis à jour avec succès', game: updatedGame });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du jeu:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du jeu' });
  }
});

// DELETE /api/games/admin/:id - Supprimer un jeu (ADMIN)
router.delete('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.game.delete({
      where: { id }
    });

    res.json({ message: 'Jeu supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du jeu:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du jeu' });
  }
});

// POST /api/games/:type/:mode/play - Démarrer un jeu
router.post('/:type/:mode/play', authenticateToken, async (req, res) => {
  try {
    const { type, mode } = req.params;
    const userId = req.user.id;

    let game = await prisma.game.findFirst({
      where: {
        userId,
        type,
        mode
      }
    });

    // Auto-provision: créer le jeu s'il n'existe pas pour cet utilisateur
    if (!game) {
      game = await prisma.game.create({
        data: {
          userId,
          type,
          mode,
          title: `${type} - ${mode}`,
          description: `Jeu ${type} en mode ${mode}`,
          difficulty: 'easy',
          isActive: true,
          status: 'unlocked'
        }
      });
    }

    if (!game.isActive) {
      return res.status(403).json({ error: 'Ce jeu est désactivé' });
    }

    if (game.status === 'locked') {
      return res.status(403).json({ error: 'Ce jeu est verrouillé' });
    }

    // Mettre à jour le statut si nécessaire
    if (game.status === 'unlocked') {
      await prisma.game.update({
        where: { id: game.id },
        data: { status: 'in-progress' }
      });
    }

    res.json({ message: 'Jeu démarré', game });
  } catch (error) {
    console.error('Erreur lors du démarrage du jeu:', error);
    res.status(500).json({ error: 'Erreur lors du démarrage du jeu' });
  }
});

// POST /api/games/:type/:mode/complete - Terminer un jeu
router.post('/:type/:mode/complete', authenticateToken, async (req, res) => {
  try {
    const { type, mode } = req.params;
    const { score } = req.body;
    const userId = req.user.id;

    const game = await prisma.game.findFirst({
      where: {
        userId,
        type,
        mode
      }
    });

    if (!game) {
      return res.status(404).json({ error: 'Jeu non trouvé' });
    }

    if (!game.isActive) {
      return res.status(403).json({ error: 'Ce jeu est désactivé' });
    }

    const updatedGame = await prisma.game.update({
      where: { id: game.id },
      data: {
        status: 'completed',
        score: score || 0,
        completedAt: new Date()
      }
    });

    res.json({ message: 'Jeu terminé avec succès', game: updatedGame });
  } catch (error) {
    console.error('Erreur lors de la finalisation du jeu:', error);
    res.status(500).json({ error: 'Erreur lors de la finalisation du jeu' });
  }
});

// GET /api/games/:gameType - Récupérer les jeux par type pour l'utilisateur connecté
router.get('/:gameType', authenticateToken, async (req, res) => {
  try {
    const { gameType } = req.params;
    const userId = req.user.id;
    
    const games = await prisma.game.findMany({
      where: { 
        userId,
        type: gameType
      },
      orderBy: [
        { createdAt: 'asc' }
      ]
    });

    res.json({ 
      games,
      total: games.length,
      gameType 
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des jeux par type:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des jeux' });
  }
});

// GET /api/games/progress - Récupérer la progression des jeux
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const games = await prisma.game.findMany({
      where: { userId }
    });

    // Définir tous les types de jeux disponibles
    const gameTypes = ['quiz', 'mots-croises', 'creativite', 'simulation'];
    const gameModes = ['online', 'solo'];
    
    // Calculer les statistiques des jeux existants
    const total = games.length;
    const completed = games.filter(g => g.status === 'completed').length;
    const unlocked = games.filter(g => g.status === 'unlocked' || g.status === 'completed').length;
    const active = games.filter(g => g.isActive).length;

    const averageScore = completed > 0 
      ? games.filter(g => g.status === 'completed').reduce((sum, g) => sum + (g.score || 0), 0) / completed
      : 0;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Initialiser les statistiques par type et mode avec des valeurs par défaut
    const byType = {};
    const byMode = {};

    // Initialiser tous les types avec des valeurs par défaut
    gameTypes.forEach(type => {
      byType[type] = { total: 0, completed: 0, unlocked: 0 };
    });

    // Initialiser tous les modes avec des valeurs par défaut
    gameModes.forEach(mode => {
      byMode[mode] = { total: 0, completed: 0, unlocked: 0 };
    });

    // Calculer les statistiques des jeux existants
    games.forEach(game => {
      // Par type
      if (byType[game.type]) {
        byType[game.type].total++;
        if (game.status === 'completed') byType[game.type].completed++;
        if (game.status === 'unlocked' || game.status === 'completed') byType[game.type].unlocked++;
      }

      // Par mode
      if (byMode[game.mode]) {
        byMode[game.mode].total++;
        if (game.status === 'completed') byMode[game.mode].completed++;
        if (game.status === 'unlocked' || game.status === 'completed') byMode[game.mode].unlocked++;
      }
    });

    // Pour les nouveaux utilisateurs, considérer tous les jeux comme déverrouillés par défaut
    const totalAvailableGames = gameTypes.length * gameModes.length;
    const defaultUnlocked = total === 0 ? totalAvailableGames : unlocked;

    res.json({
      total: totalAvailableGames,
      completed,
      unlocked: defaultUnlocked,
      active: totalAvailableGames,
      averageScore: Math.round(averageScore * 100) / 100,
      completionRate,
      byType,
      byMode
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la progression des jeux:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la progression' });
  }
});

module.exports = router;
