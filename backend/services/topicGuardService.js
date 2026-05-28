const fetchFn = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/** Mots-clés hors-sujet fréquents (allemand / français / anglais) */
const OFF_TOPIC_KEYWORDS = [
  'essen', 'pizza', 'manger', 'food', 'restaurant', 'kochen', 'cuisine', 'mochte essen', 'liebe essen',
  'umwelt', 'environment', 'klima', 'climate', 'pollution', 'écologie', 'oekologie',
  'politik', 'politique', 'sport', 'fussball', 'football', 'musik', 'music', 'film', 'cinema',
  'arbeit', 'travail', 'job', 'schule', 'école', 'school', 'universität',
  'wetter', 'weather', 'météo', 'reise', 'travel', 'voyage', 'urlaub', 'vacances',
  'geld', 'money', 'argent', 'wirtschaft', 'economy', 'économie',
  'liebe', 'amour', 'dating', 'beziehung', 'relation',
  'krankheit', 'maladie', 'disease', 'medizin', 'médecine',
  'technologie', 'technology', 'computer', 'handy', 'telefon',
];

/** Thème = animaux / pets */
function isPetTheme(theme) {
  const t = (theme || '').toLowerCase();
  return /haustier|tier|animal|pet|chat|chien|dog|cat|vétér|veterin|vierbein|compagnie|katze|hund|oiseau|hamster|lapin|rongeur/i.test(t);
}

/**
 * Détection rapide sans API — retourne false si clairement hors sujet, null si incertain.
 */
function heuristicOffTopic(userMessage, theme) {
  const msg = (userMessage || '').trim().toLowerCase();
  if (!msg) return null;

  const hasOffTopicWord = OFF_TOPIC_KEYWORDS.some((kw) => msg.includes(kw));
  if (!hasOffTopicWord) return null;

  if (isPetTheme(theme)) {
    const petContext = /\b(katze|hund|tier|haustier|pet|chat|chien|animal|futter|nahrung|tierfutter|katzenfutter|hundefutter)\b/i;
    if (petContext.test(msg)) return null;
    return false;
  }

  return false;
}

function parseStrictYesNo(answer) {
  const a = (answer || '').trim().toUpperCase();
  if (!a) return null;
  if (/^NO\b/.test(a) || a === 'NO' || /\bNO\b/.test(a)) return false;
  if (/^YES\b/.test(a) || a === 'YES' || /\bYES\b/.test(a)) return true;
  return null;
}

/**
 * @returns {Promise<boolean>} true = on-topic, false = hors sujet (perte)
 */
async function isMessageOnTopic(userMessage, theme, options = {}) {
  const text = (userMessage || '').trim();
  const topic = (theme || 'Conversation générale').trim();
  const context = options.imageDescription ? ` Contexte: ${options.imageDescription}` : '';

  if (!text) return true;

  const heuristic = heuristicOffTopic(text, topic);
  if (heuristic === false) {
    console.log('[topicGuard] heuristic OFF_TOPIC', { topic, preview: text.slice(0, 80) });
    return false;
  }

  if (!GROQ_API_KEY) {
    console.warn('[topicGuard] GROQ_API_KEY absente — heuristique seule');
    return heuristic !== false;
  }

  const systemPrompt = `Tu es l'arbitre STRICT d'un jeu. Le joueur doit parler UNIQUEMENT du thème: "${topic}".${context}

Évalue UNIQUEMENT le dernier message du joueur (ignore les réponses de l'assistant).

Réponds NO si le joueur:
- change de sujet (nourriture, environnement, politique, sport, travail, etc.)
- pose une question sans lien direct avec le thème
- parle de quelque chose que le thème n'inclut pas explicitement

Réponds YES seulement si le message traite directement le thème.

Exemples si le thème est les animaux de compagnie / Haustiere:
- "ich habe eine Katze" → YES
- "meine Katze heißt Max" → YES
- "ich mochte essen" → NO
- "was denkt du uber umwelt" → NO
- "ich liebe Pizza" → NO

Réponds par UN SEUL mot: YES ou NO.`;

  try {
    const resp = await fetchFn(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        max_tokens: 5,
        temperature: 0,
      }),
    });

    if (!resp.ok) {
      console.warn('[topicGuard] Groq error', resp.status);
      return heuristic !== false;
    }

    const data = await resp.json();
    const answer = data.choices?.[0]?.message?.content || '';
    const parsed = parseStrictYesNo(answer);
    const onTopic = parsed === null ? heuristic !== false : parsed;

    console.log('[topicGuard]', { topic, preview: text.slice(0, 80), answer, onTopic });
    return onTopic;
  } catch (err) {
    console.warn('[topicGuard] check failed:', err.message);
    return heuristic !== false;
  }
}

module.exports = { isMessageOnTopic, heuristicOffTopic };
