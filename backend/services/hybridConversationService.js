/**
 * Hybrid Conversation Service
 * Essaie plusieurs APIs dans l'ordre : Gemini (gratuit) -> DeepSeek -> OpenAI
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Import dynamique de node-fetch
const fetchFn = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Configuration des APIs
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_BASE = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_MODEL = process.env.OPENAI_CONVERSATION_MODEL || 'gpt-4o-mini';

/**
 * Essaie de générer une réponse avec Gemini (GRATUIT)
 */
async function tryGemini(userMessage, conversationHistory, systemPrompt) {
  try {
    console.log('🔵 Essai avec Gemini...');
    
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY non définie');
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash-latest',
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 150,
      },
    });

    // Construire l'historique
    let history = '';
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      history = conversationHistory.map(msg => 
        `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`
      ).join('\n');
    }

    const prompt = `${systemPrompt || 'You are a friendly German language tutor.'}

${history ? `Previous conversation:\n${history}\n\n` : ''}Current message:
User: ${userMessage}
AI: `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (text && text.trim().length > 0) {
      console.log('✅ Gemini réussi!');
      return text.trim();
    }

    throw new Error('Réponse vide de Gemini');
  } catch (error) {
    console.log('❌ Gemini échoué:', error.message);
    throw error;
  }
}

/**
 * Essaie de générer une réponse avec DeepSeek
 */
async function tryDeepSeek(userMessage, conversationHistory, systemPrompt) {
  try {
    console.log('🟢 Essai avec DeepSeek...');
    
    if (!DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY non définie');
    }

    const messages = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      conversationHistory.forEach(msg => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    }
    
    messages.push({ role: 'user', content: userMessage });

    const response = await fetchFn(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: messages,
        temperature: 0.8,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    if (aiResponse && aiResponse.trim().length > 0) {
      console.log('✅ DeepSeek réussi!');
      return aiResponse.trim();
    }

    throw new Error('Réponse vide de DeepSeek');
  } catch (error) {
    console.log('❌ DeepSeek échoué:', error.message);
    throw error;
  }
}

/**
 * Essaie de générer une réponse avec OpenAI
 */
async function tryOpenAI(userMessage, conversationHistory, systemPrompt) {
  try {
    console.log('🔴 Essai avec OpenAI...');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY non définie');
    }

    const messages = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      conversationHistory.forEach(msg => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    }
    
    messages.push({ role: 'user', content: userMessage });

    const response = await fetchFn(`${OPENAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: messages,
        temperature: 0.8,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    if (aiResponse && aiResponse.trim().length > 0) {
      console.log('✅ OpenAI réussi!');
      return aiResponse.trim();
    }

    throw new Error('Réponse vide de OpenAI');
  } catch (error) {
    console.log('❌ OpenAI échoué:', error.message);
    throw error;
  }
}

/**
 * Génère une réponse en essayant plusieurs APIs dans l'ordre
 * @param {string} userMessage - Message de l'utilisateur
 * @param {Array} conversationHistory - Historique de la conversation
 * @param {string} systemPrompt - Prompt système
 * @returns {Promise<string>} - Réponse de l'IA
 */
async function generateConversationResponse(userMessage, conversationHistory = [], systemPrompt = '') {
  console.log('\n=== HYBRID AI CONVERSATION START ===');
  console.log('User message:', userMessage);
  console.log('History length:', conversationHistory.length);

  // Essayer les APIs dans l'ordre : Gemini (gratuit) -> DeepSeek -> OpenAI
  const providers = [
    { name: 'Gemini', fn: tryGemini },
    { name: 'DeepSeek', fn: tryDeepSeek },
    { name: 'OpenAI', fn: tryOpenAI }
  ];

  for (const provider of providers) {
    try {
      const response = await provider.fn(userMessage, conversationHistory, systemPrompt);
      console.log(`✅ Succès avec ${provider.name}!`);
      console.log('=== HYBRID AI CONVERSATION END ===\n');
      return response;
    } catch (error) {
      console.log(`❌ ${provider.name} a échoué, essai du suivant...`);
      continue;
    }
  }

  // Si toutes les APIs échouent
  console.error('❌ TOUTES LES APIs ONT ÉCHOUÉ');
  console.log('=== HYBRID AI CONVERSATION END ===\n');
  return "Entschuldigung, ich hatte ein Problem mit der Antwort. Könnten Sie das bitte wiederholen?";
}

/**
 * Génère une réponse simple
 */
async function generateResponse(prompt, context = '') {
  const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
  return await generateConversationResponse(fullPrompt, [], '');
}

module.exports = {
  generateResponse,
  generateConversationResponse
};
