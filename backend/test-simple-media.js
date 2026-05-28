const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSimpleMedia() {
  try {
    console.log('🧪 Test simple de création de média...\n');

    // 1. Trouver un utilisateur admin
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminUser) {
      console.log('❌ Aucun utilisateur admin trouvé');
      return;
    }

    console.log('✅ Utilisateur admin trouvé:', adminUser.email);

    // 2. Trouver une catégorie
    const category = await prisma.mediaCategory.findFirst();

    if (!category) {
      console.log('❌ Aucune catégorie trouvée');
      return;
    }

    console.log('✅ Catégorie trouvée:', category.displayName);

    // 3. Créer un média simple
    console.log('\n📝 Création du média...');
    
    const mediaData = {
      title: 'Test Simple Film',
      description: 'Description de test',
      type: 'film',
      language: 'Allemand',
      languageLevel: 'A1',
      categoryId: category.id,
      userId: adminUser.id,
      isActive: true
    };

    console.log('📊 Données à créer:', mediaData);

    const media = await prisma.media.create({
      data: mediaData,
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

    console.log('✅ Média créé avec succès:');
    console.log(`   - ID: ${media.id}`);
    console.log(`   - Titre: ${media.title}`);
    console.log(`   - Type: ${media.type}`);
    console.log(`   - Catégorie: ${media.category.displayName}`);
    console.log(`   - Créé par: ${media.createdBy.email}`);

    // 4. Nettoyer
    console.log('\n🧹 Nettoyage...');
    await prisma.media.delete({
      where: { id: media.id }
    });
    console.log('✅ Média supprimé');

    console.log('\n🎉 Test réussi !');

  } catch (error) {
    console.error('❌ Erreur:', error);
    
    if (error.code) {
      console.error('📋 Code d\'erreur:', error.code);
    }
    
    if (error.meta) {
      console.error('📋 Métadonnées:', error.meta);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testSimpleMedia();
