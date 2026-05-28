const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const MAX_HEARTS = 2;
const REGEN_MS = 24 * 60 * 60 * 1000;

function parseLosses(raw) {
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((t) => new Date(t).getTime())
      .filter((t) => !Number.isNaN(t))
      .sort((a, b) => a - b)
      .slice(-MAX_HEARTS);
  } catch {
    return [];
  }
}

/**
 * Calcule les cœurs effectifs et la prochaine régénération.
 * - 1ère perte : reste 1 cœur (jeu possible)
 * - 2ème perte : 0 cœur → +24h → 1 cœur → +24h → 2 cœurs
 * - 1 seule perte : +24h → 2 cœurs
 */
function computeHeartStatus(lossTimestamps) {
  const now = Date.now();
  const losses = [...lossTimestamps];

  if (losses.length === 0) {
    return { hearts: MAX_HEARTS, canPlay: true, nextRegenAt: null };
  }

  if (losses.length === 1) {
    const t1 = losses[0];
    if (now >= t1 + REGEN_MS) {
      return { hearts: MAX_HEARTS, canPlay: true, nextRegenAt: null };
    }
    return {
      hearts: 1,
      canPlay: true,
      nextRegenAt: new Date(t1 + REGEN_MS).toISOString(),
    };
  }

  const t1 = losses[0];
  const t2 = losses[1];

  if (now < t2 + REGEN_MS) {
    return {
      hearts: 0,
      canPlay: false,
      nextRegenAt: new Date(t2 + REGEN_MS).toISOString(),
    };
  }

  if (now < t2 + 2 * REGEN_MS) {
    return {
      hearts: 1,
      canPlay: true,
      nextRegenAt: new Date(t2 + 2 * REGEN_MS).toISOString(),
    };
  }

  return { hearts: MAX_HEARTS, canPlay: true, nextRegenAt: null };
}

async function getOrCreateRecord(userId) {
  let record = await prisma.simulationHearts.findUnique({ where: { userId } });
  if (!record) {
    record = await prisma.simulationHearts.create({
      data: { userId, losses: '[]' },
    });
  }
  return record;
}

async function getHeartsStatus(userId) {
  const record = await getOrCreateRecord(userId);
  const lossTimestamps = parseLosses(record.losses);
  const status = computeHeartStatus(lossTimestamps);

  return {
    maxHearts: MAX_HEARTS,
    lossesCount: lossTimestamps.length,
    regenHours: 24,
    ...status,
  };
}

async function recordLoss(userId) {
  const record = await getOrCreateRecord(userId);
  let losses = parseLosses(record.losses);
  const now = Date.now();

  const current = computeHeartStatus(losses);
  if (!current.canPlay && current.hearts === 0) {
    return { ...current, maxHearts: MAX_HEARTS, lossesCount: losses.length, regenHours: 24, alreadyBlocked: true };
  }

  losses.push(now);
  losses = losses.slice(-MAX_HEARTS);

  await prisma.simulationHearts.update({
    where: { userId },
    data: { losses: JSON.stringify(losses.map((t) => new Date(t).toISOString())) },
  });

  const status = computeHeartStatus(losses);
  return {
    maxHearts: MAX_HEARTS,
    lossesCount: losses.length,
    regenHours: 24,
    ...status,
  };
}

/** Après régénération complète, on peut réinitialiser l'historique des pertes */
async function syncRecordAfterRegen(userId) {
  const record = await getOrCreateRecord(userId);
  const losses = parseLosses(record.losses);
  const status = computeHeartStatus(losses);
  if (status.hearts === MAX_HEARTS && losses.length > 0) {
    await prisma.simulationHearts.update({
      where: { userId },
      data: { losses: '[]' },
    });
    return { ...status, maxHearts: MAX_HEARTS, lossesCount: 0, regenHours: 24 };
  }
  return { maxHearts: MAX_HEARTS, lossesCount: losses.length, regenHours: 24, ...status };
}

module.exports = {
  getHeartsStatus,
  recordLoss,
  syncRecordAfterRegen,
  MAX_HEARTS,
  REGEN_MS,
};
