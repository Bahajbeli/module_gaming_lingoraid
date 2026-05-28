// Créer un cours sur "Begrüßen" (saluer en allemand)
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function ensureAdmin() {
  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    admin = await prisma.user.findFirst();
  }
  if (!admin) throw new Error('Aucun utilisateur trouvé pour créer le cours.');
  return admin.id;
}

async function main() {
  const userId = await ensureAdmin();

  const courseData = {
    title: 'Begrüßen - Les Salutations en Allemand',
    description: 'Apprenez les différentes façons de saluer en allemand selon le contexte et l\'heure de la journée.',
    content: `
# Begrüßen - Les Salutations en Allemand

## Objectifs d'apprentissage
- Connaître les différentes salutations selon le moment de la journée
- Comprendre les nuances entre formel et informel
- Maîtriser les réponses appropriées

## 1. Salutations selon l'heure

### Le matin (Morgen)
- **Guten Morgen** - Bonjour (jusqu'à 10h)
- **Morgen** - Salut (informel)

### L'après-midi (Mittag)
- **Guten Tag** - Bonjour (10h-18h)
- **Tag** - Salut (informel)

### Le soir (Abend)
- **Guten Abend** - Bonsoir (après 18h)
- **Abend** - Salut (informel)

## 2. Salutations informelles
- **Hallo** - Salut/Bonjour (universel)
- **Hi** - Salut (très informel)
- **Hey** - Hé (très familier)

## 3. Salutations formelles
- **Guten Tag** - Bonjour (formel)
- **Grüß Gott** - Bonjour (Bavière/Autriche)
- **Grüß Sie** - Bonjour (très formel)

## 4. Réponses courantes
- **Guten Morgen** → **Guten Morgen**
- **Guten Tag** → **Guten Tag**
- **Guten Abend** → **Guten Abend**
- **Hallo** → **Hallo**

## 5. Expressions supplémentaires
- **Wie geht es Ihnen?** - Comment allez-vous ? (formel)
- **Wie geht's?** - Comment ça va ? (informel)
- **Mir geht es gut** - Je vais bien
- **Danke, gut** - Merci, bien

## Exercices pratiques
1. Saluez quelqu'un le matin (formel et informel)
2. Répondez à "Guten Tag"
3. Demandez comment va quelqu'un
4. Présentez-vous après avoir salué

## Points culturels
- En Allemagne, on serre la main en se saluant
- Le contact visuel est important
- Les salutations sont essentielles dans la culture allemande
    `,
    level: 'A1',
    order: '1',
    videoUrl: null,
    imagePath: null,
    pdfPath: null
  };

  // Vérifier si le cours existe déjà
  const existing = await prisma.course.findFirst({ 
    where: { title: courseData.title } 
  });
  
  if (existing) {
    console.log('✅ Le cours "Begrüßen" existe déjà:', existing.id);
    return;
  }

  const course = await prisma.course.create({
    data: {
      ...courseData,
      userId
    }
  });

  console.log('✅ Cours "Begrüßen" créé avec succès!');
  console.log('📋 ID du cours:', course.id);
  console.log('📚 Titre:', course.title);
  console.log('🎯 Niveau:', course.level);
}

main()
  .catch((e) => { 
    console.error('❌ Erreur création cours:', e); 
    process.exit(1); 
  })
  .finally(async () => { 
    await prisma.$disconnect(); 
  });
