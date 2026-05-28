const axios = require('axios');
const FormData = require('form-data');

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const TEST_EMAIL = 'admin@deutsche-lernen.com';
const TEST_PASSWORD = 'admin123';

async function testUISimulation() {
  try {
    console.log('🧪 Test de simulation de l\'interface utilisateur...\n');

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

    // 2. Récupérer les catégories (comme fetchCategories)
    console.log('\n2. Récupération des catégories...');
    const categoriesResponse = await axios.get(`${API_BASE_URL}/media/categories`);
    const categories = categoriesResponse.data;
    console.log(`✅ ${categories.length} catégories trouvées:`);
    categories.forEach(cat => console.log(`   - ${cat.displayName} (${cat.id})`));

    if (categories.length === 0) {
      console.log('❌ Aucune catégorie disponible');
      return;
    }

    // 3. Récupérer les médias existants (comme fetchMedia)
    console.log('\n3. Récupération des médias existants...');
    const mediaResponse = await axios.get(`${API_BASE_URL}/media`);
    const existingMedia = mediaResponse.data;
    console.log(`✅ ${existingMedia.length} médias trouvés`);

    // 4. Simuler la création d'un média (comme handleSubmit)
    console.log('\n4. Simulation de création d\'un média...');
    
    const formData = new FormData();
    
    // Données comme dans le formulaire
    formData.append('title', 'Test Film Interface');
    formData.append('description', 'Description de test pour l\'interface');
    formData.append('type', 'film');
    formData.append('language', 'Allemand');
    formData.append('languageLevel', 'B1');
    formData.append('categoryId', categories[0].id);
    formData.append('director', 'Test Director');
    formData.append('year', '2024');
    formData.append('genre', 'Drame');
    formData.append('duration', '1h 45min');
    formData.append('rating', '4.5');
    formData.append('viewers', '1.2M');
    formData.append('platform', 'Netflix');

    console.log('📤 Envoi des données...');
    console.log('📋 Données envoyées:');
    console.log('   title: Test Film Interface');
    console.log('   description: Description de test pour l\'interface');
    console.log('   type: film');
    console.log('   language: Allemand');
    console.log('   languageLevel: B1');
    console.log(`   categoryId: ${categories[0].id}`);
    console.log('   director: Test Director');
    console.log('   year: 2024');
    console.log('   genre: Drame');
    console.log('   duration: 1h 45min');
    console.log('   rating: 4.5');
    console.log('   viewers: 1.2M');
    console.log('   platform: Netflix');

    const createResponse = await axios.post(`${API_BASE_URL}/media/admin/create`, formData, { headers });
    
    console.log('📥 Réponse de l\'API:', createResponse.data);
    
    // Vérifier la structure de la réponse
    if (createResponse.data.success || createResponse.data.id) {
      console.log('✅ Média créé avec succès!');
      console.log(`   - ID: ${createResponse.data.media?.id || createResponse.data.id}`);
      console.log(`   - Titre: ${createResponse.data.media?.title || createResponse.data.title}`);
    } else {
      console.log('❌ Réponse inattendue de l\'API');
    }

    // 5. Vérifier que le média apparaît dans la liste
    console.log('\n5. Vérification de la liste mise à jour...');
    const updatedMediaResponse = await axios.get(`${API_BASE_URL}/media`);
    const updatedMedia = updatedMediaResponse.data;
    console.log(`✅ ${updatedMedia.length} médias dans la liste mise à jour`);

    // 6. Nettoyer - supprimer le média de test
    console.log('\n6. Nettoyage...');
    const mediaId = createResponse.data.media?.id || createResponse.data.id;
    await axios.delete(`${API_BASE_URL}/media/${mediaId}`, { headers });
    console.log('✅ Média de test supprimé');

    console.log('\n🎉 Test de simulation terminé avec succès !');

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
testUISimulation();
