const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testRoomsAPI() {
  console.log("🧪 Test de l'API des salles...\n");

  try {
    // Test 1: Connexion à la base de données
    console.log("🔵 Test 1: Connexion à la base de données...");
    await prisma.$connect();
    console.log("✅ Connexion réussie\n");

    // Test 2: Vérifier les simulations pour les salles
    console.log("🟢 Test 2: Vérification des simulations disponibles...");
    const simulations = await prisma.game.findMany({
      where: {
        type: "simulation",
        isActive: true,
      },
    });
    console.log(`📊 Simulations actives trouvées: ${simulations.length}`);

    if (simulations.length === 0) {
      console.log(
        "⚠️ Aucune simulation active - créons-en une pour les tests..."
      );

      // Trouver un utilisateur
      let user = await prisma.user.findFirst();
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: "test@example.com",
            passwordHash: "test",
            role: "USER",
          },
        });
        console.log("✅ Utilisateur de test créé");
      }

      // Créer une simulation de test
      const testSimulation = await prisma.game.create({
        data: {
          type: "simulation",
          mode: "online",
          title: "Test Simulation Vocale",
          description: "Simulation de test pour les salles vocales",
          difficulty: "medium",
          isActive: true,
          status: "unlocked",
          userId: user.id,
          metadata: JSON.stringify({
            theme: "Conversation au restaurant",
            imagePath: "/uploads/test-restaurant.jpg",
          }),
        },
      });

      console.log("✅ Simulation de test créée:", testSimulation.id);
      simulations.push(testSimulation);
    }

    // Test 3: Simuler une sélection aléatoire
    console.log("🟡 Test 3: Test de sélection aléatoire de simulation...");
    const randomSimulation =
      simulations[Math.floor(Math.random() * simulations.length)];
    console.log("🎮 Simulation sélectionnée:", {
      id: randomSimulation.id,
      title: randomSimulation.title,
      metadata: randomSimulation.metadata,
    });

    let metadata = {};
    try {
      if (randomSimulation.metadata) {
        metadata = JSON.parse(randomSimulation.metadata);
      }
    } catch (e) {
      console.log(
        "⚠️ Erreur parsing metadata, utilisation des valeurs par défaut"
      );
    }

    console.log("📋 Métadonnées parsées:", {
      theme: metadata.theme || "Conversation générale",
      imagePath: metadata.imagePath || null,
    });

    // Test 4: Simuler la structure d'une salle
    console.log("🔴 Test 4: Simulation de création de salle...");
    const mockRoom = {
      id: `room_${Date.now()}_test`,
      name: "Salle de Test",
      simulation: {
        id: randomSimulation.id,
        title: randomSimulation.title,
        theme: metadata.theme || "Conversation générale",
        imagePath: metadata.imagePath || null,
      },
      status: "waiting",
      maxPlayers: 2,
      playersCount: 1,
    };

    console.log("✅ Structure de salle simulée:", mockRoom);
    console.log("✅ Test de l'API des salles réussi !");
  } catch (error) {
    console.error("❌ Erreur générale:", error.message);
    if (error.code) {
      console.log("📋 Code d'erreur:", error.code);
    }
  } finally {
    await prisma.$disconnect();
    console.log("\n🔌 Déconnexion de la base de données");
  }
}

// Lancer le test
console.log("🚀 Test de l'API des salles...\n");
testRoomsAPI().catch(console.error);
