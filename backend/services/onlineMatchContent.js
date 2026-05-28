const { PrismaClient } = require('@prisma/client');
const germanBingoData = require('./germanBingoDataService');

const prisma = new PrismaClient();

const ONLINE_BINGO_GRID = 16;
const ONLINE_BINGO_WORDS = 20;

async function loadCreativityPayload() {
  let items = await prisma.media.findMany({
    where: { type: 'creativity', isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!items.length) {
    items = await prisma.media.findMany({
      where: { type: 'creativity' },
      orderBy: { createdAt: 'desc' },
    });
  }
  if (!items.length) return null;
  const m = items[Math.floor(Math.random() * items.length)];
  let cfg = {};
  try {
    cfg = JSON.parse(m.streamingUrl || '{}');
  } catch {
    cfg = {};
  }
  return {
    itemId: m.id,
    title: m.title,
    image: m.imageUrl,
    points: cfg.points || [],
  };
}

async function loadCrosswordPayload() {
  let list = await prisma.crossword.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, title: true },
  });
  if (!list.length) {
    list = await prisma.crossword.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, title: true },
    });
  }
  if (!list.length) return null;
  const pick = list[Math.floor(Math.random() * list.length)];
  return { itemId: pick.id, title: pick.title };
}

function loadBingoPayload() {
  try {
    const session = germanBingoData.createGameSession();
    const gridClasses = (session.gridClasses || []).slice(0, ONLINE_BINGO_GRID);
    const words = (session.words || []).slice(0, ONLINE_BINGO_WORDS);
    if (!gridClasses.length || !words.length) return null;

    return {
      gridClasses: gridClasses.map((cls) => ({
        id: cls.id,
        label: cls.label,
        imageUrl: cls.imageUrl || '',
        icon: cls.icon || '',
      })),
      words,
      durationSeconds: 90,
    };
  } catch (err) {
    console.error('loadBingoPayload (JSON):', err.message);
    return null;
  }
}

async function loadTourPayload(gameType) {
  switch (gameType) {
    case 'creativite':
      return { type: 'creativite', data: await loadCreativityPayload() };
    case 'mots-croises':
      return { type: 'mots-croises', data: await loadCrosswordPayload() };
    case 'bingo':
      return { type: 'bingo', data: await loadBingoPayload() };
    default:
      return { type: gameType, data: null };
  }
}

module.exports = {
  loadTourPayload,
};
