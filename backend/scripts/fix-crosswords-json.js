#!/usr/bin/env node
/**
 * Convert files/crosswords.json from Python tuple list to valid JSON.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '..', 'files', 'crosswords.json');
const GERMAN_LETTERS = /^[A-ZÄÖÜẞ]+$/;

/** Keep grid letters as in source (UE/OE/AE or Ä/Ö/Ü); do not auto-expand UE→Ü (breaks FEUER). */
function normalizeAnswer(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/ẞ/g, 'ß')
    .replace(/[^A-ZÄÖÜß]/g, '')
    .replace(/ß/g, 'SS');
}

function main() {
  const raw = fs.readFileSync(INPUT, 'utf8');
  const re = /\("([^"]+)",\s*"([^"]*)"\)/g;
  const words = [];
  const seen = new Set();
  const skipped = [];

  let m;
  while ((m = re.exec(raw)) !== null) {
    const answer = normalizeAnswer(m[1]);
    const clue = m[2].trim().replace(/\s+/g, ' ');
    if (!answer || !clue) {
      skipped.push({ raw: m[1], reason: 'empty' });
      continue;
    }
    if (!GERMAN_LETTERS.test(answer)) {
      skipped.push({ raw: m[1], answer, reason: 'invalid letters' });
      continue;
    }
    if (seen.has(answer)) continue;
    seen.add(answer);
    words.push({ answer, clue });
  }

  if (words.length === 0) {
    console.error('No entries parsed — check input format.');
    process.exit(1);
  }

  const out = {
    version: 1,
    description: 'German crossword word bank (answer + English clue)',
    count: words.length,
    words,
  };

  fs.writeFileSync(INPUT, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${words.length} words to ${INPUT}`);
  if (skipped.length) console.log(`Skipped ${skipped.length}:`, skipped.slice(0, 5));
}

main();
