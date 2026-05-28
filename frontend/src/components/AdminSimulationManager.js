import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Edit, Trash2, Plus, Save, X } from 'lucide-react';
import api, { apiWithFormData } from '../utils/axios';

const AdminSimulationManager = () => {
  const navigate = useNavigate();
  const [simulations, setSimulations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    theme: '',
    difficulty: 'medium'
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchSimulations();
  }, []);

  const fetchSimulations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/simulation/admin');
      setSimulations(response.data);
    } catch (error) {
      console.error('Error lors de la récupération des simulations:', error);
      setError('Error loading simulations');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedImage && !editingId) {
      setError('Please sélectionner une image');
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('theme', formData.theme);
      formDataToSend.append('difficulty', formData.difficulty);
      
      if (selectedImage) {
        formDataToSend.append('image', selectedImage);
      }

      if (editingId) {
        await apiWithFormData.put(`/api/simulation/${editingId}`, formDataToSend);
        setSuccess('Simulation mise à jour avec succès');
      } else {
        await apiWithFormData.post('/api/simulation/create', formDataToSend);
        setSuccess('Simulation créée avec succès');
      }

      // Réinitialiser le formulaire
      setFormData({
        title: '',
        description: '',
        theme: '',
        difficulty: 'medium'
      });
      setSelectedImage(null);
      setImagePreview(null);
      setShowForm(false);
      setEditingId(null);

      // Rafraîchir la liste
      fetchSimulations();

    } catch (error) {
      console.error('Error lors de la sauvegarde:', error);
      setError(error.response?.data?.error || 'Error lors de la sauvegarde');
    }
  };

  const handleEdit = (simulation) => {
    setEditingId(simulation.id);
    setFormData({
      title: simulation.title || '',
      description: simulation.description || '',
      theme: simulation.metadata ? JSON.parse(simulation.metadata).theme : '',
      difficulty: simulation.difficulty || 'medium'
    });
    
    // Afficher l'image existante si disponible
    if (simulation.metadata) {
      try {
        const metadata = JSON.parse(simulation.metadata);
        if (metadata.imagePath) {
          setImagePreview(`https://backend-u6jh.onrender.com${metadata.imagePath}`);
        }
      } catch (e) {
        console.error('Error parsing metadata:', e);
      }
    }
    
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette simulation ?')) {
      return;
    }

    try {
      await api.delete(`/api/simulation/${id}`);
      setSuccess('Simulation supprimée avec succès');
      fetchSimulations();
    } catch (error) {
      console.error('Error lors de la suppression:', error);
      setError('Error lors de la suppression');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      theme: '',
      difficulty: 'medium'
    });
    setSelectedImage(null);
    setImagePreview(null);
    setShowForm(false);
    setEditingId(null);
    setError(null);
    setSuccess(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-german-50 to-german-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-german-600 mx-auto mb-4"></div>
          <p className="text-german-700 text-lg">Loading simulations...</p>
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
              Back au dashboard
            </button>
            
            <div className="text-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                Gestion des Simulations
              </h1>
              <p className="text-german-600 mt-2">Créez et gérez les jeux de simulation conversationnelle</p>
            </div>
            
            <button
              onClick={() => setShowForm(true)}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nouvelle Simulation
            </button>
          </div>
        </div>
      </div>

      {/* Messages d'erreur et de succès */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        </div>
      )}

      {/* Formulaire */}
      {showForm && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-german-800">
                {editingId ? 'Modifier la Simulation' : 'Nouvelle Simulation'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titre *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Titre de la simulation"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulté
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows="3"
                  placeholder="Description de la simulation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thème de conversation *
                </label>
                <textarea
                  value={formData.theme}
                  onChange={(e) => setFormData({...formData, theme: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows="3"
                  placeholder="Ex: Parler de la famille, discuter du travail, décrire une ville..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image {!editingId && '*'}
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {imagePreview ? (
                    <div className="space-y-4">
                      <img 
                        src={imagePreview} 
                        alt="Aperçu" 
                        className="max-w-xs mx-auto rounded-lg shadow-md"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreview(null);
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Changer l'image
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4">
                        <label className="cursor-pointer bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors">
                          Sélectionner une image
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        JPG, PNG jusqu'à 5MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {editingId ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Liste des simulations */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {simulations.map((simulation) => {
            let metadata = {};
            try {
              if (simulation.metadata) {
                metadata = JSON.parse(simulation.metadata);
              }
            } catch (e) {
              console.error('Error parsing metadata:', e);
            }

            return (
              <div key={simulation.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Image */}
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  {metadata.imagePath ? (
                    <img
                      src={`https://backend-u6jh.onrender.com${metadata.imagePath}`}
                      alt={simulation.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-500 text-center">
                      <Upload className="w-12 h-12 mx-auto mb-2" />
                      <p>No image</p>
                    </div>
                  )}
                </div>

                {/* Contenu */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-bold text-german-800">
                      {simulation.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      simulation.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {simulation.status === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                  </div>

                  {simulation.description && (
                    <p className="text-gray-600 mb-3">{simulation.description}</p>
                  )}

                  {metadata.theme && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-500 mb-1">Topic:</p>
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                        {metadata.theme}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      simulation.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                      simulation.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {simulation.difficulty === 'easy' ? 'Easy' :
                       simulation.difficulty === 'medium' ? 'Medium' : 'Hard'}
                    </span>
                    <span className="text-xs text-gray-500">
                      ID: {simulation.id}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(simulation)}
                      className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(simulation.id)}
                      className="bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {simulations.length === 0 && !showForm && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Upload className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune simulation créée
            </h3>
            <p className="text-gray-500 mb-6">
              Commencez par créer votre première simulation conversationnelle
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center mx-auto"
            >
              <Plus className="w-5 h-5 mr-2" />
              Créer une simulation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSimulationManager;
