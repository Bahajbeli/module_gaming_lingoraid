import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api, { getAssetUrl } from '../utils/axios';
import { BookOpen, Play, Calendar, ArrowLeft, ExternalLink } from 'lucide-react';
import AIQuizGenerator from './gamification/AIQuizGenerator';

const CourseDetail = () => {

  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fontScale, setFontScale] = useState(1); // 0=normal,1=large,2=xl
  const [progress, setProgress] = useState(0);
  const [showAIQuiz, setShowAIQuiz] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  // Reading progress based on content section
  useEffect(() => {
    const onScroll = () => {
      const el = contentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const total = rect.height + Math.min(rect.top, 0) + (viewportHeight - Math.max(rect.bottom, viewportHeight));
      const scrollable = Math.max(el.scrollHeight - viewportHeight, 1);
      // Compute progress relative to element visibility
      const topOffset = el.offsetTop;
      const scrolled = Math.max(window.scrollY - topOffset, 0);
      const pct = Math.min(Math.max((scrolled / scrollable) * 100, 0), 100);
      setProgress(pct);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const fetchCourse = async () => {
    try {
      const response = await api.get(`/api/courses/${courseId}`);
      setCourse(response.data);
    } catch (error) {
      console.error('Error lors de la récupération du cours:', error);
      setError('Error while chargement du cours');
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

  const isYouTubeUrl = (url) => {
    if (!url) return false;
    const u = url.toString().trim();
    return /(?:youtube\.com|youtu\.be)/i.test(u);
  };

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    const u = url.toString().trim();

    // Supporte: watch?v=ID, youtu.be/ID, shorts/ID, embed/ID
    const match = u.match(/(?:v=|youtu\.be\/|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{6,})/);
    const id = match ? match[1].split('?')[0].split('&')[0] : '';
    return id ? `https://www.youtube.com/embed/${id}` : null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg max-w-md mx-auto">
          <h3 className="text-lg font-medium mb-2">Error</h3>
          <p>{error}</p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary mt-4"
          >
            Back à l'accueil
          </button>
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  const proseSizeClass = fontScale === 0 ? 'prose' : fontScale === 1 ? 'prose-lg' : 'prose-xl';

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-0">
      {/* Reading progress bar */}
      <div className="sticky top-0 z-20 h-1 bg-gray-100">
        <div
          className="h-1 bg-german-600 transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>
      {/* Bouton retour */}
      <div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back à l'accueil
        </button>
      </div>

      {/* En-tête du cours */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {course.imagePath && (
          <div className="h-64 md:h-80 bg-gray-200 overflow-hidden">
            <img 
              src={getAssetUrl(course.imagePath)} 
              alt={course.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 mb-3">
                {course.title}
              </h1>
              <p className="text-base md:text-lg text-gray-600 mb-4 leading-relaxed">
                {course.description}
              </p>
              
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="h-4 w-4 mr-1" />
                Créé le {formatDate(course.createdAt)}
              </div>
            </div>
            
            {course.videoUrl && (
              <div className="ml-4">
                <div className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                  <Play className="h-4 w-4 mr-1" />
                  Vidéo incluse
                </div>
              </div>
            )}
          </div>

          {/* Reading toolbar */}
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 mr-2">Taille du texte</span>
              <button
                onClick={() => setFontScale(s => Math.max(0, s - 1))}
                className="px-3 py-1 rounded-md border text-sm hover:bg-gray-50"
                aria-label="Réduire la taille du texte"
              >A-</button>
              <button
                onClick={() => setFontScale(s => Math.min(2, s + 1))}
                className="px-3 py-1 rounded-md border text-sm hover:bg-gray-50"
                aria-label="Augmenter la taille du texte"
              >A+</button>
            </div>
          </div>
        </div>
      </div>

      {/* Vidéo en avant si disponible */}
      {course.videoUrl && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Vidéo du cours</h2>
          {isYouTubeUrl(course.videoUrl) ? (
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <iframe
                src={getYouTubeEmbedUrl(course.videoUrl)}
                title={course.title}
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : course.videoUrl.startsWith('/uploads/') ? (
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <video controls className="w-full h-full" src={getAssetUrl(course.videoUrl)}>
                Votre navigateur ne supporte pas la lecture de vidéos.
              </video>
            </div>
          ) : (
            <div className="text-center py-8">
              <Play className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <a
                href={course.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Voir la vidéo
              </a>
            </div>
          )}
        </div>
      )}

      {/* Contenu du cours */}
      <div ref={contentRef} className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Contenu du cours</h2>
        <div className={`${proseSizeClass} prose-slate max-w-none leading-relaxed`}
             dangerouslySetInnerHTML={{ __html: course.content }}
        />
      </div>

      {/* Document PDF */}
      {course.pdfPath && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Support PDF</h2>
          <a
            href={getAssetUrl(course.pdfPath)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center px-4 py-2 bg-german-600 text-white rounded-lg hover:bg-german-700"
          >
            Télécharger le support PDF
          </a>
        </div>
      )}

      {/* AI Quiz Generator */}
      {course && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl shadow-md p-6 border border-purple-100">
          <div className="text-center mb-6">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">🤖</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Quiz IA Généré
            </h3>
            <p className="text-gray-600 max-w-md mx-auto mb-4">
              Testez vos connaissances avec un quiz personnalisé généré par l'intelligence artificielle
            </p>
            <button
              onClick={() => setShowAIQuiz(true)}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <span className="mr-2">🧠</span>
              Générer un Quiz IA
            </button>
          </div>
        </div>
      )}

      {/* Section "Continue l'apprentissage" améliorée */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-md p-8 border border-blue-100">
        <div className="text-center mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Continuez votre apprentissage
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Explorez de nouveaux cours ou reprenez ceux que vous avez commencés
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Carte "Voir tous les cours" */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-200 hover:shadow-md transition-shadow">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Tous les cours</h4>
              <p className="text-sm text-gray-600 mb-3">
                Découvrez l'ensemble de notre catalogue
              </p>
              <Link
                to="/courses"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Explorer
              </Link>
            </div>
          </div>

          {/* Carte "Tableau de bord" */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-200 hover:shadow-md transition-shadow">
            <div className="text-center">
              <div className="bg-indigo-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-indigo-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Progress</h4>
              <p className="text-sm text-gray-600 mb-3">
                Suivez vos avancées et objectifs
              </p>
              <Link
                to="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Voir
              </Link>
            </div>
          </div>

          {/* Carte "Recommandations" */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-200 hover:shadow-md transition-shadow">
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <Play className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Recommandé</h4>
              <p className="text-sm text-gray-600 mb-3">
                Cours suggérés pour vous
              </p>
              <button
                onClick={() => navigate('/courses')}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
              >
                Découvrir
              </button>
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/courses"
            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <BookOpen className="w-5 h-5 mr-2" />
            Voir tous les cours
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
          >
            <Calendar className="w-5 h-5 mr-2" />
            Back au tableau de bord
          </Link>
        </div>
      </div>

      {/* AI Quiz Generator Modal */}
      {showAIQuiz && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Quiz IA - {course?.title}</h2>
                <button
                  onClick={() => setShowAIQuiz(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <AIQuizGenerator
                courseContent={course?.content || ''}
                courseTitle={course?.title || 'Cours sans titre'}
                onClose={() => setShowAIQuiz(false)}
                onQuizGenerated={() => console.log('Quiz generated successfully')}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetail;
