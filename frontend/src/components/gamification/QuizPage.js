import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, ArrowRight, Star, Zap } from 'lucide-react';

const QuizPage = ({ 
  questions, 
  onComplete, 
  onNext, 
  points = 0,
  timeLimit = null 
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [earnedPoints, setEarnedPoints] = useState(0);

  useEffect(() => {
    if (timeLimit && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLimit && timeLeft === 0) {
      handleAnswer(-1); // Timeout
    }
  }, [timeLeft]);

  const handleAnswer = (answerIndex) => {
    if (showResult) return;
    
    setSelectedAnswer(answerIndex);
    setShowResult(true);
    
    const isCorrect = answerIndex === questions[currentQuestion].correct;
    if (isCorrect) {
      setScore(score + 1);
      setEarnedPoints(earnedPoints + (questions[currentQuestion].points || 5));
    }

    // Animation de feedback
    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
        setShowResult(false);
        setTimeLeft(timeLimit);
      } else {
        onComplete({ score, totalQuestions: questions.length, earnedPoints });
      }
    }, 2000);
  };

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header avec progression */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Quiz</h2>
            <div className="flex items-center space-x-4">
              {timeLimit && (
                <div className="flex items-center space-x-1">
                  <Zap className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium text-gray-600">{timeLeft}s</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-gray-600">{earnedPoints} pts</span>
              </div>
            </div>
          </div>
          
          {/* Barre de progression */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Question {currentQuestion + 1} sur {questions.length}
          </p>
        </div>

        {/* Question */}
        <motion.div
          key={currentQuestion}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -50, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <h3 className="text-xl font-semibold text-gray-800 mb-6 leading-relaxed">
            {currentQ.question}
          </h3>

          {/* Options de réponse */}
          <div className="space-y-3">
            {currentQ.options.map((option, index) => (
              <motion.button
                key={index}
                className={`w-full p-4 rounded-xl text-left transition-all duration-200 ${
                  showResult
                    ? index === currentQ.correct
                      ? 'bg-green-100 border-2 border-green-500 text-green-800'
                      : selectedAnswer === index
                      ? 'bg-red-100 border-2 border-red-500 text-red-800'
                      : 'bg-gray-100 border-2 border-gray-200 text-gray-600'
                    : selectedAnswer === index
                    ? 'bg-blue-100 border-2 border-blue-500 text-blue-800'
                    : 'bg-gray-50 border-2 border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300'
                }`}
                onClick={() => handleAnswer(index)}
                disabled={showResult}
                whileHover={{ scale: showResult ? 1 : 1.02 }}
                whileTap={{ scale: showResult ? 1 : 0.98 }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{option}</span>
                  <AnimatePresence>
                    {showResult && index === currentQ.correct && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200 }}
                      >
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      </motion.div>
                    )}
                    {showResult && selectedAnswer === index && index !== currentQ.correct && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200 }}
                      >
                        <XCircle className="w-6 h-6 text-red-500" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Feedback */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className={`p-4 rounded-xl mb-4 ${
                selectedAnswer === currentQ.correct
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                {selectedAnswer === currentQ.correct ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-green-700 font-medium">Correct ! +{currentQ.points || 5} points</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-700 font-medium">
                      Incorrect. La bonne réponse était : {currentQ.options[currentQ.correct]}
                    </span>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bouton suivant */}
        {showResult && currentQuestion < questions.length - 1 && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1 }}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-medium flex items-center justify-center space-x-2 hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
            onClick={() => {
              setCurrentQuestion(currentQuestion + 1);
              setSelectedAnswer(null);
              setShowResult(false);
              setTimeLeft(timeLimit);
            }}
          >
            <span>Question suivante</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        )}
      </motion.div>
    </div>
  );
};

export default QuizPage;

