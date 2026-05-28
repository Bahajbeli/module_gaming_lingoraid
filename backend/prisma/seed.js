const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding...');

  // Créer l'utilisateur admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@deutsche-lernen.com' },
    update: {},
    create: {
      email: 'admin@deutsche-lernen.com',
      passwordHash: adminPassword,
      role: 'ADMIN'
    }
  });

  // Créer l'utilisateur normal
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@deutsche-lernen.com' },
    update: {},
    create: {
      email: 'user@deutsche-lernen.com',
      passwordHash: userPassword,
      role: 'USER'
    }
  });

  // Créer les catégories de médias
  const mediaCategories = await Promise.all([
    prisma.mediaCategory.upsert({
      where: { name: 'series' },
      update: {},
      create: {
        name: 'series',
        displayName: 'Séries TV',
        description: 'Découvrez les meilleures séries allemandes',
        icon: '📺',
        color: 'from-purple-500 to-purple-600'
      }
    }),
    prisma.mediaCategory.upsert({
      where: { name: 'podcasts' },
      update: {},
      create: {
        name: 'podcasts',
        displayName: 'Podcasts',
        description: 'Podcasts pour améliorer votre allemand',
        icon: '🎧',
        color: 'from-blue-500 to-blue-600'
      }
    }),
    prisma.mediaCategory.upsert({
      where: { name: 'films' },
      update: {},
      create: {
        name: 'films',
        displayName: 'Films',
        description: 'Films allemands pour tous les niveaux',
        icon: '🎬',
        color: 'from-green-500 to-green-600'
      }
    })
  ]);

  // Créer des exemples de médias
  const seriesCategory = mediaCategories[0];
  const podcastsCategory = mediaCategories[1];
  const filmsCategory = mediaCategories[2];

  await Promise.all([
    prisma.media.upsert({
      where: { id: 'media-1' },
      update: {},
      create: {
        id: 'media-1',
        title: 'Dark',
        description: 'Une série de science-fiction mystérieuse qui se déroule dans une petite ville allemande',
        type: 'series',
        language: 'Allemand',
        subtitles: 'Français, Anglais',
        duration: '3 saisons',
        rating: 4.8,
        viewers: '2.5M',
        imageUrl: 'https://via.placeholder.com/300x200/6366f1/ffffff?text=Dark',
        streamingUrl: 'https://www.netflix.com/title/80100172',
        categoryId: seriesCategory.id,
        userId: admin.id
      }
    }),
    prisma.media.upsert({
      where: { id: 'media-2' },
      update: {},
      create: {
        id: 'media-2',
        title: 'Deutsche Welle Podcast',
        description: 'Podcast quotidien pour apprendre l\'allemand',
        type: 'podcast',
        language: 'Allemand',
        subtitles: 'Français',
        duration: '15-20 min',
        rating: 4.5,
        viewers: '500K',
        imageUrl: 'https://via.placeholder.com/300x200/3b82f6/ffffff?text=DW+Podcast',
        streamingUrl: 'https://www.dw.com/de/deutsch-lernen',
        categoryId: podcastsCategory.id,
        userId: admin.id
      }
    }),
    prisma.media.upsert({
      where: { id: 'media-3' },
      update: {},
      create: {
        id: 'media-3',
        title: 'Das Leben der Anderen',
        description: 'Film dramatique sur la surveillance en RDA',
        type: 'film',
        language: 'Allemand',
        subtitles: 'Français, Anglais',
        duration: '2h 17min',
        rating: 4.7,
        viewers: '1.2M',
        imageUrl: 'https://via.placeholder.com/300x200/10b981/ffffff?text=Das+Leben',
        streamingUrl: 'https://www.imdb.com/title/tt0405094/',
        categoryId: filmsCategory.id,
        userId: admin.id
      }
    })
  ]);

  // Créer les cours
  const courses = await Promise.all([
    prisma.course.upsert({
      where: { id: 'course-a1-1' },
      update: {},
      create: {
        id: 'course-a1-1',
        title: 'Grundlagen der deutschen Grammatik - A1',
        description: 'Apprenez les bases de la grammaire allemande - Niveau débutant',
        content: `
          <h2>Les articles en allemand - Niveau A1</h2>
          <p>En allemand, il y a trois genres : masculin (der), féminin (die) et neutre (das).</p>
          <h3>Exemples :</h3>
          <ul>
            <li>der Mann (l'homme) - masculin</li>
            <li>die Frau (la femme) - féminin</li>
            <li>das Kind (l'enfant) - neutre</li>
          </ul>
          <p>Les articles changent selon le cas grammatical (nominatif, accusatif, datif, génitif).</p>
        `,
        level: 'A1',
        order: '1',
        imagePath: '/uploads/grammar-basics.jpg',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        userId: admin.id
      }
    }),
    prisma.course.upsert({
      where: { id: 'course-a1-2' },
      update: {},
      create: {
        id: 'course-a1-2',
        title: 'Deutsche Aussprache - A1',
        description: 'Maîtrisez la prononciation allemande - Niveau débutant',
        content: `
          <h2>La prononciation allemande - Niveau A1</h2>
          <p>L'allemand a des sons spécifiques qui n'existent pas en français.</p>
          <h3>Sons importants :</h3>
          <ul>
            <li>ä - comme "é" en français</li>
            <li>ö - comme "eu" en français</li>
            <li>ü - comme "u" mais avec les lèvres arrondies</li>
            <li>ß - comme "ss" en français</li>
          </ul>
          <p>Pratiquez ces sons avec des mots courants comme "Mädchen", "schön", "grün".</p>
        `,
        level: 'A1',
        order: '2',
        imagePath: '/uploads/pronunciation.jpg',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        userId: admin.id
      }
    }),
    prisma.course.upsert({
      where: { id: 'course-a2-1' },
      update: {},
      create: {
        id: 'course-a2-1',
        title: 'Alltagssprache - A2',
        description: 'Expressions quotidiennes en allemand - Niveau intermédiaire',
        content: `
          <h2>Expressions de la vie quotidienne - Niveau A2</h2>
          <p>Voici des expressions utiles pour la vie de tous les jours.</p>
          <h3>Salutations :</h3>
          <ul>
            <li>Guten Morgen - Bonjour (matin)</li>
            <li>Guten Tag - Bonjour (journée)</li>
            <li>Guten Abend - Bonsoir</li>
            <li>Auf Wiedersehen - Au revoir</li>
          </ul>
          <h3>Questions courantes :</h3>
          <ul>
            <li>Wie geht es dir? - Comment ça va ?</li>
            <li>Wo wohnst du? - Où habites-tu ?</li>
            <li>Was machst du? - Que fais-tu ?</li>
          </ul>
        `,
        level: 'A2',
        order: '1',
        imagePath: '/uploads/everyday-language.jpg',
        userId: admin.id
      }
    })
  ]);

  // Créer les jeux avec les nouvelles propriétés
  const gameTypes = ['quiz', 'mots-croises', 'creativite', 'simulation'];
  const gameModes = ['online', 'solo'];
  const gameTitles = {
    'quiz': 'Quiz de vocabulaire',
    'mots-croises': 'Mots croisés allemands',
    'creativite': 'Exercices créatifs',
    'simulation': 'Simulations de conversation'
  };

  for (const type of gameTypes) {
    for (const mode of gameModes) {
      await prisma.game.upsert({
        where: {
          id: (await prisma.game.findFirst({
            where: {
              userId: user.id,
              type: type,
              mode: mode
            }
          }))?.id || `game-${type}-${mode}-${user.id}`
        },
        update: {},
        create: {
          type: type,
          mode: mode,
          title: gameTitles[type],
          description: `Jeu ${type} en mode ${mode} pour améliorer votre allemand`,
          difficulty: 'medium',
          isActive: true,
          status: 'unlocked',
          userId: user.id
        }
      });
    }
  }

  // Créer la progression pour le premier cours
  await prisma.progress.upsert({
    where: {
      userId_courseId: {
        userId: user.id,
        courseId: 'course-a1-1'
      }
    },
    update: {},
    create: {
      userId: user.id,
      courseId: 'course-a1-1',
      status: 'completed',
      completedAt: new Date()
    }
  });

  console.log('✅ Seeding terminé avec succès !');
  console.log(`👤 Admin créé: ${admin.email}`);
  console.log(`👤 Utilisateur créé: ${user.email}`);
  console.log(`📚 Cours créés: ${courses.length}`);
  console.log(`🎮 Jeux créés: ${gameTypes.length * gameModes.length}`);
  console.log(`📺 Catégories de médias créées: ${mediaCategories.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
