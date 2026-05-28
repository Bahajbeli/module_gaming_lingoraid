/**
 * AI Quiz Generator Service
 * Generates quizzes dynamically based on course content using AI
 */

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

/**
 * Generate a quiz based on course content using AI
 * @param {string} courseContent - The content to generate quiz from
 * @param {string} courseTitle - Title of the course
 * @param {string} difficulty - Difficulty level (easy, medium, hard)
 * @param {number} numberOfQuestions - Number of questions to generate
 * @returns {Promise<Array>} Array of quiz questions
 */
async function generateQuizFromCourse(courseContent, courseTitle, difficulty = 'medium', numberOfQuestions = 5) {
  console.log(`\n=== GENERATING QUIZ FOR: ${courseTitle} ===`);
  console.log(`Difficulty: ${difficulty}, Questions: ${numberOfQuestions}`);
  
  try {
    // Prepare the prompt for AI
    const prompt = `
      Generate a German language quiz based on the following course content.
      
      Course: "${courseTitle}"
      Content: "${courseContent}"
      
      Requirements:
      1. Generate exactly ${numberOfQuestions} questions
      2. Difficulty level: ${difficulty}
      3. Return in JSON format with this structure:
      [
        {
          "question": "The quiz question in German",
          "englishTranslation": "English translation of the question",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "englishOptionTranslations": ["Translation A", "Translation B", "Translation C", "Translation D"],
          "correctAnswer": "The correct option text",
          "correctAnswerEnglish": "English translation of correct answer",
          "explanation": "Brief explanation of why this is correct",
          "explanationEnglish": "English translation of explanation",
          "type": "multiple-choice" // or "true-false", "fill-blank"
        }
      ]
      4. Make questions relevant to German language learning
      5. Include various question types: vocabulary, grammar, pronunciation, cultural context
      6. Ensure all content is in German
      7. Make questions appropriate for the course level
      8. Provide English translations for all German content
    `;

    // Try Groq API first (free tier)
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      console.log('Using Groq API for quiz generation...');
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful German language teacher. Respond with only valid JSON as specified, no additional text.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0].message.content;
        
        try {
          // Extract JSON from response (sometimes wrapped in markdown)
          const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```|```([\s\S]*?)```|([\s\S]+)/);
          const jsonString = jsonMatch?.[1] || jsonMatch?.[2] || jsonMatch?.[3] || content;
          
          const quiz = JSON.parse(jsonString.trim());
          
          // Handle potential nested structure from AI response
          let quizQuestions = quiz;
          if (quiz.questions && Array.isArray(quiz.questions)) {
            quizQuestions = quiz.questions;
          } else if (quiz.quiz && Array.isArray(quiz.quiz)) {
            quizQuestions = quiz.quiz;
          } else if (Array.isArray(quiz)) {
            quizQuestions = quiz;
          } else {
            console.warn('Unexpected quiz structure, using as-is:', typeof quiz);
            quizQuestions = quiz;
          }
          
          console.log('✅ Quiz generated successfully with Groq API');
          console.log(`Generated ${quizQuestions.length} questions`);
          return quizQuestions;
        } catch (parseError) {
          console.error('❌ JSON parse error:', parseError);
          console.log('Response content:', content);
          throw new Error('Invalid JSON response from AI');
        }
      } else {
        console.log('❌ Groq API failed, trying fallback...');
      }
    }

    // Fallback to other APIs if Groq fails
    // Try DeepSeek API
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (deepseekKey) {
      console.log('Using DeepSeek API for quiz generation...');
      
      const response = await fetch(process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful German language teacher. Respond with only valid JSON as specified, no additional text.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0].message.content;
        
        try {
          const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```|```([\s\S]*?)```|([\s\S]+)/);
          const jsonString = jsonMatch?.[1] || jsonMatch?.[2] || jsonMatch?.[3] || content;
          
          const quiz = JSON.parse(jsonString.trim());
          
          // Handle potential nested structure from AI response
          let quizQuestions = quiz;
          if (quiz.questions && Array.isArray(quiz.questions)) {
            quizQuestions = quiz.questions;
          } else if (quiz.quiz && Array.isArray(quiz.quiz)) {
            quizQuestions = quiz.quiz;
          } else if (Array.isArray(quiz)) {
            quizQuestions = quiz;
          } else {
            console.warn('Unexpected quiz structure, using as-is:', typeof quiz);
            quizQuestions = quiz;
          }
          
          console.log('✅ Quiz generated successfully with DeepSeek API');
          return quizQuestions;
        } catch (parseError) {
          console.error('❌ JSON parse error:', parseError);
        }
      }
    }

    // If all AI attempts fail, generate a sample quiz
    console.log('⚠️ All AI services failed, generating sample quiz...');
    return generateSampleQuiz(courseTitle, numberOfQuestions);
    
  } catch (error) {
    console.error('❌ Error generating quiz:', error);
    return generateSampleQuiz(courseTitle, numberOfQuestions);
  }
}

/**
 * Generate a sample quiz when AI fails
 */
function generateSampleQuiz(courseTitle, numberOfQuestions) {
  const sampleQuestions = [
    {
      question: "Wie sagt man 'Guten Morgen' auf Deutsch?",
      options: ["Good Morning", "Good Evening", "Good Night", "Good Afternoon"],
      correctAnswer: "Good Morning",
      explanation: "'Guten Morgen' bedeutet 'Good Morning' auf Englisch.",
      type: "multiple-choice"
    },
    {
      question: "Was ist die korrekte Antwort auf 'Wie geht es Ihnen?'",
      options: ["Danke, gut", "Auf Wiedersehen", "Entschuldigung", "Bitte"],
      correctAnswer: "Danke, gut",
      explanation: "'Danke, gut' ist eine höfliche Antwort auf die Frage 'Wie geht es Ihnen?'",
      type: "multiple-choice"
    },
    {
      question: "Ist 'Hallo' eine formelle oder informelle Begrüßung?",
      options: ["Formell", "Informell", "Beides", "Keine von beiden"],
      correctAnswer: "Beides",
      explanation: "'Hallo' kann sowohl formell als auch informell verwendet werden.",
      type: "multiple-choice"
    },
    {
      question: "Wie sagt man 'Goodbye' auf Deutsch?",
      options: ["Auf Wiedersehen", "Guten Tag", "Entschuldigung", "Bitte"],
      correctAnswer: "Auf Wiedersehen",
      explanation: "'Auf Wiedersehen' ist die Standard-Antwort für 'Goodbye'.",
      type: "multiple-choice"
    },
    {
      question: "Welches Wort bedeutet 'Thank you'?",
      options: ["Danke", "Bitte", "Entschuldigung", "Auf Wiedersehen"],
      correctAnswer: "Danke",
      explanation: "'Danke' ist das deutsche Wort für 'Thank you'.",
      type: "multiple-choice"
    }
  ];

  // Return requested number of questions (duplicate if needed)
  const result = [];
  for (let i = 0; i < numberOfQuestions; i++) {
    result.push(sampleQuestions[i % sampleQuestions.length]);
  }
  
  console.log('✅ Sample quiz generated');
  return result;
}

module.exports = {
  generateQuizFromCourse
};