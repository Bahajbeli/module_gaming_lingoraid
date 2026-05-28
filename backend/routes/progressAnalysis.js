const express = require('express');
const { generateLocalProgressAnalysis } = require('../services/localProgressAnalysisService');
const { authenticateToken, requireUser } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/progress-analysis
 * Get comprehensive AI-powered progress analysis for the authenticated user
 */
router.get('/', authenticateToken, requireUser, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const analysis = await generateLocalProgressAnalysis(userId);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error generating progress analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération de l\'analyse de progression',
      message: error.message
    });
  }
});

/**
 * POST /api/progress-analysis/regenerate
 * Regenerate progress analysis for the authenticated user
 */
router.post('/regenerate', authenticateToken, requireUser, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const analysis = await generateLocalProgressAnalysis(userId);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error regenerating progress analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la régénération de l\'analyse de progression',
      message: error.message
    });
  }
});

/**
 * GET /api/progress-analysis/stats
 * Get basic statistics for the user's progress
 */
router.get('/stats', authenticateToken, requireUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Get user's basic progress stats
    const progressStats = await prisma.progress.count({
      where: {
        userId: userId
      }
    });

    const completedCourses = await prisma.progress.count({
      where: {
        userId: userId,
        status: 'completed'
      }
    });

    // Try to get quiz results, but handle if table doesn't exist
    let quizResults = 0;
    let averageQuizScore = { _avg: { score: 0 } };
    try {
      // Try to check if quiz_results table exists by attempting a simple query
      const tableCheck = await prisma.$queryRaw`
        SELECT table_name::text AS name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'quiz_results'
      `;
      if (tableCheck.length > 0) {
        // If table exists, get the data
        const quizResultCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM quiz_results WHERE user_id = ${userId}`;
        quizResults = Number(quizResultCount[0]?.count) || 0;
        
        const avgScoreResult = await prisma.$queryRaw`SELECT AVG(score) as avg_score FROM quiz_results WHERE user_id = ${userId}`;
        averageQuizScore = { _avg: { score: Number(avgScoreResult[0]?.avg_score) || 0 } };
      } else {
        console.log('ℹ️ Quiz results table does not exist, proceeding without quiz data');
      }
    } catch (quizError) {
      console.log('⚠️ Quiz results table not found or accessible, proceeding without quiz data:', quizError.message);
      // Continue with default values
    }

    const badges = await prisma.userBadge.count({
      where: {
        userId: userId
      }
    });

    // Get current streak
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, totalPoints: true }
    });

    await prisma.$disconnect();

    res.json({
      success: true,
      data: {
        totalCourses: progressStats,
        completedCourses,
        totalQuizzes: quizResults,
        averageQuizScore: averageQuizScore._avg.score || 0,
        totalBadges: badges,
        currentStreak: user?.currentStreak || 0,
        totalPoints: user?.totalPoints || 0
      }
    });
  } catch (error) {
    console.error('Error fetching progress stats:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques de progression',
      message: error.message
    });
  }
});

module.exports = router;