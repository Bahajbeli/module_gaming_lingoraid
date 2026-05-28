const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireUser } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/progress - Récupérer la progression globale de l'utilisateur
router.get('/', authenticateToken, requireUser, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Récupérer tous les cours avec la progression de l'utilisateur
    const coursesWithProgress = await prisma.course.findMany({
      include: {
        progress: {
          where: { userId: userId }
        }
      },
      orderBy: [
        { level: 'asc' },
        { order: 'asc' }
      ]
    });

    // Calculer les statistiques globales
    const totalCourses = coursesWithProgress.length;
    const completedCourses = coursesWithProgress.filter(c => 
      c.progress[0]?.status === 'completed'
    ).length;
    
    const inProgressCourses = coursesWithProgress.filter(c => 
      c.progress[0]?.status === 'in-progress'
    ).length;

    // Organiser par niveau
    const levels = ['A1', 'A2', 'B1', 'B2'];
    const progressByLevel = {};
    
    levels.forEach(level => {
      const levelCourses = coursesWithProgress.filter(c => c.level === level);
      const levelCompleted = levelCourses.filter(c => 
        c.progress[0]?.status === 'completed'
      ).length;
      
      progressByLevel[level] = {
        total: levelCourses.length,
        completed: levelCompleted,
        inProgress: levelCourses.filter(c => 
          c.progress[0]?.status === 'in-progress'
        ).length,
        completionRate: Math.round((levelCompleted / levelCourses.length) * 100)
      };
    });

    const globalProgress = {
      total: totalCourses,
      completed: completedCourses,
      inProgress: inProgressCourses,
      completionRate: Math.round((completedCourses / totalCourses) * 100),
      byLevel: progressByLevel
    };

    res.json(globalProgress);
  } catch (error) {
    console.error('Erreur lors de la récupération de la progression:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/progress/courses - Récupérer la progression détaillée des cours
router.get('/courses', authenticateToken, requireUser, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const progress = await prisma.progress.findMany({
      where: { userId: userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            level: true,
            order: true,
            description: true
          }
        }
      },
      orderBy: [
        { course: { level: 'asc' } },
        { course: { order: 'asc' } }
      ]
    });

    res.json(progress);
  } catch (error) {
    console.error('Erreur lors de la récupération de la progression des cours:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/progress/courses/:courseId/start - Commencer un cours
router.post('/courses/:courseId/start', authenticateToken, requireUser, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // Vérifier si l'utilisateur peut accéder à ce cours
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return res.status(404).json({ error: 'Cours non trouvé' });
    }

    // Vérifier si le cours précédent est terminé (order est stocké en string)
    const currentOrder = parseInt(course.order, 10) || 0;
    if (currentOrder > 1) {
      const previousCourse = await prisma.course.findFirst({
        where: {
          level: course.level,
          order: String(currentOrder - 1)
        }
      });

      if (previousCourse) {
        const previousProgress = await prisma.progress.findUnique({
          where: {
            userId_courseId: {
              userId: userId,
              courseId: previousCourse.id
            }
          }
        });

        if (!previousProgress || previousProgress.status !== 'completed') {
          return res.status(403).json({ 
            error: 'Cours verrouillé',
            message: 'Vous devez terminer le cours précédent pour commencer celui-ci'
          });
        }
      }
    }

    // Créer ou mettre à jour la progression
    const progress = await prisma.progress.upsert({
      where: {
        userId_courseId: {
          userId: userId,
          courseId: courseId
        }
      },
      update: {
        status: 'in-progress'
      },
      create: {
        userId: userId,
        courseId: courseId,
        status: 'in-progress'
      }
    });

    res.json({ 
      message: 'Cours commencé',
      progress 
    });
  } catch (error) {
    console.error('Erreur lors du démarrage du cours:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/progress/courses/:courseId/restart - Reprendre un cours terminé
router.post('/courses/:courseId/restart', authenticateToken, requireUser, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // Vérifier si l'utilisateur peut accéder à ce cours
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return res.status(404).json({ error: 'Cours non trouvé' });
    }

    // Vérifier si le cours précédent est terminé (order est stocké en string)
    const currentOrderRestart = parseInt(course.order, 10) || 0;
    if (currentOrderRestart > 1) {
      const previousCourse = await prisma.course.findFirst({
        where: {
          level: course.level,
          order: String(currentOrderRestart - 1)
        }
      });

      if (previousCourse) {
        const previousProgress = await prisma.progress.findUnique({
          where: {
            userId_courseId: {
              userId: userId,
              courseId: previousCourse.id
            }
          }
        });

        if (!previousProgress || previousProgress.status !== 'completed') {
          return res.status(403).json({ 
            error: 'Cours verrouillé',
            message: 'Vous devez terminer le cours précédent pour reprendre celui-ci'
          });
        }
      }
    }

    // Remettre le cours en cours
    const progress = await prisma.progress.upsert({
      where: {
        userId_courseId: {
          userId: userId,
          courseId: courseId
        }
      },
      update: {
        status: 'in-progress',
        completedAt: null // Réinitialiser la date de completion
      },
      create: {
        userId: userId,
        courseId: courseId,
        status: 'in-progress'
      }
    });

    res.json({ 
      message: 'Cours repris',
      progress 
    });
  } catch (error) {
    console.error('Erreur lors de la reprise du cours:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/progress/courses/:courseId/complete - Terminer un cours
router.post('/courses/:courseId/complete', authenticateToken, requireUser, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // Vérifier si l'utilisateur peut accéder à ce cours
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return res.status(404).json({ error: 'Cours non trouvé' });
    }

    // Vérifier si le cours précédent est terminé (order est stocké en string)
    const currentOrderComplete = parseInt(course.order, 10) || 0;
    if (currentOrderComplete > 1) {
      const previousCourse = await prisma.course.findFirst({
        where: {
          level: course.level,
          order: String(currentOrderComplete - 1)
        }
      });

      if (previousCourse) {
        const previousProgress = await prisma.progress.findUnique({
          where: {
            userId_courseId: {
              userId: userId,
              courseId: previousCourse.id
            }
          }
        });

        if (!previousProgress || previousProgress.status !== 'completed') {
          return res.status(403).json({ 
            error: 'Cours verrouillé',
            message: 'Vous devez terminer le cours précédent pour terminer celui-ci'
          });
        }
      }
    }

    // Marquer le cours comme terminé
    const progress = await prisma.progress.upsert({
      where: {
        userId_courseId: {
          userId: userId,
          courseId: courseId
        }
      },
      update: {
        status: 'completed',
        completedAt: new Date()
      },
      create: {
        userId: userId,
        courseId: courseId,
        status: 'completed',
        completedAt: new Date()
      }
    });

    res.json({ 
      message: 'Cours terminé',
      progress 
    });
  } catch (error) {
    console.error('Erreur lors de la finalisation du cours:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;
