const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testMistralServer() {
  console.log('🧪 Test de l\'API Mistral du serveur...\n');
  
  try {
    console.log('1. Test POST /api/mistral/conversation/start');
    
    const response = await fetch('http://localhost:5000/api/mistral/conversation/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        theme: 'Familie',
        imageDescription: 'Une famille heureuse'
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
    console.log('Message IA:', data.message);
    console.log('Mode fallback:', data.fallback ? 'Oui' : 'Non');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testMistralServer();
