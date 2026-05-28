const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { tryAutoLayout, normalizeEntryNumbers } = require('../services/crosswordLayoutService');

const prisma = new PrismaClient();

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function seedCrosswords(userId) {
  console.log('--- Seeding 1000 Crosswords ---');
  const filePath = path.join(__dirname, '../files/crosswords.json');
  if (!fs.existsSync(filePath)) {
    console.error('crosswords.json not found!');
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const dictionary = data.words || [];

  if (dictionary.length < 10) {
    console.error('Not enough words in dictionary!');
    return;
  }

  let createdCount = 0;
  let attempt = 0;

  // We want to create 1000 crosswords. We'll limit total attempts to 10000 to avoid infinite loops.
  while (createdCount < 1000 && attempt < 10000) {
    attempt++;
    
    // Pick 8-12 words randomly
    const numWords = Math.floor(Math.random() * 5) + 8;
    const selectedWords = shuffle(dictionary).slice(0, numWords);
    
    // Try to build a 10x10 layout (mobile friendly)
    let layout;
    try {
      layout = tryAutoLayout(10, 10, selectedWords);
    } catch (e) {
      continue;
    }

    if (!layout || layout.length === 0) continue;

    const normalized = normalizeEntryNumbers(layout);
    
    // Validate that we have at least 5 words placed
    if (normalized.length < 5) continue;

    // Create the crossword
    await prisma.crossword.create({
      data: {
        title: `Mots Croisés #${createdCount + 1}`,
        description: `Une grille compacte de taille 10x10 idéale pour mobile.`,
        width: 10,
        height: 10,
        isPublished: true,
        userId: userId,
        entries: {
          create: normalized.map(e => ({
            row: e.row,
            col: e.col,
            direction: e.direction,
            clue: e.clue,
            answer: (e.answer || '').toUpperCase().replace(/[^A-ZÄÖÜẞßÉÈÊËÎÏÔÖÛÜÀÂÇ]/g, ''),
            number: e.number,
          }))
        }
      }
    });

    createdCount++;
    if (createdCount % 100 === 0) {
      console.log(`...Created ${createdCount}/1000 crosswords`);
    }
  }

  console.log(`Finished creating ${createdCount} crosswords.`);
}

async function seedCreativity(userId) {
  console.log('--- Seeding 500 Creativity Games ---');
  const filePath = path.join(__dirname, '../files/creativité/game_levels_500.json');
  if (!fs.existsSync(filePath)) {
    console.error('game_levels_500.json not found!');
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const levels = data.levels || [];

  let category = await prisma.mediaCategory.findFirst({ where: { name: 'creativity' } });
  if (!category) {
    category = await prisma.mediaCategory.create({
      data: { name: 'creativity', displayName: 'Créativité' }
    });
  }

  let createdCount = 0;
  for (const level of levels) {
    const config = {
      image: '', 
      points: level.pairs || []
    };

    await prisma.media.create({
      data: {
        title: `${level.stage} - ${level.category_label}`,
        description: `Niveau ${level.difficulty} (${level.items_count} paires)`,
        type: 'creativity',
        language: 'Allemand',
        imageUrl: '',
        streamingUrl: JSON.stringify(config),
        isActive: true,
        userId: userId,
        categoryId: category.id
      }
    });
    createdCount++;
    if (createdCount % 100 === 0) {
      console.log(`...Created ${createdCount}/500 creativity games`);
    }
  }

  console.log(`Finished creating ${createdCount} creativity games.`);
}

async function seedSimulations(userId) {
  console.log('--- Seeding 50 Simulation Games ---');
  
  const simulationThemes = [
    "Commander au restaurant", "Acheter un billet de train", "Entretien d'embauche",
    "Chez le médecin", "Demander son chemin", "Réserver un hôtel", "Faire les courses",
    "Louer une voiture", "Acheter des vêtements", "Ouvrir un compte bancaire",
    "Déclarer un vol à la police", "Prendre rendez-vous chez le coiffeur",
    "Parler de la météo", "Se présenter à une soirée", "Organiser une fête",
    "Discuter de ses loisirs", "Acheter un billet d'avion", "Passer la douane",
    "Louer un appartement", "S'inscrire à la salle de sport", "Demander des conseils touristiques",
    "Au bureau de poste", "Acheter des médicaments à la pharmacie", "Parler avec un nouveau voisin",
    "Appeler un taxi", "A la boulangerie", "Visiter un musée", "Discuter d'un film",
    "Organiser une réunion de travail", "Prendre un café avec un collègue", "Demander de l'aide technique",
    "A la bibliothèque", "S'inscrire à un cours de langue", "Proposer une sortie",
    "S'excuser pour un retard", "Parler de ses dernières vacances", "Acheter un cadeau",
    "Se renseigner sur un produit", "Demander un menu végétarien", "Commander une pizza par téléphone",
    "A la gare routière", "Discuter de l'actualité", "Décrire sa famille",
    "Parler de ses études", "Négocier un prix au marché", "Demander un remboursement",
    "Acheter une carte SIM", "Trouver un objet perdu", "Féliciter quelqu'un", "Discuter de sport"
  ];

  let createdCount = 0;
  for (const theme of simulationThemes) {
    await prisma.game.create({
      data: {
        type: 'simulation',
        mode: 'solo',
        title: `Simulation: ${theme}`,
        description: `Pratiquez votre oral avec ce scénario de la vie quotidienne.`,
        difficulty: 'medium',
        isActive: true,
        status: 'unlocked',
        userId: userId,
        metadata: JSON.stringify({
          theme: theme,
          image: '',
          imagePath: ''
        })
      }
    });
    createdCount++;
  }
  
  console.log(`Finished creating ${createdCount} simulation games.`);
}

async function main() {
  console.log('Starting seed process...');
  
  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    admin = await prisma.user.findFirst();
  }
  
  if (!admin) {
    console.error('No users found in database. Cannot create games without an owner.');
    process.exit(1);
  }

  const userId = admin.id;

  await seedCrosswords(userId);
  await seedCreativity(userId);
  await seedSimulations(userId);

  console.log('Seed process completed successfully!');
}

main()
  .catch(e => {
    console.error('Fatal error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
