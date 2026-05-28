// Script de test pour vérifier la connexion frontend-backend
const testConnection = async () => {
  try {
    console.log('🧪 Test de connexion au backend...');
    
    // Test 1: API de santé
    const healthResponse = await fetch('http://localhost:5000/api/health');
    console.log('✅ API de santé:', healthResponse.status);
    
    // Test 2: Authentification admin
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@deutsche-lernen.com',
        password: 'admin123'
      })
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Authentification admin réussie');
      console.log('Token:', loginData.token.substring(0, 50) + '...');
      
      // Test 3: API des cours avec token
      const coursesResponse = await fetch('http://localhost:5000/api/courses/levels', {
        headers: {
          'Authorization': `Bearer ${loginData.token}`
        }
      });
      
      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json();
        console.log('✅ API des cours accessible');
        console.log('Niveaux disponibles:', Object.keys(coursesData));
      } else {
        console.log('❌ Erreur API des cours:', coursesResponse.status);
      }
      
    } else {
      console.log('❌ Erreur authentification:', loginResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
  }
};

// Exécuter le test
testConnection();
