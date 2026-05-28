const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testSimulationCRUD() {
  const baseURL = 'http://localhost:5000/api';
  
  console.log('🧪 Test complet du CRUD Simulation...\n');
  
  let createdSimulationId = null;
  
  try {
    // Test 1: GET /api/simulation/admin (LIST)
    console.log('1. Test LIST - GET /api/simulation/admin');
    const response1 = await fetch(`${baseURL}/simulation/admin`);
    console.log(`Status: ${response1.status}`);
    const data1 = await response1.json();
    console.log(`Nombre de simulations: ${data1.length}`);
    console.log('');
    
    // Test 2: POST /api/simulation/create (CREATE)
    console.log('2. Test CREATE - POST /api/simulation/create');
    
    // Créer un fichier temporaire pour le test
    const testImagePath = path.join(__dirname, 'test-image.jpg');
    const testImageBuffer = Buffer.from('fake image data');
    fs.writeFileSync(testImagePath, testImageBuffer);
    
    const formData = new FormData();
    formData.append('image', fs.createReadStream(testImagePath));
    formData.append('title', 'Test Simulation CRUD');
    formData.append('description', 'Test de création via API');
    formData.append('theme', 'Test Theme');
    formData.append('difficulty', 'easy');
    
    const response2 = await fetch(`${baseURL}/simulation/create`, {
      method: 'POST',
      body: formData
    });
    
    console.log(`Status: ${response2.status}`);
    const data2 = await response2.json();
    console.log(`Réponse:`, data2);
    
    if (response2.ok && data2.success) {
      createdSimulationId = data2.game.id;
      console.log(`✅ Simulation créée avec ID: ${createdSimulationId}`);
    }
    console.log('');
    
    // Nettoyer le fichier temporaire
    fs.unlinkSync(testImagePath);
    
    // Test 3: GET /api/simulation/:id (READ)
    if (createdSimulationId) {
      console.log('3. Test READ - GET /api/simulation/:id');
      const response3 = await fetch(`${baseURL}/simulation/${createdSimulationId}`);
      console.log(`Status: ${response3.status}`);
      const data3 = await response3.json();
      console.log(`Titre: ${data3.title}`);
      console.log(`Thème: ${data3.metadata ? JSON.parse(data3.metadata).theme : 'N/A'}`);
      console.log('');
    }
    
    // Test 4: PUT /api/simulation/:id (UPDATE)
    if (createdSimulationId) {
      console.log('4. Test UPDATE - PUT /api/simulation/:id');
      const response4 = await fetch(`${baseURL}/simulation/${createdSimulationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Test Simulation CRUD - Modifié',
          theme: 'Test Theme - Modifié',
          difficulty: 'medium'
        })
      });
      
      console.log(`Status: ${response4.status}`);
      const data4 = await response4.json();
      console.log(`Réponse:`, data4);
      console.log('');
    }
    
    // Test 5: DELETE /api/simulation/:id (DELETE)
    if (createdSimulationId) {
      console.log('5. Test DELETE - DELETE /api/simulation/:id');
      const response5 = await fetch(`${baseURL}/simulation/${createdSimulationId}`, {
        method: 'DELETE'
      });
      
      console.log(`Status: ${response5.status}`);
      const data5 = await response5.json();
      console.log(`Réponse:`, data5);
      console.log('');
    }
    
    // Test 6: Vérifier que la suppression a fonctionné
    if (createdSimulationId) {
      console.log('6. Test de vérification après suppression');
      const response6 = await fetch(`${baseURL}/simulation/${createdSimulationId}`);
      console.log(`Status: ${response6.status}`);
      const data6 = await response6.json();
      console.log(`Réponse:`, data6);
      console.log('');
    }
    
    console.log('🎉 Test CRUD terminé !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

testSimulationCRUD();
