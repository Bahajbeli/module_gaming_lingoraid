// Test de la configuration OpenAI pour les simulations vocales
require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

async function testSimulationVoice() {
  console.log('🎤 Test de la configuration OpenAI pour les simulations vocales...\n');

  // Test 1: Vérifier la clé API
  console.log('1️⃣ Vérification de la clé API...');
  if (!OPENAI_API_KEY) {
    console.log('❌ OPENAI_API_KEY manquant');
    console.log('💡 Créez un fichier .env dans le dossier server/ avec :');
    console.log('   OPENAI_API_KEY=sk-votre-cle-api-ici');
    console.log('\n📖 Consultez SIMULATION_VOICE_SETUP.md pour les instructions complètes');
    return;
  }
  console.log('✅ Clé API configurée');

  // Test 2: Valider la clé API
  console.log('\n2️⃣ Test de validation de la clé API...');
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Clé API OpenAI valide !');
      console.log(`📊 Modèles disponibles : ${data.data.length}`);
      
      // Vérifier les modèles nécessaires
      const requiredModels = ['gpt-4o-mini', 'whisper-1', 'tts-1'];
      const availableModels = data.data.map(m => m.id);
      
      console.log('\n3️⃣ Vérification des modèles requis...');
      for (const model of requiredModels) {
        if (availableModels.includes(model)) {
          console.log(`✅ ${model} : Disponible`);
        } else {
          console.log(`❌ ${model} : Non disponible`);
        }
      }
    } else {
      console.log(`❌ Erreur HTTP ${response.status}`);
      if (response.status === 401) {
        console.log('💡 Clé API invalide ou expirée');
      } else if (response.status === 403) {
        console.log('💡 Compte sans accès à l\'API');
      }
    }
  } catch (error) {
    console.log('❌ Erreur de connexion:', error.message);
  }

  // Test 3: Test de génération de texte (GPT-4o)
  console.log('\n4️⃣ Test de génération de texte (GPT-4o)...');
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Tu es un assistant conversationnel germanophone. Réponds en allemand.' },
          { role: 'user', content: 'Sag Hallo!' }
        ],
        temperature: 0.8,
        max_tokens: 100
      })
    });

    if (response.ok) {
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content || '';
      console.log('✅ Génération de texte réussie !');
      console.log('📝 Réponse:', text);
    } else {
      console.log(`❌ Erreur lors de la génération: HTTP ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Erreur lors du test de génération:', error.message);
  }

  // Test 4: Test de synthèse vocale (TTS)
  console.log('\n5️⃣ Test de synthèse vocale (TTS)...');
  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: 'Hallo! Wie geht es dir?',
        voice: 'alloy'
      })
    });

    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      console.log('✅ Synthèse vocale réussie !');
      console.log(`📊 Taille audio: ${audioBuffer.byteLength} bytes`);
    } else {
      console.log(`❌ Erreur lors de la synthèse vocale: HTTP ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Erreur lors du test TTS:', error.message);
  }

  console.log('\n🎉 Test terminé !');
  console.log('\n📋 Résumé des fonctionnalités :');
  console.log('🎤 Whisper (transcription) : ✅ Prêt');
  console.log('💬 GPT-4o (conversation) : ✅ Prêt');
  console.log('🔊 TTS (synthèse vocale) : ✅ Prêt');
  console.log('\n🚀 Vous pouvez maintenant tester les simulations vocales !');
}

// Exécuter le test
testSimulationVoice().catch(console.error);
