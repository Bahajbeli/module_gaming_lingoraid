const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin, requireUser } = require('../middleware/auth');
const { validateCourse, validateCourseUpdate } = require('../middleware/validation');
const { uploadFiles } = require('../middleware/upload');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/courses - Récupérer tous les cours (accessible aux utilisateurs connectés)
router.get('/', authenticateToken, requireUser, async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        createdBy: {
          select: {
            email: true,
            role: true
          }
        }
      },
      orderBy: [
        { level: 'asc' },
        { order: 'asc' }
      ]
    });

    res.json(courses);
  } catch (error) {
    console.error('Erreur lors de la récupération des cours:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/courses/levels - Récupérer les cours organisés par niveau
router.get('/levels', authenticateToken, requireUser, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Récupérer tous les cours organisés par niveau
    const coursesByLevel = await prisma.course.findMany({
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

    // Organiser les cours par niveau
    const levels = ['A1', 'A2', 'B1', 'B2'];
    const organizedCourses = {};
    
    levels.forEach(level => {
      organizedCourses[level] = coursesByLevel
        .filter(course => course.level === level)
        .map(course => ({
          ...course,
          userProgress: course.progress[0] || null,
          isUnlocked: isCourseUnlocked(course, coursesByLevel, userId)
        }));
    });

    res.json(organizedCourses);
  } catch (error) {
    console.error('Erreur lors de la récupération des cours par niveau:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/courses/:id - Récupérer un cours spécifique
router.get('/:id', authenticateToken, requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            email: true,
            role: true
          }
        }
      }
    });

    if (!course) {
      return res.status(404).json({ error: 'Cours non trouvé' });
    }

    // Les admins peuvent accéder sans restriction (édition)
    if (req.user.role !== 'ADMIN') {
      // Vérifier si l'utilisateur peut accéder à ce cours
      const canAccess = await checkCourseAccess(course.id, userId);
      if (!canAccess) {
        return res.status(403).json({ 
          error: 'Cours verrouillé', 
          message: 'Vous devez terminer le cours précédent pour accéder à celui-ci' 
        });
      }
    }

    res.json(course);
  } catch (error) {
    console.error('Erreur lors de la récupération du cours:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/courses - Créer un nouveau cours (réservé aux admins)
router.post('/', authenticateToken, requireAdmin, uploadFiles, validateCourse, async (req, res) => {
  try {
    const { title, description, content, level, order, videoUrl } = req.body;
    const userId = req.user.id;

    // Récupérer les chemins des fichiers uploadés si présents
    let imagePath = undefined;
    let uploadedVideoUrl = undefined;
    let pdfPath = undefined;
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        imagePath = `/uploads/${req.files.image[0].filename}`;
      }
      if (req.files.video && req.files.video[0]) {
        uploadedVideoUrl = `/uploads/${req.files.video[0].filename}`;
      }
      if (req.files.pdf && req.files.pdf[0]) {
        pdfPath = `/uploads/${req.files.pdf[0].filename}`;
      }
    }

    const course = await prisma.course.create({
      data: {
        title,
        description,
        content,
        level,
        order,
        // Priorité à l'URL fournie, sinon utiliser la vidéo uploadée
        videoUrl: videoUrl || uploadedVideoUrl,
        // Enregistrer le chemin de l'image/pdf si uploadés
        imagePath,
        pdfPath,
        userId
      }
    });

    res.status(201).json(course);
  } catch (error) {
    console.error('Erreur lors de la création du cours:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// PUT /api/courses/:id - Mettre à jour un cours (réservé aux admins)
router.put('/:id', authenticateToken, requireAdmin, uploadFiles, validateCourseUpdate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, content, level, order, videoUrl } = req.body;

    // Construire l'objet data dynamiquement pour ne mettre à jour que les champs fournis
    const data = { title, description, content, level, order };

    // Gestion des fichiers uploadés (si présents)
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        data.imagePath = `/uploads/${req.files.image[0].filename}`;
      }
      if (req.files.video && req.files.video[0]) {
        data.videoUrl = `/uploads/${req.files.video[0].filename}`;
      }
      if (req.files.pdf && req.files.pdf[0]) {
        data.pdfPath = `/uploads/${req.files.pdf[0].filename}`;
      }
    }

    // Si une videoUrl est fournie explicitement dans le body, elle a priorité
    if (videoUrl) {
      data.videoUrl = videoUrl;
    }

    const course = await prisma.course.update({
      where: { id },
      data
    });

    res.json(course);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du cours:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// DELETE /api/courses/:id - Supprimer un cours (réservé aux admins)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.course.delete({ where: { id } });
    res.json({ message: 'Cours supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du cours:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/courses/:id/complete - Marquer un cours comme terminé
router.post('/:id/complete', authenticateToken, requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Vérifier si l'utilisateur peut accéder à ce cours
    const canAccess = await checkCourseAccess(id, userId);
    if (!canAccess) {
      return res.status(403).json({ 
        error: 'Cours verrouillé', 
        message: 'Vous devez terminer le cours précédent pour accéder à celui-ci' 
      });
    }

    // Marquer le cours comme terminé
    const progress = await prisma.progress.upsert({
      where: {
        userId_courseId: {
          userId: userId,
          courseId: id
        }
      },
      update: {
        status: 'completed',
        completedAt: new Date()
      },
      create: {
        userId: userId,
        courseId: id,
        status: 'completed',
        completedAt: new Date()
      }
    });

    res.json({ 
      message: 'Cours marqué comme terminé',
      progress 
    });
  } catch (error) {
    console.error('Erreur lors de la finalisation du cours:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Fonction pour vérifier si un cours est débloqué
async function checkCourseAccess(courseId, userId) {
  const course = await prisma.course.findUnique({
    where: { id: courseId }
  });

  if (!course) return false;

  // Le premier cours de chaque niveau est toujours débloqué
  if (parseInt(course.order) === 1) return true;

  // Vérifier si le cours précédent est terminé
  const previousCourse = await prisma.course.findFirst({
    where: {
      level: course.level,
      order: String(parseInt(course.order) - 1)
    }
  });

  if (!previousCourse) return true;

  const previousProgress = await prisma.progress.findUnique({
    where: {
      userId_courseId: {
        userId: userId,
        courseId: previousCourse.id
      }
    }
  });

  return previousProgress?.status === 'completed';
}

// Fonction pour vérifier si un cours est débloqué (version synchrone)
function isCourseUnlocked(course, allCourses, userId) {
  // Le premier cours de chaque niveau est toujours débloqué
  if (parseInt(course.order) === 1) return true;

  // Vérifier si le cours précédent est terminé
  const previousCourse = allCourses.find(c => 
    c.level === course.level && c.order === String(parseInt(course.order) - 1)
  );

  if (!previousCourse) return true;

  const previousProgress = previousCourse.progress[0];
  return previousProgress?.status === 'completed';
}

module.exports = router;
