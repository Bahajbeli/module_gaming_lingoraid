import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Zap, Target } from 'lucide-react';

const ProgressTracker = ({ 
  userProgress, 
  currentChapter, 
  totalChapters,
  showDetailed = false 
}) => {
  const chapterProgress = (currentChapter / totalChapters) * 100;
  const overallProgress = userProgress?.overallProgress || 0;
  const streak = userProgress?.streak || 0;
  const totalPoints = userProgress?.totalPoints || 0;
  const badges = userProgress?.badges || [];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Votre Progress</h3>
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          <span className="text-sm font-medium text-gray-600">{streak} days</span>
        </div>
      </div>

      {/* Barre de progression globale */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">Progress globale</span>
          <span className="text-sm font-bold text-blue-600">{Math.round(overallProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <motion.div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Progress du chapitre actuel */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">Chapitre actuel</span>
          <span className="text-sm font-bold text-green-600">{Math.round(chapterProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${chapterProgress}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          />
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center mb-1">
            <Star className="w-4 h-4 text-blue-500 mr-1" />
            <span className="text-lg font-bold text-blue-600">{totalPoints}</span>
          </div>
          <span className="text-xs text-gray-600">Points totaux</span>
        </div>
        <div className="bg-orange-50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center mb-1">
            <Trophy className="w-4 h-4 text-orange-500 mr-1" />
            <span className="text-lg font-bold text-orange-600">{badges.length}</span>
          </div>
          <span className="text-xs text-gray-600">Badges</span>
        </div>
      </div>

      {/* Badges récents */}
      {showDetailed && badges.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Badges récents</h4>
          <div className="flex space-x-2">
            {badges.slice(-3).map((badge, index) => (
              <motion.div
                key={badge.id}
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full p-2"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
              >
                <span className="text-lg">{badge.icon}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressTracker;

