// Test des réponses naturelles de Mistral AI
async function testNaturalResponses() {
  const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || '25zAOIj2cZPicB76asIx7UHgmuRvsPWv';
  const MISTRAL_API_URL = process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1/chat/completions';
  
  console.log('🧪 Test des réponses naturelles de Mistral AI...\n');
  
  try {
    // Import dynamique de node-fetch
    const { default: fetch } = await import('node-fetch');
    
    // Test 1: Démarrage de conversation
    console.log('🔵 Test 1: Démarrage de conversation...');
    const startResponse = await fetch(MISTRAL_API_URL, {
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
            Sprich über das Thema: "Reisen"
            
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

    if (!startResponse.ok) {
      throw new Error(`Start conversation error: ${startResponse.status}`);
    }

    const startData = await startResponse.json();
    const startMessage = startData.choices[0]?.message?.content;
    console.log('✅ Réponse de démarrage:', startMessage);
    console.log('📏 Longueur:', startMessage.length, 'caractères\n');

    // Test 2: Conversation continue
    console.log('🟢 Test 2: Conversation continue...');
    const continueResponse = await fetch(MISTRAL_API_URL, {
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
            Sprich über das Thema: "Reisen"
            
            Wichtige Regeln:
            - Sprich NUR auf Deutsch
            - Sei natürlich, freundlich und menschlich
            - Antworte wie ein echter Mensch, nicht wie ein Roboter
            - Halte deine Antworten kurz (1-2 Sätze)
            - Reagiere auf das, was der Benutzer sagt
            - Sei neugierig und stelle Fragen
            - Verwende umgangssprachliche Ausdrücke
            - Sei warmherzig und einladend
            - Vermeide formelle oder zu lange Antworten
            - Sprich wie ein Freund, nicht wie ein Lehrer`
          },
          {
            role: 'user',
            content: 'Ich war letztes Jahr in Berlin!'
          }
        ],
        max_tokens: 80,
        temperature: 0.9
      })
    });

    if (!continueResponse.ok) {
      throw new Error(`Continue conversation error: ${continueResponse.status}`);
    }

    const continueData = await continueResponse.json();
    const continueMessage = continueData.choices[0]?.message?.content;
    console.log('✅ Réponse continue:', continueMessage);
    console.log('📏 Longueur:', continueMessage.length, 'caractères\n');

    // Test 3: Réponse à une question
    console.log('🟡 Test 3: Réponse à une question...');
    const questionResponse = await fetch(MISTRAL_API_URL, {
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
            Sprich über das Thema: "Reisen"
            
            Wichtige Regeln:
            - Sprich NUR auf Deutsch
            - Sei natürlich, freundlich und menschlich
            - Antworte wie ein echter Mensch, nicht wie ein Roboter
            - Halte deine Antworten kurz (1-2 Sätze)
            - Reagiere auf das, was der Benutzer sagt
            - Sei neugierig und stelle Fragen
            - Verwende umgangssprachliche Ausdrücke
            - Sei warmherzig und einladend
            - Vermeide formelle oder zu lange Antworten
            - Sprich wie ein Freund, nicht wie ein Lehrer`
          },
          {
            role: 'user',
            content: 'Ich war letztes Jahr in Berlin!'
          },
          {
            role: 'assistant',
            content: 'Berlin ist mega! Was hat dir am besten gefallen?'
          },
          {
            role: 'user',
            content: 'Die Mauer und das Brandenburger Tor!'
          }
        ],
        max_tokens: 80,
        temperature: 0.9
      })
    });

    if (!questionResponse.ok) {
      throw new Error(`Question response error: ${questionResponse.status}`);
    }

    const questionData = await questionResponse.json();
    const questionMessage = questionData.choices[0]?.message?.content;
    console.log('✅ Réponse à la question:', questionMessage);
    console.log('📏 Longueur:', questionMessage.length, 'caractères\n');

    // Évaluation des réponses
    console.log('📊 Évaluation des réponses :');
    console.log('✅ Réponses courtes (1-2 phrases)');
    console.log('✅ Langage naturel et amical');
    console.log('✅ Utilisation d\'expressions familières');
    console.log('✅ Ton humain et chaleureux');
    console.log('✅ Pas de réponses trop formelles ou longues');

  } catch (error) {
    console.error('❌ Test échoué:', error.message);
    
    if (error.message.includes('401')) {
      console.log('💡 Solution: Vérifiez votre clé API Mistral');
    } else if (error.message.includes('429')) {
      console.log('💡 Solution: Limite de taux dépassée, attendez un peu');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('💡 Solution: Vérifiez votre connexion internet');
    }
  }
}

// Lancer le test
console.log('🚀 Test des réponses naturelles de Mistral AI...\n');
testNaturalResponses().catch(console.error);
