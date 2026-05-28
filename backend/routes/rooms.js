const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const prisma = new PrismaClient();
const { normalizeGameConfig } = require('../services/onlineGameConfig');

// Stockage temporaire des salles en mémoire (en production, utiliser Redis)
const rooms = new Map();



// Créer une nouvelle salle
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { name, isPrivate = false, gameType, timerSeconds, roundsCount, randomMode } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;
    const gameConfig = normalizeGameConfig({
      gameType,
      timerSeconds,
      roundsCount,
      randomMode,
    });

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Le nom de la salle est requis' 
      });
    }

    // Générer un ID unique pour la salle
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const inviteCode = isPrivate ? Math.random().toString(36).substring(2, 8).toUpperCase() : null;

    // Créer la salle
    const room = {
      id: roomId,
      inviteCode,
      name: name.trim(),
      hostId: userId,
      hostEmail: userEmail,
      gameConfig,
      players: [
        {
          id: userId,
          email: userEmail,
          isHost: true,
          isReady: false,
          joinedAt: new Date()
        }
      ],
      gameSession: null,
      status: 'waiting', // waiting, in-progress, completed
      isPrivate: Boolean(isPrivate),
      createdAt: new Date(),
      maxPlayers: 2
    };

    rooms.set(roomId, room);

    console.log(`Salle créée: ${roomId} par ${userEmail}`);

    res.json({
      success: true,
      room: {
        id: roomId,
        name: room.name,
        gameConfig: room.gameConfig,
        playersCount: 1,
        maxPlayers: 2,
        status: 'waiting',
        isPrivate: room.isPrivate,
        inviteCode: room.inviteCode
      }
    });

  } catch (error) {
    console.error('Erreur lors de la création de la salle:', error);
    res.status(500).json({ 
      error: 'Erreur interne lors de la création de la salle',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Rejoindre une salle
router.post('/:roomId/join', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const userEmail = req.user.email;

    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Salle non trouvée' });
    }

    if (room.players.length >= room.maxPlayers) {
      return res.status(400).json({ error: 'Salle pleine' });
    }

    if (room.status !== 'waiting') {
      return res.status(400).json({ error: 'Salle déjà en cours' });
    }

    // Vérifier si l'utilisateur n'est pas déjà dans la salle
    if (room.players.find(p => p.id === userId)) {
      return res.status(400).json({ error: 'Vous êtes déjà dans cette salle' });
    }

    // Ajouter le joueur
    room.players.push({
      id: userId,
      email: userEmail,
      isHost: false,
      isReady: false,
      joinedAt: new Date()
    });

    rooms.set(roomId, room);

    console.log(`${userEmail} a rejoint la salle ${roomId}`);

    res.json({
      success: true,
      room: {
        id: roomId,
        name: room.name,
        gameConfig: room.gameConfig,
        players: room.players.map(p => ({
          id: p.id,
          email: p.email,
          isHost: p.isHost,
          isReady: p.isReady
        })),
        status: room.status
      }
    });

  } catch (error) {
    console.error('Erreur lors de la jointure de la salle:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la jointure de la salle',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Rejoindre une salle via code
router.post('/join-by-code', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;

    if (!code) {
      return res.status(400).json({ error: 'Code d\'invitation requis' });
    }

    const inviteCode = code.toUpperCase().trim();
    
    let targetRoom = null;
    for (const room of rooms.values()) {
      if (room.inviteCode === inviteCode) {
        targetRoom = room;
        break;
      }
    }

    if (!targetRoom) {
      return res.status(404).json({ error: 'Code d\'invitation invalide ou expiré' });
    }

    const roomId = targetRoom.id;

    if (targetRoom.players.length >= targetRoom.maxPlayers) {
      return res.status(400).json({ error: 'Salle pleine' });
    }

    if (targetRoom.status !== 'waiting') {
      return res.status(400).json({ error: 'Salle déjà en cours' });
    }

    if (targetRoom.players.find(p => p.id === userId)) {
      return res.status(400).json({ error: 'Vous êtes déjà dans cette salle' });
    }

    targetRoom.players.push({
      id: userId,
      email: userEmail,
      isHost: false,
      isReady: false,
      joinedAt: new Date()
    });

    rooms.set(roomId, targetRoom);

    console.log(`${userEmail} a rejoint la salle privée ${roomId} via le code ${inviteCode}`);

    res.json({
      success: true,
      roomId: roomId,
      room: {
        id: roomId,
        name: targetRoom.name,
        gameConfig: targetRoom.gameConfig,
        players: targetRoom.players.map(p => ({
          id: p.id,
          email: p.email,
          isHost: p.isHost,
          isReady: p.isReady
        })),
        status: targetRoom.status
      }
    });

  } catch (error) {
    console.error('Erreur lors de la jointure via code:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la jointure via code',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Lister les salles publiques disponibles
router.get('/public', authenticateToken, async (req, res) => {
  try {
    const publicRooms = Array.from(rooms.values())
      .filter(room => 
        !room.isPrivate && 
        room.status === 'waiting' && 
        room.players.length < room.maxPlayers
      )
      .map(room => ({
        id: room.id,
        name: room.name,
        gameConfig: room.gameConfig,
        playersCount: room.players.length,
        maxPlayers: room.maxPlayers,
        hostEmail: room.hostEmail,
        createdAt: room.createdAt
      }));

    res.json({ rooms: publicRooms });

  } catch (error) {
    console.error('Erreur lors de la récupération des salles:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des salles',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtenir les détails d'une salle
router.get('/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Salle non trouvée' });
    }

    // Vérifier que l'utilisateur fait partie de la salle
    const player = room.players.find(p => p.id === userId);
    if (!player) {
      return res.status(403).json({ error: 'Accès interdit à cette salle' });
    }

    res.json({
      success: true,
      room: {
        id: roomId,
        name: room.name,
        gameConfig: room.gameConfig,
        players: room.players.map(p => ({
          id: p.id,
          email: p.email,
          isHost: p.isHost,
          isReady: p.isReady
        })),
        status: room.status,
        isPrivate: room.isPrivate,
        inviteCode: room.inviteCode
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de la salle:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération de la salle',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Marquer un joueur comme prêt
router.post('/:roomId/ready', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Salle non trouvée' });
    }

    const player = room.players.find(p => p.id === userId);
    if (!player) {
      return res.status(403).json({ error: 'Vous n\'êtes pas dans cette salle' });
    }

    player.isReady = !player.isReady;
    rooms.set(roomId, room);

    // Vérifier si tous les joueurs sont prêts et qu'il y a au moins 2 joueurs
    const allReady = room.players.length >= 2 && room.players.every(p => p.isReady);
    if (allReady && room.status === 'waiting') {
      room.status = 'in-progress';
      rooms.set(roomId, room);
    }

    res.json({
      success: true,
      isReady: player.isReady,
      allReady,
      gameStarted: allReady
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour du statut',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Quitter une salle
router.post('/:roomId/leave', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Salle non trouvée' });
    }

    // Retirer le joueur
    room.players = room.players.filter(p => p.id !== userId);

    if (room.players.length === 0) {
      // Supprimer la salle si elle est vide
      rooms.delete(roomId);
      console.log(`Salle ${roomId} supprimée (vide)`);
    } else if (room.hostId === userId) {
      // Transférer l'hôte au premier joueur restant
      room.hostId = room.players[0].id;
      room.players[0].isHost = true;
    }

    if (room.players.length > 0) {
      rooms.set(roomId, room);
    }

    res.json({ success: true, message: 'Salle quittée avec succès' });

  } catch (error) {
    console.error('Erreur lors de la sortie de la salle:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la sortie de la salle',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Fonction pour obtenir les salles (pour Socket.IO)
const getRooms = () => rooms;

module.exports = router;
module.exports.getRooms = getRooms;
