import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/axios';

// Import des composants de gamification
import LearningFlow from './LearningFlow';
import ProgressTracker from './ProgressTracker';
import StreakTracker from './StreakTracker';
import BadgeCollection from './BadgeCollection';
import { courseStructure, badgeSystem } from '../../data/courseStructure';

const GamifiedCourse = () => {
  const { courseId, chapterId, lessonId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [currentView, setCurrentView] = useState('learning');
  const [userProgress, setUserProgress] = useState({
    totalPoints: 0,
    streak: 0,
    badges: [],
    overallProgress: 0,
    lastLoginDate: null
  });
  const [courseData, setCourseData] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notification, setNotification] = useState({});

  useEffect(() => {
    loadCourseData();
    loadUserProgress();
    checkDailyLogin();
  }, [courseId]);

  const loadCourseData = async () => {
    try {
      // Simuler le chargement des données du cours
      const course = courseStructure[courseId] || courseStructure.A1;
      setCourseData(course);
    } catch (error) {
      console.error('Error while chargement du cours:', error);
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
          { id: '3-day-streak', name: 'Débutant', icon: '🔥', points: 25 },
          { id: 'alphabet-master', name: 'Maître de l\'Alphabet', icon: '🔤', points: 50 }
        ],
        overallProgress: 25,
        lastLoginDate: new Date().toISOString()
      };
      
      setUserProgress(mockProgress);
    } catch (error) {
      console.error('Error while chargement des progrès:', error);
    }
  };

  const checkDailyLogin = () => {
    const today = new Date().toDateString();
    const lastLogin = userProgress.lastLoginDate 
      ? new Date(userProgress.lastLoginDate).toDateString() 
      : null;

    if (lastLogin !== today) {
      // Nouveau jour - incrémenter la série
      setUserProgress(prev => ({
        ...prev,
        streak: prev.streak + 1,
        lastLoginDate: new Date().toISOString()
      }));

      // Afficher notification de série
      showNotificationMessage({
        type: 'streak',
        title: 'Série quotidienne !',
        message: `${userProgress.streak + 1} days consécutifs !`,
        icon: '🔥'
      });
    }
  };

  const showNotificationMessage = (notification) => {
    setNotification(notification);
    setShowNotification(true);
    
    setTimeout(() => {
      setShowNotification(false);
    }, 3000);
  };

  const handlePointsEarned = (points) => {
    setUserProgress(prev => ({
      ...prev,
      totalPoints: prev.totalPoints + points
    }));

    showNotificationMessage({
      type: 'points',
      title: 'Points gagnés !',
      message: `+${points} points`,
      icon: '⭐'
    });
  };

  const handleBadgeEarned = (badge) => {
    setUserProgress(prev => ({
      ...prev,
      badges: [...prev.badges, badge]
    }));

    showNotificationMessage({
      type: 'badge',
      title: 'Nouveau badge !',
      message: badge.name,
      icon: badge.icon
    });
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'learning':
        return (
          <LearningFlow
            courseId={courseId}
            chapterId={chapterId}
            lessonId={lessonId}
            onPointsEarned={handlePointsEarned}
            onBadgeEarned={handleBadgeEarned}
          />
        );
      
      case 'progress':
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ProgressTracker
                    userProgress={userProgress}
                    currentChapter={1}
                    totalChapters={courseData?.chapters.length || 5}
                    showDetailed={true}
                  />
                </div>
                <div>
                  <StreakTracker
                    currentStreak={userProgress.streak}
                    bestStreak={userProgress.streak + 5}
                    lastLoginDate={userProgress.lastLoginDate}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'badges':
        return (
          <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 p-6">
            <div className="max-w-6xl mx-auto">
              <BadgeCollection
                badges={userProgress.badges}
                allBadges={[
                  ...Object.values(badgeSystem.streaks).map(badge => ({ ...badge, category: 'streaks' })),
                  ...Object.values(badgeSystem.achievements).map(badge => ({ ...badge, category: 'achievements' })),
                  { id: 'alphabet-master', name: 'Maître de l\'Alphabet', icon: '🔤', description: 'Vous connaissez parfaitement l\'alphabet allemand!', points: 50, category: 'lessons' },
                  { id: 'greeting-expert', name: 'Expert en Salutations', icon: '👋', description: 'Vous savez saluer comme un vrai Allemand!', points: 50, category: 'lessons' }
                ]}
                showUnlocked={true}
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/courses')}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← Back aux cours
              </button>
              <h1 className="text-xl font-bold text-gray-800">
                {courseData?.title || 'Cours d\'Allemand'}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Points:</span>
                <span className="font-semibold text-blue-600">{userProgress.totalPoints}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Série:</span>
                <span className="font-semibold text-orange-600">{userProgress.streak} days</span>
              </div>
            </div>
          </div>
          
          {/* Navigation des vues */}
          <div className="flex space-x-1 mt-4">
            {[
              { id: 'learning', name: 'Apprentissage', icon: '📚' },
              { id: 'progress', name: 'Progress', icon: '📊' },
              { id: 'badges', name: 'Badges', icon: '🏆' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleViewChange(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentView === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderCurrentView()}
        </motion.div>
      </AnimatePresence>

      {/* Notifications */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed top-4 right-4 z-50 bg-white rounded-xl shadow-lg p-4 border-l-4 border-blue-500"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{notification.icon}</span>
              <div>
                <h4 className="font-semibold text-gray-800">{notification.title}</h4>
                <p className="text-sm text-gray-600">{notification.message}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GamifiedCourse;

