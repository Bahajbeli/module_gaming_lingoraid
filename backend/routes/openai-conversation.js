const express = require('express');
const router = express.Router();

// Configuration OpenRouter API
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';

if (!OPENROUTER_API_KEY) {
  console.error('❌ OPENROUTER_API_KEY manquante dans les variables d\'environnement');
}

// Import dynamique de node-fetch pour la compatibilité
const fetchFn = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pick(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  const idx = Math.floor((Date.now() + Math.random() * 1000) % arr.length);
  return arr[idx];
}

async function ollamaAvailable() {
  try {
    const r = await fetchFn(`${OLLAMA_URL}/api/tags`, { method: 'GET', timeout: 4000 });
    return r.ok;
  } catch (_) {
    return false;
  }
}

async function ollamaGenerate(prompt, maxTokens = 80) {
  const r = await fetchFn(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false, options: { temperature: 0.7, max_tokens: maxTokens } })
  });
  if (!r.ok) throw new Error(`Ollama HTTP ${r.status}`);
  const data = await r.json();
  return data.response || '';
}

// Route pour démarrer une conversation
router.post('/conversation/start', async (req, res) => {
  try {
    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({
        error: 'Configuration OpenRouter manquante',
        details: 'OPENROUTER_API_KEY non configurée'
      });
    }

    const { theme, imageDescription } = req.body;

    if (!theme) {
      return res.status(400).json({ error: 'Thème requis' });
    }

    const systemPrompt = `Du bist ein freundlicher deutscher Gesprächspartner.
    Sprich über das Thema: "${theme}"
    ${imageDescription ? `Das Bild zeigt: ${imageDescription}` : ''}

    Wichtige Regeln für A2-Niveau:
    - Sprich NUR auf Deutsch
    - Verwende EINFACHE Wörter und kurze Sätze
    - Spreche wie mit einem Anfänger - langsam und klar
    - Verwende nur GRUNDWORTSCHATZ (häufige, einfache Wörter)
    - Vermeide komplizierte Grammatik
    - Verwende Präsens und einfache Vergangenheit
    - Keine langen oder verschachtelte Sätze
    - Stelle einfache Fragen mit "Was", "Wie", "Wo"
    - Sei geduldig und hilfsbereit

    Begrüße den Benutzer einfach und freundlich.`;

    // Appel à l'API OpenRouter (Gemini via OpenRouter)
    const response = await fetchFn(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'LingoRaid Chat'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          }
        ],
        max_tokens: 50,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      console.error(`OpenRouter API error: ${response.status} - ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);

      if (response.status === 401) {
        return res.status(500).json({
          error: 'Clé API OpenRouter invalide',
          details: 'Vérifiez votre clé API OpenRouter'
        });
      }

      if (response.status === 403) {
        return res.status(500).json({
          error: 'Accès refusé à l\'API OpenRouter',
          details: 'Vérifiez les permissions de votre clé API'
        });
      }

      return res.status(500).json({
        error: 'API OpenRouter indisponible',
        details: 'L\'API OpenRouter ne répond pas. Vérifiez votre clé API et votre connexion internet.'
      });
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content || 'Hallo! Wie geht es dir?';

    res.json({
      success: true,
      message: aiMessage,
      conversationId: Date.now().toString()
    });

  } catch (error) {
    console.error('Erreur lors du démarrage de la conversation:', error?.message || error);
    res.status(500).json({
      error: 'Erreur serveur',
      details: 'Une erreur inattendue s\'est produite'
    });
  }
});

// Route pour continuer la conversation
router.post('/conversation/continue', async (req, res) => {
  try {
    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({
        error: 'Configuration OpenRouter manquante',
        details: 'OPENROUTER_API_KEY non configurée'
      });
    }

    const { userMessage, theme, conversationHistory } = req.body;

    if (!userMessage || !theme) {
      return res.status(400).json({ error: 'Message utilisateur et thème requis' });
    }

    // Construire les messages pour OpenRouter
    const messages = [
      {
        role: 'system',
        content: `Du bist ein freundlicher deutscher Gesprächspartner. Sprich über das Thema: "${theme}". Sei geduldig und hilfsbereit.`
      }
    ];

    // Ajouter l'historique de conversation (limiter à 6 derniers messages)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-6);
      recentHistory.forEach(msg => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    }

    // Ajouter le message actuel de l'utilisateur
    messages.push({
      role: 'user',
      content: userMessage
    });

    // Appel à l'API OpenRouter (Gemini via OpenRouter)
    console.log('Making OpenRouter API request...');
    console.log('API Key (first 10 chars):', OPENROUTER_API_KEY ? OPENROUTER_API_KEY.substring(0, 10) + '...' : 'UNDEFINED');
    console.log('Model:', OPENROUTER_MODEL);
    console.log('Base URL:', OPENROUTER_BASE_URL);

    const response = await fetchFn(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'LingoRaid Chat'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: messages,
        max_tokens: 45,
        temperature: 0.7
      })
    });
    console.log('OpenRouter API response status:', response.status);

    if (!response.ok) {
      console.error(`OpenRouter API error: ${response.status} - ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);

      if (response.status === 401) {
        return res.status(500).json({
          error: 'Clé API OpenRouter invalide',
          details: 'Vérifiez votre clé API OpenRouter'
        });
      }

      if (response.status === 403) {
        return res.status(500).json({
          error: 'Accès refusé à l\'API OpenRouter',
          details: 'Vérifiez les permissions de votre clé API'
        });
      }

      return res.status(500).json({
        error: 'API OpenRouter indisponible',
        details: 'L\'API OpenRouter ne répond pas. Vérifiez votre clé API et votre connexion internet.'
      });
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content || 'Das ist interessant! Erzähl mir mehr.';

    res.json({
      success: true,
      message: aiMessage
    });

  } catch (error) {
    console.error('Erreur lors de la continuation de la conversation:', error?.message || error);
    res.status(500).json({
      error: 'Erreur serveur',
      details: 'Une erreur inattendue s\'est produite'
    });
  }
});

// Health check for OpenRouter connectivity
router.get('/health', async (req, res) => {
  try {
    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({ ok: false, error: 'OPENROUTER_API_KEY manquant' });
    }
    // Just check configuration, don't make actual API calls
    res.json({
      ok: true,
      model: OPENROUTER_MODEL,
      baseUrl: OPENROUTER_BASE_URL,
      configured: true,
      provider: 'OpenRouter'
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

module.exports = router;
