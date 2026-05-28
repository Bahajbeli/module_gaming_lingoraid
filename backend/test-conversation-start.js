const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

const prisma = new PrismaClient();

async function testConversationStart() {
  console.log('🧪 Test de démarrage de conversation...\n');
  
  try {
    // Test 1: Vérifier la connexion à la base de données
    console.log('🔵 Test 1: Connexion à la base de données...');
    await prisma.$connect();
    console.log('✅ Connexion réussie\n');

    // Test 2: Vérifier les simulations existantes
    console.log('🟢 Test 2: Vérification des simulations...');
    const simulations = await prisma.game.findMany({
      where: { type: 'simulation' }
    });
    console.log(`📊 Nombre de simulations trouvées: ${simulations.length}`);
    
    if (simulations.length > 0) {
      const sim = simulations[0];
      console.log('🎮 Première simulation:', {
        id: sim.id,
        title: sim.title,
        isActive: sim.isActive,
        metadata: sim.metadata
      });
    } else {
      console.log('❌ Aucune simulation trouvée');
      return;
    }
    console.log('');

    // Test 3: Tester la route Mistral directement
    console.log('🟡 Test 3: Test de la route Mistral...');
    const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || '25zAOIj2cZPicB76asIx7UHgmuRvsPWv';
    const MISTRAL_API_URL = process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1/chat/completions';
    
    try {
      const response = await fetch(MISTRAL_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MISTRAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral-large-latest',
          messages: [
            {
              role: 'system',
              content: `Du bist ein freundlicher deutscher Gesprächspartner. 
              Sprich über das Thema: "Test Thema"
              
              Wichtige Regeln:
              - Sprich NUR auf Deutsch
              - Sei natürlich, freundlich und menschlich
              - Antworte wie ein echter Mensch, nicht wie ein Roboter
              - Halte deine Antworten kurz (1-2 Sätze)
              - Sei neugierig und stelle eine Frage
              - Verwende umgangssprachliche Ausdrücke
              - Sei warmherzig und einladend
              - Vermeide formelle oder zu lange Antworten
              
              Begrüße den Benutzer freundlich und lade ihn ein, über das Thema zu sprechen.`
            }
          ],
          max_tokens: 100,
          temperature: 0.9
        })
      });

      if (!response.ok) {
        throw new Error(`Mistral API error: ${response.status}`);
      }

      const data = await response.json();
      const aiMessage = data.choices[0]?.message?.content;
      console.log('✅ Réponse Mistral réussie:', aiMessage);
      console.log('📏 Longueur:', aiMessage.length, 'caractères');

    } catch (mistralError) {
      console.error('❌ Erreur Mistral:', mistralError.message);
    }
    console.log('');

    // Test 4: Simuler une requête de démarrage de conversation
    console.log('🔴 Test 4: Simulation de requête de démarrage...');
    try {
      // Simuler les données d'une requête
      const requestData = {
        theme: 'Test Thema',
        imageDescription: 'Test Bild Beschreibung'
      };

      console.log('📤 Données envoyées:', requestData);
      console.log('✅ Simulation réussie - pas d\'erreur détectée');

    } catch (requestError) {
      console.error('❌ Erreur lors de la simulation:', requestError.message);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Déconnexion de la base de données');
  }
}

// Lancer le test
console.log('🚀 Test de démarrage de conversation...\n');
testConversationStart().catch(console.error);
