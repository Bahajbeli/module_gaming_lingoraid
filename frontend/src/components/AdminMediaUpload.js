import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, Plus, X, Edit, Trash2, Film, Tv, Headphones, FileVideo, FileAudio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';

const AdminMediaUpload = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // État du formulaire
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'series',
    language: 'Allemand',
    subtitles: '',
    duration: '',
    rating: '',
    viewers: '',
    streamingUrl: '',
    imageUrl: '',
    categoryId: '',
    director: '',
    cast: '',
    year: '',
    genre: '',
    episodes: '',
    season: '',
    platform: '',
    languageLevel: 'A1'
  });
  
  // État des fichiers
  const [imageFile, setImageFile] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  // État de l'interface
  const [isUploading, setIsUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingMedia, setEditingMedia] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchCategories();
    fetchMedia();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/media/categories');
      setCategories(response.data);
      if (response.data.length > 0) {
        setFormData(prev => ({ ...prev, categoryId: response.data[0].id }));
      }
    } catch (error) {
      console.error('Error lors de la récupération des catégories:', error);
    }
  };

  const fetchMedia = async () => {
    try {
      const response = await api.get('/api/media');
      setMedia(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error lors de la récupération des médias:', error);
      setError('Error lors de la récupération des médias');
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleMediaFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      console.log('Fichier média sélectionné:', file.name, file.size, file.type);
    }
  };

  const getAcceptedFileTypes = () => {
    switch (formData.type) {
      case 'film':
        return 'video/*,.mp4,.avi,.mkv,.mov,.wmv,.flv,.webm';
      case 'series':
        return 'video/*,.mp4,.avi,.mkv,.mov,.wmv,.flv,.webm';
      case 'podcast':
        return 'audio/*,.mp3,.wav,.aac,.ogg,.m4a,.flac';
      default:
        return 'video/*,audio/*';
    }
  };

  const getFileIcon = () => {
    switch (formData.type) {
      case 'film':
      case 'series':
        return <FileVideo className="w-8 h-8 text-blue-400 mx-auto mb-2" />;
      case 'podcast':
        return <FileAudio className="w-8 h-8 text-green-400 mx-auto mb-2" />;
      default:
        return <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formDataToSend = new FormData();
      
      // Ajouter les données du formulaire
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '' && formData[key] !== null && formData[key] !== undefined) {
          formDataToSend.append(key, formData[key]);
        }
      });

      // Ajouter les fichiers
      if (imageFile) {
        formDataToSend.append('image', imageFile);
        console.log('Image ajoutée:', imageFile.name);
      }
      if (mediaFile) {
        formDataToSend.append('mediaFile', mediaFile);
        console.log('Fichier média ajouté:', mediaFile.name);
      }

      // Simuler le progrès d'upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      let response;
      if (editingMedia) {
        response = await api.put(`/api/media/admin/${editingMedia.id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        response = await api.post('/api/media/admin/create', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.data.success || response.data.id) {
        alert(editingMedia ? 'Média mis à jour avec succès!' : 'Média créé avec succès!');
        resetForm();
        fetchMedia();
      }
    } catch (error) {
      console.error('Error lors de l\'upload:', error);
      let errorMessage = 'Error lors de l\'upload';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEdit = (mediaItem) => {
    setEditingMedia(mediaItem);
    setFormData({
      title: mediaItem.title,
      description: mediaItem.description,
      type: mediaItem.type,
      language: mediaItem.language,
      subtitles: mediaItem.subtitles || '',
      duration: mediaItem.duration || '',
      rating: mediaItem.rating?.toString() || '',
      viewers: mediaItem.viewers || '',
      streamingUrl: mediaItem.streamingUrl || '',
      imageUrl: mediaItem.imageUrl || '',
      categoryId: mediaItem.categoryId,
      director: mediaItem.director || '',
      cast: mediaItem.cast || '',
      year: mediaItem.year || '',
      genre: mediaItem.genre || '',
      episodes: mediaItem.episodes || '',
      season: mediaItem.season || '',
      platform: mediaItem.platform || '',
      languageLevel: mediaItem.languageLevel || 'A1'
    });
    setShowForm(true);
  };

  const handleDelete = async (mediaId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce média ?')) {
      try {
        await api.delete(`/api/media/${mediaId}`);
        alert('Média supprimé avec succès!');
        fetchMedia();
      } catch (error) {
        console.error('Error lors de la suppression:', error);
        alert('Error lors de la suppression');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'series',
      language: 'Allemand',
      subtitles: '',
      duration: '',
      rating: '',
      viewers: '',
      streamingUrl: '',
      imageUrl: '',
      categoryId: categories[0]?.id || '',
      director: '',
      cast: '',
      year: '',
      genre: '',
      episodes: '',
      season: '',
      platform: '',
      languageLevel: 'A1'
    });
    setImageFile(null);
    setMediaFile(null);
    setPreviewUrl('');
    setEditingMedia(null);
    setShowForm(false);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'series': return <Tv className="w-6 h-6 text-blue-500" />;
      case 'podcast': return <Headphones className="w-6 h-6 text-green-500" />;
      case 'film': return <Film className="w-6 h-6 text-purple-500" />;
      default: return <FileVideo className="w-6 h-6 text-gray-500" />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'musique': return 'Musique';
      case 'podcast': return 'Podcast';
      case 'film': return 'Film';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-german-50 to-german-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-german-600 mx-auto mb-4"></div>
          <p className="text-german-700 text-lg">Loading...</p>
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
            onClick={() => navigate('/admin')}
            className="bg-german-600 text-white px-6 py-2 rounded-lg hover:bg-german-700 transition-colors"
          >
            Back à l'administration
          </button>
        </div>
      </div>
    );
  }

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
              Back à l'administration
            </button>
            
            <div className="text-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent">
                Gestion des Médias
              </h1>
              <p className="text-german-600 mt-2">Ajoutez et gérez vos films, séries et podcasts</p>
            </div>
            
            <button
              onClick={() => setShowForm(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un média
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Formulaire d'upload */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-german-800">
                {editingMedia ? 'Modifier le média' : 'Ajouter un nouveau média'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section Upload de fichiers - TRÈS VISIBLE */}
              <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-300 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
                  📁 UPLOAD DE FICHIERS DEPUIS VOTRE PC
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Upload d'image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🖼️ Image de couverture
                    </label>
                    <div className="border-2 border-dashed border-blue-400 rounded-lg p-6 text-center bg-white hover:bg-blue-50 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload" className="cursor-pointer">
                        <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-700 font-medium">
                          Cliquez pour sélectionner une image
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          JPG, PNG, WEBP (max 10MB)
                        </p>
                      </label>
                    </div>
                    {previewUrl && (
                      <div className="mt-2">
                        <img src={previewUrl} alt="Aperçu" className="w-32 h-20 object-cover rounded" />
                      </div>
                    )}
                  </div>

                  {/* Upload de fichier média - CHAMP PRINCIPAL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🎬 FICHIER MÉDIA ({formData.type === 'podcast' ? 'Audio' : 'Vidéo'})
                    </label>
                    <div className="border-2 border-dashed border-green-400 rounded-lg p-6 text-center bg-white hover:bg-green-50 transition-colors">
                      <input
                        type="file"
                        accept={getAcceptedFileTypes()}
                        onChange={handleMediaFileChange}
                        className="hidden"
                        id="media-upload"
                      />
                      <label htmlFor="media-upload" className="cursor-pointer">
                        {getFileIcon()}
                        <p className="text-sm text-gray-700 font-bold">
                          📂 CLIQUEZ ICI POUR SÉLECTIONNER UN FICHIER {formData.type === 'podcast' ? 'AUDIO' : 'VIDÉO'} DEPUIS VOTRE PC
                        </p>
                        <p className="text-xs text-gray-600 mt-2">
                          Formats acceptés: {formData.type === 'podcast' ? 'MP3, WAV, AAC, OGG, M4A, FLAC' : 'MP4, AVI, MKV, MOV, WMV, FLV, WEBM'}
                        </p>
                        <p className="text-xs text-orange-600 mt-1 font-bold">
                          Taille max: 2GB
                        </p>
                      </label>
                    </div>
                    {mediaFile && (
                      <div className="mt-2 p-3 bg-green-100 rounded border-2 border-green-300">
                        <p className="text-sm text-green-800 font-bold">
                          ✅ FICHIER SÉLECTIONNÉ: {mediaFile.name}
                        </p>
                        <p className="text-xs text-green-700">
                          📏 Taille: {(mediaFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                        <p className="text-xs text-green-700">
                          📋 Type: {mediaFile.type}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Informations de base */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titre *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type *
                      </label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="musique">Musique</option>
                        <option value="podcast">Podcast</option>
                        <option value="film">Film</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Catégorie *
                      </label>
                      <select
                        name="categoryId"
                        value={formData.categoryId}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.displayName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Détails */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Langue
                      </label>
                      <input
                        type="text"
                        name="language"
                        value={formData.language}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Level de langue
                      </label>
                      <select
                        name="languageLevel"
                        value={formData.languageLevel}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="A1">A1 - Débutant</option>
                        <option value="A2">A2 - Élémentaire</option>
                        <option value="B1">B1 - Intermédiaire</option>
                        <option value="B2">B2 - Avancé</option>
                        <option value="C1">C1 - Autonome</option>
                        <option value="C2">C2 - Maîtrise</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sous-titres
                      </label>
                      <input
                        type="text"
                        name="subtitles"
                        value={formData.subtitles}
                        onChange={handleInputChange}
                        placeholder="Français, Anglais"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Durée
                      </label>
                      <input
                        type="text"
                        name="duration"
                        value={formData.duration}
                        onChange={handleInputChange}
                        placeholder="2h 17min ou 3 saisons"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Note (1-5)
                      </label>
                      <input
                        type="number"
                        name="rating"
                        value={formData.rating}
                        onChange={handleInputChange}
                        min="1"
                        max="5"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Spectateurs/Auditeurs
                      </label>
                      <input
                        type="text"
                        name="viewers"
                        value={formData.viewers}
                        onChange={handleInputChange}
                        placeholder="2.5M ou 500K"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL de streaming
                    </label>
                    <input
                      type="url"
                      name="streamingUrl"
                      value={formData.streamingUrl}
                      onChange={handleInputChange}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Plateforme
                    </label>
                    <input
                      type="text"
                      name="platform"
                      value={formData.platform}
                      onChange={handleInputChange}
                      placeholder="Netflix, Spotify, YouTube..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Barre de progression */}
              {isUploading && (
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-purple-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}

              {/* Boutons d'action */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Upload en cours...
                    </>
                  ) : (
                    editingMedia ? 'Mettre à jour' : 'Créer le média'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Liste des médias existants */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-german-800 mb-6">Médias existants</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {media.map(mediaItem => (
              <div key={mediaItem.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(mediaItem.type)}
                    <span className="text-sm font-medium text-gray-600">
                      {getTypeLabel(mediaItem.type)}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(mediaItem)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(mediaItem.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <h3 className="font-semibold text-lg text-gray-800 mb-2">{mediaItem.title}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{mediaItem.description}</p>
                
                <div className="space-y-1 text-sm text-gray-500">
                  <p><span className="font-medium">Langue:</span> {mediaItem.language}</p>
                  {mediaItem.languageLevel && <p><span className="font-medium">Niveau:</span> {mediaItem.languageLevel}</p>}
                  {mediaItem.duration && <p><span className="font-medium">Durée:</span> {mediaItem.duration}</p>}
                  {mediaItem.rating && <p><span className="font-medium">Note:</span> {mediaItem.rating}/5</p>}
                  {mediaItem.viewers && <p><span className="font-medium">Audience:</span> {mediaItem.viewers}</p>}
                  {mediaItem.director && <p><span className="font-medium">Réalisateur:</span> {mediaItem.director}</p>}
                  {mediaItem.year && <p><span className="font-medium">Année:</span> {mediaItem.year}</p>}
                  {mediaItem.genre && <p><span className="font-medium">Genre:</span> {mediaItem.genre}</p>}
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    mediaItem.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {mediaItem.isActive ? 'Actif' : 'Inactif'}
                  </span>
                  {mediaItem.mediaFileUrl && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      Fichier disponible
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {media.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>Aucun média trouvé. Commencez par en ajouter un !</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMediaUpload;
