require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Test de la clé API Gemini
async function testGemini() {
  console.log('🧪 Test de l\'API Gemini...');
  console.log('Clé API:', process.env.GEMINI_API_KEY ? 'Trouvée dans .env' : 'Non trouvée');
  
  const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyDvfh6h8m6Dy6HGEo_2Slvg2viOdf3gHGg';
  console.log('Utilisation de la clé:', apiKey.substring(0, 20) + '...');
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    console.log('\n📤 Envoi du test à Gemini...');
    const prompt = 'Hallo! Wie geht es dir? Antworte auf Deutsch in 2 Sätzen.';
    console.log('Prompt:', prompt);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('\n✅ Réponse reçue de Gemini:');
    console.log(text);
    console.log('\n✅ Test réussi! L\'API Gemini fonctionne correctement.');
    
  } catch (error) {
    console.error('\n❌ Erreur lors du test:');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

testGemini();
