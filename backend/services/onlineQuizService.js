const fs = require('fs');
const path = require('path');

const OPTIONS = ['der', 'die', 'das'];
const QUESTION_COUNT = 10;
const ALLOWED_TIMERS = [15, 30, 45, 60];
const QUIZ_QUESTIONS_MATCH = 5;
const QUIZ_QUESTIONS_SOLO = 10;

const NOUNS_CANDIDATE_PATHS = [
  path.join(__dirname, '..', 'german_nouns.json'),
  path.join(__dirname, '..', '..', '..', 'german_nouns.json'),
  path.join(__dirname, '..', '..', 'german_nouns.json'),
];

function resolveNounsFilePath() {
  for (const candidate of NOUNS_CANDIDATE_PATHS) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return NOUNS_CANDIDATE_PATHS[0];
}

function loadNouns() {
  const filePath = resolveNounsFilePath();
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Fichier german_nouns.json introuvable. Chemins testés : ${NOUNS_CANDIDATE_PATHS.join(', ')}`
    );
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const nouns = JSON.parse(raw);
  return nouns
    .filter((n) => n && n.word && n.article)
    .map((n) => ({
      word: n.word,
      article: String(n.article).trim().toLowerCase(),
      translation: n.englishTranslation || n.translation || n.meaning || '',
    }))
    .filter((n) => OPTIONS.includes(n.article));
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildQuizQuestions(count = QUESTION_COUNT) {
  const nouns = loadNouns();
  const picked = shuffle(nouns).slice(0, Math.min(count, nouns.length));
  return picked.map((n, index) => ({
    id: `q_${index}`,
    word: n.word,
    translation: n.translation,
    correctArticle: n.article,
  }));
}

/** Points: 100 si correct + bonus temps (max 50) selon temps restant */
function computeRoundPoints(isCorrect, timeRemainingMs, timerMs) {
  if (!isCorrect) return 0;
  const base = 100;
  const ratio = Math.max(0, Math.min(1, timeRemainingMs / timerMs));
  const timeBonus = Math.round(ratio * 50);
  return base + timeBonus;
}

function initQuizSession(room, { questionCount = QUESTION_COUNT, parentSession = null } = {}) {
  const questions = buildQuizQuestions(questionCount);
  const scores = {};
  room.players.forEach((p) => {
    scores[p.id] = { total: 0, correct: 0, rounds: [] };
  });

  const quizSession = {
    kind: 'quiz',
    status: 'playing',
    currentRound: -1,
    timerSeconds: room.gameConfig.timerSeconds,
    questions,
    scores,
    roundAnswers: {},
    roundTimer: null,
    roundEndsAt: null,
    parentSession,
  };

  if (parentSession) {
    room.gameSession.activeQuiz = quizSession;
  } else {
    room.gameSession = quizSession;
  }
  return quizSession;
}

function getPublicQuestion(question) {
  return {
    id: question.id,
    word: question.word,
    translation: question.translation,
  };
}

module.exports = {
  OPTIONS,
  QUESTION_COUNT,
  QUIZ_QUESTIONS_MATCH,
  QUIZ_QUESTIONS_SOLO,
  ALLOWED_TIMERS,
  initQuizSession,
  computeRoundPoints,
  getPublicQuestion,
};
