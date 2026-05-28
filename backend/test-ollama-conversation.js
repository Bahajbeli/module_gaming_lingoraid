// Test de l'endpoint Ollama conversation
require('dotenv').config();

async function testOllamaEndpoint() {
  try {
    console.log('🧪 Test de l\'endpoint Ollama conversation...');
    
    const response = await fetch('http://localhost:5000/api/ollama/conversation/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        theme: 'famille',
        imageDescription: 'Une famille heureuse'
      })
    });

    console.log('📡 Status:', response.status);
    console.log('📡 Status Text:', response.statusText);
    
    const data = await response.json();
    console.log('📋 Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      if (data.fallback) {
        console.log('⚠️ Mode fallback utilisé (Ollama non disponible)');
      } else {
        console.log('✅ Ollama fonctionne correctement!');
      }
    } else {
      console.log('❌ Erreur dans l\'endpoint');
    }
    
  } catch (error) {
    console.error('❌ Erreur de test:', error.message);
  }
}

testOllamaEndpoint();
