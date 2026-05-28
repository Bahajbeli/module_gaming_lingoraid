/**
 * AI Quiz Generation Routes
 * Provides endpoints for generating quizzes dynamically using AI
 */

const express = require('express');
const router = express.Router();
const { generateQuizFromCourse } = require('../services/aiQuizGenerator');

// Endpoint to generate quiz from course content
router.post('/generate', async (req, res) => {
  try {
    const { courseContent, courseTitle, difficulty = 'medium', numberOfQuestions = 5 } = req.body;
    
    console.log(`\n=== AI QUIZ GENERATION REQUEST ===`);
    console.log(`Course: ${courseTitle}`);
    console.log(`Difficulty: ${difficulty}`);
    console.log(`Questions: ${numberOfQuestions}`);
    
    // Validate required fields
    if (!courseContent || !courseTitle) {
      return res.status(400).json({
        error: 'Missing required fields: courseContent and courseTitle',
        details: {
          courseContent: !!courseContent,
          courseTitle: !!courseTitle
        }
      });
    }
    
    // Validate difficulty level
    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({
        error: `Invalid difficulty level. Valid options: ${validDifficulties.join(', ')}`
      });
    }
    
    // Validate number of questions
    if (numberOfQuestions < 1 || numberOfQuestions > 20) {
      return res.status(400).json({
        error: 'Number of questions must be between 1 and 20'
      });
    }
    
    // Generate quiz using AI
    const quiz = await generateQuizFromCourse(
      courseContent,
      courseTitle,
      difficulty,
      numberOfQuestions
    );
    
    console.log(`✅ Quiz generated successfully with ${quiz.length} questions`);
    
    res.json({
      success: true,
      quiz,
      metadata: {
        courseTitle,
        difficulty,
        numberOfQuestions: quiz.length,
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error in AI quiz generation:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate quiz',
      message: error.message
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'AI Quiz Generator',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;