const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testSimple() {
  try {
    console.log('🧪 Test simple du serveur...');
    
    const response = await fetch('http://localhost:5000/api/health');
    console.log(`Status: ${response.status}`);
    const data = await response.json();
    console.log('Réponse:', data);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testSimple();
