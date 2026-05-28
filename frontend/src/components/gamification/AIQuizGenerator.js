import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/axios';

const AIQuizGenerator = ({ courseContent, courseTitle, onQuizGenerated, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [showAnswerFeedback, setShowAnswerFeedback] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);

  const generateQuiz = async () => {
    if (!courseContent || !courseTitle) {
      setError('Course content and title are required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/api/ai-quiz/generate', {
        courseContent,
        courseTitle,
        difficulty,
        numberOfQuestions
      });

      if (response.data.success) {
        setQuiz(response.data.quiz);
        setScore(0);
        setCurrentQuestionIndex(0);
        setUserAnswers([]);
        setShowResults(false);
        setShowAnswerFeedback(false); // Réinitialiser le feedback pour le nouveau quiz
        setShowExplanation(false); // Réinitialiser l'explication pour le nouveau quiz
        setError('');
        
        if (onQuizGenerated) {
          onQuizGenerated(response.data.quiz);
        }
      } else {
        setError(response.data.error || 'Failed to generate quiz');
      }
    } catch (err) {
      console.error('Error generating quiz:', err);
      setError(err.response?.data?.error || 'An error occurred while generating the quiz');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (answer) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = answer;
    setUserAnswers(newAnswers);
    // Ne pas activer le feedback immédiatement, seulement quand on clique sur Suivant
  };

  const handleNextQuestion = () => {
    if (!showAnswerFeedback) {
      // Première étape: montrer le feedback et l'explication
      setShowAnswerFeedback(true);
      setShowExplanation(true);
    } else {
      // Deuxième étape: passer à la question suivante ou terminer
      setTimeout(() => { // Délai pour permettre la transition
        if (quiz && currentQuestionIndex < quiz.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setShowAnswerFeedback(false);
          setShowExplanation(false); // Réinitialiser pour la prochaine question
        } else {
          calculateScore();
          setShowResults(true);
        }
      }, 500);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setShowAnswerFeedback(false); // Réinitialiser le feedback quand on revient en arrière
      setShowExplanation(false); // Réinitialiser l'explication aussi
    }
  };

  const calculateScore = () => {
    let correctAnswers = 0;
    if (quiz) {
      quiz.forEach((question, index) => {
        if (userAnswers[index] === question.correctAnswer) {
          correctAnswers++;
        }
      });
    }
    setScore(correctAnswers);
  };

  const restartQuiz = () => {
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setShowResults(false);
    setScore(0);
  };

  const retakeQuiz = () => {
    generateQuiz();
  };

  if (!quiz || showResults) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto">
        {!quiz ? (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Générer un Quiz IA</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulté
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de questions
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={numberOfQuestions}
                  onChange={(e) => setNumberOfQuestions(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={generateQuiz}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Génération...
                    </>
                  ) : (
                    'Générer le Quiz'
                  )}
                </button>
                
                {onClose && (
                  <button
                    onClick={onClose}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Fermer
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-6"
            >
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Quiz Terminé!</h2>
              <p className="text-xl text-gray-600 mb-2">
                Score: {score} / {quiz.length}
              </p>
              <p className="text-gray-500">
                {score === quiz.length ? 'Parfait! 🏆' : 
                 score >= quiz.length * 0.7 ? 'Bien joué! 👍' : 
                 score >= quiz.length * 0.5 ? 'Bon effort! 💪' : 'Continuez à pratiquer! 📚'}
              </p>
            </motion.div>

            <div className="space-y-4">
              <button
                onClick={restartQuiz}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200"
              >
                Reprendre le même quiz
              </button>
              <button
                onClick={retakeQuiz}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
              >
                Générer un nouveau quiz
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back au cours
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentQuestion = quiz && quiz[currentQuestionIndex] ? quiz[currentQuestionIndex] : null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Quiz IA</h2>
        <div className="text-sm text-gray-500">
          Question {currentQuestionIndex + 1} / {quiz.length}
        </div>
      </div>

      <div className="mb-6">
        {currentQuestion ? (
          <>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-lg font-medium text-gray-800">{currentQuestion.question}</p>
              {currentQuestion.englishTranslation && (
                <p className="text-sm text-gray-600 mt-2 italic">Traduction: {currentQuestion.englishTranslation}</p>
              )}
            </div>

            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAnswerSelect(option)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                    userAnswers[currentQuestionIndex] === option
                      ? showAnswerFeedback
                        ? option === currentQuestion.correctAnswer
                          ? 'border-green-500 bg-green-50'
                          : 'border-red-500 bg-red-50'
                        : 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${
                      userAnswers[currentQuestionIndex] === option
                        ? showAnswerFeedback
                          ? option === currentQuestion.correctAnswer
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-red-500 bg-red-500 text-white'
                          : 'border-blue-500 bg-blue-500 text-white'
                        : 'border-gray-300'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <div>
                      <span>{option}</span>
                      {currentQuestion.englishOptionTranslations && currentQuestion.englishOptionTranslations[index] && (
                        <span className="text-xs text-gray-500 block">{currentQuestion.englishOptionTranslations[index]}</span>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading de la question...</p>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Précédent
        </button>

        <div className="text-sm text-gray-500">
          {currentQuestion && userAnswers[currentQuestionIndex] ? (showAnswerFeedback ? (userAnswers[currentQuestionIndex] === currentQuestion.correctAnswer ? '✅ Bonne réponse! Cliquez sur Suivant' : `❌ Mauvaise réponse! La bonne réponse est: ${currentQuestion.correctAnswer}. Cliquez sur Suivant`) : 'Réponse sélectionnée - Cliquez sur Confirmer pour voir l\'explication') : 'Sélectionnez une réponse'}
        </div>

        <button
          onClick={handleNextQuestion}
          disabled={!userAnswers[currentQuestionIndex]}
          className={`px-6 py-2 rounded-lg font-medium transition-colors duration-200 ${
            userAnswers[currentQuestionIndex]
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {showAnswerFeedback ? (currentQuestionIndex === quiz.length - 1 ? 'Completedr' : 'Suivant') : 'Confirmer'}
        </button>
      </div>

      {currentQuestion && userAnswers[currentQuestionIndex] && showExplanation && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Explication:</strong> {currentQuestion.explanation}
            {currentQuestion.explanationEnglish && <><br /><span className="italic">({currentQuestion.explanationEnglish})</span></>}</p>
        </div>
      )}
    </div>
  );
};

export default AIQuizGenerator;