const fs = require('fs');
const FormData = require('form-data');

const fetchFn = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_ASR_BASE = 'https://api.groq.com/openai/v1';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_BASE =
  process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

const GROQ_WHISPER_MODEL =
  process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3-turbo';

function buildMime(filePath) {
  const ext = (filePath.split('.').pop() || 'mp3').toLowerCase();
  const mimeByExt = {
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    webm: 'audio/webm',
    opus: 'audio/opus',
    ogg: 'audio/ogg',
  };
  return {
    ext,
    contentType: mimeByExt[ext] || 'application/octet-stream',
  };
}

function getProviders() {
  const preferred = (process.env.SHADOWING_ASR_PROVIDER || 'groq,openai')
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  const available = [];
  if (GROQ_API_KEY) {
    available.push({
      id: 'groq',
      label: 'Groq',
      baseUrl: GROQ_ASR_BASE,
      apiKey: GROQ_API_KEY,
      model: GROQ_WHISPER_MODEL,
    });
  }
  if (OPENAI_API_KEY) {
    available.push({
      id: 'openai',
      label: 'OpenAI',
      baseUrl: OPENAI_API_BASE,
      apiKey: OPENAI_API_KEY,
      model: 'whisper-1',
    });
  }

  const ordered = [];
  for (const id of preferred) {
    const p = available.find((x) => x.id === id);
    if (p && !ordered.some((o) => o.id === p.id)) ordered.push(p);
  }
  for (const p of available) {
    if (!ordered.some((o) => o.id === p.id)) ordered.push(p);
  }
  return ordered;
}

function isQuotaError(status, body) {
  return (
    status === 429 ||
    /insufficient_quota|exceeded.*quota|rate_limit/i.test(body || '')
  );
}

async function callWhisper(provider, filePath) {
  const { ext, contentType } = buildMime(filePath);
  const stat = fs.statSync(filePath);
  const maxMb = provider.id === 'groq' ? 25 : 25;
  if (stat.size > maxMb * 1024 * 1024) {
    throw new Error(
      `Fichier audio trop volumineux (${Math.ceil(stat.size / 1024 / 1024)} Mo). Maximum ~${maxMb} Mo pour ${provider.label}.`
    );
  }

  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), {
    filename: `audio.${ext}`,
    contentType,
  });
  form.append('model', provider.model);
  form.append('language', 'de');
  form.append('response_format', 'verbose_json');
  if (provider.id === 'groq') {
    form.append('timestamp_granularities[]', 'segment');
  }

  const resp = await fetchFn(`${provider.baseUrl}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: form,
  });

  if (!resp.ok) {
    const errTxt = await resp.text();
    const err = new Error(`${provider.label} ${resp.status}: ${errTxt}`);
    err.status = resp.status;
    err.quota = isQuotaError(resp.status, errTxt);
    throw err;
  }

  return resp.json();
}

function parseWhisperResponse(data) {
  const raw = (data.segments || []).map((s) => ({
    start: Number(s.start) || 0,
    end: Number(s.end) || 0,
    text: String(s.text || '').trim(),
  }));

  return {
    text: String(data.text || raw.map((s) => s.text).join(' ')).trim(),
    segments: groupSegmentsForShadowing(raw),
  };
}

/**
 * Transcrit un fichier audio avec segments (Whisper verbose_json).
 * Utilise Groq par défaut si GROQ_API_KEY est définie (gratuit / quota séparé d'OpenAI).
 */
async function transcribeFileWithSegments(filePath) {
  const providers = getProviders();
  if (!providers.length) {
    throw new Error(
      'Aucune clé ASR configurée. Ajoutez GROQ_API_KEY (recommandé, gratuit) ou OPENAI_API_KEY dans backend/.env'
    );
  }

  const errors = [];

  for (const provider of providers) {
    try {
      const data = await callWhisper(provider, filePath);
      return parseWhisperResponse(data);
    } catch (err) {
      errors.push(err);
      const tryNext = err.quota || err.status === 429 || err.status >= 500;
      if (tryNext && providers.indexOf(provider) < providers.length - 1) {
        console.warn(
          `[shadowing] ${provider.label} indisponible, repli sur le fournisseur suivant…`
        );
        continue;
      }
      throw err;
    }
  }

  throw errors[errors.length - 1];
}

/** Regroupe les micro-segments Whisper en phrases pratiques pour le shadowing. */
function groupSegmentsForShadowing(segments, maxDuration = 9, maxChars = 140) {
  const result = [];
  let current = null;

  for (const s of segments) {
    if (!s.text || s.text === '.') continue;
    if (!current) {
      current = { start: s.start, end: s.end, text: s.text };
      continue;
    }
    const tooLong =
      s.end - current.start > maxDuration ||
      `${current.text} ${s.text}`.length > maxChars;
    if (tooLong) {
      result.push(current);
      current = { start: s.start, end: s.end, text: s.text };
    } else {
      current.end = s.end;
      current.text = `${current.text} ${s.text}`.trim();
    }
  }
  if (current) result.push(current);
  return result;
}

module.exports = { transcribeFileWithSegments, groupSegmentsForShadowing };
