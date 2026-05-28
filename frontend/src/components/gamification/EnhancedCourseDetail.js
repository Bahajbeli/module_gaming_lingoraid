import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/axios';

// Import des composants de gamification
import ProgressTracker from './ProgressTracker';
import StreakTracker from './StreakTracker';
import BadgeCollection from './BadgeCollection';

const EnhancedCourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProgress, setUserProgress] = useState({
    totalPoints: 0,
    streak: 0,
    badges: [],
    overallProgress: 0,
    lastLoginDate: null
  });
  const [showGamification, setShowGamification] = useState(false);

  useEffect(() => {
    fetchCourse();
    loadUserProgress();
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/courses/${courseId}`);
      setCourse(response.data);
    } catch (error) {
      console.error('Error lors de la récupération du cours:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProgress = async () => {
    try {
      // Simuler le chargement des progrès utilisateur
      const mockProgress = {
        totalPoints: 150,
        streak: 7,
        badges: [
          { id: 'first-lesson', name: 'Premier Pas', icon: '👶', points: 10 },
          { id: '3-day-streak', name: 'Débutant', icon: '🔥', points: 25 }
        ],
        overallProgress: 25,
        lastLoginDate: new Date().toISOString()
      };
      
      setUserProgress(mockProgress);
    } catch (error) {
      console.error('Error while chargement des progrès:', error);
    }
  };

  const handleStartLearning = () => {
    // Naviguer vers le cours gamifié
    navigate(`/gamified-course/${courseId}/A1-1/A1-1-1`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading du cours...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Cours non trouvé</h2>
          <button
            onClick={() => navigate('/courses')}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Back aux cours
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contenu principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header du cours */}
            <motion.div
              className="bg-white rounded-2xl shadow-lg p-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">{course.title}</h1>
                  <p className="text-gray-600 text-lg">{course.description}</p>
                  <div className="flex items-center space-x-4 mt-4">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      {course.level}
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-600">Level débutant</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600">{userProgress.totalPoints}</div>
                  <div className="text-sm text-gray-500">points totaux</div>
                </div>
              </div>

              {/* Bouton de démarrage */}
              <motion.button
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-xl font-semibold text-lg hover:from-green-600 hover:to-green-700 transition-all duration-200"
                onClick={handleStartLearning}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                🚀 Start l'apprentissage gamifié
              </motion.button>
            </motion.div>

            {/* Contenu du cours */}
            <motion.div
              className="bg-white rounded-2xl shadow-lg p-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Contenu du cours</h2>
              <div className="prose prose-lg max-w-none">
                <div dangerouslySetInnerHTML={{ __html: course.content }} />
              </div>
            </motion.div>

            {/* Fonctionnalités gamifiées */}
            <motion.div
              className="bg-white rounded-2xl shadow-lg p-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Fonctionnalités d'apprentissage</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 p-3 rounded-xl">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Exercices interactifs</h3>
                    <p className="text-gray-600 text-sm">Quiz, glisser-déposer, et exercices de prononciation</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="bg-green-100 p-3 rounded-xl">
                    <span className="text-2xl">🏆</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Système de badges</h3>
                    <p className="text-gray-600 text-sm">Débloquez des badges en progressant</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="bg-orange-100 p-3 rounded-xl">
                    <span className="text-2xl">🔥</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Série quotidienne</h3>
                    <p className="text-gray-600 text-sm">Maintenez votre série d'apprentissage</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="bg-purple-100 p-3 rounded-xl">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Suivi des progrès</h3>
                    <p className="text-gray-600 text-sm">Visualisez votre progression détaillée</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress */}
            <ProgressTracker
              userProgress={userProgress}
              currentChapter={1}
              totalChapters={5}
              showDetailed={true}
            />

            {/* Série */}
            <StreakTracker
              currentStreak={userProgress.streak}
              bestStreak={userProgress.streak + 5}
              lastLoginDate={userProgress.lastLoginDate}
            />

            {/* Badges récents */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Badges récents</h3>
              <div className="space-y-3">
                {userProgress.badges.slice(-3).map((badge, index) => (
                  <motion.div
                    key={badge.id}
                    className="flex items-center space-x-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <span className="text-2xl">{badge.icon}</span>
                    <div>
                      <h4 className="font-medium text-gray-800">{badge.name}</h4>
                      <p className="text-sm text-gray-600">+{badge.points} points</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <button
                onClick={() => setShowGamification(true)}
                className="w-full mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Voir tous les badges →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de gamification */}
      <AnimatePresence>
        {showGamification && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowGamification(false)}
          >
            <motion.div
              className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Collection de badges</h2>
                <button
                  onClick={() => setShowGamification(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <BadgeCollection
                badges={userProgress.badges}
                allBadges={[
                  { id: 'first-lesson', name: 'Premier Pas', icon: '👶', description: 'Première leçon terminée', points: 10, category: 'achievements' },
                  { id: '3-day-streak', name: 'Débutant', icon: '🔥', description: '3 days consécutifs', points: 25, category: 'streaks' },
                  { id: 'alphabet-master', name: 'Maître de l\'Alphabet', icon: '🔤', description: 'Vous connaissez parfaitement l\'alphabet allemand!', points: 50, category: 'lessons' }
                ]}
                showUnlocked={true}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedCourseDetail;

