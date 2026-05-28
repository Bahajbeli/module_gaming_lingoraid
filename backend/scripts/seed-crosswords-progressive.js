#!/usr/bin/env node
/**
 * Seed 1500 progressive crosswords (A1 → A2 → B1 → B2) from files/croswords/*.json.
 *
 * Usage:
 *   node scripts/seed-crosswords-progressive.js
 *   node scripts/seed-crosswords-progressive.js --dry-run
 *   node scripts/seed-crosswords-progressive.js --clear
 *   node scripts/seed-crosswords-progressive.js --count 50   (override total for test)
 *
 * Requires: DATABASE_URL, prisma migrate, admin user (created by seed or ensure-users)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const { tryAutoLayout, normalizeEntryNumbers } = require('../services/crosswordLayoutService');
const {
  PROGRESSIVE_PLAN,
  PROGRESSIVE_TOTAL,
  loadPools,
  pickWordsForPuzzle,
} = require('../services/crosswordWordPool');

const prisma = new PrismaClient();

const SEED_TAG = 'seed:croswords-cefr-v2';
const MIN_ENTRIES = 5;
const MAX_LAYOUT_ATTEMPTS = 12;
const BATCH_LOG = 25;

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    clear: args.includes('--clear'),
    count: (() => {
      const i = args.indexOf('--count');
      if (i === -1 || !args[i + 1]) return null;
      return Math.max(1, parseInt(args[i + 1], 10));
    })(),
  };
}

function scalePlan(totalOverride) {
  if (!totalOverride || totalOverride >= PROGRESSIVE_TOTAL) {
    return PROGRESSIVE_PLAN;
  }
  const ratio = totalOverride / PROGRESSIVE_TOTAL;
  return PROGRESSIVE_PLAN.map((tier) => ({
    ...tier,
    count: Math.max(1, Math.round(tier.count * ratio)),
  }));
}

async function resolveOwnerUserId() {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    orderBy: { createdAt: 'asc' },
  });
  if (admin) return admin.id;

  const any = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (any) return any.id;

  throw new Error(
    'Aucun utilisateur en base. Lancez: npm run db:seed ou npm run ensure-users'
  );
}

async function clearPreviousSeeds() {
  const legacyTags = [
    'seed:progressive-v1',
    'seed:crosswords-json-v1',
    'seed:croswords-cefr-v2',
  ];
  const toDelete = await prisma.crossword.findMany({
    where: {
      OR: legacyTags.map((tag) => ({ description: { contains: tag } })),
    },
    select: { id: true },
  });
  if (toDelete.length === 0) {
    console.log('ℹ️  Aucune grille seed précédente à supprimer.');
    return;
  }
  const ids = toDelete.map((c) => c.id);
  await prisma.crosswordEntry.deleteMany({ where: { crosswordId: { in: ids } } });
  await prisma.crossword.deleteMany({ where: { id: { in: ids } } });
  console.log(`🗑️  ${ids.length} grilles seed supprimées.`);
}

function buildLayout(tier, words, attempt) {
  const size = tier.gridSize;
  const shuffled =
    attempt > 0
      ? [...words].sort(() => Math.random() - 0.5)
      : words;
  const entries = tryAutoLayout(size, size, shuffled);
  return { width: size, height: size, entries };
}

function generateOnePuzzle(tier, pool, puzzleIndex, globalNumber, globalSeed) {
  for (let attempt = 0; attempt < MAX_LAYOUT_ATTEMPTS; attempt++) {
    const wordCandidates = pickWordsForPuzzle(pool, tier, puzzleIndex, globalSeed + attempt);
    if (wordCandidates.length < MIN_ENTRIES) continue;

    const extra = tier.targetWords + 4;
    const batch = pickWordsForPuzzle(
      pool,
      tier,
      puzzleIndex + attempt * 1000,
      globalSeed + attempt
    ).slice(0, extra);

    const { width, height, entries } = buildLayout(tier, batch, attempt);
    if (entries.length >= MIN_ENTRIES) {
      const title = `${tier.cefr} · #${String(globalNumber).padStart(4, '0')}`;
      const description = [
        SEED_TAG,
        `CEFR ${tier.cefr}`,
        tier.theme,
        `${entries.length} words`,
        `grid ${width}×${height}`,
        `puzzle ${puzzleIndex}/${tier.count}`,
      ].join(' · ');

      return {
        title,
        description,
        width,
        height,
        entries,
        wordCount: entries.length,
      };
    }
  }
  return null;
}

async function insertPuzzle(userId, puzzle) {
  return prisma.crossword.create({
    data: {
      title: puzzle.title,
      description: puzzle.description,
      width: puzzle.width,
      height: puzzle.height,
      isPublished: true,
      userId,
      entries: {
        create: puzzle.entries.map((e) => ({
          row: e.row,
          col: e.col,
          direction: e.direction,
          clue: e.clue,
          answer: e.answer,
          number: e.number,
        })),
      },
    },
    include: { entries: true },
  });
}

async function main() {
  const { dryRun, clear, count: countOverride } = parseArgs();
  const plan = scalePlan(countOverride);
  const targetTotal = plan.reduce((s, t) => s + t.count, 0);

  console.log('═══════════════════════════════════════════════════');
  console.log('  LingoRaid — Seed mots croisés progressifs (A1→B2)');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Cible: ${targetTotal} grilles${dryRun ? ' (dry-run)' : ''}\n`);

  const { pools, totalWords, source, levelStats } = loadPools();
  console.log(`  Banque de mots: ${source} (${totalWords} entrées total)\n`);

  for (const tier of plan) {
    const poolSize = pools[tier.cefr]?.length || 0;
    const bankSize = levelStats?.[tier.cefr]?.bank || 0;
    const needed = tier.count * tier.targetWords;
    console.log(
      `  ${tier.cefr}: ${tier.count} grilles · banque ${bankSize} · pool filtré ${poolSize} · besoin ~${needed} tirages`
    );
    if (poolSize < tier.targetWords * 2) {
      console.warn(`  ⚠️  Pool ${tier.cefr} faible — certaines grilles pourraient échouer`);
    }
  }
  console.log('');

  if (clear && !dryRun) {
    await clearPreviousSeeds();
  }

  const userId = dryRun ? null : await resolveOwnerUserId();
  if (!dryRun) console.log(`  Propriétaire des grilles: userId ${userId}\n`);

  let globalNumber = 0;
  let created = 0;
  let failed = 0;
  const failures = [];
  const globalSeed = Date.now() % 1000000;

  const startTime = Date.now();

  for (const tier of plan) {
    const pool = pools[tier.cefr];
    if (!pool || pool.length === 0) {
      console.error(`❌ Pool vide pour ${tier.cefr}`);
      continue;
    }

    console.log(`\n▶ Génération ${tier.cefr} (${tier.count} grilles, ${tier.gridSize}×${tier.gridSize})…`);

    for (let i = 1; i <= tier.count; i++) {
      globalNumber++;
      const puzzle = generateOnePuzzle(tier, pool, i, globalNumber, globalSeed);

      if (!puzzle) {
        failed++;
        failures.push({ cefr: tier.cefr, index: i, globalNumber });
        continue;
      }

      if (dryRun) {
        created++;
        if (created <= 3 || i === tier.count) {
          console.log(
            `  [dry] ${puzzle.title} — ${puzzle.wordCount} mots — ex: ${puzzle.entries[0]?.answer}`
          );
        }
      } else {
        try {
          await insertPuzzle(userId, puzzle);
          created++;
        } catch (err) {
          failed++;
          failures.push({ cefr: tier.cefr, index: i, error: err.message });
        }
      }

      if (created % BATCH_LOG === 0 && created > 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`  … ${created}/${targetTotal} grilles (${elapsed}s)`);
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  ✅ Créées: ${created}`);
  console.log(`  ❌ Échecs: ${failed}`);
  console.log(`  ⏱️  Durée: ${elapsed}s`);
  if (failures.length > 0 && failures.length <= 15) {
    console.log('  Échecs détail:', failures);
  } else if (failures.length > 15) {
    console.log(`  (${failures.length} échecs — relancer le script pour combler)`);
  }
  console.log('═══════════════════════════════════════════════════\n');

  if (!dryRun && created > 0) {
    const published = await prisma.crossword.count({ where: { isPublished: true } });
    console.log(`  Total grilles publiées en base: ${published}\n`);
  }
}

main()
  .catch((e) => {
    console.error('Fatal:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
