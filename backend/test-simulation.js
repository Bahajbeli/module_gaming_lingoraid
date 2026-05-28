const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testSimulationAPI() {
  const baseURL = 'http://localhost:5000/api';
  
  console.log('🧪 Test des routes de simulation...\n');
  
  try {
    // Test 1: GET /api/simulation/admin
    console.log('1. Test GET /api/simulation/admin');
    const response1 = await fetch(`${baseURL}/simulation/admin`);
    console.log(`Status: ${response1.status}`);
    const data1 = await response1.json();
    console.log(`Réponse:`, data1);
    console.log('');
    
    // Test 2: GET /api/simulation/latest/active
    console.log('2. Test GET /api/simulation/latest/active');
    const response2 = await fetch(`${baseURL}/simulation/latest/active`);
    console.log(`Status: ${response2.status}`);
    const data2 = await response2.json();
    console.log(`Réponse:`, data2);
    console.log('');
    
    // Test 3: POST /api/simulation/create (sans image pour tester l'erreur)
    console.log('3. Test POST /api/simulation/create (sans image)');
    const response3 = await fetch(`${baseURL}/simulation/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Test Simulation',
        theme: 'Test theme'
      })
    });
    console.log(`Status: ${response3.status}`);
    const data3 = await response3.json();
    console.log(`Réponse:`, data3);
    console.log('');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

testSimulationAPI();
