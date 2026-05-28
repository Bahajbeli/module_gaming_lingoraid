#!/usr/bin/env node
/**
 * Seed 500 jeux créativité depuis files/creativité/game_levels_500.json
 *
 * - Supprime TOUS les anciens media type=creativity
 * - Crée 500 niveaux avec images SVG uniques (emoji + fond différent)
 *
 * Usage:
 *   node scripts/seed-creativity-levels-500.js
 *   node scripts/seed-creativity-levels-500.js --count 10
 *   node scripts/seed-creativity-levels-500.js --dry-run
 *   node scripts/seed-creativity-levels-500.js --clear-only
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const { generateHotspotPositions } = require('../services/creativityLayoutService');
const { publishSceneImage } = require('../services/cloudinaryService');

const prisma = new PrismaClient();

const SOURCE_JSON = path.join(__dirname, '..', 'files', 'creativité', 'game_levels_500.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'uploads', 'creativity');

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    clearOnly: args.includes('--clear-only'),
    count: (() => {
      const i = args.indexOf('--count');
      if (i === -1 || !args[i + 1]) return null;
      return Math.max(1, parseInt(args[i + 1], 10));
    })(),
  };
}

function hashStringToInt(str) {
  const s = String(str || '');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function escapeXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;');
}

function levelToCefr(level) {
  // map the 4 difficulty_level in the JSON to A1..B2
  if (level <= 1) return 'A1';
  if (level === 2) return 'A2';
  if (level === 3) return 'B1';
  return 'B2';
}

function colorsForCategory(category) {
  const h = hashStringToInt(category);
  const palettes = [
    ['#dbeafe', '#bfdbfe', '#2563eb'],
    ['#d1fae5', '#a7f3d0', '#059669'],
    ['#fef3c7', '#fde68a', '#d97706'],
    ['#ede9fe', '#ddd6fe', '#7c3aed'],
    ['#ffe4e6', '#fecdd3', '#e11d48'],
    ['#cffafe', '#a5f3fc', '#0891b2'],
  ];
  const p = palettes[h % palettes.length];
  return { bg1: p[0], bg2: p[1], accent: p[2] };
}

function buildCategoryIcon({ categoryLabel, accent, seed }) {
  const t = String(categoryLabel || '').toLowerCase();
  const s = hashStringToInt(seed);
  const a = accent;
  const x = 140;
  const y = 260;

  // Keep icons simple vector shapes (no emojis) so frontend can render the draggable icons.
  if (t.includes('fruits')) {
    return `
      <g transform="translate(${x},${y})">
        <circle cx="60" cy="20" r="22" fill="${a}" fill-opacity="0.18" stroke="${a}" stroke-opacity="0.25" stroke-width="2"/>
        <circle cx="25" cy="55" r="16" fill="${a}" fill-opacity="0.14" stroke="${a}" stroke-opacity="0.25" stroke-width="2"/>
        <circle cx="95" cy="55" r="16" fill="${a}" fill-opacity="0.14" stroke="${a}" stroke-opacity="0.25" stroke-width="2"/>
        <path d="M55 0 C60 15, 45 20, 40 10 C45 6, 50 4, 55 0Z" fill="${a}" fill-opacity="0.22"/>
      </g>`;
  }

  if (t.includes('animaux')) {
    return `
      <g transform="translate(${x},${y})">
        <ellipse cx="45" cy="60" rx="42" ry="22" fill="${a}" fill-opacity="0.14"/>
        <circle cx="25" cy="40" r="13" fill="${a}" fill-opacity="0.20"/>
        <circle cx="60" cy="33" r="12" fill="${a}" fill-opacity="0.18"/>
        <circle cx="85" cy="40" r="13" fill="${a}" fill-opacity="0.20"/>
        <path d="M55 78 C50 92, 65 96, 62 78" stroke="${a}" stroke-opacity="0.35" stroke-width="3" fill="none" stroke-linecap="round"/>
      </g>`;
  }

  if (t.includes('couleurs')) {
    return `
      <g transform="translate(${x},${y})">
        <rect x="25" y="15" width="90" height="75" rx="18" fill="${a}" fill-opacity="0.14" stroke="${a}" stroke-opacity="0.25" stroke-width="2"/>
        <circle cx="45" cy="42" r="12" fill="#ffffff" fill-opacity="0.40" stroke="${a}" stroke-opacity="0.25" stroke-width="2"/>
        <circle cx="75" cy="42" r="12" fill="#ffffff" fill-opacity="0.30" stroke="${a}" stroke-opacity="0.25" stroke-width="2"/>
        <circle cx="60" cy="65" r="12" fill="#ffffff" fill-opacity="0.25" stroke="${a}" stroke-opacity="0.25" stroke-width="2"/>
        <path d="M35 90 H85" stroke="${a}" stroke-opacity="0.35" stroke-width="4" stroke-linecap="round"/>
      </g>`;
  }

  if (t.includes('nombres')) {
    return `
      <g transform="translate(${x},${y})">
        <rect x="30" y="15" width="60" height="70" rx="16" fill="${a}" fill-opacity="0.14" stroke="${a}" stroke-opacity="0.25" stroke-width="2"/>
        <circle cx="60" cy="40" r="7" fill="${a}" fill-opacity="0.35"/>
        <circle cx="45" cy="57" r="7" fill="${a}" fill-opacity="0.25"/>
        <circle cx="75" cy="57" r="7" fill="${a}" fill-opacity="0.25"/>
      </g>`;
  }

  if (t.includes('corps')) {
    return `
      <g transform="translate(${x},${y})">
        <path d="M55 10 C70 10, 80 25, 80 40 C80 62, 70 85, 55 85 C40 85, 30 62, 30 40 C30 25, 40 10, 55 10Z"
          fill="${a}" fill-opacity="0.14" stroke="${a}" stroke-opacity="0.25" stroke-width="2"/>
        <path d="M45 70 C40 90, 70 90, 65 70" fill="${a}" fill-opacity="0.14" />
        <circle cx="55" cy="30" r="12" fill="${a}" fill-opacity="0.18"/>
      </g>`;
  }

  if (t.includes('nourriture') || t.includes('food')) {
    return `
      <g transform="translate(${x},${y})">
        <ellipse cx="60" cy="55" rx="42" ry="16" fill="${a}" fill-opacity="0.12"/>
        <circle cx="60" cy="40" r="30" fill="${a}" fill-opacity="0.14" stroke="${a}" stroke-opacity="0.25" stroke-width="2"/>
        <path d="M40 15 V35" stroke="${a}" stroke-opacity="0.40" stroke-width="5" stroke-linecap="round"/>
        <path d="M35 15 H48" stroke="${a}" stroke-opacity="0.30" stroke-width="5" stroke-linecap="round"/>
        <path d="M85 20 C78 40, 78 55, 92 70" stroke="${a}" stroke-opacity="0.32" stroke-width="4" fill="none" stroke-linecap="round"/>
      </g>`;
  }

  if (t.includes('transport')) {
    return `
      <g transform="translate(${x},${y})">
        <path d="M25 55 H95" stroke="${a}" stroke-opacity="0.35" stroke-width="6" stroke-linecap="round"/>
        <rect x="35" y="20" width="55" height="40" rx="14" fill="${a}" fill-opacity="0.14" stroke="${a}" stroke-opacity="0.25" stroke-width="2"/>
        <circle cx="45" cy="65" r="12" fill="${a}" fill-opacity="0.18" stroke="${a}" stroke-opacity="0.25" stroke-width="2"/>
        <circle cx="80" cy="65" r="12" fill="${a}" fill-opacity="0.18" stroke="${a}" stroke-opacity="0.25" stroke-width="2"/>
        <path d="M55 35 H75" stroke="${a}" stroke-opacity="0.35" stroke-width="5" stroke-linecap="round"/>
      </g>`;
  }

  if (t.includes('météo') || t.includes('meteo') || t.includes('weather')) {
    return `
      <g transform="translate(${x},${y})">
        <circle cx="65" cy="30" r="18" fill="${a}" fill-opacity="0.14" stroke="${a}" stroke-opacity="0.25" stroke-width="2"/>
        <path d="M30 60 C30 45, 42 40, 50 42 C55 30, 72 30, 76 44 C90 44, 92 57, 84 65 H40 C33 64, 30 63, 30 60Z"
          fill="${a}" fill-opacity="0.12" stroke="${a}" stroke-opacity="0.25" stroke-width="2" stroke-linejoin="round"/>
        <path d="M15 50 L25 50" stroke="${a}" stroke-opacity="0.35" stroke-width="5" stroke-linecap="round"/>
        <path d="M105 50 L115 50" stroke="${a}" stroke-opacity="0.35" stroke-width="5" stroke-linecap="round"/>
      </g>`;
  }

  if (t.includes('sports')) {
    return `
      <g transform="translate(${x},${y})">
        <circle cx="60" cy="45" r="28" fill="${a}" fill-opacity="0.14" stroke="${a}" stroke-opacity="0.25" stroke-width="2"/>
        <path d="M45 60 L75 30" stroke="${a}" stroke-opacity="0.30" stroke-width="6" stroke-linecap="round"/>
        <path d="M80 60 L40 30" stroke="${a}" stroke-opacity="0.22" stroke-width="4" stroke-linecap="round"/>
        <rect x="45" y="76" width="30" height="10" rx="5" fill="${a}" fill-opacity="0.12"/>
      </g>`;
  }

  if (t.includes('école') || t.includes('ecole') || t.includes('school')) {
    return `
      <g transform="translate(${x},${y})">
        <rect x="28" y="20" width="65" height="75" rx="16" fill="${a}" fill-opacity="0.14" stroke="${a}" stroke-opacity="0.25" stroke-width="2"/>
        <path d="M50 20 V95" stroke="${a}" stroke-opacity="0.25" stroke-width="4" stroke-linecap="round"/>
        <path d="M18 45 H95" stroke="${a}" stroke-opacity="0.30" stroke-width="6" stroke-linecap="round"/>
      </g>`;
  }

  // Default icon
  return `
    <g transform="translate(${x},${y})">
      <circle cx="55" cy="55" r="30" fill="${a}" fill-opacity="0.12"/>
      <path d="M35 55 C45 35, 65 35, 75 55 C65 75, 45 75, 35 55Z" fill="${a}" fill-opacity="0.12" stroke="${a}" stroke-opacity="0.25" stroke-width="2"/>
    </g>
  `;
}

function buildLevelSvg({ title, categoryLabel, cefr, pairs, seed }) {
  const w = 900;
  const h = 560;
  const { bg1, bg2, accent } = colorsForCategory(categoryLabel);
  const s = hashStringToInt(seed);

  // Professional background: gradient + play panel + subtle pattern + category icon.
  const rng = (() => {
    let x = s >>> 0;
    return () => {
      x = (Math.imul(1664525, x) + 1013904223) >>> 0;
      return (x >>> 0) / 0xffffffff;
    };
  })();

  const playX = 64;
  const playY = 146;
  const playW = w - 128;
  const playH = h - 190;

  const pattern = Array.from({ length: 26 })
    .map(() => {
      const cx = playX + rng() * playW;
      const cy = playY + rng() * playH;
      const r = 7 + rng() * 18;
      const op = 0.03 + rng() * 0.06;
      return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(
        1
      )}" fill="${accent}" fill-opacity="${op.toFixed(3)}"/>`;
    })
    .join('\n');

  const icon = buildCategoryIcon({ categoryLabel, accent, seed });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bg1}"/>
      <stop offset="100%" style="stop-color:${bg2}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" rx="22" fill="url(#bg)"/>
  <rect x="28" y="26" width="${w - 56}" height="110" rx="18" fill="#ffffff" fill-opacity="0.72"/>
  <text x="52" y="72" font-size="26" font-weight="700" fill="#0f172a" font-family="Segoe UI,sans-serif">${escapeXml(title)}</text>
  <text x="52" y="104" font-size="16" fill="#334155" font-family="Segoe UI,sans-serif">${escapeXml(categoryLabel)} · ${escapeXml(cefr)}</text>
  <rect x="${playX}" y="${playY}" width="${playW}" height="${playH}" rx="26" fill="#ffffff" fill-opacity="0.20" stroke="${accent}" stroke-opacity="0.22" stroke-width="2"/>
  ${pattern}
  ${icon}
</svg>`;
}

function structuredPositions(count, seed) {
  // Professional layout: evenly distributed columns/rows in safe zone of the image.
  // Safe zone avoids header area and borders.
  const cols = count <= 3 ? 3 : count <= 4 ? 4 : 3;
  const rows = Math.ceil(count / cols);
  const left = 0.18;
  const right = 0.86;
  const top = 0.30;
  const bottom = 0.80;

  const xs = [];
  const ys = [];
  for (let c = 0; c < cols; c++) {
    xs.push(cols === 1 ? (left + right) / 2 : left + ((right - left) * c) / (cols - 1));
  }
  for (let r = 0; r < rows; r++) {
    ys.push(rows === 1 ? (top + bottom) / 2 : top + ((bottom - top) * r) / (rows - 1));
  }

  // Tiny deterministic jitter to avoid too-rigid look while keeping structure.
  const rng = (() => {
    let x = hashStringToInt(seed) >>> 0;
    return () => {
      x = (Math.imul(1664525, x) + 1013904223) >>> 0;
      return (x >>> 0) / 0xffffffff;
    };
  })();

  const pos = [];
  for (let i = 0; i < count; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const jitterX = (rng() - 0.5) * 0.03;
    const jitterY = (rng() - 0.5) * 0.03;
    const xpct = Math.min(0.90, Math.max(0.12, xs[c] + jitterX));
    const ypct = Math.min(0.84, Math.max(0.26, ys[r] + jitterY));
    pos.push({ xpct, ypct });
  }
  return pos;
}

function toPointsFromPairs(pairs, seed) {
  // Keep icon order stable by in-image number to preserve clean visual structure.
  const ordered = [...pairs].sort((a, b) => Number(a.number || 0) - Number(b.number || 0));
  const positions = structuredPositions(ordered.length, seed);
  return ordered.map((p, i) => ({
    text: String(p.word || '').trim().toUpperCase(),
    xpct: Number((positions[i]?.xpct ?? 0.5).toFixed(4)),
    ypct: Number((positions[i]?.ypct ?? 0.5).toFixed(4)),
    x: Math.round((positions[i]?.xpct ?? 0.5) * 900),
    y: Math.round((positions[i]?.ypct ?? 0.5) * 560),
    translation: p.translation,
    emoji: p.emoji,
    number: p.number,
  }));
}

async function resolveOwnerUserId() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' } });
  if (admin) return admin.id;
  const any = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!any) throw new Error('Aucun utilisateur — lancez npm run init-db');
  return any.id;
}

async function resolveCategoryId() {
  let cat = await prisma.mediaCategory.findFirst({ where: { name: 'creativity' } });
  if (!cat) {
    cat = await prisma.mediaCategory.create({
      data: { name: 'creativity', displayName: 'Créativité', description: 'Jeux drag & drop (500 niveaux)' },
    });
  }
  return cat.id;
}

async function clearAllCreativity() {
  const count = await prisma.media.count({ where: { type: 'creativity' } });
  if (count === 0) {
    console.log('ℹ️  Aucun jeu créativité à supprimer.');
    return;
  }
  await prisma.media.deleteMany({ where: { type: 'creativity' } });
  console.log(`🗑️  Supprimés: ${count} jeux créativité.`);
}

async function main() {
  const { dryRun, clearOnly, count: countOverride } = parseArgs();

  if (!fs.existsSync(SOURCE_JSON)) {
    throw new Error(`Source introuvable: ${SOURCE_JSON}`);
  }
  const data = JSON.parse(fs.readFileSync(SOURCE_JSON, 'utf8'));
  const levels = Array.isArray(data?.levels) ? data.levels : [];
  const target = countOverride ? Math.min(countOverride, levels.length) : levels.length;

  console.log('═══════════════════════════════════════════════════');
  console.log('  LingoRaid — Seed créativité depuis JSON (500)');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Source: ${path.basename(SOURCE_JSON)} · niveaux: ${levels.length}`);
  console.log(`  Cible: ${target}${dryRun ? ' (dry-run)' : ''}\n`);

  if (!dryRun) {
    await clearAllCreativity();
  }
  if (clearOnly) return;

  const userId = dryRun ? null : await resolveOwnerUserId();
  const categoryId = dryRun ? null : await resolveCategoryId();

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (let i = 0; i < target; i++) {
    const lvl = levels[i];
    const pairs = Array.isArray(lvl?.pairs) ? lvl.pairs : [];
    const cefr = levelToCefr(Number(lvl?.difficulty_level || 1));
    const title = `${cefr} · Level ${lvl.id} · ${lvl.category_label || lvl.category}`;
    const slug = `lvl-${String(lvl.id).padStart(4, '0')}-${String(lvl.category || 'cat')}`;
    const seed = `${slug}-${cefr}`;

    const points = toPointsFromPairs(pairs, seed);
    const svg = buildLevelSvg({
      title,
      categoryLabel: lvl.category_label || lvl.category || 'Category',
      cefr,
      pairs,
      seed,
    });

    const localPath = path.join(OUTPUT_DIR, `${slug}.svg`);
    fs.writeFileSync(localPath, svg, 'utf8');

    if (dryRun) {
      if (i < 3) console.log(`  [dry] ${title} — ${pairs.length} items — ${localPath}`);
      continue;
    }

    const { imageUrl } = await publishSceneImage({ localPath, slug });

    await prisma.media.create({
      data: {
        title,
        description: `seed:levels-500 · ${lvl.stage || ''} · ${lvl.difficulty || ''} · ${lvl.time_limit_seconds || ''}s`,
        type: 'creativity',
        language: 'Allemand',
        languageLevel: cefr,
        imageUrl,
        streamingUrl: JSON.stringify({
          image: imageUrl,
          points,
          meta: {
            levelId: lvl.id,
            category: lvl.category,
            categoryLabel: lvl.category_label,
            difficultyLevel: lvl.difficulty_level,
            timeLimitSeconds: lvl.time_limit_seconds,
            itemsCount: lvl.items_count,
            instruction: lvl.instruction,
            scorePoints: lvl.points,
          },
        }),
        isActive: true,
        userId,
        categoryId,
      },
    });

    if ((i + 1) % 25 === 0) {
      console.log(`  … ${i + 1}/${target}`);
    }
  }

  if (!dryRun) {
    const total = await prisma.media.count({ where: { type: 'creativity', isActive: true } });
    console.log(`\n✅ Terminé. Jeux créativité actifs: ${total}\n`);
  }
}

main()
  .catch((e) => {
    console.error('Fatal:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

