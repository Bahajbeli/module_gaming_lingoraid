const jwt = require('jsonwebtoken');
const {
  startOnlineMatch,
  handleTourComplete,
  handleQuizAnswerForRoom,
} = require('../services/onlineMatchSession');
const { getQuizSession } = require('../services/onlineQuizRoom');

const authenticateSocket = (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      console.log('Socket connection rejected: No token provided');
      return next(new Error('Token manquant'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userEmail = decoded.email;
    console.log(`Socket authenticated: ${decoded.email} (${decoded.id})`);
    next();
  } catch (error) {
    console.log('Socket authentication failed:', error.message);
    next(new Error('Token invalide'));
  }
};

const setupGameSocket = (io, roomsRouter) => {
  const rooms = roomsRouter.getRooms();
  
  io.use(authenticateSocket);
  
  io.on('connection', (socket) => {
    console.log(`✅ Utilisateur connecté via Socket.IO: ${socket.userEmail} (${socket.userId})`);

    // Rejoindre une salle
    socket.on('join-room', ({ roomId }) => {
      try {
        const room = rooms.get(roomId);
        if (room && room.players.find(p => p.id === socket.userId)) {
          const player = room.players.find(p => p.id === socket.userId);
          player.socketConnected = true;
          
          socket.join(roomId);
          socket.roomId = roomId;
          
          // Notifier les autres joueurs
          socket.to(roomId).emit('player-joined', {
            playerId: socket.userId,
            playerEmail: socket.userEmail
          });

          // Envoyer l'état actuel de la salle
          socket.emit('room-state', {
            players: room.players.map(p => ({
              id: p.id,
              email: p.email,
              isHost: p.isHost,
              isReady: p.isReady
            })),
            gameConfig: room.gameConfig,
            status: room.status
          });

          console.log(`🏠 ${socket.userEmail} a rejoint la salle Socket.IO ${roomId}`);
        } else {
          socket.emit('error', { message: 'Salle non trouvée ou accès refusé' });
        }
      } catch (error) {
        console.error('Erreur join-room:', error);
        socket.emit('error', { message: 'Erreur lors de la jointure de la salle' });
      }
    });

    // Changer le statut "prêt"
    socket.on('toggle-ready', ({ roomId }) => {
      try {
        const room = rooms.get(roomId);
        if (room) {
          const player = room.players.find(p => p.id === socket.userId);
          if (player) {
            // Note: player.isReady was already updated by the API POST /rooms/:roomId/ready
            // so we don't toggle it here again to avoid double-toggling.
            
            // Vérifier si tous les joueurs sont prêts
            const allReady = room.players.length >= 2 && room.players.every(p => p.isReady);
            if (allReady && room.status === 'waiting') {
              room.status = 'in-progress';
            }

            // Notifier tous les joueurs de la salle
            io.to(roomId).emit('player-ready-changed', {
              playerId: socket.userId,
              isReady: player.isReady,
              allReady,
              gameStarted: allReady
            });

            if (allReady) {
              try {
                startOnlineMatch(io, roomId, room);
              } catch (matchErr) {
                console.error('Erreur démarrage match en ligne:', matchErr);
                room.status = 'waiting';
                room.players.forEach((p) => {
                  p.isReady = false;
                });
                io.to(roomId).emit('match-tour-error', {
                  message: matchErr.message || 'Impossible de démarrer la partie',
                });
                io.to(roomId).emit('room-state', {
                  players: room.players.map((p) => ({
                    id: p.id,
                    email: p.email,
                    isHost: p.isHost,
                    isReady: p.isReady,
                  })),
                  gameConfig: room.gameConfig,
                  status: room.status,
                });
              }
            }

            console.log(`🎮 ${socket.userEmail} changed ready status to ${player.isReady} in room ${roomId}`);
          }
        }
      } catch (error) {
        console.error('Erreur toggle-ready:', error);
        socket.emit('error', { message: 'Erreur lors du changement de statut' });
      }
    });

    // Messages de chat vocal (signaling WebRTC)
    socket.on('webrtc-offer', ({ roomId, offer, targetId }) => {
      try {
        console.log(`📞 WebRTC offer from ${socket.userEmail} in room ${roomId}`);
        socket.to(roomId).emit('webrtc-offer', {
          offer,
          senderId: socket.userId,
          targetId
        });
      } catch (error) {
        console.error('Erreur webrtc-offer:', error);
      }
    });

    socket.on('webrtc-answer', ({ roomId, answer, targetId }) => {
      try {
        console.log(`📞 WebRTC answer from ${socket.userEmail} in room ${roomId}`);
        socket.to(roomId).emit('webrtc-answer', {
          answer,
          senderId: socket.userId,
          targetId
        });
      } catch (error) {
        console.error('Erreur webrtc-answer:', error);
      }
    });

    socket.on('webrtc-ice-candidate', ({ roomId, candidate, targetId }) => {
      try {
        socket.to(roomId).emit('webrtc-ice-candidate', {
          candidate,
          senderId: socket.userId,
          targetId
        });
      } catch (error) {
        console.error('Erreur webrtc-ice-candidate:', error);
      }
    });

    // Quiz en ligne — soumettre une réponse
    socket.on('quiz-submit-answer', ({ roomId, roundIndex, answer }) => {
      try {
        const room = rooms.get(roomId);
        if (!room) return;
        if (!room.players.find((p) => p.id === socket.userId)) return;
        handleQuizAnswerForRoom(io, roomId, room, socket.userId, { roundIndex, answer });
      } catch (error) {
        console.error('Erreur quiz-submit-answer:', error);
      }
    });

    socket.on('tour-complete', ({ roomId, tourIndex, score }) => {
      try {
        const room = rooms.get(roomId);
        if (!room) return;
        if (!room.players.find((p) => p.id === socket.userId)) return;
        handleTourComplete(io, roomId, room, socket.userId, { tourIndex, score });
      } catch (error) {
        console.error('Erreur tour-complete:', error);
      }
    });

    socket.on('match-sync', ({ roomId }) => {
      try {
        const room = rooms.get(roomId);
        if (!room?.gameSession) return;
        const session = room.gameSession;
        const quiz = getQuizSession(room);

        socket.emit('match-sync-state', {
          gameConfig: room.gameConfig,
          status: session.status,
          kind: session.kind,
          currentTour: session.currentTour,
          totalTours: session.schedule?.length || 0,
          schedule: session.schedule,
          matchScores: session.matchScores,
          tourPayload: session.tourPayload,
          activeGameType: session.schedule?.[session.currentTour]?.gameType,
          quiz:
            quiz && quiz.status === 'playing' && quiz.currentRound >= 0
              ? {
                  currentRound: quiz.currentRound,
                  totalRounds: quiz.questions.length,
                  endsAt: quiz.roundEndsAt,
                  question: require('../services/onlineQuizService').getPublicQuestion(
                    quiz.questions[quiz.currentRound]
                  ),
                  scores: quiz.scores,
                }
              : null,
        });
      } catch (error) {
        console.error('Erreur match-sync:', error);
      }
    });

    // Messages de conversation durant le jeu
    socket.on('conversation-message', ({ roomId, message, isAI = false }) => {
      try {
        socket.to(roomId).emit('conversation-message', {
          senderId: socket.userId,
          senderEmail: socket.userEmail,
          message,
          isAI,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Erreur conversation-message:', error);
      }
    });

    // Messages vocaux relay
    socket.on('voice-message-sent', ({ roomId, messageId }) => {
      try {
        console.log(`📢 Voice message relay from ${socket.userEmail} in room ${roomId}: ${messageId}`);
        socket.to(roomId).emit('voice-message-sent', {
          messageId,
          audioUrl: `/uploads/${messageId}.webm`,
          senderId: socket.userId,
          senderEmail: socket.userEmail
        });
      } catch (error) {
        console.error('Erreur voice-message-sent:', error);
      }
    });

    // Déconnexion
    socket.on('leave-room', ({ roomId }) => {
      handleLeaveRoom(socket, roomId, rooms, io);
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ Utilisateur déconnecté: ${socket.userEmail} (${reason})`);
      if (socket.roomId) {
        handleLeaveRoom(socket, socket.roomId, rooms, io);
      }
    });

    // Gestion des erreurs
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.userEmail}:`, error);
    });
  });
};

const handleLeaveRoom = (socket, roomId, rooms, io) => {
  try {
    const room = rooms.get(roomId);
    if (room) {
      // Marquer comme déconnecté
      const player = room.players.find(p => p.id === socket.userId);
      if (player) {
        player.socketConnected = false;
      }

      socket.leave(roomId);
      socket.roomId = null;

      // Attendre avant de retirer le joueur (pour gérer React StrictMode ou les rafraîchissements)
      setTimeout(() => {
        const currentRoom = rooms.get(roomId);
        if (!currentRoom) return;

        const currentPlayer = currentRoom.players.find(p => p.id === socket.userId);
        // S'il ne s'est pas reconnecté entre temps
        if (currentPlayer && !currentPlayer.socketConnected) {
          currentRoom.players = currentRoom.players.filter(p => p.id !== socket.userId);
          
          // Notifier les autres joueurs
          io.to(roomId).emit('player-left', {
            playerId: socket.userId,
            playerEmail: socket.userEmail
          });

          if (currentRoom.players.length === 0) {
            // Supprimer la salle si elle est vide
            rooms.delete(roomId);
            console.log(`🗑️ Salle ${roomId} supprimée (vide après délai)`);
          } else if (currentRoom.hostId === socket.userId) {
            // Transférer l'hôte
            currentRoom.hostId = currentRoom.players[0].id;
            currentRoom.players[0].isHost = true;
            
            io.to(roomId).emit('host-changed', {
              newHostId: currentRoom.hostId,
              newHostEmail: currentRoom.players[0].email
            });
            
            console.log(`👑 Hôte transféré à ${currentRoom.players[0].email} dans la salle ${roomId}`);
          }
          console.log(`🚪 ${socket.userEmail} a définitivement quitté la salle ${roomId}`);
        }
      }, 5000); // Délai de grâce de 5 secondes
    }
  } catch (error) {
    console.error('Erreur handleLeaveRoom:', error);
  }
};

module.exports = { setupGameSocket };
