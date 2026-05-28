import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Play, Calendar, Search, Filter } from 'lucide-react';
import api from '../utils/axios';

const CourseList = () => {
  const getAssetUrl = (url) => {
    if (!url) return '';
    return url.startsWith('/uploads/') ? `http://localhost:5000${url}` : url;
  };

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVideo, setFilterVideo] = useState('all');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/api/courses');
      setCourses(response.data);
    } catch (error) {
      console.error('Error lors de la récupération des cours:', error);
      setError('Error while chargement des cours');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Filtrer les cours selon la recherche et les filtres
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (filterVideo === 'with-video') {
      matchesFilter = !!course.videoUrl;
    } else if (filterVideo === 'without-video') {
      matchesFilter = !course.videoUrl;
    }
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Nos cours d'allemand
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Découvrez notre collection complète de cours pour apprendre l'allemand. 
          Chaque cours est conçu pour vous faire progresser de manière efficace et ludique.
        </p>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Barre de recherche */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un cours..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Filtre vidéo */}
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterVideo}
              onChange={(e) => setFilterVideo(e.target.value)}
              className="input-field"
            >
              <option value="all">Tous les cours</option>
              <option value="with-video">Avec vidéo</option>
              <option value="without-video">Sans vidéo</option>
            </select>
          </div>
        </div>

        {/* Statistiques */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            {filteredCourses.length} cours trouvé{filteredCourses.length > 1 ? 's' : ''}
            {searchTerm && ` pour "${searchTerm}"`}
          </p>
        </div>
      </div>

      {/* Liste des cours */}
      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
          {error}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucun cours trouvé
          </h3>
          <p className="text-gray-500">
            {searchTerm 
              ? `Aucun cours ne correspond à votre recherche "${searchTerm}"`
              : 'Aucun cours disponible pour le moment.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div key={course.id} className="card p-6 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1">
              {/* Image du cours */}
              {course.imagePath ? (
                <div className="h-48 bg-gray-200 rounded-lg mb-4 overflow-hidden">
                  <img 
                    src={getAssetUrl(course.imagePath)} 
                    alt={course.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                  />
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-primary-100 to-german-100 rounded-lg mb-4 flex items-center justify-center">
                  <BookOpen className="h-16 w-16 text-primary-400" />
                </div>
              )}
              
              {/* Contenu du cours */}
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
                  {course.title}
                </h3>
                
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {course.description}
                </p>
                
                {/* Métadonnées */}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDate(course.createdAt)}
                  </div>
                  
                  {course.videoUrl && (
                    <div className="flex items-center text-primary-600">
                      <Play className="h-4 w-4 mr-1" />
                      Vidéo incluse
                    </div>
                  )}
                </div>
                
                {/* Bouton d'action */}
                <Link 
                  to={`/courses/${course.id}`}
                  className="btn-primary w-full text-center block"
                >
                  Start le cours
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination simple (optionnel) */}
      {filteredCourses.length > 9 && (
        <div className="flex justify-center mt-8">
          <div className="bg-white rounded-lg shadow-md px-6 py-3">
            <p className="text-sm text-gray-600">
              Affichage de {Math.min(filteredCourses.length, 9)} cours sur {filteredCourses.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseList;
