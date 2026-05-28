// Test direct de l'API Gemini
const GEMINI_API_KEY = 'AIzaSyAg0sgDskmiqk-1cSIZQf6bQgBVRyFixOc';

async function testGeminiDirect() {
  console.log('🧪 Test DIRECT de l\'API Gemini...\n');
  
  try {
    // Import dynamique de node-fetch
    const { default: fetch } = await import('node-fetch');
    
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
    
    console.log('URL:', url.substring(0, 100) + '...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Sag "Hallo" auf Deutsch in einem kurzen Satz.'
          }]
        }]
      })
    });
    
    console.log('Status:', response.status);
    
    const data = await response.json();
    console.log('Réponse complète:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.candidates && data.candidates[0]) {
      const text = data.candidates[0].content.parts[0].text;
      console.log('\n✅ SUCCÈS!');
      console.log('Texte:', text);
    } else {
      console.log('\n❌ ERREUR dans la réponse');
    }
    
  } catch (error) {
    console.error('❌ ERREUR:', error.message);
  }
}

testGeminiDirect();
