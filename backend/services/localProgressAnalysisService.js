/**
 * Local Machine Learning Progress Analysis Service
 * Provides comprehensive analysis of user progress with strengths and weaknesses using local ML model
 */

const { PrismaClient } = require('@prisma/client');
const { analyzeProgressWithML } = require('../ml/progressAnalysisML');

const prisma = new PrismaClient();

/**
 * Generate comprehensive progress analysis for a user using local ML model
 * @param {string} userId - The ID of the user to analyze
 * @returns {Promise<Object>} Object containing detailed analysis
 */
async function generateLocalProgressAnalysis(userId) {
  console.log(`\n=== GENERATING LOCAL PROGRESS ANALYSIS FOR USER: ${userId} ===`);
  
  try {
    // Fetch user data and progress
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        progress: {
          include: {
            course: true
          },
          orderBy: {
            completedAt: 'desc'
          }
        },
        badges: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Analyze course progress
    const courseProgress = await analyzeCourseProgress(user.progress);
    
    // Analyze badges earned
    const badgesAnalysis = await analyzeBadges(user.badges);
    
    // Analyze game progress
    const gameProgress = await analyzeGameProgress(userId);
    
    // Analyze quiz results if available
    const quizAnalysis = await analyzeQuizResults(userId);
    
    // Use local ML model to generate analysis
    const mlAnalysis = generateMLAnalysis(courseProgress, badgesAnalysis, user, gameProgress, quizAnalysis);
    
    console.log('✅ Local progress analysis generated successfully');
    return mlAnalysis;

  } catch (error) {
    console.error('❌ Error generating local progress analysis:', error);
    throw error;
  }
}

/**
 * Analyze course progress data
 */
async function analyzeCourseProgress(progressData) {
  const totalCourses = progressData.length;
  const completedCourses = progressData.filter(p => p.status === 'completed').length;
  const inProgressCourses = progressData.filter(p => p.status === 'in-progress').length;
  const notStartedCourses = progressData.filter(p => p.status === 'not-started').length;

  // Calculate completion by level
  const levels = {};
  progressData.forEach(p => {
    const level = p.course.level;
    if (!levels[level]) {
      levels[level] = { total: 0, completed: 0 };
    }
    levels[level].total++;
    if (p.status === 'completed') {
      levels[level].completed++;
    }
  });

  // Calculate average time to complete courses
  let totalTime = 0;
  let completedCount = 0;
  progressData.forEach(p => {
    if (p.completedAt && p.createdAt) {
      const completionTime = new Date(p.completedAt) - new Date(p.createdAt);
      totalTime += completionTime;
      completedCount++;
    }
  });

  const avgCompletionTime = completedCount > 0 ? totalTime / completedCount : 0;

  return {
    totalCourses,
    completedCourses,
    inProgressCourses,
    notStartedCourses,
    completionRate: totalCourses > 0 ? (completedCourses / totalCourses) * 100 : 0,
    levels,
    avgCompletionTime,
    recentProgress: progressData.slice(0, 5) // Last 5 courses
  };
}

/**
 * Analyze user badges
 */
async function analyzeBadges(badges) {
  const totalBadges = badges.length;
  const recentBadges = badges.slice(-5); // Last 5 badges earned
  
  // Categorize badges
  const badgeCategories = {
    streak: badges.filter(b => b.name.toLowerCase().includes('streak') || b.name.toLowerCase().includes('jour')),
    completion: badges.filter(b => b.name.toLowerCase().includes('complet') || b.name.toLowerCase().includes('finish')),
    achievement: badges.filter(b => b.name.toLowerCase().includes('master') || b.name.toLowerCase().includes('expert'))
  };

  return {
    totalBadges,
    recentBadges,
    badgeCategories,
    byCategory: {
      streak: badgeCategories.streak.length,
      completion: badgeCategories.completion.length,
      achievement: badgeCategories.achievement.length
    }
  };
}

/**
 * Analyze game progress data
 */
async function analyzeGameProgress(userId) {
  try {
    const games = await prisma.game.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    const totalGames = games.length;
    const completedGames = games.filter(g => g.status === 'completed').length;
    const averageScore = completedGames > 0 
      ? games.filter(g => g.status === 'completed').reduce((sum, g) => sum + (g.score || 0), 0) / completedGames
      : 0;

    // Analyze by game type
    const byType = {
      quiz: { total: 0, completed: 0, avgScore: 0, scores: [] },
      'mots-croises': { total: 0, completed: 0, avgScore: 0, scores: [] },
      creativite: { total: 0, completed: 0, avgScore: 0, scores: [] },
      simulation: { total: 0, completed: 0, avgScore: 0, scores: [] }
    };

    games.forEach(game => {
      const type = game.type || 'quiz';
      if (byType[type]) {
        byType[type].total++;
        if (game.status === 'completed') {
          byType[type].completed++;
          if (game.score) {
            byType[type].scores.push(game.score);
          }
        }
      }
    });

    // Calculate average scores per type
    Object.keys(byType).forEach(type => {
      const typeData = byType[type];
      if (typeData.scores.length > 0) {
        typeData.avgScore = typeData.scores.reduce((a, b) => a + b, 0) / typeData.scores.length;
      }
    });

    // Analyze by mode
    const byMode = {
      online: { total: 0, completed: 0, avgScore: 0 },
      solo: { total: 0, completed: 0, avgScore: 0 }
    };

    games.forEach(game => {
      const mode = game.mode || 'solo';
      if (byMode[mode]) {
        byMode[mode].total++;
        if (game.status === 'completed') {
          byMode[mode].completed++;
        }
      }
    });

    return {
      totalGames,
      completedGames,
      averageScore,
      completionRate: totalGames > 0 ? (completedGames / totalGames) * 100 : 0,
      byType,
      byMode,
      recentGames: games.slice(0, 5)
    };
  } catch (error) {
    console.error('Error analyzing game progress:', error);
    return {
      totalGames: 0,
      completedGames: 0,
      averageScore: 0,
      completionRate: 0,
      byType: {},
      byMode: {},
      recentGames: []
    };
  }
}

/**
 * Analyze quiz results if available
 */
async function analyzeQuizResults(userId) {
  try {
    // Check if quiz_results table exists
    const tableCheck = await prisma.$queryRaw`
      SELECT table_name::text AS name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'quiz_results'
    `;
    
    if (tableCheck.length === 0) {
      return {
        totalQuizzes: 0,
        averageScore: 0,
        bestScore: 0,
        worstScore: 0,
        improvementTrend: 'stable'
      };
    }

    const quizResults = await prisma.$queryRaw`
      SELECT * FROM quiz_results WHERE user_id = ${userId} ORDER BY created_at DESC
    `;

    if (quizResults.length === 0) {
      return {
        totalQuizzes: 0,
        averageScore: 0,
        bestScore: 0,
        worstScore: 0,
        improvementTrend: 'stable'
      };
    }

    const scores = quizResults.map(q => Number(q.score || 0));
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const bestScore = Math.max(...scores);
    const worstScore = Math.min(...scores);

    // Calculate improvement trend
    const recentScores = scores.slice(0, 5);
    const olderScores = scores.slice(-5);
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
    
    let improvementTrend = 'stable';
    if (recentAvg > olderAvg + 5) {
      improvementTrend = 'improving';
    } else if (recentAvg < olderAvg - 5) {
      improvementTrend = 'declining';
    }

    return {
      totalQuizzes: quizResults.length,
      averageScore: Math.round(averageScore),
      bestScore,
      worstScore,
      improvementTrend,
      recentScores: recentScores.slice(0, 3)
    };
  } catch (error) {
    console.error('Error analyzing quiz results:', error);
    return {
      totalQuizzes: 0,
      averageScore: 0,
      bestScore: 0,
      worstScore: 0,
      improvementTrend: 'stable'
    };
  }
}

/**
 * Generate analysis using local ML model logic
 */
function generateMLAnalysis(courseProgress, badgesAnalysis, user, gameProgress, quizAnalysis) {
  // Use the dedicated ML algorithm with enhanced data
  return analyzeProgressWithML(courseProgress, badgesAnalysis, user, gameProgress, quizAnalysis);
}

/**
 * Generate overall assessment using ML logic
 */
function generateOverallAssessment(courseProgress, badgesAnalysis) {
  const { completionRate, totalCourses, completedCourses } = courseProgress;
  const { totalBadges } = badgesAnalysis;
  
  if (completionRate >= 80) {
    return "Votre progression dans l'apprentissage de l'allemand est exceptionnelle ! Vous avez terminé la majorité de vos cours avec succès et accumulé de nombreux badges. Votre engagement est remarquable.";
  } else if (completionRate >= 50) {
    return "Votre progression est solide ! Vous avez terminé la moitié de vos cours et montrez un bon engagement dans l'apprentissage de l'allemand. Continuez sur cette lancée.";
  } else if (completionRate >= 20) {
    return "Vous êtes sur la bonne voie dans votre apprentissage de l'allemand. Vous avez commencé plusieurs cours et obtenu quelques badges. Concentrez-vous sur la complétion des cours en cours.";
  } else {
    return "Vous débutez votre parcours d'apprentissage de l'allemand. C'est un excellent début ! Terminez vos premiers cours pour construire une base solide.";
  }
}

/**
 * Generate strengths based on ML analysis
 */
function generateStrengths(courseProgress, badgesAnalysis) {
  const strengths = [];
  const { completionRate, levels, completedCourses, inProgressCourses, totalCourses } = courseProgress;
  const { totalBadges, byCategory } = badgesAnalysis;

  if (completionRate >= 70) {
    strengths.push("Taux de complétion élevé - vous terminez la plupart de vos cours");
  }
  
  if (byCategory.streak > 0) {
    strengths.push("Consistance - vous maintenez une bonne série d'apprentissage");
  }
  
  if (byCategory.achievement > 0) {
    strengths.push("Maîtrise des compétences spécifiques - vous excellez dans certains domaines");
  }
  
  if (completedCourses > 0 && inProgressCourses > 0) {
    strengths.push("Capacité à gérer plusieurs cours simultanément");
  }
  
  if (totalBadges > 5) {
    strengths.push("Engagement actif - vous participez activement aux activités");
  }

  // Check for level-specific strengths
  Object.entries(levels).forEach(([level, data]) => {
    if (data.completed / data.total >= 0.7) {
      strengths.push(`Force dans le niveau ${level} - vous avez bien maîtrisé ce niveau`);
    }
  });

  if (strengths.length === 0) {
    strengths.push("Motivation à apprendre - vous avez commencé votre parcours");
  }

  return strengths;
}

/**
 * Generate weaknesses based on ML analysis
 */
function generateWeaknesses(courseProgress, badgesAnalysis) {
  const weaknesses = [];
  const { completionRate, levels, completedCourses, inProgressCourses, notStartedCourses, totalCourses } = courseProgress;
  const { totalBadges } = badgesAnalysis;

  if (completionRate < 30) {
    weaknesses.push("Taux de complétion faible - beaucoup de cours non terminés");
  }
  
  if (notStartedCourses > totalCourses * 0.5) {
    weaknesses.push("Beaucoup de cours commencés mais non terminés");
  }
  
  if (totalBadges < 3) {
    weaknesses.push("Faible participation aux activités bonus");
  }

  // Check for level-specific weaknesses
  Object.entries(levels).forEach(([level, data]) => {
    if (data.completed / data.total < 0.3) {
      weaknesses.push(`Difficultés avec le niveau ${level} - taux de complétion inférieur à 30%`);
    }
  });

  if (inProgressCourses > 3 && completedCourses < 3) {
    weaknesses.push("Tendance à commencer trop de cours sans les terminer");
  }

  if (weaknesses.length === 0 && totalCourses > 0) {
    weaknesses.push("Aucun point faible majeur détecté - continuez comme ça !");
  }

  return weaknesses;
}

/**
 * Generate recommendations based on ML analysis
 */
function generateRecommendations(courseProgress, badgesAnalysis) {
  const recommendations = [];
  const { completionRate, levels, inProgressCourses, notStartedCourses, totalCourses } = courseProgress;

  if (inProgressCourses > 2) {
    recommendations.push("Concentrez-vous sur la complétion des cours en cours avant d'en commencer de nouveaux");
  }
  
  if (completionRate < 50) {
    recommendations.push("Fixez-vous des objectifs hebdomadaires réalistes pour améliorer votre taux de complétion");
  }
  
  if (notStartedCourses > 0) {
    recommendations.push("Choisissez un cours non commencé et concentrez-vous dessus cette semaine");
  }

  // Recommend specific levels based on progress
  Object.entries(levels).forEach(([level, data]) => {
    if (data.completed / data.total < 0.5) {
      recommendations.push(`Concentrez-vous sur le niveau ${level} pour renforcer vos bases`);
    } else if (data.completed === data.total && data.total > 0) {
      recommendations.push(`Passez au niveau supérieur après avoir maîtrisé le niveau ${level}`);
    }
  });

  if (recommendations.length === 0) {
    recommendations.push("Continuez votre excellent travail et maintenez votre rythme actuel");
  }

  return recommendations;
}

/**
 * Generate next steps based on ML analysis
 */
function generateNextSteps(courseProgress, badgesAnalysis) {
  const nextSteps = [];
  const { completionRate, levels, inProgressCourses, notStartedCourses, completedCourses, totalCourses } = courseProgress;

  if (inProgressCourses > 0) {
    nextSteps.push("Terminez le cours en cours d'apprentissage");
  } else if (notStartedCourses > 0) {
    nextSteps.push("Commencez un nouveau cours adapté à votre niveau");
  }
  
  if (completionRate < 70) {
    nextSteps.push("Révisez les cours précédemment terminés pour renforcer vos acquis");
  }

  // Suggest next level based on completion
  const sortedLevels = ['A1', 'A2', 'B1', 'B2'];
  for (let i = 0; i < sortedLevels.length - 1; i++) {
    const currentLevel = sortedLevels[i];
    const nextLevel = sortedLevels[i + 1];
    
    if (levels[currentLevel] && levels[currentLevel].completed === levels[currentLevel].total && 
        levels[nextLevel] && levels[nextLevel].completed < levels[nextLevel].total) {
      nextSteps.push(`Commencez le premier cours du niveau ${nextLevel}`);
      break;
    }
  }

  if (nextSteps.length === 0) {
    nextSteps.push("Continuez à explorer de nouveaux contenus et activités");
  }

  return nextSteps;
}

/**
 * Generate motivational message based on ML analysis
 */
function generateMotivationalMessage(courseProgress, badgesAnalysis) {
  const { completionRate, completedCourses, totalCourses } = courseProgress;
  const { totalBadges } = badgesAnalysis;

  if (completionRate >= 80) {
    return "Félicitations ! Votre détermination et votre persévérance sont impressionnantes. Vous êtes sur la voie de la maîtrise de l'allemand !";
  } else if (completionRate >= 50) {
    return "Super travail jusqu'à présent ! Chaque cours terminé vous rapproche de votre objectif. Continuez cet excellent travail !";
  } else if (completionRate >= 20) {
    return "Vous êtes sur la bonne voie ! Chaque petit pas compte dans votre parcours d'apprentissage. Continuez à avancer !";
  } else {
    return "Bienvenue dans votre aventure d'apprentissage de l'allemand ! Chaque grand voyage commence par un premier pas. Félicitations pour avoir commencé !";
  }
}

module.exports = {
  generateLocalProgressAnalysis
};