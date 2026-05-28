const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_BASE = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_MODEL = process.env.OPENAI_CONVERSATION_MODEL || 'gpt-4o-mini';

// Helper to import node-fetch dynamically (ESM compatibility)
const fetchFn = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

/**
 * Generate a conversation response using OpenAI GPT
 * @param {string} userMessage - The user's message
 * @param {Array} conversationHistory - Array of previous messages
 * @param {string} systemPrompt - The system prompt for context
 * @returns {Promise<string>} - The AI's response
 */
async function generateConversationResponse(userMessage, conversationHistory = [], systemPrompt = '') {
  try {
    console.log('\n=== OPENAI CONVERSATION API CALL START ===');
    console.log('API Key présente:', OPENAI_API_KEY ? 'OUI' : 'NON');
    console.log('Model:', OPENAI_MODEL);
    console.log('User message:', userMessage);
    console.log('Conversation history length:', conversationHistory.length);
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY non définie');
    }

    // Build messages array for OpenAI chat completion
    const messages = [];
    
    // Add system prompt
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }
    
    // Add conversation history
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      conversationHistory.forEach(msg => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    }
    
    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    });

    console.log('Messages to send:', messages.length);

    // Call OpenAI API
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
        max_tokens: 150,
        presence_penalty: 0.6,
        frequency_penalty: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error response:', errorText);
      throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    console.log('AI Response:', aiResponse);
    console.log('=== OPENAI CONVERSATION API CALL END ===\n');

    if (!aiResponse || aiResponse.trim() === '') {
      console.warn('⚠️ ATTENTION: OpenAI a retourné une réponse vide!');
      return 'Guten Tag! Wie kann ich Ihnen helfen?';
    }

    return aiResponse.trim();
  } catch (error) {
    console.error('\n❌ ERREUR dans generateConversationResponse (OpenAI):');
    console.error('Message d\'erreur:', error.message);
    console.error('Stack:', error.stack);
    console.error('=== ERREUR END ===\n');
    // Propager l'erreur pour permettre un fallback (ex: freeConversationService)
    throw error;
  }
}

/**
 * Generate a simple response using OpenAI
 * @param {string} prompt - The prompt to send
 * @param {string} context - Additional context
 * @returns {Promise<string>} - The generated response
 */
async function generateResponse(prompt, context = '') {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY non définie');
    }

    const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;

    const response = await fetchFn(`${OPENAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'user',
            content: fullPrompt
          }
        ],
        temperature: 0.8,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error generating response with OpenAI:', error);
    throw new Error('Failed to generate response with OpenAI');
  }
}

module.exports = {
  generateResponse,
  generateConversationResponse
};
