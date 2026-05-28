/**
 * Free Conversation Service using Multiple Free AI APIs
 * Génère des réponses DYNAMIQUES uniquement via API
 */

// Import dynamique de node-fetch
const fetchFn = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

/**
 * Génère une réponse de conversation UNIQUEMENT via API
 */
async function generateConversationResponse(userMessage, conversationHistory = [], systemPrompt = '') {
  console.log('\n=== DYNAMIC API CONVERSATION START ===');
  console.log('User message:', userMessage);
  console.log('History length:', conversationHistory.length);

  // Construire le contexte de conversation
  let context = 'Du bist ein freundlicher deutscher Sprachlehrer. Antworte NUR auf Deutsch in 2-3 kurzen Sätzen.\n\n';
  
  if (conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-4);
    recentHistory.forEach(msg => {
      context += `${msg.role === 'user' ? 'Schüler' : 'Lehrer'}: ${msg.content}\n`;
    });
  }
  
  context += `Schüler: ${userMessage}\nLehrer:`;

  // Liste d'APIs gratuites à essayer
  const apiProviders = [
    // 1. Hugging Face NEW endpoint (serverless inference)
    {
      name: 'HuggingFace Serverless (Qwen)',
      call: async () => {
        const response = await fetchFn('https://api-inference.huggingface.co/models/Qwen/Qwen2.5-72B-Instruct', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-use-cache': 'false'
          },
          body: JSON.stringify({
            inputs: `<|im_start|>system
Du bist ein freundlicher deutscher Sprachlehrer. Antworte immer auf Deutsch.<|im_end|>
<|im_start|>user
${userMessage}<|im_end|>
<|im_start|>assistant
`,
            parameters: {
              max_new_tokens: 100,
              temperature: 0.7,
              return_full_text: false,
              do_sample: true
            }
          })
        });
        
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`HF Qwen error ${response.status}: ${error.substring(0, 100)}`);
        }
        
        const data = await response.json();
        let text = data[0]?.generated_text || data.generated_text || '';
        text = text.replace(/<\|.*?\|>/g, '').trim();
        
        if (text.length < 5) throw new Error('Response too short');
        return text;
      }
    },
    // 2. Groq Free API
    {
      name: 'Groq Free (Llama)',
      call: async () => {
        const GROQ_KEY = process.env.GROQ_API_KEY;
        if (!GROQ_KEY) throw new Error('No Groq API key');
        
        const response = await fetchFn('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_KEY}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'Du bist ein freundlicher deutscher Sprachlehrer. Antworte immer auf Deutsch in 2-3 kurzen Sätzen.' },
              { role: 'user', content: userMessage }
            ],
            max_tokens: 150,
            temperature: 0.7
          })
        });
        
        if (!response.ok) throw new Error(`Groq error ${response.status}`);
        
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (!text || text.length < 5) throw new Error('Empty response');
        return text;
      }
    },
    // 3. Together AI Free tier
    {
      name: 'Together AI Free',
      call: async () => {
        const TOGETHER_KEY = process.env.TOGETHER_API_KEY;
        if (!TOGETHER_KEY) throw new Error('No Together API key');
        
        const response = await fetchFn('https://api.together.xyz/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOGETHER_KEY}`
          },
          body: JSON.stringify({
            model: 'meta-llama/Llama-3-70b-chat-hf',
            messages: [
              { role: 'system', content: 'Du bist ein freundlicher deutscher Sprachlehrer. Antworte auf Deutsch.' },
              { role: 'user', content: userMessage }
            ],
            max_tokens: 100,
            temperature: 0.7
          })
        });
        
        if (!response.ok) throw new Error(`Together error ${response.status}`);
        
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (!text || text.length < 5) throw new Error('Empty response');
        return text;
      }
    },
    // 4. Cerebras Free API
    {
      name: 'Cerebras Free',
      call: async () => {
        const response = await fetchFn('https://api.cerebras.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer demo`
          },
          body: JSON.stringify({
            model: 'llama3.1-8b',
            messages: [
              { role: 'system', content: 'Du bist ein deutscher Sprachlehrer. Antworte auf Deutsch.' },
              { role: 'user', content: userMessage }
            ],
            max_tokens: 100
          })
        });
        
        if (!response.ok) throw new Error(`Cerebras error ${response.status}`);
        
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (!text || text.length < 5) throw new Error('Empty response');
        return text;
      }
    },
    // 5. Ollama local (if running)
    {
      name: 'Ollama Local',
      call: async () => {
        const response = await fetchFn('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama3.2',
            prompt: `Du bist ein deutscher Sprachlehrer. Antworte auf Deutsch auf diese Nachricht: "${userMessage}"`,
            stream: false,
            options: { num_predict: 100, temperature: 0.7 }
          })
        });
        
        if (!response.ok) throw new Error(`Ollama error ${response.status}`);
        
        const data = await response.json();
        const text = data.response?.trim();
        if (!text || text.length < 5) throw new Error('Empty response');
        return text;
      }
    }
  ];

  // Essayer chaque API
  for (const provider of apiProviders) {
    try {
      console.log(`🔄 Trying ${provider.name}...`);
      const response = await provider.call();
      
      if (response && response.length >= 5) {
        console.log(`✅ SUCCESS with ${provider.name}!`);
        console.log('Generated response:', response.substring(0, 100));
        console.log('=== DYNAMIC API CONVERSATION END ===\n');
        return response;
      }
    } catch (error) {
      console.log(`❌ ${provider.name} failed:`, error.message.substring(0, 80));
    }
  }

  // Si toutes échouent, retourner erreur
  console.error('❌ ALL APIs FAILED');
  console.log('=== DYNAMIC API CONVERSATION END ===\n');
  throw new Error('Toutes les APIs sont indisponibles. Veuillez réessayer.');
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
