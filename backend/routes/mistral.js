const express = require('express');
const router = express.Router();

// Configuration Mistral AI
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || '';
const MISTRAL_API_URL = process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1/chat/completions';

// Import dynamique de node-fetch pour la compatibilité
const fetchFn = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Route pour démarrer une conversation
router.post('/conversation/start', async (req, res) => {
  try {
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

    const response = await fetchFn(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          }
        ],
        max_tokens: 60, // Phrases très courtes pour A2
        temperature: 0.9 // Plus de créativité et de naturel
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        // Service tier capacity exceeded - utiliser une réponse de fallback
        console.log('API Mistral limitée, utilisation du mode fallback');
        const fallbackMessage = `Hallo! Ich bin froh, dass du hier bist! Wir können über "${theme}" sprechen. Was denkst du?`;
        
        return res.json({
          success: true,
          message: fallbackMessage,
          conversationId: Date.now().toString(),
          fallback: true
        });
      }
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.choices[0]?.message?.content || 'Hallo! Wie geht es dir? Wir können sprechen!';

    res.json({
      success: true,
      message: aiMessage,
      conversationId: Date.now().toString()
    });

  } catch (error) {
    console.error('Erreur Mistral AI:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la communication avec l\'IA',
      details: error.message 
    });
  }
});

// Route pour continuer la conversation
router.post('/conversation/continue', async (req, res) => {
  try {
    const { userMessage, theme, conversationHistory } = req.body;
    
    if (!userMessage || !theme) {
      return res.status(400).json({ error: 'Message utilisateur et thème requis' });
    }

    // Construire l'historique de conversation
    const messages = [
      {
        role: 'system',
        content: `Du bist ein freundlicher deutscher Gesprächspartner. 
        Sprich über das Thema: "${theme}"
        
        Wichtige Regeln für A2-Niveau:
        - Sprich NUR auf Deutsch
        - Verwende EINFACHE Wörter und kurze Sätze
        - Spreche wie mit einem Anfänger - langsam und klar
        - Verwende nur GRUNDWORTSCHATZ (häufige, einfache Wörter)
        - Vermeide komplizierte Grammatik
        - Verwende Präsens und einfache Vergangenheit
        - Keine langen oder verschachtelte Sätze
        - Stelle einfache Fragen mit "Was", "Wie", "Wo"
        - Reagiere auf das, was der Benutzer sagt
        - Sei geduldig und hilfsbereit
        - Sprich wie ein geduldiger Freund`
      }
    ];

    // Ajouter l'historique de conversation (limiter à 6 derniers messages pour éviter la surcharge)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-6); // Garder seulement les 6 derniers messages
      recentHistory.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });
    }

    // Ajouter le message actuel de l'utilisateur
    messages.push({
      role: 'user',
      content: userMessage
    });

    const response = await fetchFn(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: messages,
        max_tokens: 50, // Réponses très courtes pour A2
        temperature: 0.9 // Plus de créativité et de naturel
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        // Service tier capacity exceeded - utiliser une réponse de fallback
        console.log('API Mistral limitée, utilisation du mode fallback');
        const fallbackResponses = [
          'Das ist interessant! Erzähl mir mehr.',
          'Gut! Was denkst du noch?',
          'Ich verstehe! Hast du andere Ideen?',
          'Das ist gut! Wie fühlst du dich?',
          'Interessant! Was machst du dann?'
        ];
        const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
        
        return res.json({
          success: true,
          message: randomResponse,
          fallback: true
        });
      }
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.choices[0]?.message?.content || 'Das ist interessant! Erzähl mir mehr.';

    res.json({
      success: true,
      message: aiMessage
    });

  } catch (error) {
    console.error('Erreur Mistral AI:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la communication avec l\'IA',
      details: error.message 
    });
  }
});

// Route pour évaluer la prononciation (simulation)
router.post('/evaluate/pronunciation', async (req, res) => {
  try {
    const { userMessage, correctPhrase } = req.body;
    
    if (!userMessage || !correctPhrase) {
      return res.status(400).json({ error: 'Message utilisateur et phrase correcte requis' });
    }

    const systemPrompt = `Du bist ein freundlicher deutscher Lehrer.
    Der Benutzer hat gesagt: "${userMessage}"
    Die richtige Phrase ist: "${correctPhrase}"
    
    Bewerte die Aussprache und gib Tipps auf Deutsch.
    Sei ermutigend und konstruktiv.
    Halte deine Antwort kurz und freundlich.`;

    const response = await fetchFn(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        // Service tier capacity exceeded - utiliser une réponse de fallback
        console.log('API Mistral limitée, utilisation du mode fallback');
        return res.json({
          success: true,
          evaluation: 'Gute Aussprache! Weiter so!',
          fallback: true
        });
      }
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    const evaluation = data.choices[0]?.message?.content || 'Gute Aussprache!';

    res.json({
      success: true,
      evaluation: evaluation
    });

  } catch (error) {
    console.error('Erreur Mistral AI:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'évaluation',
      details: error.message 
    });
  }
});

module.exports = router;
