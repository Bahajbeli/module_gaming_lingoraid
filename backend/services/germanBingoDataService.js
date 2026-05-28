const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const GAME_GRID_MAX = 16;
const WORDS_PER_CLASS = 2;
const OFF_TOPIC_WORDS = 18;

let cached = null;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function loadData() {
  if (cached) return cached;

  const dbClasses = await prisma.germanBingoClass.findMany();
  const dbWords = await prisma.germanBingoWord.findMany({
    include: { classes: true }
  });

  const categories = dbClasses.map(c => ({
    id: c.id,
    name: c.label,
    icon: c.icon || '',
    english: c.english || ''
  }));

  const words = dbWords.map(w => ({
    id: w.id,
    word: w.word,
    english: w.english || '',
    emoji: w.emoji || '',
    categoryIds: w.classes.map(cls => cls.classId),
  }));

  cached = { categories, words, dataPath: 'database' };
  return cached;
}

function formatGridClass(category) {
  return {
    id: category.id,
    label: category.name || category.id,
    imageUrl: '',
    icon: category.icon || '',
    english: category.english || '',
  };
}

async function createGameSession() {
  const { categories, words } = await loadData();
  
  if (categories.length === 0 || words.length === 0) {
    throw new Error('Le fichier German Bingo ne contient pas de données jouables');
  }

  // 1. Select up to 16 random categories
  const gridCategories = shuffle(categories).slice(0, Math.min(GAME_GRID_MAX, categories.length));
  const gridClassIds = gridCategories.map(c => c.id);

  const selectedWords = [];
  const chosenWordIds = new Set();

  // 2. Pick exactly WORDS_PER_CLASS for each displayed class
  for (const cls of gridCategories) {
    const available = words.filter(w => 
      w.categoryIds.includes(cls.id) && !chosenWordIds.has(w.id)
    );
    const picked = shuffle(available).slice(0, WORDS_PER_CLASS);
    for (const p of picked) {
      chosenWordIds.add(p.id);
      selectedWords.push(p);
    }
  }

  // 3. Pick exactly OFF_TOPIC_WORDS that do not belong to ANY displayed class
  const availableOffTopic = words.filter(w => 
    !w.categoryIds.some(catId => gridClassIds.includes(catId)) && !chosenWordIds.has(w.id)
  );
  
  const pickedOffTopic = shuffle(availableOffTopic).slice(0, OFF_TOPIC_WORDS);
  for (const p of pickedOffTopic) {
    chosenWordIds.add(p.id);
    selectedWords.push(p);
  }

  // Final shuffle of the word pool
  const sessionWords = shuffle(selectedWords);

  return {
    gridClasses: gridCategories.map(formatGridClass),
    words: sessionWords.map((w) => ({
      wordId: w.id,
      word: w.word,
      english: w.english,
      emoji: w.emoji,
    })),
  };
}

async function checkPlacement(wordId, selectedClassIds) {
  const { words } = await loadData();
  const word = words.find((w) => w.id === String(wordId));
  if (!word) return null;

  const correctIds = new Set(word.categoryIds);
  const selected = selectedClassIds.map(String);
  const correctSelected = selected.filter((id) => correctIds.has(id)).length;
  const expectedCount = correctIds.size;
  const selectedCount = selected.length;
  const perfectMatch =
    selectedCount > 0 && correctSelected === selectedCount && correctSelected > 0;

  let message;
  if (correctSelected === expectedCount && selectedCount >= expectedCount) {
    message = 'Bravo ! Vous avez trouvé toutes les classes pour ce mot.';
  } else if (correctSelected > 0 && correctSelected === selectedCount) {
    message = "Bien ! Cette sélection est correcte (il peut rester d'autres classes).";
  } else if (correctSelected > 0) {
    message = "Certaines classes sont correctes, d'autres ne conviennent pas.";
  } else {
    message = 'Cette sélection ne convient pas à ce mot.';
  }

  return {
    perfectMatch,
    expectedCount,
    selectedCount,
    correctSelectedCount: correctSelected,
    message,
  };
}

module.exports = {
  createGameSession,
  checkPlacement,
};
