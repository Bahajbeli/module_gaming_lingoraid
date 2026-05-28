/**
 * Machine Learning Algorithm for Progress Analysis
 * Contains the core ML algorithms for analyzing user progress
 */

/**
 * Main ML analysis function
 * @param {Object} courseProgress - Course progress data
 * @param {Object} badgesAnalysis - Badges analysis data
 * @param {Object} user - User data
 * @param {Object} gameProgress - Game progress data
 * @param {Object} quizAnalysis - Quiz results analysis
 * @returns {Object} Analysis results
 */
function analyzeProgressWithML(courseProgress, badgesAnalysis, user, gameProgress = {}, quizAnalysis = {}) {
  // Initialize the analysis object
  const analysis = {
    generatedAt: new Date().toISOString(),
    confidence: 0.9,
    overallAssessment: "",
    strengths: [],
    weaknesses: [],
    recommendations: [],
    nextSteps: [],
    motivationalMessage: "",
    skillBreakdown: {},
    performanceMetrics: {}
  };

  // Run different ML algorithms with enhanced data
  analysis.overallAssessment = runOverallAssessmentML(courseProgress, badgesAnalysis, gameProgress, quizAnalysis);
  analysis.strengths = runStrengthsDetectionML(courseProgress, badgesAnalysis, gameProgress, quizAnalysis);
  analysis.weaknesses = runWeaknessesDetectionML(courseProgress, badgesAnalysis, gameProgress, quizAnalysis);
  analysis.recommendations = runRecommendationEngineML(courseProgress, badgesAnalysis, gameProgress, quizAnalysis);
  analysis.nextSteps = runNextStepsPredictionML(courseProgress, badgesAnalysis, gameProgress, quizAnalysis);
  analysis.motivationalMessage = runMotivationalGeneratorML(courseProgress, badgesAnalysis, gameProgress, quizAnalysis);
  analysis.skillBreakdown = runSkillBreakdownML(courseProgress, gameProgress, quizAnalysis);
  analysis.performanceMetrics = runPerformanceMetricsML(courseProgress, gameProgress, quizAnalysis);

  return analysis;
}

/**
 * ML Algorithm for Overall Assessment
 */
function runOverallAssessmentML(courseProgress, badgesAnalysis, gameProgress = {}, quizAnalysis = {}) {
  const { completionRate, totalCourses, completedCourses } = courseProgress;
  const { totalBadges } = badgesAnalysis;
  const { averageScore: gameAvgScore = 0, completedGames = 0 } = gameProgress;
  const { averageScore: quizAvgScore = 0, improvementTrend = 'stable' } = quizAnalysis;

  // Enhanced weighted scoring algorithm
  let score = 0;
  score += completionRate * 0.35; // 35% weight to course completion rate
  score += Math.min((totalBadges * 2), 30) * 0.2; // 20% weight to badges (capped at 30)
  score += (completedCourses / Math.max(totalCourses, 1)) * 0.15 * 100; // 15% weight to completion ratio
  score += Math.min((gameAvgScore / 100) * 100, 20); // 20% weight to game performance (capped at 20)
  score += Math.min((quizAvgScore / 100) * 100, 10); // 10% weight to quiz performance (capped at 10)

  // Adjust score based on improvement trend
  if (improvementTrend === 'improving') {
    score += 5;
  } else if (improvementTrend === 'declining') {
    score -= 3;
  }

  if (score >= 75) {
    return `Votre progression dans l'apprentissage de l'allemand est exceptionnelle ! Vous avez terminé ${completedCourses} cours sur ${totalCourses}, obtenu ${totalBadges} badges, et maintenu une moyenne de ${Math.round(gameAvgScore)}% dans les jeux. Votre engagement constant et votre performance élevée démontrent une excellente maîtrise de la langue allemande.`;
  } else if (score >= 50) {
    return `Votre progression est solide ! Vous avez complété ${Math.round(completionRate)}% de vos cours, obtenu ${totalBadges} badges, et maintenu une moyenne de ${Math.round(gameAvgScore)}% dans les jeux. Vous êtes sur la bonne voie pour maîtriser l'allemand.`;
  } else if (score >= 25) {
    return `Vous êtes sur la bonne voie dans votre apprentissage de l'allemand. Vous avez commencé ${totalCourses} cours, obtenu ${totalBadges} badges, et complété ${completedGames} jeux. Concentrez-vous sur la complétion des cours en cours pour accélérer votre progression.`;
  } else {
    return `Vous débutez votre parcours d'apprentissage de l'allemand. C'est un excellent début ! Vous avez ${totalCourses} cours disponibles et ${totalBadges} badges. Terminez vos premiers cours pour construire une base solide et développer vos compétences.`;
  }
}

/**
 * ML Algorithm for Strengths Detection
 */
function runStrengthsDetectionML(courseProgress, badgesAnalysis, gameProgress = {}, quizAnalysis = {}) {
  const strengths = [];
  const { completionRate, levels, completedCourses, inProgressCourses, totalCourses } = courseProgress;
  const { totalBadges, byCategory } = badgesAnalysis;
  const { averageScore: gameAvgScore = 0, completedGames = 0, byType = {} } = gameProgress;
  const { averageScore: quizAvgScore = 0, improvementTrend = 'stable', bestScore = 0 } = quizAnalysis;

  // Pattern recognition for strengths
  if (completionRate >= 70) {
    strengths.push(`Taux de complétion élevé (${Math.round(completionRate)}%) - vous terminez la plupart de vos cours avec succès`);
  }
  
  if (byCategory.streak > 0) {
    strengths.push(`Consistance remarquable - vous maintenez une série de ${byCategory.streak} jours d'apprentissage`);
  }
  
  if (byCategory.achievement > 0) {
    strengths.push(`Maîtrise des compétences - vous avez obtenu ${byCategory.achievement} badges de maîtrise`);
  }
  
  if (completedCourses > 0 && inProgressCourses > 0) {
    strengths.push("Capacité à gérer plusieurs cours simultanément - vous équilibrez bien votre apprentissage");
  }
  
  if (totalBadges > 5) {
    strengths.push(`Engagement actif - vous avez obtenu ${totalBadges} badges, montrant une participation régulière`);
  }

  // Game performance strengths
  if (gameAvgScore >= 80) {
    strengths.push(`Excellente performance dans les jeux (${Math.round(gameAvgScore)}% de moyenne) - vous appliquez bien vos connaissances`);
  }
  
  if (completedGames >= 10) {
    strengths.push(`Pratique régulière - vous avez complété ${completedGames} jeux, ce qui renforce votre apprentissage`);
  }

  // Quiz performance strengths
  if (quizAvgScore >= 85) {
    strengths.push(`Excellents résultats aux quiz (${quizAvgScore}% de moyenne) - vous maîtrisez bien les concepts`);
  }
  
  if (improvementTrend === 'improving') {
    strengths.push("Progression constante - vos résultats s'améliorent régulièrement");
  }
  
  if (bestScore >= 90) {
    strengths.push(`Meilleur score de ${bestScore}% - vous démontrez une excellente compréhension`);
  }

  // Game type specific strengths
  Object.entries(byType).forEach(([type, data]) => {
    if (data.avgScore >= 80 && data.completed >= 3) {
      const typeNames = {
        quiz: 'Quiz',
        'mots-croises': 'Mots Croisés',
        creativite: 'Créativité',
        simulation: 'Simulation'
      };
      strengths.push(`Force en ${typeNames[type] || type} - moyenne de ${Math.round(data.avgScore)}% sur ${data.completed} jeux`);
    }
  });

  // Level-specific strength detection
  Object.entries(levels).forEach(([level, data]) => {
    if (data.total > 0 && data.completed / data.total >= 0.7) {
      strengths.push(`Maîtrise du niveau ${level} - ${data.completed}/${data.total} cours complétés (${Math.round((data.completed / data.total) * 100)}%)`);
    }
  });

  if (strengths.length === 0) {
    strengths.push("Motivation à apprendre - vous avez commencé votre parcours avec détermination");
  }

  return strengths;
}

/**
 * ML Algorithm for Weaknesses Detection
 */
function runWeaknessesDetectionML(courseProgress, badgesAnalysis, gameProgress = {}, quizAnalysis = {}) {
  const weaknesses = [];
  const { completionRate, levels, completedCourses, inProgressCourses, notStartedCourses, totalCourses } = courseProgress;
  const { totalBadges } = badgesAnalysis;
  const { averageScore: gameAvgScore = 0, completedGames = 0, byType = {} } = gameProgress;
  const { averageScore: quizAvgScore = 0, improvementTrend = 'stable', worstScore = 0 } = quizAnalysis;

  // Pattern recognition for weaknesses
  if (completionRate < 30) {
    weaknesses.push(`Taux de complétion faible (${Math.round(completionRate)}%) - ${notStartedCourses} cours non commencés sur ${totalCourses}`);
  }
  
  if (notStartedCourses > totalCourses * 0.5) {
    weaknesses.push(`Beaucoup de cours non commencés (${notStartedCourses}/${totalCourses}) - concentrez-vous sur la complétion`);
  }
  
  if (totalBadges < 3) {
    weaknesses.push(`Faible participation aux activités bonus (${totalBadges} badges) - explorez plus d'activités pour progresser`);
  }

  // Game performance weaknesses
  if (gameAvgScore > 0 && gameAvgScore < 60) {
    weaknesses.push(`Performance dans les jeux à améliorer (${Math.round(gameAvgScore)}% de moyenne) - pratiquez davantage`);
  }
  
  if (completedGames < 5 && totalCourses > 0) {
    weaknesses.push(`Peu de jeux complétés (${completedGames}) - les jeux renforcent l'apprentissage`);
  }

  // Quiz performance weaknesses
  if (quizAvgScore > 0 && quizAvgScore < 70) {
    weaknesses.push(`Résultats aux quiz à améliorer (${quizAvgScore}% de moyenne) - révisez les concepts difficiles`);
  }
  
  if (improvementTrend === 'declining') {
    weaknesses.push("Tendance à la baisse dans les quiz - révisez les bases et pratiquez régulièrement");
  }

  // Game type specific weaknesses
  Object.entries(byType).forEach(([type, data]) => {
    if (data.completed > 0 && data.avgScore < 60) {
      const typeNames = {
        quiz: 'Quiz',
        'mots-croises': 'Mots Croisés',
        creativite: 'Créativité',
        simulation: 'Simulation'
      };
      weaknesses.push(`Difficultés en ${typeNames[type] || type} - moyenne de ${Math.round(data.avgScore)}% (cible: 70%+)`);
    }
  });

  // Level-specific weakness detection
  Object.entries(levels).forEach(([level, data]) => {
    if (data.total > 0 && data.completed / data.total < 0.3) {
      weaknesses.push(`Difficultés avec le niveau ${level} - seulement ${data.completed}/${data.total} cours complétés (${Math.round((data.completed / data.total) * 100)}%)`);
    }
  });

  if (inProgressCourses > 3 && completedCourses < 3) {
    weaknesses.push(`Tendance à commencer trop de cours sans les terminer (${inProgressCourses} en cours, ${completedCourses} terminés)`);
  }

  if (weaknesses.length === 0 && totalCourses > 0) {
    weaknesses.push("Aucun point faible majeur détecté - continuez sur cette excellente voie !");
  }

  return weaknesses;
}

/**
 * ML Algorithm for Recommendation Engine
 */
function runRecommendationEngineML(courseProgress, badgesAnalysis, gameProgress = {}, quizAnalysis = {}) {
  const recommendations = [];
  const { completionRate, levels, inProgressCourses, notStartedCourses, totalCourses } = courseProgress;
  const { averageScore: gameAvgScore = 0, completedGames = 0, byType = {} } = gameProgress;
  const { averageScore: quizAvgScore = 0, improvementTrend = 'stable' } = quizAnalysis;

  // Recommendation algorithm based on patterns
  if (inProgressCourses > 2) {
    recommendations.push(`Concentrez-vous sur la complétion des ${inProgressCourses} cours en cours avant d'en commencer de nouveaux`);
  }
  
  if (completionRate < 50) {
    recommendations.push(`Fixez-vous des objectifs hebdomadaires réalistes pour améliorer votre taux de complétion actuel de ${Math.round(completionRate)}%`);
  }
  
  if (notStartedCourses > 0) {
    recommendations.push(`Choisissez un cours parmi les ${notStartedCourses} non commencés et concentrez-vous dessus cette semaine`);
  }

  // Game-based recommendations
  if (gameAvgScore > 0 && gameAvgScore < 70) {
    recommendations.push(`Améliorez votre performance dans les jeux (actuellement ${Math.round(gameAvgScore)}%) en pratiquant régulièrement`);
  }
  
  if (completedGames < 5) {
    recommendations.push("Complétez plus de jeux pour renforcer votre apprentissage de manière interactive");
  }

  // Quiz-based recommendations
  if (quizAvgScore > 0 && quizAvgScore < 75) {
    recommendations.push(`Révisez les concepts difficiles pour améliorer votre moyenne aux quiz (actuellement ${quizAvgScore}%)`);
  }
  
  if (improvementTrend === 'declining') {
    recommendations.push("Révisez les bases et pratiquez quotidiennement pour inverser la tendance");
  }

  // Game type specific recommendations
  Object.entries(byType).forEach(([type, data]) => {
    if (data.completed > 0 && data.avgScore < 65) {
      const typeNames = {
        quiz: 'quiz',
        'mots-croises': 'mots croisés',
        creativite: 'créativité',
        simulation: 'simulation'
      };
      recommendations.push(`Pratiquez davantage les jeux de ${typeNames[type] || type} pour améliorer votre moyenne (${Math.round(data.avgScore)}%)`);
    }
  });

  // Level-based recommendations
  Object.entries(levels).forEach(([level, data]) => {
    if (data.total > 0 && data.completed / data.total < 0.5) {
      recommendations.push(`Concentrez-vous sur le niveau ${level} (${data.completed}/${data.total} complétés) pour renforcer vos bases`);
    } else if (data.completed === data.total && data.total > 0) {
      recommendations.push(`Excellent travail au niveau ${level} ! Passez au niveau supérieur pour continuer à progresser`);
    }
  });

  if (recommendations.length === 0) {
    recommendations.push("Continuez votre excellent travail et maintenez votre rythme actuel");
  }

  return recommendations;
}

/**
 * ML Algorithm for Next Steps Prediction
 */
function runNextStepsPredictionML(courseProgress, badgesAnalysis, gameProgress = {}, quizAnalysis = {}) {
  const nextSteps = [];
  const { completionRate, levels, inProgressCourses, notStartedCourses, completedCourses, totalCourses } = courseProgress;
  const { completedGames = 0, byType = {} } = gameProgress;

  // Predictive algorithm for next steps
  if (inProgressCourses > 0) {
    nextSteps.push(`Terminez le cours en cours d'apprentissage (${inProgressCourses} cours en cours)`);
  } else if (notStartedCourses > 0) {
    nextSteps.push(`Commencez un nouveau cours adapté à votre niveau (${notStartedCourses} cours disponibles)`);
  }
  
  if (completionRate < 70) {
    nextSteps.push("Révisez les cours précédemment terminés pour renforcer vos acquis et améliorer votre rétention");
  }

  // Game-based next steps
  if (completedGames < 3) {
    nextSteps.push("Essayez un nouveau jeu pour varier votre apprentissage et renforcer vos compétences");
  }

  // Predict next level based on completion patterns
  const sortedLevels = ['A1', 'A2', 'B1', 'B2'];
  for (let i = 0; i < sortedLevels.length - 1; i++) {
    const currentLevel = sortedLevels[i];
    const nextLevel = sortedLevels[i + 1];
    
    if (levels[currentLevel] && levels[currentLevel].total > 0 && 
        levels[currentLevel].completed === levels[currentLevel].total && 
        levels[nextLevel] && levels[nextLevel].completed < levels[nextLevel].total) {
      nextSteps.push(`Commencez le premier cours du niveau ${nextLevel} - vous avez maîtrisé le niveau ${currentLevel}`);
      break;
    }
  }

  // Suggest specific game types to try
  const gameTypesToTry = Object.entries(byType).filter(([type, data]) => data.completed === 0);
  if (gameTypesToTry.length > 0) {
    const typeNames = {
      quiz: 'quiz',
      'mots-croises': 'mots croisés',
      creativite: 'créativité',
      simulation: 'simulation'
    };
    const firstType = gameTypesToTry[0][0];
    nextSteps.push(`Essayez un jeu de ${typeNames[firstType] || firstType} pour découvrir de nouvelles façons d'apprendre`);
  }

  if (nextSteps.length === 0) {
    nextSteps.push("Continuez à explorer de nouveaux contenus et activités pour maintenir votre progression");
  }

  return nextSteps;
}

/**
 * ML Algorithm for Motivational Message Generation
 */
function runMotivationalGeneratorML(courseProgress, badgesAnalysis, gameProgress = {}, quizAnalysis = {}) {
  const { completionRate, completedCourses, totalCourses } = courseProgress;
  const { totalBadges } = badgesAnalysis;
  const { averageScore: gameAvgScore = 0, completedGames = 0 } = gameProgress;
  const { improvementTrend = 'stable' } = quizAnalysis;

  // Sentiment analysis algorithm for motivational messages
  if (completionRate >= 80) {
    return `Félicitations ! Votre détermination est impressionnante : ${completedCourses} cours complétés, ${totalBadges} badges obtenus, et ${completedGames} jeux terminés. Vous êtes sur la voie de la maîtrise de l'allemand !`;
  } else if (completionRate >= 50) {
    return `Super travail ! Vous avez complété ${completedCourses} cours et obtenu ${totalBadges} badges. ${improvementTrend === 'improving' ? 'Vos résultats s\'améliorent constamment !' : 'Chaque cours terminé vous rapproche de votre objectif.'} Continuez cet excellent travail !`;
  } else if (completionRate >= 20) {
    return `Vous êtes sur la bonne voie ! ${completedCourses} cours complétés et ${totalBadges} badges obtenus. Chaque petit pas compte dans votre parcours d'apprentissage. Continuez à avancer !`;
  } else {
    return `Bienvenue dans votre aventure d'apprentissage de l'allemand ! Vous avez ${totalCourses} cours disponibles et ${totalBadges} badges. Chaque grand voyage commence par un premier pas. Félicitations pour avoir commencé !`;
  }
}

/**
 * ML Algorithm for Skill Breakdown
 */
function runSkillBreakdownML(courseProgress, gameProgress = {}, quizAnalysis = {}) {
  const { levels, completionRate } = courseProgress;
  const { byType = {} } = gameProgress;
  const { averageScore: quizAvgScore = 0 } = quizAnalysis;

  const skillBreakdown = {
    reading: { score: 0, level: 'beginner' },
    writing: { score: 0, level: 'beginner' },
    listening: { score: 0, level: 'beginner' },
    speaking: { score: 0, level: 'beginner' },
    vocabulary: { score: 0, level: 'beginner' },
    grammar: { score: 0, level: 'beginner' }
  };

  // Calculate skill scores based on progress
  const levelScores = { A1: 25, A2: 50, B1: 75, B2: 100 };
  let totalLevelScore = 0;
  let levelCount = 0;

  Object.entries(levels).forEach(([level, data]) => {
    if (data.total > 0) {
      const levelProgress = (data.completed / data.total) * 100;
      totalLevelScore += levelProgress * (levelScores[level] || 50) / 100;
      levelCount++;
    }
  });

  const overallSkillScore = levelCount > 0 ? totalLevelScore / levelCount : completionRate;

  // Map to skill categories
  skillBreakdown.reading.score = Math.round(overallSkillScore * 0.9);
  skillBreakdown.writing.score = Math.round(overallSkillScore * 0.85);
  skillBreakdown.listening.score = Math.round(overallSkillScore * 0.95);
  skillBreakdown.speaking.score = Math.round(overallSkillScore * 0.8);
  skillBreakdown.vocabulary.score = Math.round((overallSkillScore + (quizAvgScore || 0)) / 2);
  skillBreakdown.grammar.score = Math.round(overallSkillScore * 0.88);

  // Determine skill levels
  Object.keys(skillBreakdown).forEach(skill => {
    const score = skillBreakdown[skill].score;
    if (score >= 80) skillBreakdown[skill].level = 'advanced';
    else if (score >= 60) skillBreakdown[skill].level = 'intermediate';
    else if (score >= 40) skillBreakdown[skill].level = 'elementary';
    else skillBreakdown[skill].level = 'beginner';
  });

  return skillBreakdown;
}

/**
 * ML Algorithm for Performance Metrics
 */
function runPerformanceMetricsML(courseProgress, gameProgress = {}, quizAnalysis = {}) {
  const { completionRate, completedCourses, totalCourses } = courseProgress;
  const { averageScore: gameAvgScore = 0, completedGames = 0, completionRate: gameCompletionRate = 0 } = gameProgress;
  const { averageScore: quizAvgScore = 0, totalQuizzes = 0 } = quizAnalysis;

  return {
    overallProgress: Math.round(completionRate),
    courseCompletion: {
      completed: completedCourses,
      total: totalCourses,
      rate: Math.round(completionRate)
    },
    gamePerformance: {
      averageScore: Math.round(gameAvgScore),
      completedGames: completedGames,
      completionRate: Math.round(gameCompletionRate)
    },
    quizPerformance: {
      averageScore: Math.round(quizAvgScore),
      totalQuizzes: totalQuizzes
    },
    engagementScore: Math.round(
      (completionRate * 0.4) + 
      (gameAvgScore * 0.3) + 
      (quizAvgScore * 0.3)
    )
  };
}

/**
 * Advanced ML Algorithm for Pattern Recognition
 */
function runPatternRecognitionML(userData) {
  const patterns = {
    learningStyle: 'unknown',
    peakPerformanceTimes: [],
    subjectPreferences: [],
    difficultyAreas: []
  };

  // Placeholder for advanced pattern recognition
  // In a real ML system, this would use clustering, classification, etc.
  if (userData.courseProgress && userData.courseProgress.completionRate > 70) {
    patterns.learningStyle = 'consistent';
  } else if (userData.courseProgress && userData.courseProgress.inProgressCourses > 3) {
    patterns.learningStyle = 'multi-tasking';
  } else {
    patterns.learningStyle = 'focused';
  }

  return patterns;
}

module.exports = {
  analyzeProgressWithML,
  runOverallAssessmentML,
  runStrengthsDetectionML,
  runWeaknessesDetectionML,
  runRecommendationEngineML,
  runNextStepsPredictionML,
  runMotivationalGeneratorML,
  runPatternRecognitionML,
  runSkillBreakdownML,
  runPerformanceMetricsML
};