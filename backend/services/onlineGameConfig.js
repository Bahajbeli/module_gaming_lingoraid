const ALLOWED_GAMES = ['quiz', 'creativite', 'mots-croises', 'bingo', 'random', 'custom'];
const ROUND_GAME_TYPES = ['quiz', 'creativite', 'mots-croises', 'bingo'];
const ALLOWED_TIMERS = [15, 30, 45, 60];

const GAME_LABELS = {
  quiz: 'Quiz Articles (der/die/das)',
  creativite: 'Créativité',
  'mots-croises': 'Mots croisés',
  bingo: 'Deutsch Bingo',
  random: 'Mode au hasard',
  custom: 'Sur mesure',
};

function clampRounds(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return 1;
  return Math.min(10, Math.max(1, Math.round(v))); // Allow up to 10 rounds for custom/random
}

function normalizeGameConfig(body = {}) {
  const randomMode = Boolean(body.randomMode) || body.gameType === 'random';
  const timerSeconds = ALLOWED_TIMERS.includes(Number(body.timerSeconds))
    ? Number(body.timerSeconds)
    : 30;

  if (randomMode) {
    const roundsCount = clampRounds(body.roundsCount);
    return {
      gameType: 'random',
      randomMode: true,
      roundsCount,
      timerSeconds,
      label: `Mode au hasard — ${roundsCount} tour${roundsCount > 1 ? 's' : ''}`,
    };
  }

  if (body.gameType === 'custom') {
    const customSchedule = Array.isArray(body.customSchedule) ? body.customSchedule : [];
    const validSchedule = customSchedule.map(s => ({
      gameType: ROUND_GAME_TYPES.includes(s.gameType) ? s.gameType : 'quiz',
      timerSeconds: ALLOWED_TIMERS.includes(Number(s.timerSeconds)) ? Number(s.timerSeconds) : 30
    })).slice(0, 10); // max 10 rounds
    return {
      gameType: 'custom',
      randomMode: false,
      roundsCount: validSchedule.length || 1,
      customSchedule: validSchedule.length ? validSchedule : [{ gameType: 'quiz', timerSeconds: 30 }],
      timerSeconds,
      label: `Sur mesure — ${validSchedule.length} tour${validSchedule.length > 1 ? 's' : ''}`,
    };
  }

  const gameType = ROUND_GAME_TYPES.includes(body.gameType) ? body.gameType : 'quiz';
  const needsRounds = gameType === 'creativite' || gameType === 'mots-croises';
  const roundsCount = needsRounds ? clampRounds(body.roundsCount) : 1;

  return {
    gameType,
    randomMode: false,
    roundsCount,
    timerSeconds,
    label:
      needsRounds && roundsCount > 1
        ? `${GAME_LABELS[gameType]} — ${roundsCount} tours`
        : GAME_LABELS[gameType],
  };
}

function buildMatchSchedule(gameConfig) {
  const count = gameConfig.roundsCount || 1;
  const pool = ROUND_GAME_TYPES;

  if (gameConfig.gameType === 'custom') {
    return gameConfig.customSchedule.map((s, i) => ({
      tourIndex: i,
      gameType: s.gameType,
      label: GAME_LABELS[s.gameType],
      timerSeconds: s.timerSeconds,
    }));
  }

  if (gameConfig.randomMode) {
    const schedule = [];
    let last = null;
    for (let i = 0; i < count; i++) {
      let pick;
      if (pool.length === 1) {
        pick = pool[0];
      } else {
        do {
          pick = pool[Math.floor(Math.random() * pool.length)];
        } while (pick === last);
      }
      last = pick;
      
      // Random timer
      const randomTimer = ALLOWED_TIMERS[Math.floor(Math.random() * ALLOWED_TIMERS.length)];
      
      schedule.push({
        tourIndex: i,
        gameType: pick,
        label: GAME_LABELS[pick],
        timerSeconds: randomTimer,
      });
    }
    return schedule;
  }

  if (gameConfig.gameType === 'creativite' || gameConfig.gameType === 'mots-croises') {
    return Array.from({ length: count }, (_, i) => ({
      tourIndex: i,
      gameType: gameConfig.gameType,
      label: GAME_LABELS[gameConfig.gameType],
      timerSeconds: gameConfig.timerSeconds,
    }));
  }

  return [
    {
      tourIndex: 0,
      gameType: gameConfig.gameType,
      label: GAME_LABELS[gameConfig.gameType],
      timerSeconds: gameConfig.timerSeconds,
    },
  ];
}

module.exports = {
  ALLOWED_GAMES,
  ROUND_GAME_TYPES,
  ALLOWED_TIMERS,
  GAME_LABELS,
  normalizeGameConfig,
  buildMatchSchedule,
};
