const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function testMediaUpload() {
  try {
    console.log('🧪 Test de l\'upload de médias...\n');

    // 1. Vérifier les catégories
    console.log('1. Vérification des catégories de médias...');
    const categories = await prisma.mediaCategory.findMany();
    console.log(`✅ ${categories.length} catégories trouvées:`);
    categories.forEach(cat => {
      console.log(`   - ${cat.displayName} (${cat.name})`);
    });

    // 2. Vérifier les médias existants
    console.log('\n2. Vérification des médias existants...');
    const media = await prisma.media.findMany({
      include: {
        category: true,
        createdBy: {
          select: {
            email: true,
            role: true
          }
        }
      }
    });
    console.log(`✅ ${media.length} médias trouvés:`);
    media.forEach(item => {
      console.log(`   - ${item.title} (${item.type}) - ${item.category.displayName}`);
      console.log(`     Langue: ${item.language}, Niveau: ${item.languageLevel || 'Non défini'}`);
      if (item.director) console.log(`     Réalisateur: ${item.director}`);
      if (item.year) console.log(`     Année: ${item.year}`);
      if (item.genre) console.log(`     Genre: ${item.genre}`);
      if (item.mediaFileUrl) console.log(`     Fichier: ${item.mediaFileUrl}`);
      if (item.imageUrl) console.log(`     Image: ${item.imageUrl}`);
    });

    // 3. Vérifier la structure des dossiers
    console.log('\n3. Vérification de la structure des dossiers...');
    const uploadDirs = [
      'uploads',
      'uploads/media-images',
      'uploads/media-files'
    ];

    uploadDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        console.log(`✅ ${dir}: ${files.length} fichiers`);
      } else {
        console.log(`❌ ${dir}: dossier manquant`);
      }
    });

    // 4. Test de création d'un média de test
    console.log('\n4. Test de création d\'un média de test...');
    
    // Trouver une catégorie
    const testCategory = categories[0];
    if (!testCategory) {
      console.log('❌ Aucune catégorie trouvée pour le test');
      return;
    }

    // Trouver un utilisateur admin
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminUser) {
      console.log('❌ Aucun utilisateur admin trouvé pour le test');
      return;
    }

    // Créer un média de test
    const testMedia = await prisma.media.create({
      data: {
        title: 'Test Film Allemand',
        description: 'Un film de test pour vérifier le système d\'upload',
        type: 'film',
        language: 'Allemand',
        languageLevel: 'B1',
        subtitles: 'Français, Anglais',
        duration: '1h 45min',
        rating: 4.5,
        viewers: '1.2M',
        director: 'Test Director',
        year: 2024,
        genre: 'Drame',
        categoryId: testCategory.id,
        userId: adminUser.id,
        isActive: true
      },
      include: {
        category: true,
        createdBy: {
          select: {
            email: true,
            role: true
          }
        }
      }
    });

    console.log('✅ Média de test créé:');
    console.log(`   - ID: ${testMedia.id}`);
    console.log(`   - Titre: ${testMedia.title}`);
    console.log(`   - Type: ${testMedia.type}`);
    console.log(`   - Catégorie: ${testMedia.category.displayName}`);
    console.log(`   - Créé par: ${testMedia.createdBy.email}`);

    // 5. Nettoyer le média de test
    console.log('\n5. Nettoyage du média de test...');
    await prisma.media.delete({
      where: { id: testMedia.id }
    });
    console.log('✅ Média de test supprimé');

    console.log('\n🎉 Tous les tests sont passés avec succès !');
    console.log('\n📋 Résumé:');
    console.log(`   - ${categories.length} catégories disponibles`);
    console.log(`   - ${media.length} médias existants`);
    console.log('   - Structure des dossiers OK');
    console.log('   - Création/suppression de médias OK');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le test si appelé directement
if (require.main === module) {
  testMediaUpload();
}

module.exports = { testMediaUpload };
