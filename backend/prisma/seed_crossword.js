const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    // Find an admin user to attribute the crossword to
    let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) {
      // fallback to any user
      admin = await prisma.user.findFirst();
    }
    if (!admin) {
      console.error('No user found to own the crossword. Create a user first.');
      process.exit(1);
    }

    const title = 'Démo Mots Croisés';

    // Avoid duplicates by title
    const existing = await prisma.crossword.findFirst({ where: { title } });
    if (existing) {
      await prisma.crossword.update({
        where: { id: existing.id },
        data: { isPublished: true }
      });
      console.log('Crossword already exists; marked as published.');
      process.exit(0);
    }

    const crossword = await prisma.crossword.create({
      data: {
        title,
        description: 'Vocabulaire de base',
        width: 10,
        height: 10,
        isPublished: true,
        userId: admin.id,
        entries: {
          create: [
            { row: 0, col: 0, direction: 'across', number: 1, clue: 'Jeu (activité)', answer: 'SPIEL' },
            { row: 0, col: 0, direction: 'down',   number: 1, clue: 'Chapeau',        answer: 'HUT' },
            { row: 2, col: 2, direction: 'across', number: 2, clue: 'Pluie',         answer: 'REGEN' },
            { row: 4, col: 1, direction: 'down',   number: 3, clue: 'Porte',         answer: 'TUR' }
          ]
        }
      }
    });

    console.log('Demo crossword created:', crossword.id);
    process.exit(0);
  } catch (e) {
    console.error('Seed crossword error:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
