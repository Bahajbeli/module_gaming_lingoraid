/**
 * Génération de lots de puzzles créativité via LLM (Groq / Gemini / DeepSeek / Ollama).
 * Fallback : banque locale files/croswords.
 * Gestion rate-limit 429 avec attente automatique.
 */

const fetchFn = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const PROVIDER = (process.env.CREATIVITY_AI_PROVIDER || 'groq').toLowerCase();
const MAX_RETRIES = parseInt(process.env.CREATIVITY_AI_MAX_RETRIES || '4', 10);
const AI_DELAY_MS = parseInt(process.env.CREATIVITY_AI_DELAY_MS || '35000', 10);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseRetrySeconds(message) {
  const m = String(message).match(/try again in ([\d.]+)s/i);
  return m ? Math.ceil(parseFloat(m[1]) * 1000) + 500 : AI_DELAY_MS;
}

async function chatCompletionOnce(system, user) {
  if (PROVIDER === 'groq' && process.env.GROQ_API_KEY) {
    const res = await fetchFn('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        temperature: 0.7,
        max_tokens: parseInt(process.env.CREATIVITY_AI_MAX_TOKENS || '2048', 10),
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    const body = await res.text();
    if (!res.ok) {
      const err = new Error(`Groq ${res.status}: ${body}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    const data = JSON.parse(body);
    return data.choices?.[0]?.message?.content || '';
  }

  if (PROVIDER === 'gemini' && process.env.GEMINI_API_KEY) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(`${system}\n\n${user}`);
    return result.response.text();
  }

  if (PROVIDER === 'deepseek' && process.env.DEEPSEEK_API_KEY) {
    const base = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
    const res = await fetchFn(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        temperature: 0.7,
        max_tokens: 2048,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  if (PROVIDER === 'ollama') {
    const url = process.env.OLLAMA_URL || 'http://localhost:11434';
    const res = await fetchFn(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || 'llama3',
        stream: false,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}`);
    const data = await res.json();
    return data.message?.content || '';
  }

  return null;
}

async function chatCompletion(system, user) {
  let lastErr;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await chatCompletionOnce(system, user);
    } catch (e) {
      lastErr = e;
      const is429 = e.status === 429 || String(e.message).includes('429');
      if (is429 && attempt < MAX_RETRIES - 1) {
        const wait = parseRetrySeconds(e.body || e.message);
        console.warn(`  ⏳ Rate limit — pause ${(wait / 1000).toFixed(0)}s…`);
        await sleep(wait);
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

function extractJsonArray(text) {
  if (!text) return null;
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function generatePuzzleBatch({ cefr, theme, count, wordCount, sampleWords }) {
  const system = `You create German vocabulary drag-and-drop puzzles for language learners.
Return ONLY a valid JSON array, no markdown. Each item:
{"theme":"German theme","title":"Short German title","words":[{"text":"NOUN","hint":"English hint"}]}
Rules:
- CEFR level: ${cefr}
- Exactly ${wordCount} words per puzzle
- "text" must be German nouns in UPPERCASE, letters only (ÄÖÜẞ allowed)
- Words must fit theme "${theme}"
- ${count} puzzles in the array`;

  const user = `Generate ${count} different puzzles for theme "${theme}" at level ${cefr}.
Word inspiration: ${sampleWords.slice(0, 20).map((w) => w.text).join(', ')}`;

  try {
    const raw = await chatCompletion(system, user);
    const arr = extractJsonArray(raw);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.map((p) => ({
      theme: p.theme || theme,
      title: p.title || theme,
      words: (p.words || [])
        .slice(0, wordCount)
        .map((w) => ({
          text: String(w.text || w.word || '')
            .toUpperCase()
            .replace(/[^A-ZÄÖÜẞ]/g, ''),
          hint: String(w.hint || w.description || '').trim(),
        }))
        .filter((w) => w.text.length >= 2),
    }));
  } catch (e) {
    console.warn('  ⚠️  IA batch:', e.message?.slice(0, 120));
    return null;
  }
}

function isAiAvailable() {
  if (process.env.CREATIVITY_USE_AI !== 'true') return false;
  if (PROVIDER === 'groq') return !!process.env.GROQ_API_KEY;
  if (PROVIDER === 'gemini') return !!process.env.GEMINI_API_KEY;
  if (PROVIDER === 'deepseek') return !!process.env.DEEPSEEK_API_KEY;
  if (PROVIDER === 'ollama') return true;
  return false;
}

module.exports = {
  generatePuzzleBatch,
  isAiAvailable,
  PROVIDER,
};
