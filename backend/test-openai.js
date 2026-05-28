// Test d'OpenAI pour Whisper et TTS
async function testOpenAI() {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const OPENAI_API_BASE = 'https://api.openai.com/v1';
  
  console.log('🧪 Test d\'OpenAI...');
  console.log('API Key:', OPENAI_API_KEY ? '✅ Configurée' : '❌ Non configurée');
  console.log('API Base:', OPENAI_API_BASE);
  
  if (!OPENAI_API_KEY) {
    console.log('❌ OPENAI_API_KEY non configurée dans le fichier .env');
    console.log('💡 Créez un fichier .env dans le dossier server/ avec votre clé API OpenAI');
    return;
  }
  
  try {
    // Import dynamique de node-fetch
    const { default: fetch } = await import('node-fetch');
    
    // Test 1: Vérifier que la clé API est valide
    console.log('\n🔑 Test de validation de la clé API...');
    const modelsResponse = await fetch(`${OPENAI_API_BASE}/models`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!modelsResponse.ok) {
      throw new Error(`OpenAI API error ${modelsResponse.status}: ${await modelsResponse.text()}`);
    }
    
    const models = await modelsResponse.json();
    console.log('✅ Clé API OpenAI valide !');
    console.log('📋 Modèles disponibles:', models.data.map(m => m.id).slice(0, 5).join(', '));
    
    // Test 2: Test de génération de texte simple
    console.log('\n💬 Test de génération de texte...');
    const chatResponse = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Tu es un assistant conversationnel en allemand. Réponds en allemand seulement.'
          },
          {
            role: 'user',
            content: 'Sag mir "Hallo, wie geht es dir?"'
          }
        ],
        max_tokens: 50,
        temperature: 0.7
      })
    });
    
    if (!chatResponse.ok) {
      throw new Error(`Chat API error ${chatResponse.status}: ${await chatResponse.text()}`);
    }
    
    const chatData = await chatResponse.json();
    const aiMessage = chatData.choices[0]?.message?.content;
    console.log('✅ Génération de texte réussie !');
    console.log('🤖 Réponse de l\'IA:', aiMessage);
    
    // Test 3: Test de TTS
    console.log('\n🔊 Test de synthèse vocale (TTS)...');
    const ttsResponse = await fetch(`${OPENAI_API_BASE}/audio/speech`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: 'alloy',
        input: 'Hallo! Schön, dass du hier bist!',
        format: 'mp3'
      })
    });
    
    if (!ttsResponse.ok) {
      throw new Error(`TTS API error ${ttsResponse.status}: ${await ttsResponse.text()}`);
    }
    
    const audioBuffer = await ttsResponse.arrayBuffer();
    console.log('✅ TTS réussi !');
    console.log('📊 Taille audio:', audioBuffer.byteLength, 'bytes');
    
    console.log('\n🎉 Tous les tests OpenAI sont réussis !');
    console.log('✅ Votre configuration OpenAI fonctionne parfaitement');
    
  } catch (error) {
    console.error('❌ Test échoué:', error.message);
    
    if (error.message.includes('401')) {
      console.log('💡 Solution: Vérifiez votre clé API OpenAI');
    } else if (error.message.includes('429')) {
      console.log('💡 Solution: Limite de taux dépassée, attendez un peu');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('💡 Solution: Vérifiez votre connexion internet');
    } else if (error.message.includes('403')) {
      console.log('💡 Solution: Vérifiez que votre compte OpenAI a accès aux modèles');
    }
  }
}

// Lancer le test
console.log('🚀 Test de configuration OpenAI...\n');
testOpenAI().catch(console.error);
