// Test simple de Mistral AI
async function testMistralAI() {
  const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || '25zAOIj2cZPicB76asIx7UHgmuRvsPWv';
  const MISTRAL_API_URL = process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1/chat/completions';
  
  console.log('🧪 Test de Mistral AI...');
  console.log('API Key:', MISTRAL_API_KEY ? '✅ Configurée' : '❌ Non configurée');
  console.log('API URL:', MISTRAL_API_URL);
  
  try {
    // Import dynamique de node-fetch
    const { default: fetch } = await import('node-fetch');
    
    const systemPrompt = `Tu es un assistant conversationnel en allemand. 
    L'utilisateur a parlé mais tu n'as pas pu comprendre ce qu'il a dit.
    
    Règles:
    - Parle UNIQUEMENT en allemand
    - Sois naturel, amical et encourageant
    - Demande poliment de répéter
    - Varie tes réponses pour éviter la répétition
    - Réponds en 2 à 3 phrases maximum
    - Sois patient et encourageant`;

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
            content: systemPrompt
          },
          {
            role: 'user',
            content: 'Ich habe dich nicht verstanden. Bitte wiederhole das.'
          }
        ],
        max_tokens: 250,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mistral API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const aiMessage = data.choices[0]?.message?.content;
    
    console.log('✅ Test réussi !');
    console.log('Réponse de l\'IA:', aiMessage);
    console.log('Tokens utilisés:', data.usage);
    
  } catch (error) {
    console.error('❌ Test échoué:', error.message);
    
    if (error.message.includes('401')) {
      console.log('💡 Solution: Vérifiez votre clé API Mistral');
    } else if (error.message.includes('429')) {
      console.log('💡 Solution: Limite de taux dépassée, attendez un peu');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('💡 Solution: Vérifiez votre connexion internet');
    }
  }
}

// Test avec transcription vide
async function testTranscriptionEmpty() {
  const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || '25zAOIj2cZPicB76asIx7UHgmuRvsPWv';
  const MISTRAL_API_URL = process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1/chat/completions';
  
  console.log('\n🧪 Test avec transcription vide...');
  
  try {
    // Import dynamique de node-fetch
    const { default: fetch } = await import('node-fetch');
    
    const systemPrompt = `Tu es un assistant conversationnel en allemand. 
    L'utilisateur a parlé mais tu n'as pas pu comprendre ce qu'il a dit.
    
    Règles:
    - Parle UNIQUEMENT en allemand
    - Sois naturel, amical et encourageant
    - Demande poliment de répéter
    - Varie tes réponses pour éviter la répétition
    - Réponds en 2 à 3 phrases maximum
    - Sois patient et encourageant`;

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
            content: systemPrompt
          },
          {
            role: 'user',
            content: 'Ich habe dich nicht verstanden. Bitte wiederhole das.'
          }
        ],
        max_tokens: 250,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mistral API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const aiMessage = data.choices[0]?.message?.content;
    
    console.log('✅ Test réussi !');
    console.log('Réponse de l\'IA (transcription vide):', aiMessage);
    
  } catch (error) {
    console.error('❌ Test échoué:', error.message);
  }
}

// Lancer les tests
async function runTests() {
  console.log('🚀 Démarrage des tests Mistral AI...\n');
  
  await testMistralAI();
  await testTranscriptionEmpty();
  
  console.log('✨ Tests terminés !');
}

runTests().catch(console.error);
