const fs = require('fs');
const path = require('path');

const CROSWORDS_DIR = path.join(__dirname, '..', 'files', 'croswords');

const CEFR_FILES = {
  A1: 'german_a1_words.json',
  A2: 'german_a2_words.json',
  B1: 'german_b1_words.json',
  B2: 'german_b2_words.json',
};

const GERMAN_LETTERS = /^[A-ZÄÖÜẞ]+$/;

/** Progressive CEFR tiers — 1500 puzzles (A1 → A2 → B1 → B2) */
const PROGRESSIVE_PLAN = [
  {
    cefr: 'A1',
    count: 450,
    gridSize: 9,
    targetWords: 6,
    minAnswerLen: 3,
    maxAnswerLen: 6,
    minClueLen: 8,
    theme: 'Grundwortschatz',
  },
  {
    cefr: 'A2',
    count: 450,
    gridSize: 11,
    targetWords: 8,
    minAnswerLen: 4,
    maxAnswerLen: 8,
    minClueLen: 10,
    theme: 'Alltag & Kommunikation',
  },
  {
    cefr: 'B1',
    count: 375,
    gridSize: 13,
    targetWords: 10,
    minAnswerLen: 5,
    maxAnswerLen: 11,
    minClueLen: 12,
    theme: 'Fortgeschritten',
  },
  {
    cefr: 'B2',
    count: 225,
    gridSize: 15,
    targetWords: 12,
    minAnswerLen: 7,
    maxAnswerLen: 14,
    minClueLen: 14,
    theme: 'Komplexe Sprache',
  },
];

let poolsCache = null;

function normalizeAnswer(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-ZÄÖÜẞ]/g, '');
}

function formatClue(clue, maxLen = 120) {
  let text = String(clue || '').trim().replace(/\s+/g, ' ');
  if (!text) return '';
  if (text.length > maxLen) {
    text = `${text.slice(0, maxLen - 1)}…`;
  }
  return text;
}

function extractWordsFromBrokenJson(raw) {
  const re =
    /\{\s*"word"\s*:\s*"([^"]+)"\s*,\s*"description"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/g;
  const words = [];
  let m;
  while ((m = re.exec(raw))) {
    words.push({
      word: m[1],
      description: m[2].replace(/\\"/g, '"'),
    });
  }
  return words;
}

function loadLevelWordBank(cefr) {
  const filename = CEFR_FILES[cefr];
  if (!filename) {
    throw new Error(`Niveau CEFR inconnu: ${cefr}`);
  }

  const filePath = path.join(CROSWORDS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier introuvable: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  let rows = [];

  try {
    const data = JSON.parse(raw);
    rows = Array.isArray(data?.words) ? data.words : Array.isArray(data) ? data : [];
  } catch {
    rows = extractWordsFromBrokenJson(raw);
  }

  const seen = new Set();
  const words = [];

  for (const row of rows) {
    const answer = normalizeAnswer(row.answer ?? row.word ?? row.headword);
    const clue = formatClue(row.clue ?? row.description ?? row.english ?? row.hint, 100);
    if (!answer || !clue) continue;
    if (!GERMAN_LETTERS.test(answer)) continue;
    if (seen.has(answer)) continue;
    seen.add(answer);
    words.push({ answer, clue, length: answer.length, cefr });
  }

  if (words.length === 0) {
    throw new Error(`${filename} ne contient aucun mot valide`);
  }

  return { words, source: filePath, cefr };
}

function buildPoolForTier(tier, allWords) {
  const seen = new Set();
  const pool = [];

  for (const item of allWords) {
    const { answer, clue, length } = item;
    if (length < tier.minAnswerLen || length > tier.maxAnswerLen) continue;
    if (clue.length < tier.minClueLen) continue;
    if (seen.has(answer)) continue;
    seen.add(answer);
    pool.push({ answer, clue });
  }

  return pool;
}

function shuffleWithSeed(arr, seed) {
  const a = [...arr];
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickWordsForPuzzle(pool, tier, puzzleIndex, globalSeed) {
  const shuffled = shuffleWithSeed(
    pool,
    globalSeed + puzzleIndex * 9973 + tier.cefr.charCodeAt(0) * 13
  );
  const picked = [];
  const used = new Set();

  for (const w of shuffled) {
    if (picked.length >= tier.targetWords) break;
    if (used.has(w.answer)) continue;
    used.add(w.answer);
    picked.push({ answer: w.answer, clue: w.clue });
  }

  return picked;
}

function loadPools(forceReload = false) {
  if (poolsCache && !forceReload) return poolsCache;

  const pools = {};
  const levelStats = {};
  let totalWords = 0;

  for (const tier of PROGRESSIVE_PLAN) {
    const { words, source } = loadLevelWordBank(tier.cefr);
    pools[tier.cefr] = buildPoolForTier(tier, words);
    levelStats[tier.cefr] = { bank: words.length, pool: pools[tier.cefr].length, source };
    totalWords += words.length;
  }

  poolsCache = {
    pools,
    plan: PROGRESSIVE_PLAN,
    totalWords,
    levelStats,
    source: CROSWORDS_DIR,
  };

  return poolsCache;
}

/** @deprecated use loadPools */
function loadCrosswordWordBank(forceReload = false) {
  const { pools, totalWords, source } = loadPools(forceReload);
  const all = Object.values(pools).flat();
  return { words: all, meta: { source, totalWords } };
}

module.exports = {
  PROGRESSIVE_PLAN,
  PROGRESSIVE_TOTAL: PROGRESSIVE_PLAN.reduce((s, t) => s + t.count, 0),
  CROSWORDS_DIR,
  CEFR_FILES,
  loadCrosswordWordBank,
  loadPools,
  pickWordsForPuzzle,
  normalizeAnswer,
};
