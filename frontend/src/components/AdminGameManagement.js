import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/axios';
import { 
  Gamepad2, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Trophy,
  Users,
  Settings,
  ArrowLeft
} from 'lucide-react';

const AdminGameManagement = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createStep, setCreateStep] = useState('choose'); // 'choose' | 'form'
  const [selectedType, setSelectedType] = useState(null); // 'quiz' | 'mots-croises' | 'creativite' | 'simulation'
  const [formData, setFormData] = useState({
    type: 'quiz',
    mode: 'online',
    difficulty: 'medium',
    title: '',
    description: '',
    isActive: true
  });

  // Champs spécifiques par type
  const [quizFields, setQuizFields] = useState({ title: '', topic: '', questions: 10 });
  const [cwFields, setCwFields] = useState({ title: '', description: '' });
  const [creaFields, setCreaFields] = useState({ title: '', prompt: '', minSentences: 3 });
  const [simFields, setSimFields] = useState({ title: '', context: '', steps: 3 });

  useEffect(() => {
    fetchGames();
    fetchTemplates();
  }, []);

  const fetchGames = async () => {
    try {
      const response = await api.get('/api/games/admin');
      setGames(response.data);
    } catch (error) {
      console.error('Error lors de la récupération des jeux:', error);
      setError('Error loading games');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      await api.get('/api/games/templates');
    } catch (error) {
      console.error('Error lors de la récupération des modèles:', error);
    }
  };

  const handleCreateGame = async (e) => {
    e.preventDefault();
    try {
      // Construire payload spécifique tout en respectant la forme attendue par l'API
      let payload = { ...formData, type: selectedType || formData.type };
      if (selectedType === 'quiz') {
        payload.title = quizFields.title || 'Quiz';
        payload.description = `Sujet: ${quizFields.topic || 'N/A'} • Questions: ${quizFields.questions}`;
        payload.metadata = {
          kind: 'quiz',
          topic: quizFields.topic || null,
          questions: quizFields.questions
        };
      } else if (selectedType === 'mots-croises') {
        payload.title = cwFields.title || 'Crosswords';
        payload.description = cwFields.description || 'Puzzle de mots croisés';
        payload.metadata = {
          kind: 'mots-croises',
          note: 'Créer/associer la grille dans la section Crosswords',
          description: cwFields.description || null
        };
      } else if (selectedType === 'creativite') {
        payload.title = creaFields.title || 'Activité créative';
        payload.description = `Consigne: ${creaFields.prompt || ''} • Minimum phrases: ${creaFields.minSentences}`;
        payload.metadata = {
          kind: 'creativite',
          prompt: creaFields.prompt || null,
          minSentences: creaFields.minSentences
        };
      } else if (selectedType === 'simulation') {
        payload.title = simFields.title || 'Simulation';
        payload.description = `Contexte: ${simFields.context || ''} • Étapes: ${simFields.steps}`;
        payload.metadata = {
          kind: 'simulation',
          context: simFields.context || null,
          steps: simFields.steps
        };
      }

      await api.post('/api/games/admin/create', payload);
      setShowCreateForm(false);
      setFormData({
        type: 'quiz',
        mode: 'online',
        difficulty: 'medium',
        title: '',
        description: '',
        isActive: true
      });
      setCreateStep('choose');
      setSelectedType(null);
      setQuizFields({ title: '', topic: '', questions: 10 });
      setCwFields({ title: '', description: '' });
      setCreaFields({ title: '', prompt: '', minSentences: 3 });
      setSimFields({ title: '', context: '', steps: 3 });
      fetchGames();
      alert('Jeux créés avec succès !');
    } catch (error) {
      console.error('Error lors de la création des jeux:', error);
      alert('Error lors de la création des jeux');
    }
  };

  const handleUpdateGame = async (gameId, updateData) => {
    try {
      await api.put(`/api/games/admin/${gameId}`, updateData);
      fetchGames();
      alert('Jeu mis à jour avec succès !');
    } catch (error) {
      console.error('Error lors de la mise à jour du jeu:', error);
      alert('Error lors de la mise à jour du jeu');
    }
  };

  const handleDeleteGame = async (gameId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce jeu ?')) {
      return;
    }

    try {
      await api.delete(`/api/games/admin/${gameId}`);
      fetchGames();
      alert('Jeu supprimé avec succès !');
    } catch (error) {
      console.error('Error lors de la suppression du jeu:', error);
      alert('Error lors de la suppression du jeu');
    }
  };

  const getGameTypeIcon = (type) => {
    const icons = {
      'quiz': '🎯',
      'mots-croises': '📝',
      'creativite': '🎨',
      'simulation': '🎮'
    };
    return icons[type] || '🎮';
  };


  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 'unlocked':
        return <Unlock className="h-4 w-4 text-green-500" />;
      case 'locked':
        return <Lock className="h-4 w-4 text-red-500" />;
      default:
        return <Settings className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-german-50 to-german-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-german-600 mx-auto mb-4"></div>
          <p className="text-german-700 text-lg">Loading games...</p>
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
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent">
                  Gestion des Jeux
                </h1>
                <p className="text-german-600 mt-2">Administrez les jeux de la plateforme</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer des Jeux
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
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Gamepad2 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total games</p>
                <p className="text-2xl font-bold text-gray-900">{games.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Unlock className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Jeux actifs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {games.filter(g => g.isActive).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Trophy className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed games</p>
                <p className="text-2xl font-bold text-gray-900">
                  {games.filter(g => g.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Utilisateurs uniques</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(games.map(g => g.userId)).size}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire de création */}
        {showCreateForm && (
          <div className="bg-white rounded-lg p-6 shadow-md mb-8">
            <h3 className="text-lg font-semibold mb-4">Créer un jeu</h3>

            {createStep === 'choose' && (
              <>
                <p className="text-sm text-gray-600 mb-4">Choisissez un type de jeu</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { id: 'quiz', title: 'Quiz', emoji: '🎯', color: 'from-purple-500 to-purple-600' },
                    { id: 'mots-croises', title: 'Crosswords', emoji: '🔤', color: 'from-blue-500 to-blue-600' },
                    { id: 'creativite', title: 'Creativity', emoji: '✨', color: 'from-green-500 to-green-600' },
                    { id: 'simulation', title: 'Simulation', emoji: '🎭', color: 'from-orange-500 to-orange-600' }
                  ].map(card => (
                    <button
                      key={card.id}
                      onClick={() => {
                        setSelectedType(card.id);
                        setFormData({ ...formData, type: card.id });
                        setCreateStep('form');
                      }}
                      className={`bg-gradient-to-br ${card.color} rounded-xl p-6 text-white shadow hover:shadow-lg transition`}
                    >
                      <div className="text-4xl mb-2">{card.emoji}</div>
                      <div className="text-lg font-semibold">{card.title}</div>
                    </button>
                  ))}
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Fermer
                  </button>
                </div>
              </>
            )}

            {createStep === 'form' && (
              <form onSubmit={handleCreateGame} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Type sélectionné</p>
                    <span className="inline-block px-3 py-1 rounded-full text-white bg-purple-600 text-sm">{selectedType}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setCreateStep('choose'); setSelectedType(null); }}
                    className="text-sm text-purple-600 hover:text-purple-800"
                  >
                    Changer de type
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mode
                    </label>
                    <select
                      value={formData.mode}
                      onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="online">En ligne</option>
                      <option value="solo">Solo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Difficulté
                    </label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <div className="flex items-center mt-6 md:mt-0">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mr-2"
                    />
                    <label htmlFor="isActive" className="text-sm text-gray-900">
                      Jeu actif
                    </label>
                  </div>
                </div>

                {/* FORMULAIRES SPÉCIFIQUES */}
                {selectedType === 'quiz' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Titre du quiz</label>
                      <input
                        type="text"
                        value={quizFields.title}
                        onChange={(e) => setQuizFields({ ...quizFields, title: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Ex: Quiz vocabulaire – A1"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sujet / Thème</label>
                        <input
                          type="text"
                          value={quizFields.topic}
                          onChange={(e) => setQuizFields({ ...quizFields, topic: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Ex: Articles der/die/das"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de questions</label>
                        <input
                          type="number"
                          min="1"
                          value={quizFields.questions}
                          onChange={(e) => setQuizFields({ ...quizFields, questions: parseInt(e.target.value || '0', 10) })}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedType === 'mots-croises' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Titre du mots croisés</label>
                      <input
                        type="text"
                        value={cwFields.title}
                        onChange={(e) => setCwFields({ ...cwFields, title: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Ex: Crosswords – thèmes de base"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description du puzzle</label>
                      <textarea
                        rows="3"
                        value={cwFields.description}
                        onChange={(e) => setCwFields({ ...cwFields, description: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Ex: Grille 10x10 – vocabulaire A1"
                      />
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-700 rounded">
                      Gérez les grilles (indices/réponses) dans la section Crosswords. Ici vous créez l’entrée de jeu et son mode.
                    </div>
                  </div>
                )}

                {selectedType === 'creativite' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Titre de l’activité créative</label>
                      <input
                        type="text"
                        value={creaFields.title}
                        onChange={(e) => setCreaFields({ ...creaFields, title: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Ex: Histoire courte – temps du passé"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Consigne</label>
                      <textarea
                        rows="3"
                        value={creaFields.prompt}
                        onChange={(e) => setCreaFields({ ...creaFields, prompt: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Ex: Écrire 5 phrases en utilisant les verbes au Präteritum"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nombre minimum de phrases</label>
                      <input
                        type="number"
                        min="1"
                        value={creaFields.minSentences}
                        onChange={(e) => setCreaFields({ ...creaFields, minSentences: parseInt(e.target.value || '0', 10) })}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                {selectedType === 'simulation' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Titre de la simulation</label>
                      <input
                        type="text"
                        value={simFields.title}
                        onChange={(e) => setSimFields({ ...simFields, title: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Ex: Commander au restaurant"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contexte</label>
                      <textarea
                        rows="3"
                        value={simFields.context}
                        onChange={(e) => setSimFields({ ...simFields, context: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Ex: Dialogue serveur-client, salutation, commande, addition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nombre d’étapes</label>
                      <input
                        type="number"
                        min="1"
                        value={simFields.steps}
                        onChange={(e) => setSimFields({ ...simFields, steps: parseInt(e.target.value || '0', 10) })}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => { setShowCreateForm(false); setCreateStep('choose'); setSelectedType(null); }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Créer le jeu
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Liste des jeux */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Tous les jeux</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jeu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {games.map((game) => (
                  <tr key={game.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{getGameTypeIcon(game.type)}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {game.title || `${game.type} - ${game.mode}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            {game.type} • {game.mode} • {game.difficulty}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{game.user.email}</div>
                      <div className="text-sm text-gray-500">{game.user.role}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(game.status)}
                        <span className="ml-2 text-sm text-gray-900 capitalize">
                          {game.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {game.score !== null ? (
                        <span className="text-sm text-gray-900">{game.score}</span>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleUpdateGame(game.id, { isActive: !game.isActive })}
                          className="text-gray-600 hover:text-gray-900"
                          title={game.isActive ? 'Désactiver' : 'Activer'}
                        >
                          {game.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                          className="text-blue-600 hover:text-blue-900"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteGame(game.id)}
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

export default AdminGameManagement;
