const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = 'AIzaSyDvfh6h8m6Dy6HGEo_2Slvg2viOdf3gHGg';

async function testGeminiAPI() {
  console.log('🧪 Test de l\'API Gemini...\n');
  console.log('API Key:', GEMINI_API_KEY.substring(0, 20) + '...\n');

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    // Test 1: Essayer gemini-pro
    console.log('Test 1: Modèle gemini-pro');
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent('Sag hallo auf Deutsch in einem Satz.');
      const response = await result.response;
      const text = response.text();
      console.log('✅ gemini-pro fonctionne!');
      console.log('Réponse:', text);
    } catch (error) {
      console.log('❌ gemini-pro ne fonctionne pas');
      console.log('Erreur:', error.message);
    }

    console.log('\n---\n');

    // Test 2: Essayer gemini-1.5-pro
    console.log('Test 2: Modèle gemini-1.5-pro');
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      const result = await model.generateContent('Sag hallo auf Deutsch in einem Satz.');
      const response = await result.response;
      const text = response.text();
      console.log('✅ gemini-1.5-pro fonctionne!');
      console.log('Réponse:', text);
    } catch (error) {
      console.log('❌ gemini-1.5-pro ne fonctionne pas');
      console.log('Erreur:', error.message);
    }

    console.log('\n---\n');

    // Test 3: Essayer gemini-1.5-flash
    console.log('Test 3: Modèle gemini-1.5-flash');
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent('Sag hallo auf Deutsch in einem Satz.');
      const response = await result.response;
      const text = response.text();
      console.log('✅ gemini-1.5-flash fonctionne!');
      console.log('Réponse:', text);
    } catch (error) {
      console.log('❌ gemini-1.5-flash ne fonctionne pas');
      console.log('Erreur:', error.message);
    }

    console.log('\n---\n');

    // Test 4: Liste des modèles disponibles
    console.log('Test 4: Tentative de lister les modèles disponibles');
    try {
      // Note: L'API Gemini ne fournit pas directement de liste de modèles
      // mais nous pouvons essayer différents noms
      console.log('ℹ️ Essayez les modèles suivants:');
      console.log('  - gemini-pro');
      console.log('  - gemini-1.5-pro');
      console.log('  - gemini-1.5-flash');
      console.log('  - gemini-1.5-pro-latest');
      console.log('  - gemini-1.5-flash-latest');
    } catch (error) {
      console.log('❌ Impossible de lister les modèles');
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

testGeminiAPI();
