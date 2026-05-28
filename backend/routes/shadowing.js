const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const {
  extractYoutubeId,
  downloadAudio,
  MAX_DURATION_SEC,
} = require('../services/youtubeAudio');
const { transcribeFileWithSegments } = require('../services/whisperTranscribe');
const { generateShadowingQuiz } = require('../services/shadowingQuiz');

const router = express.Router();
const prisma = new PrismaClient();

function parseSegments(json) {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

function formatVideo(video) {
  const segments = parseSegments(video.segmentsJson);
  return {
    id: video.id,
    youtubeId: video.youtubeId,
    youtubeUrl: video.youtubeUrl,
    title: video.title,
    durationSec: video.durationSec,
    segments,
    fullText: video.fullText,
    embedUrl: `https://www.youtube.com/embed/${video.youtubeId}`,
  };
}

// Préparer une vidéo : cache DB ou téléchargement + Whisper
router.post('/prepare', authenticateToken, async (req, res) => {
  try {
    const { url } = req.body;
    const youtubeId = extractYoutubeId(url);
    if (!youtubeId) {
      return res.status(400).json({ error: 'Lien YouTube invalide' });
    }

    const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`;

    let video = await prisma.shadowingVideo.findUnique({
      where: { youtubeId },
    });

    // ===========================
    // VÉRIFICATION LIMITE 24H
    // ===========================
    let hasExistingSession = false;
    if (video) {
      const existingSession = await prisma.shadowingSession.findUnique({
        where: { userId_videoId: { userId: req.user.id, videoId: video.id } }
      });
      if (existingSession) hasExistingSession = true;
    }

    if (!hasExistingSession) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentSessionsCount = await prisma.shadowingSession.count({
        where: { 
          userId: req.user.id, 
          createdAt: { gte: twentyFourHoursAgo } 
        }
      });
      
      if (recentSessionsCount >= 2) {
        return res.status(403).json({ error: "Vous avez atteint la limite de 2 nouvelles vidéos par 24h. Réessayez plus tard ou révisez vos vidéos existantes !" });
      }
    }
    // ===========================

    if (!video) {
      const { filePath, title, durationSec } = await downloadAudio(youtubeId);
      const { text, segments } = await transcribeFileWithSegments(filePath);

      if (!segments.length) {
        return res.status(400).json({
          error: 'Aucune parole détectée dans cette vidéo',
        });
      }

      video = await prisma.shadowingVideo.create({
        data: {
          youtubeId,
          youtubeUrl,
          title,
          durationSec,
          segmentsJson: JSON.stringify(segments),
          fullText: text,
        },
      });
    }

    let session = await prisma.shadowingSession.findUnique({
      where: {
        userId_videoId: {
          userId: req.user.id,
          videoId: video.id,
        },
      },
    });

    if (!session) {
      session = await prisma.shadowingSession.create({
        data: {
          userId: req.user.id,
          videoId: video.id,
        },
      });
    }

    res.json({
      success: true,
      video: formatVideo(video),
      session: {
        id: session.id,
        currentIndex: session.currentIndex,
        hasQuiz: !!session.quizJson,
      },
      maxDurationSec: MAX_DURATION_SEC,
    });
  } catch (error) {
    console.error('Shadowing prepare:', error);
    const msg = error.message || 'Erreur lors de la préparation de la vidéo';
    const clientError =
      /invalide|trop longue|accessible|télécharger|parole|OPENAI_API_KEY/i.test(
        msg
      );
    res.status(clientError ? 400 : 500).json({ error: msg });
  }
});

// Récupérer une vidéo en cache
router.get('/video/:youtubeId', authenticateToken, async (req, res) => {
  try {
    const video = await prisma.shadowingVideo.findUnique({
      where: { youtubeId: req.params.youtubeId },
    });
    if (!video) {
      return res.status(404).json({ error: 'Vidéo non trouvée — utilisez /prepare' });
    }
    res.json({ success: true, video: formatVideo(video) });
  } catch (error) {
    console.error('Shadowing get video:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Sauvegarder la progression shadowing
router.patch('/progress', authenticateToken, async (req, res) => {
  try {
    const { youtubeId, currentIndex } = req.body;
    const video = await prisma.shadowingVideo.findUnique({
      where: { youtubeId },
    });
    if (!video) {
      return res.status(404).json({ error: 'Vidéo introuvable' });
    }

    const session = await prisma.shadowingSession.upsert({
      where: {
        userId_videoId: {
          userId: req.user.id,
          videoId: video.id,
        },
      },
      create: {
        userId: req.user.id,
        videoId: video.id,
        currentIndex: Number(currentIndex) || 0,
      },
      update: {
        currentIndex: Number(currentIndex) || 0,
      },
    });

    res.json({ success: true, currentIndex: session.currentIndex });
  } catch (error) {
    console.error('Shadowing progress:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Générer (ou renvoyer) le quiz post-vidéo
router.post('/quiz', authenticateToken, async (req, res) => {
  try {
    const { youtubeId } = req.body;
    const video = await prisma.shadowingVideo.findUnique({
      where: { youtubeId },
    });
    if (!video) {
      return res.status(404).json({ error: 'Vidéo introuvable' });
    }

    let session = await prisma.shadowingSession.findUnique({
      where: {
        userId_videoId: {
          userId: req.user.id,
          videoId: video.id,
        },
      },
    });

    if (session?.quizJson) {
      const cached = JSON.parse(session.quizJson);
      const hasBilingual = cached[0]?.questionEn && cached[0]?.optionsEn?.length;
      if (hasBilingual) {
        return res.json({
          success: true,
          questions: cached,
          cached: true,
        });
      }
    }

    const questions = await generateShadowingQuiz(
      video.fullText || '',
      video.title || ''
    );

    session = await prisma.shadowingSession.upsert({
      where: {
        userId_videoId: {
          userId: req.user.id,
          videoId: video.id,
        },
      },
      create: {
        userId: req.user.id,
        videoId: video.id,
        quizJson: JSON.stringify(questions),
      },
      update: {
        quizJson: JSON.stringify(questions),
      },
    });

    res.json({ success: true, questions, cached: false });
  } catch (error) {
    console.error('Shadowing quiz:', error);
    res.status(500).json({
      error: error.message || 'Erreur lors de la génération du quiz',
    });
  }
});

// Soumettre le score du quiz
router.post('/quiz/submit', authenticateToken, async (req, res) => {
  try {
    const { youtubeId, answers } = req.body;
    const video = await prisma.shadowingVideo.findUnique({
      where: { youtubeId },
    });
    if (!video) {
      return res.status(404).json({ error: 'Vidéo introuvable' });
    }

    const session = await prisma.shadowingSession.findUnique({
      where: {
        userId_videoId: {
          userId: req.user.id,
          videoId: video.id,
        },
      },
    });

    if (!session?.quizJson) {
      return res.status(400).json({ error: 'Générez le quiz d\'abord' });
    }

    const questions = JSON.parse(session.quizJson);
    let correct = 0;
    questions.forEach((q, i) => {
      if (Number(answers?.[i]) === q.correctIndex) correct += 1;
    });
    const score = Math.round((correct / questions.length) * 100);

    await prisma.shadowingSession.update({
      where: { id: session.id },
      data: {
        quizScore: score,
        completedAt: new Date(),
      },
    });

    res.json({
      success: true,
      score,
      correct,
      total: questions.length,
      questions,
    });
  } catch (error) {
    console.error('Shadowing quiz submit:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Historique utilisateur
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const sessions = await prisma.shadowingSession.findMany({
      where: { userId: req.user.id },
      include: { video: true },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    res.json({
      success: true,
      items: sessions.map((s) => ({
        youtubeId: s.video.youtubeId,
        title: s.video.title,
        currentIndex: s.currentIndex,
        quizScore: s.quizScore,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Shadowing history:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
