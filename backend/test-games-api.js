const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testGamesAPI() {
  console.log('🧪 Test de l\'API des jeux...\n');
  
  try {
    // Test 1: Connexion à la base de données
    console.log('🔵 Test 1: Connexion à la base de données...');
    await prisma.$connect();
    console.log('✅ Connexion réussie\n');

    // Test 2: Vérifier les jeux existants
    console.log('🟢 Test 2: Vérification des jeux...');
    const games = await prisma.game.findMany({
      take: 5,
      include: {
        user: {
          select: {
            email: true,
            role: true
          }
        }
      }
    });
    console.log(`📊 Nombre de jeux trouvés: ${games.length}`);
    
    if (games.length > 0) {
      const game = games[0];
      console.log('🎮 Premier jeu:', {
        id: game.id,
        type: game.type,
        mode: game.mode,
        title: game.title,
        isActive: game.isActive,
        userEmail: game.user?.email
      });
    }
    console.log('');

    // Test 3: Tester la recherche de jeux par type et mode
    console.log('🟡 Test 3: Recherche de jeux par type et mode...');
    try {
      const creativiteGames = await prisma.game.findMany({
        where: {
          type: 'creativite',
          mode: 'solo'
        }
      });
      console.log(`📊 Jeux de créativité solo trouvés: ${creativiteGames.length}`);
      
      if (creativiteGames.length > 0) {
        console.log('✅ Premier jeu de créativité:', {
          id: creativiteGames[0].id,
          title: creativiteGames[0].title,
          status: creativiteGames[0].status
        });
      }
    } catch (error) {
      console.error('❌ Erreur lors de la recherche:', error.message);
    }
    console.log('');

    // Test 4: Tester la création d'un jeu de test
    console.log('🔴 Test 4: Création d\'un jeu de test...');
    try {
      // Trouver un utilisateur existant
      const user = await prisma.user.findFirst();
      if (!user) {
        console.log('❌ Aucun utilisateur trouvé');
        return;
      }

      // Créer un jeu de test
      const testGame = await prisma.game.create({
        data: {
          type: 'creativite',
          mode: 'solo',
          title: 'Test Créativité',
          description: 'Jeu de test pour la créativité',
          difficulty: 'easy',
          isActive: true,
          status: 'unlocked',
          userId: user.id
        }
      });
      
      console.log('✅ Jeu de test créé:', {
        id: testGame.id,
        type: testGame.type,
        title: testGame.title
      });

      // Nettoyer - supprimer le jeu de test
      await prisma.game.delete({
        where: { id: testGame.id }
      });
      console.log('🧹 Jeu de test supprimé');

    } catch (error) {
      console.error('❌ Erreur lors de la création du jeu de test:', error.message);
      
      if (error.code) {
        console.log('📋 Code d\'erreur:', error.code);
      }
      if (error.meta) {
        console.log('📋 Métadonnées d\'erreur:', error.meta);
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
console.log('🚀 Test de l\'API des jeux...\n');
testGamesAPI().catch(console.error);
