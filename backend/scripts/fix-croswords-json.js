#!/usr/bin/env node
/**
 * Convert files/croswords/*.json to valid JSON (fixes B1/B2 pseudo-JSON).
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'files', 'croswords');

const LEVELS = [
  { file: 'german_a1_words.json', level: 'A1' },
  { file: 'german_a2_words.json', level: 'A2' },
  { file: 'german_b1_words.json', level: 'B1' },
  { file: 'german_b2_words.json', level: 'B2' },
];

function extractWords(raw) {
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

function loadWords(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    const data = JSON.parse(raw);
    const rows = Array.isArray(data?.words) ? data.words : Array.isArray(data) ? data : [];
    return rows.map((r) => ({
      word: r.word ?? r.answer,
      description: r.description ?? r.clue ?? r.english,
    }));
  } catch {
    return extractWords(raw);
  }
}

function writeLevel({ file, level }) {
  const filePath = path.join(DIR, file);
  const words = loadWords(filePath).filter((w) => w.word && w.description);
  const out = {
    metadata: {
      level,
      language: 'German',
      description_language: 'English',
      total_words: words.length,
      usage: 'crossword',
    },
    words,
  };
  fs.writeFileSync(filePath, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  console.log(`✅ ${file}: ${words.length} mots`);
  return words.length;
}

function main() {
  console.log('Normalisation des fichiers croswords…\n');
  let total = 0;
  for (const spec of LEVELS) {
    total += writeLevel(spec);
  }
  console.log(`\nTotal: ${total} mots sur 4 niveaux`);
}

main();
