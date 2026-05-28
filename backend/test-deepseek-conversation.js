// Test de l'endpoint DeepSeek conversation
require('dotenv').config();

async function testDeepSeekEndpoint() {
  try {
    console.log('🧪 Test de l\'endpoint DeepSeek conversation...');
    console.log('🔑 DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? '✅ Configurée' : '❌ Manquante');

    const response = await fetch('http://localhost:5000/api/deepseek/conversation/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        theme: 'test conversation',
        imageDescription: 'test image'
      })
    });

    console.log('📡 Status:', response.status);
    console.log('📡 Status Text:', response.statusText);

    const data = await response.json();
    console.log('📋 Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ Endpoint fonctionne correctement!');
    } else {
      console.log('❌ Erreur dans l\'endpoint');
    }

  } catch (error) {
    console.error('❌ Erreur de test:', error.message);
  }
}

testDeepSeekEndpoint();
