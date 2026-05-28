import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Lock, CheckCircle, Sparkles } from 'lucide-react';

const BadgeCollection = ({ 
  badges, 
  allBadges, 
  onBadgeClick,
  showUnlocked = true 
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBadge, setSelectedBadge] = useState(null);

  const categories = [
    { id: 'all', name: 'Tous', icon: '🏆' },
    { id: 'streaks', name: 'Séries', icon: '🔥' },
    { id: 'achievements', name: 'Succès', icon: '⭐' },
    { id: 'lessons', name: 'Leçons', icon: '📚' },
    { id: 'special', name: 'Spéciaux', icon: '🎯' }
  ];

  const filteredBadges = allBadges.filter(badge => {
    if (selectedCategory === 'all') return true;
    return badge.category === selectedCategory;
  });

  const userBadgeIds = badges.map(badge => badge.id);
  const unlockedBadges = filteredBadges.filter(badge => userBadgeIds.includes(badge.id));
  const lockedBadges = filteredBadges.filter(badge => !userBadgeIds.includes(badge.id));

  const handleBadgeClick = (badge) => {
    setSelectedBadge(badge);
    if (onBadgeClick) onBadgeClick(badge);
  };

  const BadgeCard = ({ badge, isUnlocked, index }) => (
    <motion.div
      className={`relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
        isUnlocked
          ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300 hover:border-yellow-400 hover:shadow-lg'
          : 'bg-gray-50 border-gray-200 opacity-60'
      }`}
      onClick={() => handleBadgeClick(badge)}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: isUnlocked ? 1.05 : 1 }}
      whileTap={{ scale: isUnlocked ? 0.95 : 1 }}
    >
      {/* Badge principal */}
      <div className="text-center mb-3">
        <div className={`text-4xl mb-2 ${isUnlocked ? '' : 'grayscale'}`}>
          {badge.icon}
        </div>
        <h3 className={`font-semibold ${isUnlocked ? 'text-gray-800' : 'text-gray-500'}`}>
          {badge.name}
        </h3>
        <p className={`text-sm ${isUnlocked ? 'text-gray-600' : 'text-gray-400'}`}>
          {badge.description}
        </p>
      </div>

      {/* Points */}
      <div className="flex items-center justify-center space-x-1 mb-2">
        <Star className={`w-4 h-4 ${isUnlocked ? 'text-yellow-500' : 'text-gray-400'}`} />
        <span className={`text-sm font-medium ${isUnlocked ? 'text-yellow-600' : 'text-gray-400'}`}>
          {badge.points} pts
        </span>
      </div>

      {/* Statut */}
      <div className="flex items-center justify-center">
        {isUnlocked ? (
          <div className="flex items-center space-x-1 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Obtenu</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1 text-gray-400">
            <Lock className="w-4 h-4" />
            <span className="text-xs font-medium">Verrouillé</span>
          </div>
        )}
      </div>

      {/* Effet de brillance pour les badges débloqués */}
      {isUnlocked && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        />
      )}
    </motion.div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Collection de Badges</h2>
        <div className="flex items-center space-x-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <span className="text-lg font-semibold text-gray-700">
            {unlockedBadges.length}/{allBadges.length}
          </span>
        </div>
      </div>

      {/* Filtres par catégorie */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              selectedCategory === category.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="mr-2">{category.icon}</span>
            {category.name}
          </button>
        ))}
      </div>

      {/* Grille des badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Badges débloqués */}
        {unlockedBadges.map((badge, index) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            isUnlocked={true}
            index={index}
          />
        ))}

        {/* Badges verrouillés */}
        {showUnlocked && lockedBadges.map((badge, index) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            isUnlocked={false}
            index={unlockedBadges.length + index}
          />
        ))}
      </div>

      {/* Statistiques */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{unlockedBadges.length}</div>
            <div className="text-sm text-gray-600">Badges obtenus</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {badges.reduce((sum, badge) => sum + badge.points, 0)}
            </div>
            <div className="text-sm text-gray-600">Points totaux</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {Math.round((unlockedBadges.length / allBadges.length) * 100)}%
            </div>
            <div className="text-sm text-gray-600">Complétion</div>
          </div>
        </div>
      </div>

      {/* Modal de détail du badge */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedBadge(null)}
          >
            <motion.div
              className="bg-white rounded-2xl p-8 max-w-md w-full"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="text-6xl mb-4">{selectedBadge.icon}</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {selectedBadge.name}
                </h3>
                <p className="text-gray-600 mb-4">
                  {selectedBadge.description}
                </p>
                <div className="flex items-center justify-center space-x-1 mb-4">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span className="text-lg font-semibold text-yellow-600">
                    {selectedBadge.points} points
                  </span>
                </div>
                <button
                  onClick={() => setSelectedBadge(null)}
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BadgeCollection;

