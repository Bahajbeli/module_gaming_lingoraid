// Test de l'authentification
require('dotenv').config();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAuth() {
  console.log('🔐 Test de l\'authentification...\n');

  try {
    // Test 1: Vérifier les variables d'environnement
    console.log('1️⃣ Vérification des variables d\'environnement...');
    if (!process.env.JWT_SECRET) {
      console.log('❌ JWT_SECRET manquant');
      return;
    }
    console.log('✅ JWT_SECRET configuré');

    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL manquant');
      return;
    }
    console.log('✅ DATABASE_URL configuré');

    // Test 2: Vérifier la connexion à la base de données
    console.log('\n2️⃣ Test de connexion à la base de données...');
    await prisma.$connect();
    console.log('✅ Connexion à la base de données réussie');

    // Test 3: Vérifier les utilisateurs existants
    console.log('\n3️⃣ Vérification des utilisateurs...');
    const users = await prisma.user.findMany({
      select: { email: true, role: true }
    });
    
    if (users.length === 0) {
      console.log('❌ Aucun utilisateur trouvé dans la base');
      return;
    }
    
    console.log(`✅ ${users.length} utilisateur(s) trouvé(s):`);
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.role})`);
    });

    // Test 4: Test de connexion avec admin@deutsche-lernen.com
    console.log('\n4️⃣ Test de connexion avec admin@deutsche-lernen.com...');
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@deutsche-lernen.com' }
    });

    if (!adminUser) {
      console.log('❌ Utilisateur admin non trouvé');
      return;
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare('admin123', adminUser.passwordHash);
    if (!isValidPassword) {
      console.log('❌ Mot de passe admin incorrect');
      return;
    }
    console.log('✅ Authentification admin réussie');

    // Test 5: Génération de token JWT
    console.log('\n5️⃣ Test de génération de token JWT...');
    const token = jwt.sign(
      { 
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    console.log('✅ Token JWT généré avec succès');
    console.log(`   Token: ${token.substring(0, 50)}...`);

    // Test 6: Vérification du token
    console.log('\n6️⃣ Test de vérification du token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token JWT vérifié avec succès');
    console.log(`   Utilisateur: ${decoded.email} (${decoded.role})`);

    console.log('\n🎉 Tous les tests d\'authentification sont réussis !');
    console.log('\n📋 Résumé :');
    console.log('🔐 JWT_SECRET : ✅ Configuré');
    console.log('🗄️ Base de données : ✅ Connectée');
    console.log('👥 Utilisateurs : ✅ Présents');
    console.log('🔑 Authentification : ✅ Fonctionnelle');
    console.log('🎫 Tokens JWT : ✅ Générés et vérifiés');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le test
testAuth().catch(console.error);
