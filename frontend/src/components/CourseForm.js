import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Upload, X, Play } from 'lucide-react';
import api from '../utils/axios';

const CourseForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [course, setCourse] = useState({
    title: '',
    description: '',
    content: '',
    level: 'A1',
    order: 1,
    videoUrl: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [videoPreview, setVideoPreview] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfPreview, setPdfPreview] = useState('');
  const [errors, setErrors] = useState({});

  const levels = ['A1', 'A2', 'B1', 'B2'];

  useEffect(() => {
    if (id) {
      fetchCourse();
    }
  }, [id]);

  const fetchCourse = async () => {
    try {
      const response = await api.get(`/api/courses/${id}`);
      const courseData = response.data;
      setCourse({
        title: courseData.title,
        description: courseData.description,
        content: courseData.content,
        level: courseData.level,
        order: courseData.order,
        // include persisted videoUrl (YouTube link or uploaded path)
        videoUrl: courseData.videoUrl || ''
      });
      setImagePreview(courseData.imagePath ? `https://backend-u6jh.onrender.com${courseData.imagePath}` : null);
      // Ensure video preview points to backend when stored as an uploaded file
      const isAbsoluteUrl = (url) => typeof url === 'string' && /^(https?:)?\/\//i.test(url);
      let videoUrl = courseData.videoUrl || null;
      if (videoUrl && !isAbsoluteUrl(videoUrl)) {
        // If backend stored relative path like /uploads/xxx.mp4, prefix with server origin
        videoUrl = `https://backend-u6jh.onrender.com${videoUrl}`;
      }
      setVideoPreview(videoUrl);
      setPdfPreview(courseData.pdfPath ? `https://backend-u6jh.onrender.com${courseData.pdfPath}` : null);
    } catch (error) {
      console.error('Error lors de la récupération du cours:', error);
      setError('Error while chargement du cours');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCourse(prev => ({
      ...prev,
      [name]: value
    }));
    // Effacer l'erreur pour ce champ
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB
        alert('L\'image est trop volumineuse. Taille maximum : 5MB');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024 * 1024) { // 2GB
        alert('La vidéo est trop volumineuse. Taille maximum : 2GB');
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handlePdfChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Seuls les fichiers PDF sont autorisés');
        return;
      }
      if (file.size > 20 * 1024 * 1024) { // 20MB
        alert('Le PDF est trop volumineux. Taille maximum : 20MB');
        return;
      }
      setPdfFile(file);
      setPdfPreview(file.name);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview('');
  };

  const removePdf = () => {
    setPdfFile(null);
    setPdfPreview('');
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!course.title.trim()) newErrors.title = 'Le titre est requis';
    if (!course.description.trim()) newErrors.description = 'La description est requise';
    if (!course.content.trim()) newErrors.content = 'Le contenu est requis';
    if (!course.level) newErrors.level = 'Le niveau est requis';
    if (!course.order || course.order < 1) newErrors.order = 'L\'ordre doit être un nombre positif';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', course.title);
      formData.append('description', course.description);
      formData.append('content', course.content);
      formData.append('level', course.level);
      formData.append('order', course.order);
      // If user provided a YouTube URL (or any external URL), always send it
      if (course.videoUrl) {
        formData.append('videoUrl', (course.videoUrl || '').trim());
      }

      if (imageFile) {
        formData.append('image', imageFile);
      }
      if (videoFile) {
        formData.append('video', videoFile);
      }
      if (pdfFile) {
        formData.append('pdf', pdfFile);
      }

      if (id) {
        // Mise à jour
        await api.put(`/api/courses/${id}`, formData, {
          headers: { 
            'Content-Type': 'multipart/form-data'
          }
        });
        alert('Cours mis à jour avec succès !');
      } else {
        // Création
        await api.post('/api/courses', formData, {
          headers: { 
            'Content-Type': 'multipart/form-data'
          }
        });
        alert('Cours créé avec succès !');
      }
      
      navigate('/admin');
    } catch (error) {
      console.error('Error lors de la sauvegarde:', error);
      if (error.response?.data?.errors) {
        setError(error.response.data.errors.join(', '));
      } else {
        setError(error.response?.data?.error || 'Error lors de la sauvegarde');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-german-50 to-german-100">
      {/* Header */}
      <div className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center text-german-600 hover:text-german-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back à l'admin
            </button>
            
            <div className="text-center">
              <h1 className="text-3xl font-bold text-german-800">
                {id ? 'Modifier le cours' : 'Créer un nouveau cours'}
              </h1>
            </div>

          {/* Upload de PDF */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-german-700 mb-2">
              Document PDF du cours (optionnel)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {pdfPreview ? (
                <div className="relative">
                  <p className="text-gray-700 mb-2">{pdfFile ? pdfFile.name : 'PDF existant'}</p>
                  {pdfPreview.startsWith('http') && (
                    <a href={pdfPreview} target="_blank" rel="noreferrer" className="text-german-600 underline">Voir le PDF</a>
                  )}
                  <button
                    type="button"
                    onClick={removePdf}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Cliquez pour sélectionner un PDF</p>
                  <p className="text-sm text-gray-500">PDF jusqu'à 20MB</p>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfChange}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label
                    htmlFor="pdf-upload"
                    className="inline-block mt-2 px-4 py-2 bg-german-600 text-white rounded-lg hover:bg-german-700 cursor-pointer"
                  >
                    Sélectionner un PDF
                  </label>
                </div>
              )}
            </div>
          </div>
            
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8">
          {/* Informations de base */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-german-700 mb-2">
                Titre *
              </label>
              <input
                type="text"
                name="title"
                value={course.title}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-german-500 focus:border-transparent ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Titre du cours"
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-german-700 mb-2">
                Level *
              </label>
              <select
                name="level"
                value={course.level}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-german-500 focus:border-transparent ${
                  errors.level ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {levels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              {errors.level && <p className="text-red-500 text-sm mt-1">{errors.level}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-german-700 mb-2">
                Ordre dans le niveau *
              </label>
              <input
                type="number"
                name="order"
                value={course.order}
                onChange={handleInputChange}
                min="1"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-german-500 focus:border-transparent ${
                  errors.order ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="1"
              />
              {errors.order && <p className="text-red-500 text-sm mt-1">{errors.order}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-german-700 mb-2">
                URL YouTube (optionnel)
              </label>
              <input
                type="url"
                name="videoUrl"
                value={course.videoUrl}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-german-500 focus:border-transparent"
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-german-700 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={course.description}
              onChange={handleInputChange}
              rows="3"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-german-500 focus:border-transparent ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Description courte du cours"
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-german-700 mb-2">
              Contenu du cours *
            </label>
            <textarea
              name="content"
              value={course.content}
              onChange={handleInputChange}
              rows="10"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-german-500 focus:border-transparent ${
                errors.content ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Contenu détaillé du cours (HTML autorisé)"
            />
            {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content}</p>}
            <p className="text-sm text-gray-500 mt-1">
              Vous pouvez utiliser du HTML pour formater le contenu (ex: &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, etc.)
            </p>
          </div>

          {/* Upload d'image */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-german-700 mb-2">
              Image du cours
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {imagePreview ? (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Aperçu" 
                    className="max-h-48 mx-auto rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Cliquez pour sélectionner une image</p>
                  <p className="text-sm text-gray-500">PNG, JPG jusqu'à 5MB</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="inline-block mt-2 px-4 py-2 bg-german-600 text-white rounded-lg hover:bg-german-700 cursor-pointer"
                  >
                    Sélectionner une image
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Upload de vidéo */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-german-700 mb-2">
              Vidéo du cours (optionnel)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {videoPreview ? (
                <div className="relative">
                  <video 
                    src={videoPreview} 
                    controls 
                    className="max-h-48 mx-auto rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={removeVideo}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <Play className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Cliquez pour sélectionner une vidéo</p>
                  <p className="text-sm text-gray-500">MP4, AVI jusqu'à 2GB</p>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                    className="hidden"
                    id="video-upload"
                  />
                  <label
                    htmlFor="video-upload"
                    className="inline-block mt-2 px-4 py-2 bg-german-600 text-white rounded-lg hover:bg-german-700 cursor-pointer"
                  >
                    Sélectionner une vidéo
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-german-600 text-white rounded-lg hover:bg-german-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sauvegarde...
                </>
              ) : (
                id ? 'Mettre à jour' : 'Créer le cours'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CourseForm;
