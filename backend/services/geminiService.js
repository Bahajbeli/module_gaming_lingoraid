const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize the Google Generative AI with the API key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Generate a response using Gemini Pro model
 * @param {string} prompt - The prompt to send to Gemini
 * @param {string} context - Additional context for the conversation
 * @returns {Promise<string>} - The generated response
 */
async function generateResponse(prompt, context = '') {
  try {
    // Get the Gemini Pro model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    // Combine context and prompt
    const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
    
    // Generate content
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating response with Gemini:', error);
    throw new Error('Failed to generate response with Gemini');
  }
}

/**
 * Generate a conversation response for the simulation game
 * @param {string} userMessage - The user's message
 * @param {string} conversationHistory - The conversation history (optional)
 * @param {string} scenario - The simulation scenario/context
 * @returns {Promise<string>} - The AI's response
 */
async function generateConversationResponse(userMessage, conversationHistory = '', scenario = '') {
  try {
    console.log('\n=== GEMINI API CALL START ===');
    console.log('API Key présente:', GEMINI_API_KEY ? 'OUI' : 'NON');
    console.log('API Key (début):', GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 20) + '...' : 'AUCUNE');
    console.log('User message:', userMessage);
    console.log('Scenario:', scenario);
    console.log('Conversation history type:', typeof conversationHistory);
    
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY non définie');
    }
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    });
    console.log('Modèle Gemini initialisé: gemini-pro');
    
    // Build the conversation history
    let history = '';
    if (conversationHistory) {
      if (typeof conversationHistory === 'string') {
        history = conversationHistory;
      } else if (Array.isArray(conversationHistory)) {
        history = conversationHistory.map(msg => 
          `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`
        ).join('\n');
      }
    }
    
    const prompt = `You are a friendly German language tutor. Help the user practice German in a natural conversation.
    
Context: ${scenario || 'General conversation practice'}

${history ? `Previous conversation:\n${history}\n\n` : ''}Current conversation:
User: ${userMessage}
AI: `;
    
    console.log('Prompt envoyé (longueur):', prompt.length, 'caractères');
    console.log('Prompt:', prompt.substring(0, 200) + '...');
    
    console.log('Appel à Gemini en cours...');
    const result = await model.generateContent(prompt);
    console.log('Résultat reçu de Gemini');
    
    const response = await result.response;
    console.log('Response extraite');
    
    const text = response.text();
    console.log('Text extrait, longueur:', text ? text.length : 0);
    console.log('Réponse de Gemini:', text);
    console.log('=== GEMINI API CALL END ===\n');
    
    if (!text || text.trim() === '') {
      console.warn('⚠️ ATTENTION: Gemini a retourné une réponse vide!');
      return 'Guten Tag! Wie kann ich Ihnen helfen?';
    }
    
    return text;
  } catch (error) {
    console.error('\n❌ ERREUR dans generateConversationResponse:');
    console.error('Message d\'erreur:', error.message);
    console.error('Stack:', error.stack);
    if (error.response) {
      console.error('Gemini API error status:', error.response.status);
      console.error('Gemini API error data:', error.response.data);
    }
    console.error('=== ERREUR END ===\n');
    return "Entschuldigung, ich hatte ein Problem mit der Antwort. Könnten Sie das bitte wiederholen?";
  }
}

module.exports = {
  generateResponse,
  generateConversationResponse
};
