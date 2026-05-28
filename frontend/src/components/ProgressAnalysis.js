import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  ThumbsUp, 
  AlertTriangle, 
  Lightbulb, 
  Target, 
  Star, 
  RotateCcw,
  RefreshCw,
  BarChart3,
  Award,
  Calendar,
  Trophy,
  Brain,
  BookOpen,
  Gamepad2,
  Zap,
  Activity
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/axios';

const ProgressAnalysis = ({ showDetailed = true }) => {
  const { token } = useAuth();
  const [analysis, setAnalysis] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalysis();
    fetchStats();
  }, []);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/progress-analysis');
      setAnalysis(response.data.data);
    } catch (err) {
      console.error('Error fetching progress analysis:', err);
      setError(err.response?.data?.error || 'Error while chargement de l\'analyse');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/progress-analysis/stats');
      setStats(response.data.data);
    } catch (err) {
      console.error('Error fetching progress stats:', err);
    }
  };

  const regenerateAnalysis = async () => {
    try {
      setRegenerating(true);
      const response = await api.post('/api/progress-analysis/regenerate');
      setAnalysis(response.data.data);
    } catch (err) {
      console.error('Error regenerating progress analysis:', err);
      setError(err.response?.data?.error || 'Error lors de la régénération de l\'analyse');
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-600">Analyse de votre progression en cours...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
        <button
          onClick={fetchAnalysis}
          className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard 
            icon={Trophy}
            value={stats.completedCourses}
            label="Cours complétés"
            color="from-yellow-500 to-orange-500"
          />
          <StatCard 
            icon={Star}
            value={Math.round(stats.averageQuizScore)}
            label="Mediumne quiz"
            suffix="%"
            color="from-blue-500 to-purple-500"
          />
          <StatCard 
            icon={Award}
            value={stats.totalBadges}
            label="Badges"
            color="from-green-500 to-teal-500"
          />
          <StatCard 
            icon={Brain}
            value={stats.currentStreak}
            label="Série actuelle"
            suffix="days"
            color="from-red-500 to-pink-500"
          />
        </div>
      )}

      {/* Overall Assessment */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100"
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center">
            <BarChart3 className="h-6 w-6 text-blue-600 mr-2" />
            Évaluation Globale
          </h3>
          <button
            onClick={regenerateAnalysis}
            disabled={regenerating}
            className="flex items-center text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            <RotateCcw className={`h-4 w-4 mr-1 ${regenerating ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
        <p className="text-gray-700 leading-relaxed">{analysis?.overallAssessment}</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strengths */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100"
        >
          <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
            <ThumbsUp className="h-5 w-5 text-green-600 mr-2" />
            Points Forts
          </h3>
          <ul className="space-y-2">
            {analysis?.strengths?.map((strength, index) => (
              <li key={index} className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                <span className="text-gray-700">{strength}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Weaknesses */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-100"
        >
          <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
            <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
            Points Faibles
          </h3>
          <ul className="space-y-2">
            {analysis?.weaknesses?.map((weakness, index) => (
              <li key={index} className="flex items-start">
                <span className="text-orange-500 mr-2">•</span>
                <span className="text-gray-700">{weakness}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommendations */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-100"
        >
          <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
            <Lightbulb className="h-5 w-5 text-purple-600 mr-2" />
            Recommandations
          </h3>
          <ul className="space-y-2">
            {analysis?.recommendations?.map((recommendation, index) => (
              <li key={index} className="flex items-start">
                <span className="text-purple-500 mr-2">•</span>
                <span className="text-gray-700">{recommendation}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Next Steps */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-6 border border-teal-100"
        >
          <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
            <Target className="h-5 w-5 text-teal-600 mr-2" />
            Prochaines Étapes
          </h3>
          <ul className="space-y-2">
            {analysis?.nextSteps?.map((step, index) => (
              <li key={index} className="flex items-start">
                <span className="text-teal-500 mr-2">•</span>
                <span className="text-gray-700">{step}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Skill Breakdown */}
      {analysis?.skillBreakdown && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100"
        >
          <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-6">
            <Brain className="h-5 w-5 text-indigo-600 mr-2" />
            Analyse des Compétences
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(analysis.skillBreakdown).map(([skill, data]) => {
              const skillNames = {
                reading: 'Lecture',
                writing: 'Écriture',
                listening: 'Écoute',
                speaking: 'Expression Orale',
                vocabulary: 'Vocabulaire',
                grammar: 'Grammaire'
              };
              const levelNames = {
                beginner: 'Débutant',
                elementary: 'Élémentaire',
                intermediate: 'Intermédiaire',
                advanced: 'Avancé'
              };
              const levelColors = {
                beginner: 'from-gray-400 to-gray-500',
                elementary: 'from-blue-400 to-blue-500',
                intermediate: 'from-green-400 to-green-500',
                advanced: 'from-purple-400 to-purple-500'
              };
              
              return (
                <div key={skill} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">{skillNames[skill] || skill}</span>
                    <span className="text-xs font-medium text-gray-500">{levelNames[data.level] || data.level}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${data.score}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className={`h-3 rounded-full bg-gradient-to-r ${levelColors[data.level] || 'from-gray-400 to-gray-500'}`}
                    ></motion.div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-800">{data.score}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Performance Metrics */}
      {analysis?.performanceMetrics && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-6 border border-cyan-100"
        >
          <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-6">
            <Activity className="h-5 w-5 text-cyan-600 mr-2" />
            Métriques de Performance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={BookOpen}
              label="Progress Globale"
              value={analysis.performanceMetrics.overallProgress}
              suffix="%"
              color="from-blue-500 to-cyan-500"
            />
            <MetricCard
              icon={Gamepad2}
              label="Performance Jeux"
              value={analysis.performanceMetrics.gamePerformance?.averageScore || 0}
              suffix="%"
              color="from-purple-500 to-pink-500"
            />
            <MetricCard
              icon={Trophy}
              label="Score Quiz"
              value={analysis.performanceMetrics.quizPerformance?.averageScore || 0}
              suffix="%"
              color="from-yellow-500 to-orange-500"
            />
            <MetricCard
              icon={Zap}
              label="Engagement"
              value={analysis.performanceMetrics.engagementScore || 0}
              suffix="%"
              color="from-green-500 to-emerald-500"
            />
          </div>
          
          {/* Detailed metrics */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.performanceMetrics.courseCompletion && (
              <div className="bg-white rounded-lg p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Cours</span>
                  <span className="text-xs text-gray-500">
                    {analysis.performanceMetrics.courseCompletion.completed}/{analysis.performanceMetrics.courseCompletion.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${analysis.performanceMetrics.courseCompletion.rate}%` }}
                    transition={{ duration: 1, delay: 0.6 }}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                  ></motion.div>
                </div>
              </div>
            )}
            
            {analysis.performanceMetrics.gamePerformance && (
              <div className="bg-white rounded-lg p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Jeux Complétés</span>
                  <span className="text-xs text-gray-500">
                    {analysis.performanceMetrics.gamePerformance.completedGames} jeux
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${analysis.performanceMetrics.gamePerformance.completionRate}%` }}
                    transition={{ duration: 1, delay: 0.6 }}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                  ></motion.div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Motivational Message */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-6 border-2 border-yellow-200 text-center"
      >
        <div className="flex justify-center mb-3">
          <Star className="h-8 w-8 text-yellow-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Message de Motivation</h3>
        <p className="text-gray-700 italic">"{analysis?.motivationalMessage}"</p>
      </motion.div>

      {/* Generated date */}
      {analysis?.generatedAt && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-gray-500"
        >
          <Calendar className="h-4 w-4 inline mr-1" />
          Analyse générée le {new Date(analysis.generatedAt).toLocaleDateString('fr-FR', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </motion.div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, value, label, suffix = '', color }) => (
  <motion.div 
    whileHover={{ scale: 1.02 }}
    className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 text-center"
  >
    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r ${color} text-white mb-2`}>
      <Icon className="h-5 w-5" />
    </div>
    <div className="text-2xl font-bold text-gray-800">
      {value}
      <span className="text-sm font-normal text-gray-600 ml-1">{suffix}</span>
    </div>
    <div className="text-xs text-gray-600">{label}</div>
  </motion.div>
);

const MetricCard = ({ icon: Icon, label, value, suffix = '', color }) => (
  <motion.div 
    whileHover={{ scale: 1.05, y: -2 }}
    className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 text-center"
  >
    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r ${color} text-white mb-3`}>
      <Icon className="h-6 w-6" />
    </div>
    <div className="text-3xl font-bold text-gray-800 mb-1">
      {value}
      <span className="text-lg font-normal text-gray-600 ml-1">{suffix}</span>
    </div>
    <div className="text-xs text-gray-600 font-medium">{label}</div>
  </motion.div>
);

export default ProgressAnalysis;