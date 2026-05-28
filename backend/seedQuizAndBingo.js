const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const FILES_ROOT = path.join(__dirname, 'files');

// === 1. Article Quiz Nouns ===
async function seedArticleNouns() {
  console.log('Seeding Article Quiz Nouns...');
  const filePath = path.join(FILES_ROOT, 'german_nouns.json');
  if (!fs.existsSync(filePath)) {
    console.log('Fichier german_nouns.json introuvable, skip.');
    return;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const nouns = JSON.parse(raw);
  
  const clean = nouns.map(n => ({
    word: n.word,
    article: String(n.article || '').trim().toLowerCase(),
    translation: n.englishTranslation || n.translation || ''
  })).filter(n => n.word && ['der', 'die', 'das'].includes(n.article));

  await prisma.germanNoun.deleteMany(); // Clear existing
  console.log(`Insertion de ${clean.length} noms...`);
  
  // CreateMany might fail if there are duplicates in word (which is unique)
  // Let's filter duplicates
  const seen = new Set();
  const uniqueNouns = [];
  for (const n of clean) {
    if (!seen.has(n.word)) {
      seen.add(n.word);
      uniqueNouns.push(n);
    }
  }

  await prisma.germanNoun.createMany({
    data: uniqueNouns,
    skipDuplicates: true
  });
  console.log('Article Quiz Nouns OK.');
}

// === 2. Vocab Quiz ===
function parseTsvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const parts = trimmed.split('\t');
  if (parts.length < 3) return null;

  const headword = parts[0].trim();
  const english = parts[parts.length - 1].trim();
  const german = parts.slice(1, -1).join('\t').trim();

  if (!headword || !english || !german) return null;
  const h = headword.toLowerCase();
  const e = english.toLowerCase();
  if (h.includes('german word') || h.includes('german sentence') || e.includes('english translation') || h === 'headword') return null;
  if (english.length < 2 || german.length < 2) return null;

  return { headword, german, english };
}

async function seedVocab() {
  console.log('Seeding Vocab Quiz...');
  const LEVELS = ['a1', 'a2', 'b1'];
  const items = [];

  for (const level of LEVELS) {
    const dir = path.join(FILES_ROOT, level);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.tsv'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      const lines = content.split(/\r?\n/);
      lines.forEach(line => {
        const parsed = parseTsvLine(line);
        if (!parsed) return;
        items.push({
          level,
          source: file,
          headword: parsed.headword,
          german: parsed.german,
          english: parsed.english,
        });
      });
    }
  }

  await prisma.vocabWord.deleteMany();
  console.log(`Insertion de ${items.length} mots de vocabulaire...`);
  
  // Insert in chunks
  const chunkSize = 1000;
  for (let i = 0; i < items.length; i += chunkSize) {
    await prisma.vocabWord.createMany({
      data: items.slice(i, i + chunkSize),
      skipDuplicates: true
    });
  }
  console.log('Vocab Quiz OK.');
}

// === 3. German Bingo ===
async function seedBingo() {
  console.log('Seeding German Bingo...');
  const dataPath = path.join(FILES_ROOT, 'german_bingo_full.json');
  if (!fs.existsSync(dataPath)) {
    console.log('Fichier german_bingo_full.json introuvable, skip.');
    return;
  }
  
  const raw = fs.readFileSync(dataPath, 'utf8');
  const data = JSON.parse(raw);
  
  let categories = Array.isArray(data.categories) ? data.categories : [];
  if (categories.length === 0) {
    const catSet = new Set();
    (data.words || []).forEach(w => {
      (w.categories || []).forEach(c => catSet.add(c));
    });
    categories = Array.from(catSet).map(c => ({
      id: c,
      name: c.charAt(0).toUpperCase() + c.slice(1).replace(/_/g, ' '),
      icon: ''
    }));
  }

  await prisma.germanBingoWordClass.deleteMany();
  await prisma.germanBingoWord.deleteMany();
  await prisma.germanBingoClass.deleteMany();

  console.log(`Insertion de ${categories.length} catégories Bingo...`);
  const catMap = new Map(); // id -> database ID
  
  for (const cat of categories) {
    const created = await prisma.germanBingoClass.create({
      data: {
        id: String(cat.id), // Try to preserve ID if possible
        label: cat.name || cat.id,
        icon: cat.icon || '',
        english: cat.english || '',
        imagePath: null
      }
    });
    catMap.set(String(cat.id), created.id);
  }

  const words = Array.isArray(data.words) ? data.words : [];
  console.log(`Insertion de ${words.length} mots Bingo...`);
  
  for (const w of words) {
    const validCatIds = (w.categories || []).map(String).filter(c => catMap.has(c));
    
    await prisma.germanBingoWord.create({
      data: {
        id: String(w.id), // Try to preserve ID
        word: w.german,
        english: w.english || '',
        emoji: w.emoji || '',
        classes: {
          create: validCatIds.map(c => ({ classId: catMap.get(c) }))
        }
      }
    });
  }
  console.log('German Bingo OK.');
}

async function main() {
  try {
    await seedArticleNouns();
    await seedVocab();
    await seedBingo();
    console.log('--- ALL SEEDING COMPLETE ---');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
