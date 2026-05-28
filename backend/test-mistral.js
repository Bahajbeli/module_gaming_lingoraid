const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testMistralAPI() {
  const MISTRAL_API_KEY = '25zAOIj2cZPicB76asIx7UHgmuRvsPWv';
  const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
  
  console.log('🧪 Test de l\'API Mistral...\n');
  
  try {
    console.log('1. Test de connexion à l\'API Mistral');
    
    const response = await fetch(MISTRAL_API_URL, {
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
            content: 'Tu es un assistant qui répond en allemand. Dis simplement "Hallo!"'
          }
        ],
        max_tokens: 50,
        temperature: 0.7
      })
    });
    
    console.log(`Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Erreur: ${errorText}`);
      return;
    }
    
    const data = await response.json();
    console.log('Réponse:', data);
    console.log('Message IA:', data.choices[0]?.message?.content);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testMistralAPI();
