const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSimulationCreation() {
  console.log('🧪 Test de création de simulation...\n');
  
  try {
    // Test 1: Vérifier la connexion à la base de données
    console.log('🔵 Test 1: Connexion à la base de données...');
    await prisma.$connect();
    console.log('✅ Connexion réussie\n');

    // Test 2: Vérifier s'il y a des utilisateurs
    console.log('🟢 Test 2: Vérification des utilisateurs...');
    const users = await prisma.user.findMany();
    console.log(`📊 Nombre d'utilisateurs trouvés: ${users.length}`);
    
    if (users.length > 0) {
      console.log('👤 Premier utilisateur:', {
        id: users[0].id,
        email: users[0].email,
        role: users[0].role
      });
    }
    console.log('');

    // Test 3: Vérifier la structure de la table Game
    console.log('🟡 Test 3: Structure de la table Game...');
    try {
      const gameCount = await prisma.game.count();
      console.log(`📊 Nombre de jeux existants: ${gameCount}`);
    } catch (error) {
      console.log('❌ Erreur lors de la vérification des jeux:', error.message);
    }
    console.log('');

    // Test 4: Tenter de créer une simulation
    console.log('🔴 Test 4: Création d\'une simulation...');
    
    // Trouver un utilisateur existant
    let owner = await prisma.user.findFirst();
    if (!owner) {
      console.log('⚠️ Aucun utilisateur trouvé, création d\'un utilisateur par défaut...');
      try {
        owner = await prisma.user.create({
          data: {
            email: 'admin@example.com',
            passwordHash: 'changeme',
            role: 'ADMIN'
          }
        });
        console.log('✅ Utilisateur par défaut créé:', owner.id);
      } catch (userError) {
        console.error('❌ Erreur lors de la création de l\'utilisateur:', userError.message);
        return;
      }
    }

    // Créer une simulation
    try {
      const game = await prisma.game.create({
        data: {
          type: 'simulation',
          mode: 'solo',
          title: 'Test Simulation',
          description: 'Test de création de simulation',
          difficulty: 'medium',
          isActive: true,
          status: 'unlocked',
          userId: owner.id,
          metadata: JSON.stringify({
            image: 'test-image.jpg',
            theme: 'Test Theme',
            imagePath: '/uploads/test-image.jpg'
          })
        }
      });
      
      console.log('✅ Simulation créée avec succès:', {
        id: game.id,
        title: game.title,
        type: game.type
      });

      // Nettoyer - supprimer la simulation de test
      await prisma.game.delete({
        where: { id: game.id }
      });
      console.log('🧹 Simulation de test supprimée');

    } catch (gameError) {
      console.error('❌ Erreur lors de la création de la simulation:', gameError.message);
      
      // Afficher plus de détails sur l'erreur
      if (gameError.code) {
        console.log('📋 Code d\'erreur:', gameError.code);
      }
      if (gameError.meta) {
        console.log('📋 Métadonnées d\'erreur:', gameError.meta);
      }
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Déconnexion de la base de données');
  }
}

// Lancer le test
console.log('🚀 Test de création de simulation...\n');
testSimulationCreation().catch(console.error);
