const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedMediaCategories() {
  try {
    console.log('🌱 Ajout des catégories de médias par défaut...');

    const categories = [
      {
        name: 'films',
        displayName: 'Films',
        description: 'Films allemands pour l\'apprentissage de la langue',
        icon: '🎬',
        color: 'purple'
      },
      {
        name: 'series',
        displayName: 'Séries TV',
        description: 'Séries télévisées allemandes',
        icon: '📺',
        color: 'blue'
      },
      {
        name: 'podcasts',
        displayName: 'Podcasts',
        description: 'Podcasts en allemand pour améliorer l\'écoute',
        icon: '🎧',
        color: 'green'
      }
    ];

    for (const category of categories) {
      const existingCategory = await prisma.mediaCategory.findUnique({
        where: { name: category.name }
      });

      if (!existingCategory) {
        await prisma.mediaCategory.create({
          data: category
        });
        console.log(`✅ Catégorie "${category.displayName}" créée`);
      } else {
        console.log(`ℹ️  Catégorie "${category.displayName}" existe déjà`);
      }
    }

    console.log('🎉 Catégories de médias ajoutées avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout des catégories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  seedMediaCategories();
}

module.exports = { seedMediaCategories };
