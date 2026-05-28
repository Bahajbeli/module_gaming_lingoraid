import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/axios';
import { 
  BookOpen, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  BarChart3, 
  Settings,
  Gamepad2,
  Film,
  Eye,
  EyeOff,
  MessageSquare,
  Book
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce cours ?')) {
      return;
    }

    try {
      await api.delete(`/api/courses/${courseId}`);
      fetchCourses();
      alert('Cours supprimé avec succès !');
    } catch (error) {
      console.error('Error lors de la suppression du cours:', error);
      alert('Error lors de la suppression du cours');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-german-50 to-german-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-german-600 mx-auto mb-4"></div>
          <p className="text-german-700 text-lg">Loading du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-german-50 to-german-100">
      {/* Header */}
      <div className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-german-500 to-german-600 bg-clip-text text-transparent">
              Tableau de Bord Administrateur
            </h1>
            <p className="text-german-600 mt-2">Welcome, {user?.email}</p>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Cartes de navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Gestion des cours */}
          <Link to="/admin/courses" className="group">
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Gestion des Cours</h3>
                  <p className="text-sm text-gray-600">{courses.length} cours</p>
                </div>
              </div>
            </div>
          </Link>

          {/* Gestion des simulations */}
          <Link to="/admin/simulation" className="group">
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                  <MessageSquare className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Simulations IA</h3>
                  <p className="text-sm text-gray-600">Conversations orales</p>
                </div>
              </div>
            </div>
          </Link>

          {/* Gestion des jeux */}
          <Link to="/admin/games" className="group">
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <Gamepad2 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Gestion des Jeux</h3>
                  <p className="text-sm text-gray-600">Quiz, mots croisés, etc.</p>
                </div>
              </div>
            </div>
          </Link>

          {/* Deutsch Bingo */}
          <Link to="/admin/german-bingo" className="group">
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-lime-100 rounded-lg flex items-center justify-center group-hover:bg-lime-200 transition-colors">
                  <span className="text-lime-700 text-xl">🎯</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Deutsch Bingo</h3>
                  <p className="text-sm text-gray-600">Vocabulaire allemand — classes & mots</p>
                </div>
              </div>
            </div>
          </Link>

          {/* Gestion des mots croisés */}
          <Link to="/admin/crosswords" className="group">
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <span className="text-blue-600 text-xl">🔤</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Crosswords</h3>
                  <p className="text-sm text-gray-600">Créer et publier des grilles</p>
                </div>
              </div>
            </div>
          </Link>

          {/* Creativity – éditeur Drag & Drop */}
          <Link to="/admin/creativity" className="group">
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-pink-100 rounded-lg flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                  <span className="text-pink-600 text-xl">🎨</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Creativity</h3>
                  <p className="text-sm text-gray-600">Éditeur d'image et points cliquables</p>
                </div>
              </div>
            </div>
          </Link>

          {/* Gestion des médias */}
          <Link to="/admin/media" className="group">
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <Film className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Gestion des Médias</h3>
                  <p className="text-sm text-gray-600">Films, séries, podcasts</p>
                </div>
              </div>
            </div>
          </Link>

        {/* Gestion des histoires */}
        <Link to="/admin/stories" className="group">
          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-pink-100 rounded-lg flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                <Book className="h-6 w-6 text-pink-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Histoires</h3>
                <p className="text-sm text-gray-600">Livres et articles</p>
              </div>
            </div>
          </div>
        </Link>

          {/* Statistiques */}
          <Link to="/admin/stats" className="group">
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                  <BarChart3 className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Statistiques</h3>
                  <p className="text-sm text-gray-600">Analyses et rapports</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Section des cours récents */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Cours Récents</h2>
            <Link
              to="/admin/courses/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouveau cours
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Niveau
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date de création
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {courses.slice(0, 5).map((course) => (
                  <tr key={course.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {course.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {course.description.substring(0, 60)}...
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {course.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(course.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          to={`/admin/courses/${course.id}/edit`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteCourse(course.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {courses.length > 5 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <Link
                to="/admin/courses"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Voir tous les cours →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
