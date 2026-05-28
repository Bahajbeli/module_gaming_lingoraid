const axios = require('axios');
const FormData = require('form-data');

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const TEST_EMAIL = 'admin@deutsche-lernen.com';
const TEST_PASSWORD = 'admin123';

async function testMediaAPI() {
  try {
    console.log('🧪 Test de l\'API de création de médias...\n');

    // 1. Connexion pour obtenir le token
    console.log('1. Connexion...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    const token = loginResponse.data.token;
    console.log('✅ Connexion réussie');

    // Configuration des headers avec le token
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    };

    // 2. Récupérer les catégories
    console.log('\n2. Récupération des catégories...');
    const categoriesResponse = await axios.get(`${API_BASE_URL}/media/categories`);
    const categories = categoriesResponse.data;
    console.log(`✅ ${categories.length} catégories trouvées:`);
    categories.forEach(cat => console.log(`   - ${cat.displayName} (${cat.id})`));

    if (categories.length === 0) {
      console.log('❌ Aucune catégorie disponible');
      return;
    }

    // 3. Créer un média de test SIMPLE
    console.log('\n3. Création d\'un média de test simple...');
    
    const formData = new FormData();
    
    // Données minimales
    formData.append('title', 'Test Film Simple');
    formData.append('description', 'Description de test simple');
    formData.append('type', 'film');
    formData.append('categoryId', categories[0].id);

    console.log('📤 Envoi des données...');
    console.log('📋 Données envoyées:');
    console.log('   title: Test Film Simple');
    console.log('   description: Description de test simple');
    console.log('   type: film');
    console.log(`   categoryId: ${categories[0].id}`);

    const createResponse = await axios.post(`${API_BASE_URL}/media/admin/create`, formData, { headers });
    
    console.log('✅ Média créé avec succès:');
    console.log(`   - ID: ${createResponse.data.media.id}`);
    console.log(`   - Titre: ${createResponse.data.media.title}`);
    console.log(`   - Type: ${createResponse.data.media.type}`);
    console.log(`   - Catégorie: ${createResponse.data.media.category.displayName}`);

    // 4. Nettoyer - supprimer le média de test
    console.log('\n4. Nettoyage...');
    await axios.delete(`${API_BASE_URL}/media/${createResponse.data.media.id}`, { headers });
    console.log('✅ Média de test supprimé');

    console.log('\n🎉 Tous les tests sont passés avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    
    if (error.response) {
      console.error('📋 Détails de l\'erreur:');
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Exécuter le test
testMediaAPI();
