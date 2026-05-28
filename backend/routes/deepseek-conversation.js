const express = require('express');
const router = express.Router();

// Configuration DeepSeek API
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';

if (!DEEPSEEK_API_KEY) {
  console.error('❌ DEEPSEEK_API_KEY manquante dans les variables d\'environnement');
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

// Route pour démarrer une conversation
router.post('/conversation/start', async (req, res) => {
  try {
    console.log('🚀 Démarrage conversation DeepSeek...');
    console.log('Clé API présente:', !!DEEPSEEK_API_KEY);
    console.log('Modèle:', DEEPSEEK_MODEL);
    console.log('Base URL:', DEEPSEEK_BASE_URL);

    if (!DEEPSEEK_API_KEY) {
      return res.status(500).json({
        error: 'Configuration DeepSeek manquante',
        details: 'DEEPSEEK_API_KEY non configurée'
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

    // Appel à l'API DeepSeek
    const response = await fetchFn(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
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
      console.error(`DeepSeek API error: ${response.status} - ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);

      if (response.status === 401) {
        return res.status(500).json({
          error: 'Clé API DeepSeek invalide',
          details: 'Vérifiez votre clé API DeepSeek'
        });
      }

      if (response.status === 403) {
        return res.status(500).json({
          error: 'Accès refusé à l\'API DeepSeek',
          details: 'Vérifiez les permissions de votre clé API'
        });
      }

      return res.status(500).json({
        error: 'API DeepSeek indisponible',
        details: 'L\'API DeepSeek ne répond pas. Vérifiez votre clé API et votre connexion internet.'
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
    if (!DEEPSEEK_API_KEY) {
      return res.status(500).json({
        error: 'Configuration DeepSeek manquante',
        details: 'DEEPSEEK_API_KEY non configurée'
      });
    }

    const { userMessage, theme, conversationHistory } = req.body;

    if (!userMessage || !theme) {
      return res.status(400).json({ error: 'Message utilisateur et thème requis' });
    }

    // Construire les messages pour DeepSeek
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

    console.log('Making DeepSeek API request...');
    console.log('API Key (first 10 chars):', DEEPSEEK_API_KEY ? DEEPSEEK_API_KEY.substring(0, 10) + '...' : 'UNDEFINED');
    console.log('Model:', DEEPSEEK_MODEL);
    console.log('Base URL:', DEEPSEEK_BASE_URL);

    const response = await fetchFn(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: messages,
        max_tokens: 45,
        temperature: 0.7
      })
    });
    console.log('DeepSeek API response status:', response.status);

    if (!response.ok) {
      console.error(`DeepSeek API error: ${response.status} - ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);

      if (response.status === 401) {
        return res.status(500).json({
          error: 'Clé API DeepSeek invalide',
          details: 'Vérifiez votre clé API DeepSeek'
        });
      }

      if (response.status === 403) {
        return res.status(500).json({
          error: 'Accès refusé à l\'API DeepSeek',
          details: 'Vérifiez les permissions de votre clé API'
        });
      }

      return res.status(500).json({
        error: 'API DeepSeek indisponible',
        details: 'L\'API DeepSeek ne répond pas. Vérifiez votre clé API et votre connexion internet.'
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

// Health check for DeepSeek connectivity
router.get('/health', async (req, res) => {
  try {
    if (!DEEPSEEK_API_KEY) {
      return res.status(500).json({ ok: false, error: 'DEEPSEEK_API_KEY manquant' });
    }
    // Just check configuration, don't make actual API calls
    res.json({
      ok: true,
      model: DEEPSEEK_MODEL,
      baseUrl: DEEPSEEK_BASE_URL,
      configured: true,
      provider: 'DeepSeek'
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

module.exports = router;
