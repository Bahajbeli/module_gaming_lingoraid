const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateSimulations() {
  try {
    console.log('🔄 Mise à jour des simulations existantes...');
    
    // Récupérer toutes les simulations sans métadonnées
    const simulations = await prisma.game.findMany({
      where: {
        type: 'simulation',
        metadata: null
      }
    });
    
    console.log(`📊 ${simulations.length} simulations trouvées sans métadonnées`);
    
    for (const simulation of simulations) {
      const defaultMetadata = {
        image: 'default-simulation.jpg',
        theme: 'Conversation générale en allemand',
        imagePath: '/uploads/default-simulation.jpg'
      };
      
      await prisma.game.update({
        where: { id: simulation.id },
        data: {
          metadata: JSON.stringify(defaultMetadata)
        }
      });
      
      console.log(`✅ Simulation ${simulation.id} mise à jour`);
    }
    
    console.log('🎉 Toutes les simulations ont été mises à jour !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateSimulations();
