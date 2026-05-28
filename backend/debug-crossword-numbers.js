// Script de débogage pour analyser la numérotation des mots croisés
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugCrosswordNumbers() {
  console.log('🔍 Débogage de la numérotation des mots croisés...\n');

  try {
    // Récupérer tous les mots croisés
    const crosswords = await prisma.crossword.findMany({
      include: { entries: true }
    });

    console.log(`📊 ${crosswords.length} mots croisés trouvés`);

    for (const cw of crosswords) {
      console.log(`\n🎯 Mots croisés: "${cw.title}" (ID: ${cw.id})`);
      console.log(`   Dimensions: ${cw.width}x${cw.height}`);
      console.log(`   Entrées: ${cw.entries.length}`);

      // Trier les entrées par numéro
      const sortedByNumber = [...cw.entries].sort((a, b) => a.number - b.number);
      
      console.log('\n   📋 Entrées triées par numéro:');
      sortedByNumber.forEach(entry => {
        console.log(`      ${entry.number}. ${entry.direction.toUpperCase()}: "${entry.answer}" (${entry.clue}) - Position: [${entry.row},${entry.col}]`);
      });

      // Trier les entrées par position (ligne, colonne)
      const sortedByPosition = [...cw.entries].sort((a, b) => {
        if (a.row !== b.row) return a.row - b.row;
        return a.col - b.col;
      });

      console.log('\n   📍 Entrées triées par position:');
      sortedByPosition.forEach(entry => {
        console.log(`      [${entry.row},${entry.col}] ${entry.direction.toUpperCase()}: "${entry.answer}" (${entry.clue}) - Numéro actuel: ${entry.number}`);
      });

      // Analyser les incohérences
      console.log('\n   ⚠️ Analyse des incohérences:');
      
      // Créer un map des positions avec leurs numéros
      const positionMap = new Map();
      let expectedNumber = 1;
      
      for (const entry of sortedByPosition) {
        const key = `${entry.row},${entry.col}`;
        
        if (!positionMap.has(key)) {
          positionMap.set(key, expectedNumber++);
        }
        
        const expected = positionMap.get(key);
        if (entry.number !== expected) {
          console.log(`      ❌ Incohérence: Position [${entry.row},${entry.col}] a le numéro ${entry.number} mais devrait avoir ${expected}`);
        } else {
          console.log(`      ✅ Cohérent: Position [${entry.row},${entry.col}] a le bon numéro ${entry.number}`);
        }
      }

      // Vérifier les doublons de numéros
      const numberCounts = {};
      cw.entries.forEach(entry => {
        numberCounts[entry.number] = (numberCounts[entry.number] || 0) + 1;
      });

      console.log('\n   🔢 Comptage des numéros:');
      Object.entries(numberCounts).forEach(([number, count]) => {
        if (count > 1) {
          console.log(`      ⚠️ Numéro ${number} apparaît ${count} fois`);
        } else {
          console.log(`      ✅ Numéro ${number} apparaît 1 fois`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Erreur lors du débogage:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le débogage
debugCrosswordNumbers().catch(console.error);
