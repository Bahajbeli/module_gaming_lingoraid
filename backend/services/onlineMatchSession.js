const { buildMatchSchedule } = require('./onlineGameConfig');
const { loadTourPayload } = require('./onlineMatchContent');
const {
  initQuizSession,
  QUIZ_QUESTIONS_MATCH,
  QUIZ_QUESTIONS_SOLO,
} = require('./onlineQuizService');
const {
  startQuizRounds,
  handleQuizAnswer,
  clearQuizTimers,
} = require('./onlineQuizRoom');

function emitToRoom(io, roomId, event, payload) {
  io.to(roomId).emit(event, payload);
}

function initMatchScores(room) {
  const scores = {};
  room.players.forEach((p) => {
    scores[p.id] = { total: 0, tourWins: 0, email: p.email };
  });
  return scores;
}

function startOnlineMatch(io, roomId, room) {
  const schedule = buildMatchSchedule(room.gameConfig);
  room.gameSession = {
    kind: 'match',
    status: 'playing',
    schedule,
    currentTour: -1,
    matchScores: initMatchScores(room),
    tourSubmissions: {},
    activeQuiz: null,
  };

  emitToRoom(io, roomId, 'game-started', {
    gameType: room.gameConfig.gameType,
    gameConfig: room.gameConfig,
    totalTours: schedule.length,
    schedule: schedule.map((t) => ({
      tourIndex: t.tourIndex,
      gameType: t.gameType,
      label: t.label,
    })),
  });

  startNextTour(io, roomId, room);
}

async function startNextTour(io, roomId, room) {
  const session = room.gameSession;
  if (!session || session.kind !== 'match' || session.status !== 'playing') return;

  const next = session.currentTour + 1;
  if (next >= session.schedule.length) {
    finishMatch(io, roomId, room);
    return;
  }

  session.currentTour = next;
  session.tourSubmissions = {};
  const tour = session.schedule[next];

  emitToRoom(io, roomId, 'match-tour-start', {
    tourIndex: next,
    totalTours: session.schedule.length,
    gameType: tour.gameType,
    label: tour.label,
    timerSeconds: tour.timerSeconds,
  });

  if (tour.gameType === 'quiz') {
    try {
      const qCount =
        session.schedule.length === 1 && room.gameConfig.gameType === 'quiz'
          ? QUIZ_QUESTIONS_SOLO
          : QUIZ_QUESTIONS_MATCH;
      initQuizSession(room, { questionCount: qCount, parentSession: session });
      startQuizRounds(io, roomId, room, {
        onFinished: (quizScores) => endTourFromQuiz(io, roomId, room, quizScores),
      });
    } catch (err) {
      console.error('Erreur quiz en ligne:', err);
      emitToRoom(io, roomId, 'match-tour-error', {
        tourIndex: next,
        message: err.message || 'Quiz indisponible',
      });
      setTimeout(() => startNextTour(io, roomId, room), 1500);
    }
    return;
  }

  const payload = await loadTourPayload(tour.gameType);
  if (!payload?.data) {
    const message = `Contenu indisponible pour « ${tour.label} ». Vérifiez que le jeu est configuré (admin).`;
    emitToRoom(io, roomId, 'match-tour-error', {
      tourIndex: next,
      gameType: tour.gameType,
      message,
    });

    if (session.schedule.length === 1) {
      clearQuizTimers(room);
      room.status = 'waiting';
      room.players.forEach((p) => {
        p.isReady = false;
      });
      room.gameSession = null;
      emitToRoom(io, roomId, 'match-cancelled', { message });
      emitToRoom(io, roomId, 'room-state', {
        players: room.players.map((p) => ({
          id: p.id,
          email: p.email,
          isHost: p.isHost,
          isReady: p.isReady,
        })),
        gameConfig: room.gameConfig,
        status: room.status,
      });
      return;
    }

    setTimeout(() => startNextTour(io, roomId, room), 1500);
    return;
  }

  session.tourPayload = payload.data;
  emitToRoom(io, roomId, 'match-tour-payload', {
    tourIndex: next,
    gameType: tour.gameType,
    payload: payload.data,
    durationSeconds: tour.gameType === 'bingo' ? payload.data.durationSeconds || 90 : null,
  });

  const tourMs =
    tour.gameType === 'bingo'
      ? (payload.data.durationSeconds || 90) * 1000 + 5000
      : (tour.timerSeconds || 300) * 1000 + 5000;
  if (session.tourTimeout) clearTimeout(session.tourTimeout);
  session.tourTimeout = setTimeout(() => {
    finalizeTour(io, roomId, room, next);
  }, tourMs);
}

function endTourFromQuiz(io, roomId, room, quizScores) {
  const session = room.gameSession;
  if (!session || session.kind !== 'match') return;

  const tourIndex = session.currentTour;
  room.players.forEach((p) => {
    const pts = quizScores[p.id]?.total || 0;
    session.tourSubmissions[p.id] = { score: pts, points: pts };
  });
  finalizeTour(io, roomId, room, tourIndex);
}

function handleTourComplete(io, roomId, room, userId, { tourIndex, score, timeTaken }) {
  const session = room.gameSession;
  if (!session || session.kind !== 'match') return;
  if (tourIndex !== session.currentTour) return;
  if (session.tourSubmissions[userId]) return;

  // Let score be any number (since crosswords might have negative points or >100)
  const finalScore = Number(score) || 0;
  session.tourSubmissions[userId] = { score: finalScore, points: finalScore, timeTaken: timeTaken || Infinity };

  const allDone = room.players.every((p) => session.tourSubmissions[p.id]);
  if (allDone) {
    if (session.tourTimeout) clearTimeout(session.tourTimeout);
    finalizeTour(io, roomId, room, tourIndex);
  }
}

function finalizeTour(io, roomId, room, tourIndex) {
  const session = room.gameSession;
  if (!session || session.currentTour !== tourIndex) return;

  const results = room.players.map((p) => {
    const sub = session.tourSubmissions[p.id] || { score: 0, points: 0, timeTaken: Infinity };
    return {
      userId: p.id,
      email: p.email,
      score: sub.score,
      tourPoints: sub.points,
      timeTaken: sub.timeTaken,
    };
  });

  // Sort by points desc, then timeTaken asc
  results.sort((a, b) => {
    if (b.tourPoints !== a.tourPoints) return b.tourPoints - a.tourPoints;
    return (a.timeTaken || Infinity) - (b.timeTaken || Infinity);
  });

  const top = results[0]?.tourPoints || 0;
  const topTime = results[0]?.timeTaken || Infinity;
  const winners = results.filter((r) => r.tourPoints === top && top > 0 && (r.timeTaken || Infinity) === topTime);
  const tourBonus = 200;

  results.forEach((r) => {
    const isWinner = winners.some((w) => w.userId === r.userId);
    const awarded = isWinner ? tourBonus + r.tourPoints : r.tourPoints;
    session.matchScores[r.userId].total += awarded;
    if (isWinner && winners.length === 1) {
      session.matchScores[r.userId].tourWins += 1;
    }
  });

  emitToRoom(io, roomId, 'match-tour-end', {
    tourIndex,
    gameType: session.schedule[tourIndex].gameType,
    results: results.map((r) => ({
      ...r,
      matchTotal: session.matchScores[r.userId].total,
    })),
    matchScores: session.matchScores,
  });

  session.tourPayload = null;
  setTimeout(() => startNextTour(io, roomId, room), 3000);
}

function finishMatch(io, roomId, room) {
  const session = room.gameSession;
  if (!session) return;

  clearQuizTimers(room);
  session.status = 'finished';
  room.status = 'completed';

  const leaderboard = room.players
    .map((p) => ({
      userId: p.id,
      email: p.email,
      total: session.matchScores[p.id]?.total || 0,
      tourWins: session.matchScores[p.id]?.tourWins || 0,
    }))
    .sort((a, b) => b.total - a.total);

  emitToRoom(io, roomId, 'match-finished', {
    leaderboard,
    totalTours: session.schedule.length,
  });
}

function handleQuizAnswerForRoom(io, roomId, room, userId, data) {
  const session = room.gameSession;
  const quiz = session?.activeQuiz || (session?.kind === 'quiz' ? session : null);
  if (!quiz) return handleQuizAnswer(io, roomId, room, userId, data, null);
  return handleQuizAnswer(io, roomId, room, userId, data, quiz);
}

module.exports = {
  startOnlineMatch,
  handleTourComplete,
  handleQuizAnswerForRoom,
};
