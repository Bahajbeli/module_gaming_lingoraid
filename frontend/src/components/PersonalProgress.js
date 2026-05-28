import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Trophy, BookOpen, Gamepad2, TrendingUp, Calendar, Clock, Star, Zap, Target, Award, Flame, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../utils/axios';
import ProgressAnalysis from './ProgressAnalysis';

const PersonalProgress = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [courseProgress, setCourseProgress] = useState({});
  const [gameProgress, setGameProgress] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      
      // Récupérer la progression des cours
      const courseResponse = await api.get('/api/progress');
      setCourseProgress(courseResponse.data);
      
      // Récupérer la progression des jeux
      const gameResponse = await api.get('/api/games/progress');
      setGameProgress(gameResponse.data);
      
      // Récupérer l'analyse de progression
      try {
        const analysisResponse = await api.get('/api/progress-analysis');
        setAnalysis(analysisResponse.data.data);
      } catch (analysisError) {
        console.error('Error lors de la récupération de l\'analyse de progression:', analysisError);
      }
    } catch (error) {
      console.error('Error lors de la récupération de la progression:', error);
      setError('Error while chargement de la progression');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-32 w-32 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">Loading de votre progression...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-red-600 text-lg mb-4 font-medium">{error}</p>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-200"
          >
            Back à l'accueil
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors bg-white/60 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back à l'accueil
            </motion.button>
            
            <div className="text-center">
              <motion.h1 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
              >
                Suivi Personnel
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-gray-600 mt-2 font-medium"
              >
                Suivez votre progression et vos accomplissements
              </motion.p>
            </div>
            
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Section d'analyse de progression */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center">
                <BarChart3 className="w-6 h-6 mr-3 text-blue-600" />
                Analyse de votre progression
              </h2>
            </div>
            <ProgressAnalysis />
          </div>
        </motion.div>
        
        {/* Gamification Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Level & XP */}
              <div className="text-center">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-4 mb-4">
                  <Target className="w-8 h-8 text-white mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">Level 5</div>
                </div>
                <div className="mb-2">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>XP: 1,250</span>
                    <span>2,000</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" style={{ width: '62.5%' }}></div>
                  </div>
                </div>
              </div>

              {/* Streak */}
              <div className="text-center">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 mb-4">
                  <Flame className="w-8 h-8 text-white mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">7 days</div>
                </div>
                <p className="text-gray-600 font-medium">Streak actuel</p>
              </div>

              {/* Total Score */}
              <div className="text-center">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-4 mb-4">
                  <Trophy className="w-8 h-8 text-white mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">8,450</div>
                </div>
                <p className="text-gray-600 font-medium">Score total</p>
              </div>

              {/* Badges */}
              <div className="text-center">
                <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-4 mb-4">
                  <Award className="w-8 h-8 text-white mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">12</div>
                </div>
                <p className="text-gray-600 font-medium">Badges earned</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Statistiques globales */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12"
        >
          <StatCard
            title="Cours terminés"
            value={courseProgress.completed || 0}
            icon={BookOpen}
            color="from-green-500 to-green-600"
            subtitle={`sur ${courseProgress.total || 0} cours`}
          />
          <StatCard
            title="Taux de réussite"
            value={`${courseProgress.completionRate || 0}%`}
            icon={TrendingUp}
            color="from-blue-500 to-blue-600"
            subtitle="de progression globale"
          />
          <StatCard
            title="Completed games"
            value={gameProgress.completed || 0}
            icon={Gamepad2}
            color="from-purple-500 to-purple-600"
            subtitle={`sur ${gameProgress.total || 0} jeux`}
          />
          <StatCard
            title="Average score"
            value={gameProgress.averageScore || 0}
            icon={Trophy}
            color="from-yellow-500 to-yellow-600"
            suffix=" pts"
            subtitle="dans les jeux"
          />
        </motion.div>

        {/* Progress par niveau */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-8 border border-white/20"
        >
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6 flex items-center">
            <BookOpen className="w-6 h-6 mr-3 text-blue-600" />
            Progress par niveau
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {['A1', 'A2', 'B1', 'B2'].map((level, index) => {
              const levelData = courseProgress.byLevel?.[level] || { total: 0, completed: 0, inProgress: 0, completionRate: 0 };
              
              return (
                <motion.div
                  key={level}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <LevelProgressCard
                    level={level}
                    data={levelData}
                  />
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Détails des cours */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-german-800 mb-6 flex items-center">
            <Calendar className="w-6 h-6 mr-3 text-german-600" />
            Détails des cours
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-german-700">Cours</th>
                  <th className="text-left py-3 px-4 font-semibold text-german-700">Niveau</th>
                  <th className="text-left py-3 px-4 font-semibold text-german-700">Statut</th>
                  <th className="text-left py-3 px-4 font-semibold text-german-700">Date de fin</th>
                </tr>
              </thead>
              <tbody>
                {courseProgress.byLevel && Object.values(courseProgress.byLevel).map(levelData => 
                  levelData.courses?.map(course => (
                    <tr key={course.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-german-800">{course.title}</p>
                          <p className="text-sm text-german-600">{course.description}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-german-100 text-german-800 rounded-full text-sm font-medium">
                          {course.level}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={course.userProgress?.status} />
                      </td>
                      <td className="py-3 px-4 text-sm text-german-600">
                        {course.userProgress?.completedAt ? 
                          new Date(course.userProgress.completedAt).toLocaleDateString('fr-FR') : 
                          '-'
                        }
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statistiques des jeux */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-german-800 mb-6 flex items-center">
            <Gamepad2 className="w-6 h-6 mr-3 text-german-600" />
            Statistiques des jeux
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Types de jeux */}
            <div>
              <h3 className="text-lg font-semibold text-german-700 mb-4">Par type de jeu</h3>
              <div className="space-y-3">
                {['quiz', 'mots-croises', 'creativite', 'simulation'].map(type => (
                  <GameTypeProgress
                    key={type}
                    type={type}
                    games={gameProgress.byType?.[type] || {}}
                  />
                ))}
              </div>
            </div>
            
            {/* Modes de jeu */}
            <div>
              <h3 className="text-lg font-semibold text-german-700 mb-4">Par mode de jeu</h3>
              <div className="space-y-3">
                {['online', 'solo'].map(mode => (
                  <GameModeProgress
                    key={mode}
                    mode={mode}
                    games={gameProgress.byMode?.[mode] || {}}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant carte de statistique
const StatCard = ({ title, value, icon: Icon, color, suffix = '', subtitle }) => (
  <motion.div 
    whileHover={{ scale: 1.02, y: -2 }}
    className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 text-center border border-white/20"
  >
    <motion.div 
      whileHover={{ rotate: 5, scale: 1.1 }}
      className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${color} text-white mb-4 shadow-lg`}
    >
      <Icon className="w-8 h-8" />
    </motion.div>
    <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
    <p className={`text-3xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent mb-1`}>
      {value}{suffix}
    </p>
    {subtitle && (
      <p className="text-sm text-gray-600 font-medium">{subtitle}</p>
    )}
  </motion.div>
);

// Composant carte de progression par niveau
const LevelProgressCard = ({ level, data }) => {
  const getLevelColor = (level) => {
    const colors = {
      'A1': 'from-green-400 to-green-600',
      'A2': 'from-blue-400 to-blue-600',
      'B1': 'from-yellow-400 to-yellow-600',
      'B2': 'from-red-400 to-red-600'
    };
    return colors[level] || 'from-gray-400 to-gray-600';
  };

  const getLevelTitle = (level) => {
    const titles = {
      'A1': 'Débutant',
      'A2': 'Élémentaire',
      'B1': 'Intermédiaire',
      'B2': 'Avancé'
    };
    return titles[level] || level;
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/20"
    >
      <motion.div 
        whileHover={{ rotate: 5, scale: 1.1 }}
        className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${getLevelColor(level)} text-white mb-4 shadow-lg`}
      >
        <span className="text-xl font-bold">{level}</span>
      </motion.div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{getLevelTitle(level)}</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 font-medium">Terminés</span>
          <span className="font-semibold text-gray-800">{data.completed}/{data.total}</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${data.completionRate}%` }}
            transition={{ duration: 1, delay: 0.5 }}
            className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
          ></motion.div>
        </div>
        
        <div className="text-center">
          <span className="text-sm font-semibold text-gray-700">{data.completionRate}%</span>
        </div>
      </div>
    </motion.div>
  );
};

// Composant badge de statut
const StatusBadge = ({ status }) => {
  const getStatusConfig = (status) => {
    const configs = {
      'completed': { text: 'Terminé', color: 'bg-green-100 text-green-800' },
      'in-progress': { text: 'In progress', color: 'bg-blue-100 text-blue-800' },
      'not-started': { text: 'Non commencé', color: 'bg-gray-100 text-gray-800' }
    };
    return configs[status] || configs['not-started'];
  };

  const config = getStatusConfig(status);
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.text}
    </span>
  );
};

// Composant progression par type de jeu
const GameTypeProgress = ({ type, games }) => {
  const getTypeTitle = (type) => {
    const titles = {
      'quiz': 'Quiz',
      'mots-croises': 'Crosswords',
      'creativite': 'Creativity',
      'simulation': 'Simulation'
    };
    return titles[type] || type;
  };

  const completed = Object.values(games).filter(g => g.status === 'completed').length;
  const total = Object.keys(games).length;

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center">
        <span className="text-lg mr-3">
          {type === 'quiz' ? '🎯' : type === 'mots-croises' ? '🔤' : type === 'creativite' ? '✨' : '🎭'}
        </span>
        <span className="font-medium text-german-700">{getTypeTitle(type)}</span>
      </div>
      <div className="text-right">
        <p className="font-semibold text-german-800">{completed}/{total}</p>
        <p className="text-sm text-german-600">
          {total > 0 ? Math.round((completed / total) * 100) : 0}%
        </p>
      </div>
    </div>
  );
};

// Composant progression par mode de jeu
const GameModeProgress = ({ mode, games }) => {
  const getModeTitle = (mode) => {
    const titles = {
      'online': 'En ligne',
      'solo': 'Solo'
    };
    return titles[mode] || mode;
  };

  const completed = Object.values(games).filter(g => g.status === 'completed').length;
  const total = Object.keys(games).length;

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center">
        <span className="text-lg mr-3">
          {mode === 'online' ? '🌐' : '👤'}
        </span>
        <span className="font-medium text-german-700">{getModeTitle(mode)}</span>
      </div>
      <div className="text-right">
        <p className="font-semibold text-german-800">{completed}/{total}</p>
        <p className="text-sm text-german-600">
          {total > 0 ? Math.round((completed / total) * 100) : 0}%
        </p>
      </div>
    </div>
  );
};

export default PersonalProgress;
