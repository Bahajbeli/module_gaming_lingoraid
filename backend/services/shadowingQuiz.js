const fetchFn = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_BASE =
  process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

/**
 * Génère un quiz JSON à partir du transcript (allemand + traduction anglaise).
 * @returns {Array<{ question: string, questionEn: string, options: string[], optionsEn: string[], correctIndex: number, explanation?: string, explanationEn?: string }>}
 */
async function generateShadowingQuiz(transcriptText, videoTitle = '') {
  const system = `You are a German teacher. From a YouTube video transcript in German, create exactly 5 comprehension multiple-choice questions.

RULES:
- "question" and "options" must be written in GERMAN only.
- "questionEn", "optionsEn", "explanation", and "explanationEn" must be accurate ENGLISH translations (explanation in German goes in "explanation", its English translation in "explanationEn").
- 4 options per question, exactly one correct answer (correctIndex 0-3).
- Questions must test vocabulary, meaning, or grammar from the transcript only. Do not invent facts not in the text.

Reply ONLY with valid JSON, no markdown:
{"questions":[{"question":"...","questionEn":"...","options":["...","...","...","..."],"optionsEn":["...","...","...","..."],"correctIndex":0,"explanation":"...","explanationEn":"..."}]}`;

  const user = `Titre vidéo: ${videoTitle || 'Sans titre'}

Transcript (allemand):
${transcriptText.slice(0, 12000)}`;

  let raw;
  if (GROQ_API_KEY) {
    raw = await callGroq(system, user);
  } else if (OPENAI_API_KEY) {
    raw = await callOpenAI(system, user);
  } else {
    throw new Error('GROQ_API_KEY ou OPENAI_API_KEY requis pour générer le quiz');
  }

  const parsed = parseQuizJson(raw);
  if (!parsed.length) {
    throw new Error('Quiz IA invalide — réessayez');
  }
  return parsed.slice(0, 5);
}

async function callGroq(system, user) {
  const resp = await fetchFn(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.4,
      max_tokens: 2000,
    }),
  });
  if (!resp.ok) throw new Error(`Groq ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callOpenAI(system, user) {
  const resp = await fetchFn(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.4,
      max_tokens: 2000,
    }),
  });
  if (!resp.ok) throw new Error(`OpenAI ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

function parseQuizJson(raw) {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) return [];
  try {
    const obj = JSON.parse(raw.slice(start, end + 1));
    const questions = obj.questions || obj;
    if (!Array.isArray(questions)) return [];
    return questions
      .filter(
        (q) =>
          q.question &&
          Array.isArray(q.options) &&
          q.options.length >= 2 &&
          typeof q.correctIndex === 'number'
      )
      .map((q) => {
        const options = q.options.map(String).slice(0, 4);
        const optionsEn = Array.isArray(q.optionsEn)
          ? q.optionsEn.map(String).slice(0, 4)
          : [];
        while (optionsEn.length < options.length) optionsEn.push('');

        return {
          question: String(q.question),
          questionEn: q.questionEn ? String(q.questionEn) : '',
          options,
          optionsEn,
          correctIndex: Math.min(
            Math.max(0, q.correctIndex),
            options.length - 1
          ),
          explanation: q.explanation ? String(q.explanation) : '',
          explanationEn: q.explanationEn ? String(q.explanationEn) : '',
        };
      });
  } catch {
    return [];
  }
}

module.exports = { generateShadowingQuiz };
