// Test de la configuration OpenAI pour les mots croisés
require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

async function testOpenAI() {
  console.log('🧪 Test de la configuration OpenAI pour les mots croisés...\n');

  // Test 1: Vérifier la clé API
  console.log('1️⃣ Vérification de la clé API...');
  if (!OPENAI_API_KEY) {
    console.log('❌ OPENAI_API_KEY manquant');
    console.log('💡 Créez un fichier .env dans le dossier server/ avec :');
    console.log('   OPENAI_API_KEY=sk-votre-cle-api-ici');
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
      console.log(`🎯 Modèle configuré : ${OPENAI_MODEL}`);
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

  // Test 3: Test de génération de mots croisés
  console.log('\n3️⃣ Test de génération de mots croisés...');
  try {
    const testWords = [
      { answer: 'HALLO', clue: 'Salutation en allemand' },
      { answer: 'MUTTER', clue: 'Mère en allemand' },
      { answer: 'VATER', clue: 'Père en allemand' }
    ];

    const prompt = `You are a crossword constructor. Place the following words into a 10x10 crossword grid.
Return ONLY strict JSON with this schema: {"entries":[{"row":0,"col":0,"direction":"across|down","number":1,"clue":"...","answer":"UPPERCASE"}]}
Rules:
- Use 0-based row/col and keep within bounds.
- Words cross only on identical letters; no conflicts.
- Distribute words across the grid, maximize intersections, avoid long unbroken lines.
- Do not include any commentary.
Words (answer|clue):
${testWords.map(w => `${w.answer}|${w.clue}`).join('\n')}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are a helpful crossword constructor that outputs strict JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 1000
      })
    });

    if (response.ok) {
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content || '';
      
      // Vérifier que la réponse contient du JSON
      if (text.includes('{') && text.includes('}')) {
        console.log('✅ Génération de mots croisés réussie !');
        console.log('📝 Réponse reçue (premiers caractères):', text.substring(0, 100) + '...');
      } else {
        console.log('⚠️ Réponse reçue mais format inattendu');
        console.log('📝 Réponse:', text);
      }
    } else {
      console.log(`❌ Erreur lors de la génération: HTTP ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Erreur lors du test de génération:', error.message);
  }

  console.log('\n🎉 Test terminé !');
}

// Exécuter le test
testOpenAI().catch(console.error);
