// Structure de données pour les cours avec gamification
export const courseStructure = {
  A1: {
    id: 'A1',
    title: 'Allemand A1',
    description: 'Level débutant - Bases de l\'allemand',
    totalLessons: 20,
    chapters: [
      {
        id: 'A1-1',
        title: 'L\'Alphabet',
        description: 'Apprenez l\'alphabet allemand',
        lessons: [
          {
            id: 'A1-1-1',
            title: 'Les lettres A-M',
            type: 'lesson',
            content: {
              text: 'Apprenez les premières lettres de l\'alphabet allemand...',
              video: '/uploads/alphabet-a-m.mp4',
              duration: 5
            },
            points: 10,
            nextStep: {
              type: 'quiz',
              questions: [
                {
                  id: 'q1',
                  question: 'Quelle est la première lettre de l\'alphabet allemand?',
                  options: ['A', 'B', 'C', 'D'],
                  correct: 0,
                  points: 5
                }
              ]
            }
          },
          {
            id: 'A1-1-2',
            title: 'Les lettres N-Z',
            type: 'lesson',
            content: {
              text: 'Apprenez les dernières lettres de l\'alphabet allemand...',
              video: '/uploads/alphabet-n-z.mp4',
              duration: 5
            },
            points: 10,
            nextStep: {
              type: 'drag-drop',
              exercise: {
                title: 'Associez les lettres',
                items: ['A', 'B', 'C', 'D'],
                targets: ['A', 'B', 'C', 'D'],
                points: 15
              }
            }
          }
        ],
        badge: {
          id: 'alphabet-master',
          name: 'Maître de l\'Alphabet',
          description: 'Vous connaissez parfaitement l\'alphabet allemand!',
          icon: '🔤',
          points: 50
        }
      },
      {
        id: 'A1-2',
        title: 'Les Salutations',
        description: 'Apprenez à saluer en allemand',
        lessons: [
          {
            id: 'A1-2-1',
            title: 'Bonjour et Au revoir',
            type: 'lesson',
            content: {
              text: 'Apprenez les salutations de base...',
              video: '/uploads/salutations.mp4',
              duration: 7
            },
            points: 10,
            nextStep: {
              type: 'matching',
              exercise: {
                title: 'Associez les salutations',
                pairs: [
                  { german: 'Guten Tag', french: 'Bonjour' },
                  { german: 'Auf Wiedersehen', french: 'Au revoir' }
                ],
                points: 20
              }
            }
          }
        ],
        badge: {
          id: 'greeting-expert',
          name: 'Expert en Salutations',
          description: 'Vous savez saluer comme un vrai Allemand!',
          icon: '👋',
          points: 50
        }
      }
    ]
  }
};

// Types d'exercices disponibles
export const exerciseTypes = {
  quiz: {
    name: 'Quiz',
    icon: '❓',
    description: 'Répondez aux questions'
  },
  'drag-drop': {
    name: 'Glisser-Déposer',
    icon: '🎯',
    description: 'Glissez les éléments aux bons endroits'
  },
  matching: {
    name: 'Association',
    icon: '🔗',
    description: 'Associez les éléments correspondants'
  },
  fill: {
    name: 'Complétion',
    icon: '✏️',
    description: 'Complétez les phrases'
  },
  pronunciation: {
    name: 'Prononciation',
    icon: '🎤',
    description: 'Prononcez les mots'
  }
};

// Système de badges
export const badgeSystem = {
  streaks: {
    '3-day-streak': { name: 'Débutant', icon: '🔥', description: '3 days consécutifs' },
    '7-day-streak': { name: 'Régulier', icon: '🔥🔥', description: '7 days consécutifs' },
    '30-day-streak': { name: 'Déterminé', icon: '🔥🔥🔥', description: '30 days consécutifs' }
  },
  achievements: {
    'first-lesson': { name: 'Premier Pas', icon: '👶', description: 'Première leçon terminée' },
    'perfect-score': { name: 'Parfait', icon: '💯', description: 'Score parfait à un quiz' },
    'speed-demon': { name: 'Rapide', icon: '⚡', description: 'Terminé un exercice en moins de 30s' }
  }
};

