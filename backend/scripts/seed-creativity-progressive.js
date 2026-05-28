#!/usr/bin/env node
/**
 * Seed 1200+ jeux créativité (A1→B2) avec IA + banque croswords.
 *
 * Usage:
 *   node scripts/seed-creativity-progressive.js
 *   node scripts/seed-creativity-progressive.js --dry-run
 *   node scripts/seed-creativity-progressive.js --clear
 *   node scripts/seed-creativity-progressive.js --count 20
 *   node scripts/seed-creativity-progressive.js --no-ai
 *
 * Variables (.env):
 *   CREATIVITY_AI_PROVIDER=groq|gemini|deepseek|ollama
 *   GROQ_API_KEY=...  (recommandé, gratuit)
 *   CLOUDINARY_URL=cloudinary://KEY:SECRET@CLOUD_NAME  (images sur CDN)
 *   CREATIVITY_USE_AI=false  → recommandé (mots depuis croswords, pas Groq)
 *   CREATIVITY_AI_BATCH=2    → si IA activée (évite rate limit)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const {
  CREATIVITY_PLAN,
  CREATIVITY_TOTAL,
  loadCreativityPools,
  pickTheme,
  pickWordsFromPool,
} = require('../services/creativityWordPool');
const {
  generateHotspotPositions,
  buildPoints,
} = require('../services/creativityLayoutService');
const { generatePuzzleBatch, isAiAvailable } = require('../services/creativityAiService');
const { isCloudinaryConfigured } = require('../services/cloudinaryService');
const { getBackgroundImage } = require('../services/creativityBackgroundService');

const prisma = new PrismaClient();
const SEED_TAG = 'seed:creativity-cefr-v1';
const AI_BATCH = Math.max(1, parseInt(process.env.CREATIVITY_AI_BATCH || '2', 10));
const AI_DELAY_MS = parseInt(process.env.CREATIVITY_AI_DELAY_MS || '35000', 10);
const UPLOAD_DELAY_MS = parseInt(process.env.CLOUDINARY_UPLOAD_DELAY_MS || '120', 10);

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    clear: args.includes('--clear'),
    noAi: args.includes('--no-ai'),
    count: (() => {
      const i = args.indexOf('--count');
      if (i === -1 || !args[i + 1]) return null;
      return Math.max(1, parseInt(args[i + 1], 10));
    })(),
  };
}

function scalePlan(totalOverride) {
  if (!totalOverride || totalOverride >= CREATIVITY_TOTAL) return CREATIVITY_PLAN;
  const ratio = totalOverride / CREATIVITY_TOTAL;
  return CREATIVITY_PLAN.map((tier) => ({
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
  if (!any) throw new Error('Aucun utilisateur — lancez npm run init-db');
  return any.id;
}

async function resolveCategoryId() {
  let cat = await prisma.mediaCategory.findFirst({ where: { name: 'creativity' } });
  if (!cat) {
    cat = await prisma.mediaCategory.create({
      data: { name: 'creativity', displayName: 'Créativité', description: 'Jeux drag & drop' },
    });
  }
  return cat.id;
}

async function clearPreviousSeeds() {
  const items = await prisma.media.findMany({
    where: {
      type: 'creativity',
      OR: [
        { description: { contains: SEED_TAG } },
        { description: { contains: 'seed:creativity' } },
      ],
    },
    select: { id: true, imageUrl: true },
  });
  if (items.length === 0) {
    console.log('ℹ️  Aucun jeu créativité seed à supprimer.');
    return;
  }
  await prisma.media.deleteMany({
    where: { id: { in: items.map((i) => i.id) } },
  });
  console.log(`🗑️  ${items.length} jeux créativité supprimés.`);
}

function slugify(cefr, n) {
  return `creativity-${cefr.toLowerCase()}-${String(n).padStart(5, '0')}`;
}

function buildPuzzleLocal(tier, pool, puzzleIndex, globalNumber, globalSeed) {
  const theme = pickTheme(tier.cefr, puzzleIndex);
  const words = pickWordsFromPool(pool, tier, puzzleIndex, globalSeed);
  if (words.length < Math.min(3, tier.wordCount)) return null;

  const positions = generateHotspotPositions(words.length, globalSeed + puzzleIndex);
  const points = buildPoints(words, positions);
  const title = `${tier.cefr} · #${String(globalNumber).padStart(4, '0')} · ${theme}`;
  const slug = slugify(tier.cefr, globalNumber);

  return {
    title,
    theme,
    cefr: tier.cefr,
    slug,
    points,
    description: [SEED_TAG, `CEFR ${tier.cefr}`, theme, `${words.length} mots`].join(' · '),
  };
}

async function insertPuzzle(userId, categoryId, puzzle) {
  const { imageUrl } = await getBackgroundImage({ puzzle, seed: puzzle.slug });

  return prisma.media.create({
    data: {
      title: puzzle.title,
      description: puzzle.description,
      type: 'creativity',
      language: 'Allemand',
      languageLevel: puzzle.cefr,
      imageUrl,
      streamingUrl: JSON.stringify({ image: imageUrl, points: puzzle.points }),
      isActive: true,
      userId,
      categoryId,
    },
  });
}

async function main() {
  const { dryRun, clear, noAi, count: countOverride } = parseArgs();
  const plan = scalePlan(countOverride);
  const targetTotal = plan.reduce((s, t) => s + t.count, 0);
  const useAi = !noAi && isAiAvailable();

  console.log('═══════════════════════════════════════════════════');
  console.log('  LingoRaid — Seed créativité progressif (A1→B2)');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Cible: ${targetTotal} jeux${dryRun ? ' (dry-run)' : ''}`);
  const cloud = isCloudinaryConfigured();
  console.log(`  Images: ${cloud ? 'Cloudinary CDN' : 'fichiers locaux /uploads'}`);
  console.log(
    `  IA: ${useAi ? `oui (${process.env.CREATIVITY_AI_PROVIDER || 'groq'}, batch ${AI_BATCH})` : 'non — banque croswords (recommandé pour 1200+)'}\n`
  );
  if (!cloud) {
    console.log('  💡 Ajoutez CLOUDINARY_URL dans .env pour héberger les images (sans limite Groq).\n');
  }

  const { pools, stats } = loadCreativityPools();
  for (const tier of plan) {
    console.log(
      `  ${tier.cefr}: ${tier.count} jeux · banque ${stats[tier.cefr].bank} · pool ${stats[tier.cefr].pool}`
    );
  }
  console.log('');

  if (clear && !dryRun) await clearPreviousSeeds();

  const userId = dryRun ? null : await resolveOwnerUserId();
  const categoryId = dryRun ? null : await resolveCategoryId();

  let globalNumber = 0;
  let created = 0;
  let failed = 0;
  let aiBatches = 0;
  const globalSeed = Date.now() % 1000000;
  const startTime = Date.now();

  for (const tier of plan) {
    const pool = pools[tier.cefr];
    if (!pool?.length) {
      console.error(`❌ Pool vide: ${tier.cefr}`);
      continue;
    }

    console.log(`\n▶ ${tier.cefr} (${tier.count} jeux, ${tier.wordCount} mots/jeu)…`);

    let i = 1;
    while (i <= tier.count) {
      let batchPuzzles = null;

      if (useAi && i + AI_BATCH - 1 <= tier.count) {
        const theme = pickTheme(tier.cefr, i);
        const sample = pickWordsFromPool(pool, tier, i, globalSeed);
        batchPuzzles = await generatePuzzleBatch({
          cefr: tier.cefr,
          theme,
          count: Math.min(AI_BATCH, tier.count - i + 1),
          wordCount: tier.wordCount,
          sampleWords: sample,
        });
        if (batchPuzzles?.length) aiBatches++;
      }

      const batchSize = batchPuzzles?.length || 1;

      for (let b = 0; b < batchSize && i <= tier.count; b++) {
        globalNumber++;
        let puzzle = null;

        if (batchPuzzles?.[b]?.words?.length >= 3) {
          const bp = batchPuzzles[b];
          const words = bp.words.slice(0, tier.wordCount).map((w) => ({
            text: w.text,
            hint: w.hint,
          }));
          const positions = generateHotspotPositions(words.length, globalSeed + globalNumber);
          const points = buildPoints(words, positions);
          const theme = bp.theme || pickTheme(tier.cefr, i);
          puzzle = {
            title: `${tier.cefr} · #${String(globalNumber).padStart(4, '0')} · ${theme}`,
            theme,
            cefr: tier.cefr,
            slug: slugify(tier.cefr, globalNumber),
            points,
            description: [SEED_TAG, `CEFR ${tier.cefr}`, theme, 'IA', `${words.length} mots`].join(' · '),
          };
        } else {
          puzzle = buildPuzzleLocal(tier, pool, i, globalNumber, globalSeed);
        }

        if (!puzzle) {
          failed++;
          i++;
          continue;
        }

        if (dryRun) {
          created++;
          if (created <= 2) {
            console.log(`  [dry] ${puzzle.title} — ${puzzle.points.length} pts — ex: ${puzzle.points[0]?.text}`);
          }
        } else {
          try {
            await insertPuzzle(userId, categoryId, puzzle);
            created++;
            if (isCloudinaryConfigured() && UPLOAD_DELAY_MS > 0) {
              await new Promise((r) => setTimeout(r, UPLOAD_DELAY_MS));
            }
          } catch (err) {
            failed++;
            console.warn(`  ⚠️  insert #${globalNumber}:`, err.message);
          }
        }

        if (created % 50 === 0 && created > 0) {
          console.log(`  … ${created}/${targetTotal} (${((Date.now() - startTime) / 1000).toFixed(0)}s)`);
        }
        i++;
      }

      if (useAi && batchPuzzles?.length) {
        await new Promise((r) => setTimeout(r, AI_DELAY_MS));
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  ✅ Créés: ${created}`);
  console.log(`  ❌ Échecs: ${failed}`);
  if (useAi) console.log(`  🤖 Lots IA: ${aiBatches}`);
  console.log(`  ⏱️  Durée: ${elapsed}s`);
  console.log('═══════════════════════════════════════════════════\n');

  if (!dryRun && created > 0) {
    const total = await prisma.media.count({ where: { type: 'creativity', isActive: true } });
    console.log(`  Total jeux créativité actifs: ${total}\n`);
  }
}

main()
  .catch((e) => {
    console.error('Fatal:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
