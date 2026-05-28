// Script pour corriger la numérotation des mots croisés existants
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixCrosswordNumbering() {
  console.log('🔧 Correction de la numérotation des mots croisés...\n');

  try {
    // Récupérer tous les mots croisés
    const crosswords = await prisma.crossword.findMany({
      include: { entries: true }
    });

    console.log(`📊 ${crosswords.length} mots croisés trouvés`);

    for (const cw of crosswords) {
      console.log(`\n🎯 Traitement de "${cw.title}" (ID: ${cw.id})`);
      console.log(`   Entrées: ${cw.entries.length}`);

      // Créer un map des positions avec leurs numéros
      const positionMap = new Map();
      let number = 1;

      // Trier les entrées par position (ligne, colonne)
      const sortedEntries = cw.entries.sort((a, b) => {
        if (a.row !== b.row) return a.row - b.row;
        return a.col - b.col;
      });

      console.log('   📍 Positions des entrées:');
      sortedEntries.forEach(entry => {
        console.log(`      ${entry.direction.toUpperCase()}: [${entry.row},${entry.col}] - "${entry.answer}" (${entry.clue})`);
      });

      // Assigner les numéros en tenant compte des positions partagées
      for (const entry of sortedEntries) {
        const key = `${entry.row},${entry.col}`;
        
        if (!positionMap.has(key)) {
          positionMap.set(key, number++);
        }
        
        const newNumber = positionMap.get(key);
        
        if (entry.number !== newNumber) {
          console.log(`      🔄 Correction: ${entry.number} → ${newNumber} pour [${entry.row},${entry.col}]`);
          
          // Mettre à jour l'entrée avec le bon numéro
          await prisma.crosswordEntry.update({
            where: { id: entry.id },
            data: { number: newNumber }
          });
        } else {
          console.log(`      ✅ Numéro correct: ${entry.number} pour [${entry.row},${entry.col}]`);
        }
      }

      console.log(`   ✨ Numérotation corrigée pour "${cw.title}"`);
    }

    console.log('\n🎉 Tous les mots croisés ont été corrigés !');

  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la correction
fixCrosswordNumbering().catch(console.error);
