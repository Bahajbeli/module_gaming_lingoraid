import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Unlock, CheckCircle, Play, ArrowLeft, RotateCcw } from 'lucide-react';
import api from '../utils/axios';

// Helper disponible au niveau module (utilisable par CourseCard aussi)
const getAssetUrl = (url) => {
  if (!url) return '';
  return url.startsWith('/uploads/') ? `https://backend-u6jh.onrender.com${url}` : url;
};

const CoursesByLevel = () => {

  const { level } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCoursesByLevel();
  }, [level]);

  const fetchCoursesByLevel = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/courses/levels');
      
      if (response.data[level]) {
        setCourses(response.data[level]);
      } else {
        setCourses([]);
      }
    } catch (error) {
      console.error('Error lors de la récupération des cours:', error);
      setError('Error while chargement des cours');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseClick = async (course) => {
    if (!course.isUnlocked) {
      alert('Vous devez terminer le cours précédent pour accéder à celui-ci');
      return;
    }

    try {
      // Si le cours est terminé, le remettre en cours
      if (course.userProgress?.status === 'completed') {
        await api.post(`/api/progress/courses/${course.id}/restart`);
      } else {
        // Start le cours
        await api.post(`/api/progress/courses/${course.id}/start`);
      }
      
      // Naviguer vers le détail du cours
      navigate(`/courses/${level}/${course.id}`);
    } catch (error) {
      console.error('Error while démarrage du cours:', error);
      if (error.response?.status === 403) {
        alert('Cours verrouillé: ' + error.response.data.message);
      } else {
        alert('Error while démarrage du cours');
      }
    }
  };

  const handleCompleteCourse = async (courseId) => {
    try {
      await api.post(`/api/progress/courses/${courseId}/complete`);
      
      // Rafraîchir la liste des cours
      fetchCoursesByLevel();
      
      alert('Cours terminé avec succès !');
    } catch (error) {
      console.error('Error lors de la finalisation du cours:', error);
      alert('Error lors de la finalisation du cours');
    }
  };

  const getLevelInfo = (level) => {
    const levelInfo = {
      'A1': { title: 'Level A1 - Débutant', color: 'from-green-400 to-green-600', description: 'Bases de la langue allemande' },
      'A2': { title: 'Level A2 - Élémentaire', color: 'from-blue-400 to-blue-600', description: 'Connaissances élémentaires' },
      'B1': { title: 'Level B1 - Intermédiaire', color: 'from-yellow-400 to-yellow-600', description: 'Level intermédiaire' },
      'B2': { title: 'Level B2 - Avancé', color: 'from-red-400 to-red-600', description: 'Level avancé' }
    };
    return levelInfo[level] || { title: level, color: 'from-gray-400 to-gray-600', description: '' };
  };

  const levelInfo = getLevelInfo(level);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-german-50 to-german-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-german-600 mx-auto mb-4"></div>
          <p className="text-german-700 text-lg">Loading des cours...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-german-50 to-german-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="bg-german-600 text-white px-6 py-2 rounded-lg hover:bg-german-700 transition-colors"
          >
            Back à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-german-50 to-german-100">
      {/* Header avec navigation */}
      <div className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-german-600 hover:text-german-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back à l'accueil
            </button>
            
            <div className="text-center">
              <h1 className={`text-3xl font-bold bg-gradient-to-r ${levelInfo.color} bg-clip-text text-transparent`}>
                {levelInfo.title}
              </h1>
              {levelInfo.description && (
                <p className="text-german-600 mt-2">{levelInfo.description}</p>
              )}
            </div>
            
            <div className="w-20"></div> {/* Spacer pour centrer le titre */}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {courses.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-german-600 text-lg">Aucun cours disponible pour ce niveau.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, index) => (
              <CourseCard
                key={course.id}
                course={course}
                index={index}
                onCourseClick={handleCourseClick}
                onCompleteCourse={handleCompleteCourse}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Composant carte de cours
const CourseCard = ({ course, index, onCourseClick, onCompleteCourse }) => {
  const [isHovered, setIsHovered] = useState(false);

  const getStatusIcon = () => {
    if (course.userProgress?.status === 'completed') {
      return <CheckCircle className="w-6 h-6 text-green-500" />;
    }
    if (course.isUnlocked) {
      return <Unlock className="w-6 h-6 text-blue-500" />;
    }
    return <Lock className="w-6 h-6 text-gray-400" />;
  };

  const getStatusText = () => {
    if (course.userProgress?.status === 'completed') {
      return 'Terminé';
    }
    if (course.isUnlocked) {
      return course.userProgress?.status === 'in-progress' ? 'In progress' : 'Available';
    }
    return 'Verrouillé';
  };

  const getStatusColor = () => {
    if (course.userProgress?.status === 'completed') {
      return 'bg-green-100 text-green-800';
    }
    if (course.isUnlocked) {
      return course.userProgress?.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 'bg-blue-100 text-blue-800';
    }
    return 'bg-gray-100 text-gray-600';
  };

  const canComplete = course.userProgress?.status === 'in-progress';
  const isCompleted = course.userProgress?.status === 'completed';

  return (
    <div
      className={`bg-white rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 ${
        isHovered ? 'scale-105 shadow-2xl' : ''
      } ${!course.isUnlocked ? 'opacity-75' : ''}`}
      style={{ animationDelay: `${index * 100}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image du cours */}
      <div className="h-48 bg-gradient-to-br from-german-100 to-german-200 flex items-center justify-center">
        {course.imagePath ? (
          <img 
            src={getAssetUrl(course.imagePath)} 
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-german-400 text-6xl font-bold">
            {course.level}
          </div>
        )}
      </div>

      {/* Contenu de la carte */}
      <div className="p-6">
        {/* En-tête avec statut */}
        <div className="flex items-center justify-between mb-4">
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-german-100 text-german-800">
            {course.level} - {course.order}
          </span>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
        </div>

        {/* Titre et description */}
        <h3 className="text-xl font-bold text-german-800 mb-2 line-clamp-2">
          {course.title}
        </h3>
        <p className="text-german-600 text-sm mb-4 line-clamp-3">
          {course.description}
        </p>

        {/* Actions */}
        <div className="flex space-x-2">
          {course.isUnlocked && !isCompleted && (
            <button
              onClick={() => onCourseClick(course)}
              className="flex-1 bg-german-600 text-white py-2 px-4 rounded-lg hover:bg-german-700 transition-colors flex items-center justify-center"
            >
              <Play className="w-4 h-4 mr-2" />
              {course.userProgress?.status === 'in-progress' ? 'Continue' : 'Start'}
            </button>
          )}
          
          {isCompleted && (
            <button
              onClick={() => onCourseClick(course)}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reprendre
            </button>
          )}
          
          {canComplete && (
            <button
              onClick={() => onCompleteCourse(course.id)}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Completedr
            </button>
          )}
          
          {!course.isUnlocked && (
            <button
              disabled
              className="flex-1 bg-gray-300 text-gray-500 py-2 px-4 rounded-lg cursor-not-allowed flex items-center justify-center"
            >
              <Lock className="w-4 h-4 mr-2" />
              Verrouillé
            </button>
          )}
        </div>

        {/* Indicateur de progression */}
        {course.userProgress && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Progress</span>
              <span className="font-medium">
                {course.userProgress.status === 'completed' ? '100%' : 
                 course.userProgress.status === 'in-progress' ? '50%' : '0%'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  course.userProgress.status === 'completed' ? 'bg-green-500' : 
                  course.userProgress.status === 'in-progress' ? 'bg-blue-500' : 'bg-gray-300'
                }`}
                style={{ 
                  width: course.userProgress.status === 'completed' ? '100%' : 
                         course.userProgress.status === 'in-progress' ? '50%' : '0%' 
                }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursesByLevel;
