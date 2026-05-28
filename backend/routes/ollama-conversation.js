const express = require('express');
const router = express.Router();

// Configuration Ollama
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';

// Import dynamique de node-fetch pour la compatibilité
const fetchFn = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Fonction pour vérifier si Ollama est disponible
async function checkOllamaStatus() {
  try {
    const response = await fetchFn(`${OLLAMA_URL}/api/tags`, {
      method: 'GET',
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    console.log('Ollama non disponible:', error.message);
    return false;
  }
}

// Route pour démarrer une conversation
router.post('/conversation/start', async (req, res) => {
  try {
    const { theme, imageDescription } = req.body;
    
    if (!theme) {
      return res.status(400).json({ error: 'Thème requis' });
    }

    // Vérifier si Ollama est disponible
    const ollamaAvailable = await checkOllamaStatus();
    
    if (!ollamaAvailable) {
      // Fallback vers des réponses prédéfinies
      console.log('Ollama non disponible, utilisation du mode fallback');
      const fallbackMessages = {
        'famille': [
          'Hallo! Erzähl mir von deiner Familie. Hast du Geschwister?',
          'Guten Tag! Wie viele Personen sind in deiner Familie?',
          'Hi! Was machst du gerne mit deiner Familie?',
          'Hallo! Hast du eine große oder kleine Familie?'
        ],
        'nourriture': [
          'Guten Tag! Was isst du gerne zum Frühstück?',
          'Hallo! Welches Essen magst du am liebsten?',
          'Hi! Kochst du gerne? Was ist dein Lieblingsgericht?',
          'Guten Tag! Trinkst du gerne Kaffee oder Tee?'
        ],
        'maison': [
          'Hallo! In welcher Art von Haus wohnst du?',
          'Guten Tag! Hast du ein Zimmer für dich allein?',
          'Hi! Was ist dein Lieblingsplatz in deinem Zuhause?',
          'Hallo! Lebst du in einer Wohnung oder einem Haus?'
        ],
        'travail': [
          'Guten Tag! Was machst du beruflich?',
          'Hallo! Gehst du gerne zur Arbeit?',
          'Hi! Was ist dein Traumberuf?',
          'Guten Tag! Arbeitest du viel?'
        ],
        'loisirs': [
          'Hallo! Was machst du gerne in deiner Freizeit?',
          'Guten Tag! Hast du Hobbys?',
          'Hi! Spielst du gerne Sport?',
          'Hallo! Liest du gerne Bücher?'
        ],
        'voyage': [
          'Guten Tag! Reist du gerne?',
          'Hallo! In welches Land möchtest du reisen?',
          'Hi! Warst du schon mal in Deutschland?',
          'Guten Tag! Wie reist du am liebsten?'
        ]
      };
      
      const themeKey = theme.toLowerCase();
      let messages = fallbackMessages[themeKey] || fallbackMessages['famille'];
      const fallbackMessage = messages[Math.floor(Math.random() * messages.length)];
      
      return res.json({
        success: true,
        message: fallbackMessage,
        conversationId: Date.now().toString(),
        fallback: true
      });
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

    const response = await fetchFn(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: systemPrompt,
        stream: false,
        options: {
          temperature: 0.9,
          max_tokens: 100
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.response || 'Hallo! Wie geht es dir? Wir können sprechen!';

    res.json({
      success: true,
      message: aiMessage,
      conversationId: Date.now().toString()
    });

  } catch (error) {
    console.error('Erreur Ollama AI:', error);
    // Graceful fallback to keep the game running even if the AI backend fails
    const safeMessage = 'Hallo! Wir können über einfache Themen sprechen. Wie geht es dir heute?';
    try {
      return res.json({ success: true, message: safeMessage, fallback: true });
    } catch (_) {
      // As a last resort, keep old behavior
      res.status(500).json({ 
        error: 'Erreur lors de la communication avec l\'IA',
        details: error.message 
      });
    }
  }
});

// Route pour continuer la conversation
router.post('/conversation/continue', async (req, res) => {
  try {
    const { userMessage, theme, conversationHistory } = req.body;
    
    if (!userMessage || !theme) {
      return res.status(400).json({ error: 'Message utilisateur et thème requis' });
    }

    // Vérifier si Ollama est disponible
    const ollamaAvailable = await checkOllamaStatus();
    
    if (!ollamaAvailable) {
      // Fallback vers des réponses prédéfinies
      console.log('Ollama non disponible, utilisation du mode fallback');
      const fallbackResponses = [
        'Das ist interessant! Erzähl mir mehr.',
        'Gut! Was denkst du noch?',
        'Ich verstehe! Hast du andere Ideen?',
        'Das ist gut! Wie fühlst du dich?',
        'Interessant! Was machst du dann?',
        'Das klingt spannend! Erzähl mir mehr darüber.',
        'Ich höre zu! Was denkst du noch?',
        'Das ist eine gute Idee! Wie geht es weiter?',
        'Aha! Das wusste ich nicht. Erzähl mir mehr!',
        'Sehr schön! Was passiert als nächstes?',
        'Das gefällt mir! Hast du noch mehr zu erzählen?',
        'Wow! Das ist wirklich interessant!',
        'Verstehe! Wie war das für dich?',
        'Das ist toll! Was denkst du darüber?',
        'Interessant! Kannst du mir ein Beispiel geben?',
        'Das ist schön! Wie oft passiert das?'
      ];
      const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      
      return res.json({
        success: true,
        message: randomResponse,
        fallback: true
      });
    }

    // Construire le prompt avec l'historique
    let prompt = `Du bist ein freundlicher deutscher Gesprächspartner. 
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
    - Sprich wie ein geduldiger Freund

    Conversation:
    `;

    // Ajouter l'historique de conversation (limiter à 4 derniers messages)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-4);
      recentHistory.forEach(msg => {
        if (msg.role === 'user') {
          prompt += `User: ${msg.content}\n`;
        } else {
          prompt += `Assistant: ${msg.content}\n`;
        }
      });
    }

    // Ajouter le message actuel de l'utilisateur
    prompt += `User: ${userMessage}\nAssistant:`;

    const response = await fetchFn(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.9,
          max_tokens: 80
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.response || 'Das ist interessant! Erzähl mir mehr.';

    res.json({
      success: true,
      message: aiMessage
    });

  } catch (error) {
    console.error('Erreur Ollama AI:', error);
    // Graceful fallback reply
    try {
      return res.json({
        success: true,
        message: 'Interessant! Erzähl mir mehr bitte.',
        fallback: true
      });
    } catch (_) {
      res.status(500).json({ 
        error: 'Erreur lors de la communication avec l\'IA',
        details: error.message 
      });
    }
  }
});

module.exports = router;
