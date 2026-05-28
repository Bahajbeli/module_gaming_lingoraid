const fs = require('fs');
const path = require('path');

const fetchFn = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const POLLINATIONS_BASE_URL =
  process.env.POLLINATIONS_BASE_URL || 'https://image.pollinations.ai';
const POLLINATIONS_MODEL = process.env.POLLINATIONS_MODEL || 'flux';

function hashStringToInt(str) {
  // Simple deterministic hash -> uint32 for stable seeding.
  const s = String(str || '');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildPrompt({ title, theme, cefr, seed }) {
  const numericSeed = hashStringToInt(seed);
  const variants = [
    'isometric flat vector illustration',
    'modern cartoon flat vector',
    'clean educational 2D illustration',
    'soft paper texture flat vector',
    'playful minimal flat vector',
  ];
  const variant = variants[numericSeed % variants.length];

  return [
    `Educational 2D illustration background for German vocabulary matching game.`,
    `Theme: ${theme}. CEFR: ${cefr}.`,
    `Style: ${variant}. modern, colorful, clean, kids friendly.`,
    `No text, no letters, no numbers, no watermark, no logo.`,
    `Landscape composition with clear objects linked to theme.`,
    `Seed: ${numericSeed}. Puzzle: ${title}.`,
  ].join(' ');
}

function buildImageUrl(prompt, seed) {
  const numericSeed = hashStringToInt(seed);
  const encodedPrompt = encodeURIComponent(prompt);
  const params = new URLSearchParams({
    width: String(parseInt(process.env.CREATIVITY_IMAGE_WIDTH || '800', 10)),
    height: String(parseInt(process.env.CREATIVITY_IMAGE_HEIGHT || '560', 10)),
    seed: String(numericSeed),
    model: POLLINATIONS_MODEL,
    nologo: 'true',
  });
  return `${POLLINATIONS_BASE_URL.replace(/\/$/, '')}/prompt/${encodedPrompt}?${params.toString()}`;
}

function getHeaders() {
  const token = process.env.POLLINATIONS_API_KEY || '';
  if (!token) return {};
  // Some deployments accept Authorization bearer.
  return { Authorization: `Bearer ${token}` };
}

async function generateImageViaPollinations({ puzzle, outputDir, filenamePrefix, seed }) {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const prompt = buildPrompt({
    title: puzzle.title,
    theme: puzzle.theme,
    cefr: puzzle.cefr,
    seed,
  });
  const url = buildImageUrl(prompt, seed);

  const res = await fetchFn(url, { method: 'GET', headers: getHeaders() });
  if (!res.ok) {
    throw new Error(`Pollinations ${res.status}: ${await res.text()}`);
  }

  const arr = await res.arrayBuffer();
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? '.jpg' : '.png';
  const outPath = path.join(outputDir, `${filenamePrefix}-bg-pollinations${ext}`);
  fs.writeFileSync(outPath, Buffer.from(arr));
  return { outPath, contentType };
}

module.exports = {
  generateImageViaPollinations,
};

