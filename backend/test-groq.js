require('dotenv').config();

async function testGroq() {
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  
  const GROQ_KEY = process.env.GROQ_API_KEY;
  console.log('GROQ_API_KEY found:', !!GROQ_KEY);
  console.log('Key preview:', GROQ_KEY?.substring(0, 15) + '...');
  
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'user', content: 'Sag Hallo auf Deutsch in einem Satz' }
        ],
        max_tokens: 50,
        temperature: 0.7
      })
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.choices?.[0]?.message?.content) {
      console.log('\n✅ SUCCESS! AI Response:', data.choices[0].message.content);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testGroq();
