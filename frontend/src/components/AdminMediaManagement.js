import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { getAssetUrl } from '../utils/axios';
import { 
  Film, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Star,
  Users,
  Clock,
  ArrowLeft,
  Globe,
  Headphones,
  Tv,
  Upload,
  FileVideo,
  FileAudio
} from 'lucide-react';

const AdminMediaManagement = () => {
  const { user } = useAuth();
  const [media, setMedia] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingMedia, setEditingMedia] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'musique',
    language: 'Allemand',
    subtitles: '',
    duration: '',
    rating: '',
    viewers: '',
    imageUrl: '',
    streamingUrl: '',
    categoryId: '',
    isActive: true
  });

  // État des fichiers
  const [imageFile, setImageFile] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchMedia();
    fetchCategories();
  }, []);

  // Helpers pour normaliser et filtrer les données (évite d'afficher des jeux)

  const normalizeItem = (item) => ({
    ...item,
    type: (item.type || item.mediaType || item.category?.name || '').toString().toLowerCase(),
    imageUrl: getAssetUrl(item.imageUrl || item.image || item.imagePath),
  });

  const allowedTypes = new Set(['musique','podcast','film']);

  const fetchMedia = async () => {
    try {
      const response = await api.get('/api/media');
      const items = Array.isArray(response.data) ? response.data : [];
      const normalized = items.map(normalizeItem);
      const filtered = normalized.filter(m => allowedTypes.has(m.type));
      setMedia(filtered);
    } catch (error) {
      console.error('Error lors de la récupération des médias:', error);
      setError('Error while chargement des médias');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/media/categories');
      setCategories(response.data);
      if (response.data.length > 0 && !formData.categoryId) {
        setFormData(prev => ({ ...prev, categoryId: response.data[0].id }));
      }
    } catch (error) {
      console.error('Error lors de la récupération des catégories:', error);
    }
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

  const handleCreateMedia = async (e) => {
    e.preventDefault();
    setIsUploading(true);

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

      if (editingMedia) {
        // Mode édition
        console.log('Updating media with ID:', editingMedia.id);
        console.log('Form data to send:', Object.fromEntries(formDataToSend.entries()));
        
        const response = await api.put(`/api/media/admin/${editingMedia.id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        console.log('Update response:', response.data);
        alert('Média mis à jour avec succès !');
      } else {
        // Mode création
        await api.post('/api/media/admin/create', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('Média créé avec succès !');
      }

      setShowCreateForm(false);
      setEditingMedia(null);
      setFormData({
        title: '',
        description: '',
        type: 'musique',
        language: 'Allemand',
        subtitles: '',
        duration: '',
        rating: '',
        viewers: '',
        imageUrl: '',
        streamingUrl: '',
        categoryId: categories.length > 0 ? categories[0].id : '',
        isActive: true
      });
      setImageFile(null);
      setMediaFile(null);
      setPreviewUrl('');
      console.log('Fetching updated media list...');
      await fetchMedia();
    } catch (error) {
      console.error('Error lors de la sauvegarde du média:', error);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      console.error('Error message:', error.message);
      
      const errorMessage = editingMedia 
        ? 'Error lors de la modification du média'
        : 'Error lors de la création du média';
      
      const details = error.response?.data?.error || error.message || 'Error inconnue';
      alert(`${errorMessage}: ${details}\n\nStatus: ${error.response?.status}\nVoir console pour plus de détails`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateMedia = async (mediaId, updateData) => {
    try {
      const dataToUpdate = {
        ...updateData,
        rating: updateData.rating ? parseFloat(updateData.rating) : null
      };
      
      await api.put(`/api/media/${mediaId}`, dataToUpdate);
      setEditingMedia(null);
      fetchMedia();
      alert('Média mis à jour avec succès !');
    } catch (error) {
      console.error('Error lors de la mise à jour du média:', error);
      alert('Error lors de la mise à jour du média');
    }
  };

  const handleDeleteMedia = async (mediaId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce média ?')) {
      return;
    }

    try {
      await api.delete(`/api/media/${mediaId}`);
      fetchMedia();
      alert('Média supprimé avec succès !');
    } catch (error) {
      console.error('Error lors de la suppression du média:', error);
      alert('Error lors de la suppression du média');
    }
  };

  const getMediaTypeIcon = (type) => {
    const icons = {
      'series': <Tv className="h-5 w-5" />,
      'podcast': <Headphones className="h-5 w-5" />,
      'film': <Film className="h-5 w-5" />
    };
    return icons[type] || <Globe className="h-5 w-5" />;
  };

  const getMediaTypeColor = (type) => {
    const colors = {
      'series': 'text-purple-600 bg-purple-100',
      'podcast': 'text-blue-600 bg-blue-100',
      'film': 'text-green-600 bg-green-100'
    };
    return colors[type] || 'text-gray-600 bg-gray-100';
  };

  const renderStars = (rating) => {
    if (!rating) return null;
    
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />);
    }
    
    if (hasHalfStar) {
      stars.push(<Star key="half" className="h-4 w-4 text-yellow-400 fill-current" style={{ clipPath: 'inset(0 50% 0 0)' }} />);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />);
    }
    
    return <div className="flex items-center">{stars}</div>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-german-50 to-german-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-german-600 mx-auto mb-4"></div>
          <p className="text-german-700 text-lg">Loading des médias...</p>
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
            <div className="flex items-center">
              <button
                onClick={() => window.history.back()}
                className="flex items-center text-german-600 hover:text-german-800 transition-colors mr-4"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </button>
              
              <div className="text-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
                  Gestion des Médias
                </h1>
                <p className="text-german-600 mt-2">Administrez les films, séries et podcasts</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un média
            </button>
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

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Film className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total des médias</p>
                <p className="text-2xl font-bold text-gray-900">{media.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Tv className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Musique</p>
                <p className="text-2xl font-bold text-gray-900">
                  {media.filter(m => m.type === 'musique').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Headphones className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Podcasts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {media.filter(m => m.type === 'podcast').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Note moyenne</p>
                <p className="text-2xl font-bold text-gray-900">
                  {media.filter(m => m.rating).length > 0 
                    ? (media.filter(m => m.rating).reduce((sum, m) => sum + m.rating, 0) / media.filter(m => m.rating).length).toFixed(1)
                    : '0.0'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire de création */}
        {showCreateForm && (
          <div className="bg-white rounded-lg p-6 shadow-md mb-8">
            <h3 className="text-lg font-semibold mb-4">Ajouter un nouveau média</h3>
            
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

            <form onSubmit={handleCreateMedia} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titre
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Titre du média"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="musique">Musique</option>
                    <option value="podcast">Podcast</option>
                    <option value="film">Film</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catégorie
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Langue
                  </label>
                  <input
                    type="text"
                    value={formData.language}
                    onChange={(e) => setFormData({...formData, language: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Allemand"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durée
                  </label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="2h 30min ou 3 saisons"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note (0-5)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={formData.rating}
                    onChange={(e) => setFormData({...formData, rating: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="4.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Spectateurs/Auditeurs
                  </label>
                  <input
                    type="text"
                    value={formData.viewers}
                    onChange={(e) => setFormData({...formData, viewers: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="1.2M"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sous-titres
                  </label>
                  <input
                    type="text"
                    value={formData.subtitles}
                    onChange={(e) => setFormData({...formData, subtitles: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Français, Anglais"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows="3"
                  placeholder="Description du média"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL de l'image
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL de streaming
                  </label>
                  <input
                    type="url"
                    value={formData.streamingUrl}
                    onChange={(e) => setFormData({...formData, streamingUrl: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="https://netflix.com/..."
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  Média actif
                </label>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Upload en cours...
                    </>
                  ) : (
                    'Créer le média'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Liste des médias */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Tous les médias</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Média
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Note
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {media.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gray-200 rounded-lg flex items-center justify-center mr-4">
                          {item.imageUrl ? (
                            <img 
                              src={item.imageUrl} 
                              alt={item.title}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          ) : (
                            getMediaTypeIcon(item.type)
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.type} • {item.language} • {item.duration}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMediaTypeColor(item.type)}`}>
                        {item.category.displayName}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {renderStars(item.rating)}
                        {item.rating && (
                          <span className="ml-2 text-sm text-gray-900">
                            {item.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {item.isActive ? (
                          <Eye className="h-4 w-4 text-green-500" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-red-500" />
                        )}
                        <span className="ml-2 text-sm text-gray-900">
                          {item.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleUpdateMedia(item.id, { isActive: !item.isActive })}
                          className="text-gray-600 hover:text-gray-900"
                          title={item.isActive ? 'Désactiver' : 'Activer'}
                        >
                          {item.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => {
                            setEditingMedia(item);
                            setFormData({
                              title: item.title || '',
                              description: item.description || '',
                              type: item.type || 'musique',
                              language: item.language || 'Allemand',
                              subtitles: item.subtitles || '',
                              duration: item.duration || '',
                              rating: item.rating?.toString() || '',
                              viewers: item.viewers || '',
                              imageUrl: item.imageUrl || '',
                              streamingUrl: item.streamingUrl || '',
                              categoryId: item.categoryId || '',
                              isActive: item.isActive !== false
                            });
                            setShowCreateForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMedia(item.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Supprimer"
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
        </div>
      </div>
    </div>
  );
};

export default AdminMediaManagement;
