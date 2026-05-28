import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Zap, Target, ArrowRight, Sparkles } from 'lucide-react';

const RewardPage = ({ 
  reward, 
  onContinue, 
  onNextChapter,
  userProgress 
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    // Séquence d'animations
    const timer1 = setTimeout(() => setShowConfetti(true), 500);
    const timer2 = setTimeout(() => setShowReward(true), 1500);
    const timer3 = setTimeout(() => setShowStats(true), 2500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const { badge, points, chapter, nextChapter } = reward;
  const { totalPoints, streak, badges } = userProgress;

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Confetti Animation */}
      <AnimatePresence>
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: -10,
                  rotate: 0,
                  scale: 0
                }}
                animate={{
                  y: window.innerHeight + 10,
                  rotate: 360,
                  scale: [0, 1, 0],
                  x: Math.random() * window.innerWidth
                }}
                transition={{
                  duration: 3,
                  delay: Math.random() * 2,
                  ease: "easeOut"
                }}
                style={{
                  left: Math.random() * 100 + '%',
                  backgroundColor: ['#fbbf24', '#f59e0b', '#d97706', '#f97316', '#ea580c'][Math.floor(Math.random() * 5)]
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      <motion.div
        className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full relative z-10"
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Header avec étoiles */}
        <div className="text-center mb-8">
          <motion.div
            className="relative inline-block"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1, type: "spring", stiffness: 200 }}
          >
            <div className="absolute -top-4 -left-4">
              <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
            </div>
            <div className="absolute -top-4 -right-4">
              <Sparkles className="w-6 h-6 text-orange-400 animate-pulse" />
            </div>
            <div className="absolute -bottom-2 -left-2">
              <Sparkles className="w-4 h-4 text-red-400 animate-pulse" />
            </div>
            <div className="absolute -bottom-2 -right-2">
              <Sparkles className="w-5 h-5 text-pink-400 animate-pulse" />
            </div>
            
            <motion.div
              className="text-6xl mb-4"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {badge.icon}
            </motion.div>
          </motion.div>

          <AnimatePresence>
            {showReward && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  Félicitations !
                </h1>
                <h2 className="text-xl font-semibold text-blue-600 mb-4">
                  {badge.name}
                </h2>
                <p className="text-gray-600 mb-6">
                  {badge.description}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Points et récompenses */}
        <AnimatePresence>
          {showReward && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl p-6 mb-6"
            >
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="flex items-center justify-center mb-2">
                    <Star className="w-6 h-6 text-yellow-500 mr-2" />
                    <span className="text-2xl font-bold text-yellow-600">+{points}</span>
                  </div>
                  <span className="text-sm text-gray-600">Points gagnés</span>
                </div>
                <div>
                  <div className="flex items-center justify-center mb-2">
                    <Trophy className="w-6 h-6 text-orange-500 mr-2" />
                    <span className="text-2xl font-bold text-orange-600">+1</span>
                  </div>
                  <span className="text-sm text-gray-600">Badge obtenu</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Statistiques */}
        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="space-y-4 mb-8"
            >
              <h3 className="text-lg font-semibold text-gray-800 text-center mb-4">
                Vos statistiques
              </h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Star className="w-5 h-5 text-blue-500 mr-1" />
                    <span className="text-xl font-bold text-blue-600">{totalPoints + points}</span>
                  </div>
                  <span className="text-xs text-gray-600">Points totaux</span>
                </div>
                
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Zap className="w-5 h-5 text-green-500 mr-1" />
                    <span className="text-xl font-bold text-green-600">{streak}</span>
                  </div>
                  <span className="text-xs text-gray-600">Jours de suite</span>
                </div>
                
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Trophy className="w-5 h-5 text-purple-500 mr-1" />
                    <span className="text-xl font-bold text-purple-600">{badges.length + 1}</span>
                  </div>
                  <span className="text-xs text-gray-600">Badges</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Boutons d'action */}
        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              {nextChapter ? (
                <motion.button
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
                  onClick={onNextChapter}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>Chapitre suivant</span>
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              ) : (
                <motion.button
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-green-600 hover:to-green-700 transition-all duration-200"
                  onClick={onContinue}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>Continue l'apprentissage</span>
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              )}
              
              <motion.button
                className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
                onClick={onContinue}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Voir mes progrès
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default RewardPage;

