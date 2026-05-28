import React, { useEffect, useState } from 'react';
import api, { getAssetUrl } from '../utils/axios';
import { Plus, Edit, Trash2, Upload, Search, Copy, X } from 'lucide-react';


const AdminStoriesManagement = () => {
  const [stories, setStories] = useState([]);
  const [filteredStories, setFilteredStories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [image, setImage] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [audio, setAudio] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [form, setForm] = useState({
    title: '', description: '', type: 'histoire', content: '', language: 'Allemand', languageLevel: 'A1', isActive: true
  });

  useEffect(() => { fetchStories(); }, []);

  const fetchStories = async () => {
    try {
      const res = await api.get('/api/stories/admin/all');
      const items = Array.isArray(res.data) ? res.data : [];
      setStories(items.map(s => ({ ...s, imageUrl: getAssetUrl(s.imageUrl) })));
    } catch (error) {
      console.error('Error while chargement des histoires:', error);
    }
  };

  // Filtrer les histoires
  useEffect(() => {
    let filtered = [...stories];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(query) ||
        (s.description && s.description.toLowerCase().includes(query))
      );
    }
    
    if (filterLevel !== 'all') {
      filtered = filtered.filter(s => s.languageLevel === filterLevel);
    }
    
    if (filterType !== 'all') {
      filtered = filtered.filter(s => s.type === filterType);
    }
    
    setFilteredStories(filtered);
  }, [stories, searchQuery, filterLevel, filterType]);

  // Dupliquer une histoire
  const duplicateStory = async (story) => {
    setForm({
      title: `${story.title} (copie)`,
      description: story.description || '',
      type: story.type || 'histoire',
      content: story.content || '',
      language: story.language || 'Allemand',
      languageLevel: story.languageLevel || 'A1',
      isActive: false
    });
    setEditing(null);
    setImage(null);
    setPdf(null);
    setAudio(null);
    setShowForm(true);
  };

  // Calculer les statistiques
  const getStoryStats = (story) => {
    const wordCount = story.content ? story.content.split(/\s+/).length : 0;
    const readingTime = Math.ceil(wordCount / 200);
    return { wordCount, readingTime };
  };

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k,v]) => {
      if (v !== '' && v !== null && v !== undefined) fd.append(k, v);
    });
    if (image) fd.append('image', image);
    if (pdf) fd.append('pdf', pdf);
    if (audio) fd.append('audio', audio);
    if (editing) {
      await api.put(`/api/stories/admin/${editing.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert('Histoire modifiée');
    } else {
      await api.post('/api/stories/admin/create', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert('Histoire créée');
    }
    setShowForm(false); setEditing(null); setImage(null); setPdf(null); setAudio(null);
    setForm({ title: '', description: '', type: 'histoire', content: '', language: 'Allemand', languageLevel: 'A1', isActive: true });
    fetchStories();
  };

  const del = async (id) => {
    if (!window.confirm('Supprimer cette histoire ?')) return;
    await api.delete(`/api/stories/admin/${id}`);
    fetchStories();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-german-50 to-german-100">
      <div className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-pink-600 bg-clip-text text-transparent">Gestion des Histoires</h1>
          <button onClick={() => { setShowForm(true); setEditing(null); }} className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors flex items-center">
            <Plus className="w-4 h-4 mr-2" /> Nouvelle histoire
          </button>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">Tous les niveaux</option>
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
              <option value="C1">C1</option>
              <option value="C2">C2</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">Tous les types</option>
              <option value="histoire">Histoire</option>
              <option value="livre">Livre</option>
              <option value="article">Article</option>
            </select>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">{editing ? 'Modifier' : 'Créer'} une histoire</h3>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="p-2 border rounded" placeholder="Titre" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} required />
              <select className="p-2 border rounded" value={form.type} onChange={e=>setForm({...form, type:e.target.value})}>
                <option value="histoire">Histoire</option>
                <option value="livre">Livre</option>
                <option value="article">Article</option>
              </select>
              <input className="p-2 border rounded" placeholder="Langue" value={form.language} onChange={e=>setForm({...form, language:e.target.value})} />
              <input className="p-2 border rounded" placeholder="Level (A1..C2)" value={form.languageLevel} onChange={e=>setForm({...form, languageLevel:e.target.value})} />
            </div>
            <textarea className="w-full p-2 border rounded" rows="3" placeholder="Description" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
            <textarea className="w-full p-2 border rounded" rows="5" placeholder="Contenu (optionnel)" value={form.content} onChange={e=>setForm({...form, content:e.target.value})} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="border-2 border-dashed rounded p-4 text-center cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={e=>setImage(e.target.files[0])} />
                <Upload className="w-6 h-6 mx-auto mb-1" /> Image
              </label>
              <label className="border-2 border-dashed rounded p-4 text-center cursor-pointer">
                <input type="file" accept="application/pdf" className="hidden" onChange={e=>setPdf(e.target.files[0])} />
                <Upload className="w-6 h-6 mx-auto mb-1" /> PDF
              </label>
              <label className="border-2 border-dashed rounded p-4 text-center cursor-pointer">
                <input type="file" accept="audio/*" className="hidden" onChange={e=>setAudio(e.target.files[0])} />
                <Upload className="w-6 h-6 mx-auto mb-1" /> Audio
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={()=>{ setShowForm(false); setEditing(null); }} className="px-4 py-2">Annuler</button>
              <button type="submit" className="bg-pink-600 text-white px-4 py-2 rounded">{editing ? 'Enregistrer' : 'Créer'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold">Toutes les histoires ({filteredStories.length})</h3>
          </div>
          <div className="divide-y">
            {filteredStories.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>Aucune histoire trouvée</p>
              </div>
            ) : (
              filteredStories.map(story => {
                const stats = getStoryStats(story);
                return (
                  <div key={story.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-16 h-16 bg-gray-200 rounded overflow-hidden flex items-center justify-center">
                        {story.imageUrl ? <img alt="" src={story.imageUrl} className="w-full h-full object-cover" /> : '📖'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold">{story.title}</div>
                          {!story.isActive && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Inactif</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">{story.type} · {story.languageLevel}</div>
                        {stats.wordCount > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {stats.wordCount} mots · {stats.readingTime} min de lecture
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => duplicateStory(story)}
                        className="text-purple-600 hover:text-purple-800"
                        title="Dupliquer"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditing(story);
                          setForm({
                            title: story.title,
                            description: story.description || '',
                            type: story.type,
                            content: story.content || '',
                            language: story.language || 'Allemand',
                            languageLevel: story.languageLevel || 'A1',
                            isActive: story.isActive !== false
                          });
                          setImage(null);
                          setPdf(null);
                          setAudio(null);
                          setShowForm(true);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => del(story.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStoriesManagement;


