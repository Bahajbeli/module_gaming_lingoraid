// Test de la logique de numérotation des mots croisés
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Logique de numérotation côté client (reproduite pour test)
function computeStartNumbers(entries) {
  const starts = {}; // key: r,c -> number
  const positionMap = new Map();
  
  // Trier d'abord par numéro pour respecter l'ordre des indices
  const sortedEntries = [...entries].sort((a, b) => a.number - b.number);
  
  for (const e of sortedEntries) {
    const key = `${e.row},${e.col}`;
    
    // Si cette position n'a pas encore de numéro, lui assigner le numéro de cette entrée
    if (!positionMap.has(key)) {
      positionMap.set(key, e.number);
      starts[key] = e.number;
    }
    // Si cette position a déjà un numéro, garder le plus petit
    // (car c'est celui qui apparaît en premier dans les indices)
    else {
      const existingNumber = positionMap.get(key);
      if (e.number < existingNumber) {
        positionMap.set(key, e.number);
        starts[key] = e.number;
      }
    }
  }
  
  return starts;
}

async function testNumberingLogic() {
  console.log('🧪 Test de la logique de numérotation...\n');

  try {
    // Récupérer tous les mots croisés
    const crosswords = await prisma.crossword.findMany({
      include: { entries: true }
    });

    for (const cw of crosswords) {
      console.log(`\n🎯 Test pour "${cw.title}":`);
      
      // Trier les entrées par numéro pour l'affichage des indices
      const acrossEntries = cw.entries
        .filter(e => e.direction === 'across')
        .sort((a, b) => a.number - b.number);
      
      const downEntries = cw.entries
        .filter(e => e.direction === 'down')
        .sort((a, b) => a.number - b.number);
      
      console.log('  📋 Indices Across (triés par numéro):');
      acrossEntries.forEach(e => {
        console.log(`     ${e.number}. ${e.clue} - Position: [${e.row},${e.col}]`);
      });
      
      console.log('  📋 Indices Down (triés par numéro):');
      downEntries.forEach(e => {
        console.log(`     ${e.number}. ${e.clue} - Position: [${e.row},${e.col}]`);
      });
      
      // Calculer les numéros à afficher sur la grille
      const startNumbers = computeStartNumbers(cw.entries);
      
      console.log('  🎯 Numéros affichés sur la grille:');
      Object.entries(startNumbers).forEach(([pos, num]) => {
        console.log(`     Position ${pos} -> Numéro ${num}`);
      });
      
      // Vérifier la cohérence
      console.log('  ✅ Vérification de la cohérence:');
      let isConsistent = true;
      
      for (const e of cw.entries) {
        const key = `${e.row},${e.col}`;
        const displayedNumber = startNumbers[key];
        
        if (displayedNumber !== e.number) {
          console.log(`     ❌ Incohérence: ${e.direction} "${e.clue}" a le numéro ${e.number} dans l'indice mais ${displayedNumber} sur la grille`);
          isConsistent = false;
        } else {
          console.log(`     ✅ Cohérent: ${e.direction} "${e.clue}" - Numéro ${e.number} partout`);
        }
      }
      
      if (isConsistent) {
        console.log('  🎉 Numérotation cohérente !');
      } else {
        console.log('  ⚠️ Incohérences détectées !');
      }
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le test
testNumberingLogic().catch(console.error);
