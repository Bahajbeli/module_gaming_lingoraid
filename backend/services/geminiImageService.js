const fs = require('fs');
const path = require('path');

const fetchFn = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const GEMINI_IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

function buildGeminiImagePrompt({ title, theme, cefr, seed }) {
  return [
    `Create a clean educational 2D illustration background for a German vocabulary drag-and-drop game.`,
    `Theme: ${theme}. Level: ${cefr}.`,
    `Style: modern flat vector, soft colors, minimal, no people faces.`,
    `No text, no letters, no numbers, no logos, no watermark.`,
    `Include visual objects related to the theme.`,
    `Aspect ratio 800x560 landscape.`,
    `Random seed hint: ${seed}.`,
  ].join(' ');
}

async function requestGeminiImageBase64(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    GEMINI_IMAGE_MODEL
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['IMAGE'],
    },
  };

  const res = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const bodyText = await res.text();
  if (!res.ok) {
    const err = new Error(`Gemini image ${res.status}: ${bodyText.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }

  let data;
  try {
    data = JSON.parse(bodyText);
  } catch {
    throw new Error('Gemini image response is not valid JSON');
  }

  const candidates = data?.candidates || [];
  for (const c of candidates) {
    const parts = c?.content?.parts || [];
    for (const p of parts) {
      if (p?.inlineData?.data) {
        return {
          base64: p.inlineData.data,
          mimeType: p.inlineData.mimeType || 'image/png',
        };
      }
    }
  }

  throw new Error('Gemini response had no inline image data');
}

async function generateImageViaGemini({ puzzle, outputDir, filenamePrefix, seed }) {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) throw new Error('GEMINI_API_KEY missing');

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const prompt = buildGeminiImagePrompt({
    title: puzzle.title,
    theme: puzzle.theme,
    cefr: puzzle.cefr,
    seed,
  });

  const { base64, mimeType } = await requestGeminiImageBase64(prompt, apiKey);
  const ext = mimeType.includes('jpeg') ? '.jpg' : '.png';
  const filePath = path.join(outputDir, `${filenamePrefix}-bg-gemini${ext}`);
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  return { outPath: filePath, mimeType };
}

module.exports = {
  generateImageViaGemini,
};

