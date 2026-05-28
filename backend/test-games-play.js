const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testGamesPlay() {
  console.log('🧪 Test de démarrage des jeux...\n');
  
  try {
    // Test 1: Connexion à la base de données
    console.log('🔵 Test 1: Connexion à la base de données...');
    await prisma.$connect();
    console.log('✅ Connexion réussie\n');

    // Test 2: Vérifier les jeux existants
    console.log('🟢 Test 2: Vérification des jeux...');
    const games = await prisma.game.findMany({
      take: 10,
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
    
    // Afficher les types de jeux disponibles
    const gameTypes = [...new Set(games.map(g => g.type))];
    const gameModes = [...new Set(games.map(g => g.mode))];
    console.log('🎮 Types de jeux disponibles:', gameTypes);
    console.log('🎮 Modes de jeux disponibles:', gameModes);
    console.log('');

    // Test 3: Tester la recherche de jeux par type et mode
    console.log('🟡 Test 3: Test de recherche par type et mode...');
    const testTypes = ['creativite', 'quiz', 'mots-croises', 'simulation'];
    const testModes = ['solo', 'online'];
    
    for (const type of testTypes) {
      for (const mode of testModes) {
        try {
          const foundGames = await prisma.game.findMany({
            where: {
              type: type,
              mode: mode
            }
          });
          console.log(`✅ ${type}/${mode}: ${foundGames.length} jeux trouvés`);
        } catch (error) {
          console.error(`❌ ${type}/${mode}: Erreur -`, error.message);
        }
      }
    }
    console.log('');

    // Test 4: Simuler le démarrage d'un jeu
    console.log('🔴 Test 4: Simulation de démarrage de jeu...');
    try {
      // Trouver un utilisateur existant
      const user = await prisma.user.findFirst();
      if (!user) {
        console.log('❌ Aucun utilisateur trouvé');
        return;
      }

      // Simuler la logique de démarrage d'un jeu
      const gameType = 'creativite';
      const gameMode = 'solo';
      
      let game = await prisma.game.findFirst({
        where: {
          userId: user.id,
          type: gameType,
          mode: gameMode
        }
      });

      if (!game) {
        console.log('⚠️ Jeu non trouvé, création...');
        game = await prisma.game.create({
          data: {
            userId: user.id,
            type: gameType,
            mode: gameMode,
            title: `${gameType} - ${gameMode}`,
            description: `Jeu ${gameType} en mode ${gameMode}`,
            difficulty: 'easy',
            isActive: true,
            status: 'unlocked'
          }
        });
        console.log('✅ Jeu créé:', game.id);
      } else {
        console.log('✅ Jeu existant trouvé:', game.id);
      }

      // Vérifier le statut du jeu
      if (!game.isActive) {
        console.log('❌ Jeu désactivé');
        return;
      }

      if (game.status === 'locked') {
        console.log('❌ Jeu verrouillé');
        return;
      }

      // Mettre à jour le statut si nécessaire
      if (game.status === 'unlocked') {
        await prisma.game.update({
          where: { id: game.id },
          data: { status: 'in-progress' }
        });
        console.log('✅ Statut mis à jour: in-progress');
      }

      console.log('🎮 Jeu démarré avec succès!');

    } catch (error) {
      console.error('❌ Erreur lors de la simulation:', error.message);
      
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
console.log('🚀 Test de démarrage des jeux...\n');
testGamesPlay().catch(console.error);
