const {
  computeRoundPoints,
  getPublicQuestion,
} = require('./onlineQuizService');

function getQuizSession(room) {
  const s = room.gameSession;
  if (!s) return null;
  if (s.kind === 'quiz') return s;
  if (s.activeQuiz) return s.activeQuiz;
  return null;
}

function clearRoundTimer(quiz) {
  if (quiz?.roundTimer) {
    clearTimeout(quiz.roundTimer);
    quiz.roundTimer = null;
  }
}

function clearQuizTimers(room) {
  const quiz = getQuizSession(room);
  clearRoundTimer(quiz);
  if (room.gameSession?.tourTimeout) {
    clearTimeout(room.gameSession.tourTimeout);
    room.gameSession.tourTimeout = null;
  }
}

function emitToRoom(io, roomId, event, payload) {
  io.to(roomId).emit(event, payload);
}

function startQuizRounds(io, roomId, room, { onFinished } = {}) {
  const quiz = getQuizSession(room);
  if (!quiz) return;
  quiz.onFinished = onFinished;
  quiz.lastEndedRound = -1;
  startNextQuizRound(io, roomId, room, quiz);
}

function startNextQuizRound(io, roomId, room, quiz) {
  if (!quiz || quiz.status !== 'playing') return;

  clearRoundTimer(quiz);
  quiz.roundAnswers = {};

  const nextIndex = quiz.currentRound + 1;
  if (nextIndex >= quiz.questions.length) {
    finishQuiz(io, roomId, room, quiz);
    return;
  }

  quiz.currentRound = nextIndex;
  const question = quiz.questions[nextIndex];
  const timerMs = quiz.timerSeconds * 1000;
  const endsAt = Date.now() + timerMs;
  quiz.roundEndsAt = endsAt;

  emitToRoom(io, roomId, 'quiz-round-start', {
    roundIndex: nextIndex,
    totalRounds: quiz.questions.length,
    question: getPublicQuestion(question),
    timerSeconds: quiz.timerSeconds,
    endsAt,
    tourIndex: room.gameSession?.currentTour,
  });

  quiz.roundTimer = setTimeout(() => {
    endQuizRound(io, roomId, room, quiz);
  }, timerMs + 300);
}

function endQuizRound(io, roomId, room, quiz) {
  if (!quiz || quiz.status !== 'playing') return;

  const roundIndex = quiz.currentRound;
  if (roundIndex < 0) return;
  if (quiz.lastEndedRound === roundIndex) return;
  quiz.lastEndedRound = roundIndex;

  clearRoundTimer(quiz);

  const question = quiz.questions[roundIndex];
  const timerMs = quiz.timerSeconds * 1000;
  const answers = quiz.roundAnswers[roundIndex] || {};

  const playerResults = room.players.map((player) => {
    const entry = answers[player.id];
    const answer = entry?.answer || null;
    const isCorrect = answer === question.correctArticle;
    const timeRemainingMs = entry
      ? Math.max(0, (quiz.roundEndsAt || Date.now()) - entry.answeredAt)
      : 0;
    const points = computeRoundPoints(isCorrect, timeRemainingMs, timerMs);

    const scoreEntry = quiz.scores[player.id];
    scoreEntry.total += points;
    if (isCorrect) scoreEntry.correct += 1;
    scoreEntry.rounds.push({
      roundIndex,
      answer,
      isCorrect,
      points,
      timeRemainingMs,
    });

    return {
      userId: player.id,
      email: player.email,
      answer,
      isCorrect,
      points,
      totalScore: scoreEntry.total,
    };
  });

  emitToRoom(io, roomId, 'quiz-round-end', {
    roundIndex,
    correctArticle: question.correctArticle,
    word: question.word,
    playerResults,
    scores: quiz.scores,
    tourIndex: room.gameSession?.currentTour,
  });

  setTimeout(() => startNextQuizRound(io, roomId, room, quiz), 2500);
}

function finishQuiz(io, roomId, room, quiz) {
  if (!quiz) return;

  clearRoundTimer(quiz);
  quiz.status = 'finished';

  if (quiz.onFinished) {
    quiz.onFinished(quiz.scores);
    if (room.gameSession?.kind === 'match') {
      room.gameSession.activeQuiz = null;
    }
    return;
  }

  room.status = 'completed';
  const leaderboard = room.players
    .map((p) => ({
      userId: p.id,
      email: p.email,
      total: quiz.scores[p.id]?.total || 0,
      correct: quiz.scores[p.id]?.correct || 0,
    }))
    .sort((a, b) => b.total - a.total);

  emitToRoom(io, roomId, 'quiz-game-finished', {
    leaderboard,
    totalRounds: quiz.questions.length,
  });
}

function startOnlineQuiz(io, roomId, room) {
  const { initQuizSession, QUIZ_QUESTIONS_SOLO } = require('./onlineQuizService');
  initQuizSession(room, { questionCount: QUIZ_QUESTIONS_SOLO });

  emitToRoom(io, roomId, 'game-started', {
    gameType: 'quiz',
    gameConfig: room.gameConfig,
    totalRounds: getQuizSession(room).questions.length,
  });

  startQuizRounds(io, roomId, room);
}

function handleQuizAnswer(io, roomId, room, userId, { roundIndex, answer }, quizOverride) {
  const quiz = quizOverride || getQuizSession(room);
  if (!quiz || quiz.status !== 'playing') return;
  if (roundIndex !== quiz.currentRound) return;

  if (!quiz.roundAnswers[roundIndex]) {
    quiz.roundAnswers[roundIndex] = {};
  }
  if (quiz.roundAnswers[roundIndex][userId]) return;

  quiz.roundAnswers[roundIndex][userId] = {
    answer: String(answer || '').trim().toLowerCase(),
    answeredAt: Date.now(),
  };

  const allAnswered = room.players.every(
    (p) => quiz.roundAnswers[roundIndex][p.id]
  );
  if (allAnswered) {
    endQuizRound(io, roomId, room, quiz);
  }
}

module.exports = {
  startOnlineQuiz,
  startQuizRounds,
  handleQuizAnswer,
  clearQuizTimers,
  getQuizSession,
};
