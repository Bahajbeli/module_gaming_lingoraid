// Test de l'API de connexion
const API_BASE = 'http://localhost:5000/api';

async function testLoginAPI() {
  console.log('🔐 Test de l\'API de connexion...\n');

  try {
    // Test 1: Connexion avec admin@deutsche-lernen.com
    console.log('1️⃣ Test de connexion admin...');
    const adminResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@deutsche-lernen.com',
        password: 'admin123'
      })
    });

    if (adminResponse.status === 200) {
      const adminData = await adminResponse.json();
      console.log('✅ Connexion admin réussie !');
      console.log(`   Token: ${adminData.token.substring(0, 50)}...`);
      console.log(`   Utilisateur: ${adminData.user.email} (${adminData.user.role})`);
      
      // Test de vérification du token
      console.log('\n2️⃣ Test de vérification du token...');
      const verifyResponse = await fetch(`${API_BASE}/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminData.token}`
        }
      });
      
      if (verifyResponse.status === 200) {
        console.log('✅ Vérification du token réussie !');
      }
    }

  } catch (error) {
    if (error.response) {
      console.log(`❌ Erreur HTTP ${error.response.status}: ${error.response.data.error}`);
    } else {
      console.log('❌ Erreur de connexion:', error.message);
    }
  }

  try {
    // Test 2: Connexion avec user@deutsche-lernen.com
    console.log('\n3️⃣ Test de connexion utilisateur...');
    const userResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'user@deutsche-lernen.com',
        password: 'user123'
      })
    });

    if (userResponse.status === 200) {
      const userData = await userResponse.json();
      console.log('✅ Connexion utilisateur réussie !');
      console.log(`   Utilisateur: ${userData.user.email} (${userData.user.role})`);
    }

  } catch (error) {
    if (error.response) {
      console.log(`❌ Erreur HTTP ${error.response.status}: ${error.response.data.error}`);
    } else {
      console.log('❌ Erreur de connexion:', error.message);
    }
  }

  try {
    // Test 3: Test de connexion avec des identifiants incorrects
    console.log('\n4️⃣ Test de connexion avec identifiants incorrects...');
    const wrongResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'wrong@email.com',
        password: 'wrongpassword'
      })
    });

    console.log('⚠️ Connexion avec identifiants incorrects devrait échouer');

  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Connexion avec identifiants incorrects échoue correctement (401)');
    } else {
      console.log('❌ Erreur inattendue:', error.message);
    }
  }

  console.log('\n🎉 Test de l\'API de connexion terminé !');
}

// Attendre que le serveur soit prêt
setTimeout(() => {
  testLoginAPI().catch(console.error);
}, 2000);
