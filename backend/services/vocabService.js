const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LEVELS = ['a1', 'a2', 'b1'];

let vocabCache = null;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function loadAllVocab(forceReload = false) {
  if (vocabCache && !forceReload) return vocabCache;

  const words = await prisma.vocabWord.findMany();
  vocabCache = words;
  
  console.log(
    `[vocab] Loaded ${words.length} entries from DB (${LEVELS.map((l) => `${l}: ${words.filter((i) => i.level === l).length}`).join(', ')})`
  );
  return vocabCache;
}

async function getMeta() {
  const all = await loadAllVocab();
  const byLevel = {};
  for (const level of LEVELS) {
    byLevel[level] = all.filter((i) => i.level === level).length;
  }
  return {
    levels: LEVELS,
    counts: byLevel,
    total: all.length,
    filesScanned: 0,
  };
}

function pickDistractors(pool, correctItem, count = 3) {
  const used = new Set([correctItem.english.toLowerCase()]);
  const distractors = [];
  const candidates = shuffle(
    pool.filter((p) => p.id !== correctItem.id && p.english)
  );

  for (const c of candidates) {
    if (distractors.length >= count) break;
    const key = c.english.toLowerCase();
    if (used.has(key)) continue;
    used.add(key);
    distractors.push(c.english);
  }
  return distractors;
}

function buildQuestion(pool, item) {
  const distractors = pickDistractors(pool, item, 3);
  if (distractors.length < 3) return null;

  const options = shuffle([item.english, ...distractors]);
  return {
    id: item.id,
    level: item.level,
    headword: item.headword,
    german: item.german,
    prompt: item.german,
    options,
    correctAnswer: item.english,
    correctIndex: options.indexOf(item.english),
  };
}

/**
 * @param {{ levels?: string[], count?: number }} opts
 */
async function buildQuizSession(opts = {}) {
  const count = Math.min(Math.max(parseInt(opts.count, 10) || 10, 1), 50);
  let requested = opts.levels;
  if (typeof requested === 'string') {
    requested = requested.split(',').map((s) => s.trim().toLowerCase());
  }
  const levelFilter =
    Array.isArray(requested) && requested.length > 0
      ? requested.filter((l) => LEVELS.includes(l))
      : LEVELS;

  const all = await loadAllVocab();
  const pool = all.filter((i) => levelFilter.includes(i.level));

  if (pool.length < 4) {
    throw new Error('Not enough vocabulary entries for a quiz');
  }

  const shuffledItems = shuffle(pool);
  const questions = [];
  const usedIds = new Set();

  for (const item of shuffledItems) {
    if (questions.length >= count) break;
    if (usedIds.has(item.id)) continue;
    const q = buildQuestion(pool, item);
    if (!q) continue;
    usedIds.add(item.id);
    questions.push(q);
  }

  if (questions.length < Math.min(count, 4)) {
    throw new Error('Could not build enough unique questions');
  }

  return {
    questions,
    questionCount: questions.length,
    poolSize: pool.length,
    levels: levelFilter,
  };
}

module.exports = {
  LEVELS,
  loadAllVocab,
  getMeta,
  buildQuizSession,
};
