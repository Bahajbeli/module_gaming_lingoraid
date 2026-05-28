const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'creativity');

const SCENE_COLORS = {
  A1: { bg1: '#ff9a9e', bg2: '#fecfef', accent: '#ff0844' },
  A2: { bg1: '#84fab0', bg2: '#8fd3f4', accent: '#005bea' },
  B1: { bg1: '#fccb90', bg2: '#d57eeb', accent: '#c471ed' },
  B2: { bg1: '#a18cd1', bg2: '#fbc2eb', accent: '#5f2c82' },
};

function hashStringToInt(str) {
  // Simple deterministic hash (no crypto) for repeatable visual variants.
  const s = String(str || '');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return (s >>> 0) / 0xffffffff;
  };
}

function shuffleWithSeed(arr, seed) {
  const a = [...arr];
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Non-overlapping hotspot positions (0–1), seeded for reproducibility */
function generateHotspotPositions(count, seed = 1) {
  const rng = (() => {
    let s = seed >>> 0;
    return () => {
      s = (Math.imul(1664525, s) + 1013904223) >>> 0;
      return (s >>> 0) / 0xffffffff;
    };
  })();

  const positions = [];
  const minDist = count > 6 ? 0.14 : 0.18;
  let attempts = 0;

  while (positions.length < count && attempts < 800) {
    const xpct = 0.1 + rng() * 0.8;
    const ypct = 0.18 + rng() * 0.65;
    const ok = positions.every((p) => {
      const dx = p.xpct - xpct;
      const dy = p.ypct - ypct;
      return Math.hypot(dx, dy) >= minDist;
    });
    if (ok) positions.push({ xpct: Number(xpct.toFixed(4)), ypct: Number(ypct.toFixed(4)) });
    attempts++;
  }

  while (positions.length < count) {
    positions.push({
      xpct: Number((0.15 + positions.length * 0.12).toFixed(4)),
      ypct: Number((0.25 + (positions.length % 4) * 0.15).toFixed(4)),
    });
  }

  return positions;
}

function buildThemeIcon({ theme, accent, variant }) {
  const t = String(theme || '').toLowerCase();

  // Keep icons simple (SVG shapes) to avoid heavy assets; variation comes from templates/placement.
  if (t.includes('supermarkt')) {
    return `
      <g opacity="0.95" transform="translate(520,245)">
        <rect x="40" y="20" width="150" height="72" rx="18" fill="${accent}" fill-opacity="0.14"/>
        <g transform="translate(55,35)">
          <path d="M25 5 L45 5 L65 65 L15 65 Z" fill="${accent}" fill-opacity="0.55" stroke="${accent}" stroke-width="2"/>
          <rect x="10" y="0" width="50" height="8" rx="4" fill="${accent}" />
          <circle cx="23" cy="75" r="9" fill="#fff" fill-opacity="0.9" stroke="${accent}" stroke-width="2"/>
          <circle cx="60" cy="75" r="9" fill="#fff" fill-opacity="0.9" stroke="${accent}" stroke-width="2"/>
          <path d="M10 18 H75" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>
        </g>
        <g transform="translate(120,70)">
          <circle cx="0" cy="0" r="10" fill="${accent}" fill-opacity="0.25"/>
          <circle cx="-22" cy="-6" r="8" fill="${accent}" fill-opacity="0.18"/>
          <circle cx="18" cy="-18" r="7" fill="${accent}" fill-opacity="0.18"/>
        </g>
      </g>
    `;
  }

  if (t.includes('schule')) {
    return `
      <g opacity="0.95" transform="translate(505,240)">
        <rect x="50" y="25" width="170" height="78" rx="18" fill="${accent}" fill-opacity="0.14"/>
        <g transform="translate(70,35)">
          <path d="M20 0 L95 25 L20 50 L-55 25 Z" fill="${accent}" fill-opacity="0.45" stroke="${accent}" stroke-width="2"/>
          <rect x="7" y="50" width="72" height="10" rx="5" fill="${accent}" />
          <rect x="28" y="60" width="8" height="20" rx="4" fill="${accent}" />
          <rect x="14" y="60" width="28" height="6" rx="3" fill="#fff" fill-opacity="0.75"/>
        </g>
      </g>
    `;
  }

  if (t.includes('küche') || t.includes('kueche') || t.includes('essen')) {
    return `
      <g opacity="0.95" transform="translate(510,245)">
        <rect x="40" y="10" width="190" height="90" rx="20" fill="${accent}" fill-opacity="0.14"/>
        <g transform="translate(62,20)">
          <circle cx="58" cy="44" r="30" fill="${accent}" fill-opacity="0.25" stroke="${accent}" stroke-width="2"/>
          <path d="M25 58 C34 46, 46 38, 58 38 C70 38, 82 46, 91 58" stroke="${accent}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M15 30 L15 75" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
          <path d="M15 20 L15 28" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
          <path d="M100 22 C98 38, 90 52, 78 60" stroke="${accent}" stroke-width="3" fill="none" stroke-linecap="round"/>
        </g>
      </g>
    `;
  }

  if (t.includes('park')) {
    return `
      <g opacity="0.95" transform="translate(520,245)">
        <rect x="35" y="15" width="170" height="90" rx="20" fill="${accent}" fill-opacity="0.14"/>
        <g transform="translate(70,25)">
          <path d="M35 62 C20 45, 20 20, 35 5 C50 20, 50 45, 35 62 Z" fill="${accent}" fill-opacity="0.35" stroke="${accent}" stroke-width="2"/>
          <rect x="30" y="62" width="10" height="22" rx="5" fill="${accent}" />
          <path d="M5 78 H65" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>
        </g>
      </g>
    `;
  }

  // Default icon (generic) for unknown themes.
  return `
    <g opacity="0.95" transform="translate(535,250)">
      <rect x="25" y="20" width="170" height="85" rx="18" fill="${accent}" fill-opacity="0.14"/>
      <circle cx="70" cy="65" r="22" fill="${accent}" fill-opacity="0.2" stroke="${accent}" stroke-width="2"/>
      <path d="M110 50 C130 40, 150 55, 150 75" stroke="${accent}" stroke-width="3" fill="none" stroke-linecap="round"/>
    </g>
  `;
}

function buildBackgroundTemplate({ cefr, colors, accent, variant, seed }) {
  const rng = seededRand(seed);
  
  return `
    <g>
      <circle cx="${100 + rng() * 150}" cy="${50 + rng() * 150}" r="220" fill="${accent}" fill-opacity="0.5" filter="url(#blur-heavy)" />
      <circle cx="${550 + rng() * 150}" cy="${350 + rng() * 150}" r="260" fill="${colors.bg1}" fill-opacity="0.6" filter="url(#blur-heavy)" />
      <path d="M${250 + rng()*100},${150 + rng()*100} C${400 + rng()*100},${100 + rng()*50} ${550 + rng()*100},${300 + rng()*100} ${400 + rng()*100},${400 + rng()*100} C${300 + rng()*100},${450 + rng()*50} ${150 + rng()*100},${300 + rng()*100} ${250 + rng()*100},${150 + rng()*100} Z" fill="${colors.bg2}" fill-opacity="0.6" filter="url(#blur-heavy)" transform="rotate(${rng() * 360} 400 280)"/>
    </g>
  `;
}

function buildSceneSvg({ title, theme, cefr, points, seed = 1 }) {
  const colors = SCENE_COLORS[cefr] || SCENE_COLORS.A1;
  const w = 800;
  const h = 560;
  const numericSeed = hashStringToInt(String(seed));
  const variant = numericSeed % 4;

  // Slight per-variant tweak to reduce “same image” impression.
  const accent = colors.accent;
  const bgColors = colors;

  const background = buildBackgroundTemplate({
    cefr,
    colors,
    accent,
    variant,
    seed: numericSeed + 77,
  });

  const icon = buildThemeIcon({ theme, accent, variant });

  const circles = points
    .map(
      (p, i) =>
        `<circle cx="${Math.round(p.xpct * w)}" cy="${Math.round(p.ypct * h)}" r="28" fill="${colors.accent}" fill-opacity="0.25" stroke="${colors.accent}" stroke-width="2"/>
         <text x="${Math.round(p.xpct * w)}" y="${Math.round(p.ypct * h) + 5}" text-anchor="middle" font-size="14" fill="${colors.accent}" font-family="Segoe UI,sans-serif" font-weight="700">${i + 1}</text>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bgColors.bg1}"/>
      <stop offset="100%" style="stop-color:${bgColors.bg2}"/>
    </linearGradient>
    <filter id="blur-heavy" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="60" />
    </filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)" rx="16"/>
  ${background}
  
  <rect x="24" y="24" width="${w - 48}" height="${h - 48}" fill="rgba(255, 255, 255, 0.45)" stroke="rgba(255, 255, 255, 0.8)" stroke-width="2" rx="24"/>
  
  <text x="56" y="76" font-size="28" font-weight="800" fill="#1e293b" font-family="Segoe UI,sans-serif">${escapeXml(title)}</text>
  <text x="56" y="106" font-size="16" font-weight="600" fill="#334155" font-family="Segoe UI,sans-serif">${escapeXml(theme)} · ${cefr}</text>
  <text x="56" y="144" font-size="14" font-weight="500" fill="#475569" font-family="Segoe UI,sans-serif">Glissez les libellés allemands vers les numéros</text>
  
  <g transform="translate(16, 24)">
    ${icon}
  </g>
  ${circles}
</svg>`;
}

function buildBackgroundSvg({ title, theme, cefr, seed = 1 }) {
  const colors = SCENE_COLORS[cefr] || SCENE_COLORS.A1;
  const w = 800;
  const h = 560;
  const numericSeed = hashStringToInt(String(seed));
  const variant = numericSeed % 4;

  const accent = colors.accent;
  const bgColors = colors;

  const background = buildBackgroundTemplate({
    cefr,
    colors,
    accent,
    variant,
    seed: numericSeed + 77,
  });

  const icon = buildThemeIcon({ theme, accent, variant });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bgColors.bg1}"/>
      <stop offset="100%" style="stop-color:${bgColors.bg2}"/>
    </linearGradient>
    <filter id="blur-heavy" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="60" />
    </filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)" rx="16"/>
  ${background}
  
  <rect x="24" y="24" width="${w - 48}" height="${h - 48}" fill="rgba(255, 255, 255, 0.45)" stroke="rgba(255, 255, 255, 0.8)" stroke-width="2" rx="24"/>
  
  <text x="56" y="76" font-size="28" font-weight="800" fill="#1e293b" font-family="Segoe UI,sans-serif">${escapeXml(title)}</text>
  <text x="56" y="106" font-size="16" font-weight="600" fill="#334155" font-family="Segoe UI,sans-serif">${escapeXml(theme)} · ${cefr}</text>
  <text x="56" y="144" font-size="14" font-weight="500" fill="#475569" font-family="Segoe UI,sans-serif">Glissez les libellés allemands vers les numéros</text>
  
  <g transform="translate(16, 24)">
    ${icon}
  </g>
</svg>`;
}

function escapeXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

/**
 * Write SVG scene file; returns public URL path /uploads/creativity/...
 */
function writeSceneImage({ slug, title, theme, cefr, points }) {
  ensureUploadsDir();
  const filename = `${slug}.svg`;
  const filePath = path.join(UPLOADS_DIR, filename);
  const svg = buildSceneSvg({ title, theme, cefr, points, seed: slug });
  fs.writeFileSync(filePath, svg, 'utf8');
  return {
    filePath,
    publicPath: `/uploads/creativity/${filename}`,
    svg,
    slug,
  };
}

function writeBackgroundImage({ slug, title, theme, cefr, seed = slug }) {
  ensureUploadsDir();
  const filename = `${slug}-bg.svg`;
  const filePath = path.join(UPLOADS_DIR, filename);
  const svg = buildBackgroundSvg({ title, theme, cefr, seed });
  fs.writeFileSync(filePath, svg, 'utf8');
  return {
    filePath,
    publicPath: `/uploads/creativity/${filename}`,
    svg,
    slug,
  };
}

function buildPoints(words, positions) {
  return words.map((w, i) => ({
    text: w.text,
    xpct: positions[i]?.xpct ?? 0.5,
    ypct: positions[i]?.ypct ?? 0.5,
    x: Math.round((positions[i]?.xpct ?? 0.5) * 800),
    y: Math.round((positions[i]?.ypct ?? 0.5) * 560),
  }));
}

module.exports = {
  UPLOADS_DIR,
  generateHotspotPositions,
  buildPoints,
  buildSceneSvg,
  buildBackgroundSvg,
  writeSceneImage,
  writeBackgroundImage,
  shuffleWithSeed,
};
