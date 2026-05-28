const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = 'AIzaSyAg0sgDskmiqk-1cSIZQf6bQgBVRyFixOc';

async function testNewGeminiKey() {
  console.log('🧪 Test de la NOUVELLE clé Gemini...\n');
  
  const models = [
    'gemini-1.5-flash',
    'gemini-1.5-pro', 
    'gemini-pro',
    'gemini-1.0-pro'
  ];
  
  for (const modelName of models) {
    try {
      console.log(`\nTest: ${modelName}`);
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Sag "Hallo" auf Deutsch in einem kurzen Satz.');
      const response = await result.response;
      const text = response.text();
      
      console.log('✅ SUCCÈS!');
      console.log('Réponse:', text);
      console.log(`\n🎉 Le modèle ${modelName} fonctionne parfaitement!\n`);
      return; // Stop au premier modèle qui fonctionne
      
    } catch (error) {
      console.error('❌ ERREUR:', error.message.substring(0, 100));
    }
  }
  
  console.log('\n❌ Aucun modèle Gemini ne fonctionne');
}

testNewGeminiKey();
