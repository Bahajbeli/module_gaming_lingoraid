import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Flame, Calendar, Target } from 'lucide-react';

const StreakTracker = ({ 
  currentStreak, 
  bestStreak, 
  lastLoginDate,
  onStreakUpdate 
}) => {
  const [showStreakAnimation, setShowStreakAnimation] = useState(false);
  const [streakMessage, setStreakMessage] = useState('');

  useEffect(() => {
    // Vérifier si l'utilisateur a une nouvelle série
    const today = new Date().toDateString();
    const lastLogin = lastLoginDate ? new Date(lastLoginDate).toDateString() : null;
    
    if (lastLogin !== today && currentStreak > 0) {
      setShowStreakAnimation(true);
      
      if (currentStreak === 1) {
        setStreakMessage('Premier jour de série ! 🔥');
      } else if (currentStreak === 3) {
        setStreakMessage('3 days de suite ! Vous êtes en feu ! 🔥🔥');
      } else if (currentStreak === 7) {
        setStreakMessage('Une semaine complète ! Incroyable ! 🔥🔥🔥');
      } else if (currentStreak === 30) {
        setStreakMessage('30 days ! Vous êtes un champion ! 🏆');
      } else {
        setStreakMessage(`${currentStreak} days de suite ! Continuez ! 🔥`);
      }
      
      setTimeout(() => {
        setShowStreakAnimation(false);
      }, 3000);
    }
  }, [currentStreak, lastLoginDate]);

  const getStreakLevel = (streak) => {
    if (streak >= 30) return { level: 'Champion', color: 'from-purple-500 to-purple-600', icon: '👑' };
    if (streak >= 14) return { level: 'Expert', color: 'from-red-500 to-red-600', icon: '🔥' };
    if (streak >= 7) return { level: 'Déterminé', color: 'from-orange-500 to-orange-600', icon: '⚡' };
    if (streak >= 3) return { level: 'Régulier', color: 'from-yellow-500 to-yellow-600', icon: '🌟' };
    return { level: 'Débutant', color: 'from-blue-500 to-blue-600', icon: '🌱' };
  };

  const streakLevel = getStreakLevel(currentStreak);
  const daysUntilNextMilestone = getNextMilestone(currentStreak);

  function getNextMilestone(streak) {
    const milestones = [3, 7, 14, 30, 60, 100];
    const nextMilestone = milestones.find(milestone => milestone > streak);
    return nextMilestone ? nextMilestone - streak : null;
  }

  return (
    <div className="relative">
      {/* Animation de série */}
      <AnimatePresence>
        {showStreakAnimation && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed top-4 right-4 z-50 bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-xl shadow-lg"
          >
            <div className="flex items-center space-x-2">
              <Flame className="w-6 h-6 animate-pulse" />
              <span className="font-semibold">{streakMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widget de série */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Série quotidienne</h3>
          <div className="flex items-center space-x-1">
            <Zap className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-medium text-gray-600">{streakLevel.level}</span>
          </div>
        </div>

        {/* Série actuelle */}
        <div className="text-center mb-6">
          <motion.div
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r ${streakLevel.color} text-white mb-3`}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-2xl font-bold">{currentStreak}</span>
          </motion.div>
          <p className="text-sm text-gray-600">days consécutifs</p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <Target className="w-4 h-4 text-blue-500 mr-1" />
              <span className="text-lg font-bold text-blue-600">{bestStreak}</span>
            </div>
            <span className="text-xs text-gray-600">Meilleure série</span>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <Calendar className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-lg font-bold text-green-600">
                {daysUntilNextMilestone || '∞'}
              </span>
            </div>
            <span className="text-xs text-gray-600">
              {daysUntilNextMilestone ? 'Jours restants' : 'Objectif atteint'}
            </span>
          </div>
        </div>

        {/* Barre de progression vers le prochain objectif */}
        {daysUntilNextMilestone && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-600">Prochain objectif</span>
              <span className="text-xs font-medium text-gray-600">
                {currentStreak}/{currentStreak + daysUntilNextMilestone}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(currentStreak / (currentStreak + daysUntilNextMilestone)) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        )}

        {/* Conseils pour maintenir la série */}
        <div className="bg-blue-50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Conseil</h4>
          <p className="text-xs text-blue-700">
            {currentStreak === 0 
              ? "Commencez votre série aujourd'hui !"
              : currentStreak < 3
              ? "Continuez encore 2 days pour votre premier badge !"
              : currentStreak < 7
              ? "Plus que quelques days pour la série hebdomadaire !"
              : "Vous êtes sur la bonne voie ! Maintenez votre série !"
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default StreakTracker;

