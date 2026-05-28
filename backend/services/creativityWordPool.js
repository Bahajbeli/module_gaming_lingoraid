const fs = require('fs');
const path = require('path');

const CROSWORDS_DIR = path.join(__dirname, '..', 'files', 'croswords');

const CEFR_FILES = {
  A1: 'german_a1_words.json',
  A2: 'german_a2_words.json',
  B1: 'german_b1_words.json',
  B2: 'german_b2_words.json',
};

const GERMAN_NOUN = /^[A-ZÄÖÜẞ]+$/;

/** 1200 jeux créativité progressifs A1 → B2 */
const CREATIVITY_PLAN = [
  { cefr: 'A1', count: 450, wordCount: 4, minLen: 3, maxLen: 8, theme: 'Alltag' },
  { cefr: 'A2', count: 400, wordCount: 5, minLen: 4, maxLen: 10, theme: 'Kommunikation' },
  { cefr: 'B1', count: 250, wordCount: 6, minLen: 5, maxLen: 12, theme: 'Beruf & Gesellschaft' },
  { cefr: 'B2', count: 100, wordCount: 7, minLen: 7, maxLen: 16, theme: 'Komplexe Themen' },
];

const THEME_PROMPTS = {
  A1: ['Küche', 'Schule', 'Zoo', 'Wohnung', 'Park', 'Supermarkt', 'Strand', 'Kleidung', 'Familie', 'Essen'],
  A2: ['Reise', 'Arzt', 'Restaurant', 'Sport', 'Wetter', 'Stadt', 'Freizeit', 'Büro', 'Garten', 'Verkehr'],
  B1: ['Umwelt', 'Politik', 'Kultur', 'Technik', 'Gesundheit', 'Wirtschaft', 'Medien', 'Bildung'],
  B2: ['Wissenschaft', 'Philosophie', 'Literatur', 'Recht', 'Psychologie', 'Globalisierung'],
};

let poolCache = null;

function normalizeWord(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-ZÄÖÜẞ]/g, '');
}

function loadLevelPool(cefr) {
  const file = path.join(CROSWORDS_DIR, CEFR_FILES[cefr]);
  const raw = fs.readFileSync(file, 'utf8');
  const data = JSON.parse(raw);
  const rows = Array.isArray(data.words) ? data.words : [];
  const seen = new Set();
  const words = [];

  for (const row of rows) {
    const text = normalizeWord(row.word ?? row.answer);
    const hint = String(row.description ?? row.clue ?? '').trim();
    if (!text || !GERMAN_NOUN.test(text)) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    words.push({ text, hint });
  }
  return words;
}

function filterPool(all, tier) {
  return all.filter((w) => w.text.length >= tier.minLen && w.text.length <= tier.maxLen);
}

function loadCreativityPools(forceReload = false) {
  if (poolCache && !forceReload) return poolCache;

  const pools = {};
  const stats = {};
  for (const tier of CREATIVITY_PLAN) {
    const bank = loadLevelPool(tier.cefr);
    pools[tier.cefr] = filterPool(bank, tier);
    stats[tier.cefr] = { bank: bank.length, pool: pools[tier.cefr].length };
  }

  poolCache = { pools, plan: CREATIVITY_PLAN, stats };
  return poolCache;
}

function pickTheme(cefr, index) {
  const list = THEME_PROMPTS[cefr] || THEME_PROMPTS.A1;
  return list[index % list.length];
}

function pickWordsFromPool(pool, tier, puzzleIndex, globalSeed) {
  const { shuffleWithSeed } = require('./creativityLayoutService');
  const shuffled = shuffleWithSeed(pool, globalSeed + puzzleIndex * 7919);
  const used = new Set();
  const picked = [];
  for (const w of shuffled) {
    if (picked.length >= tier.wordCount) break;
    if (used.has(w.text)) continue;
    used.add(w.text);
    picked.push(w);
  }
  return picked;
}

module.exports = {
  CREATIVITY_PLAN,
  CREATIVITY_TOTAL: CREATIVITY_PLAN.reduce((s, t) => s + t.count, 0),
  loadCreativityPools,
  pickTheme,
  pickWordsFromPool,
  THEME_PROMPTS,
};
