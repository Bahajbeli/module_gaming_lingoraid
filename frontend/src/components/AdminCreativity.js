import React, { useEffect, useState, useRef } from 'react';
import api, { getAssetUrl } from '../utils/axios';
import { Plus, Trash2, RefreshCcw, Image as ImageIcon, Edit2 } from 'lucide-react';

export default function AdminCreativity() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ id: null, title: '', description: '', image: '' });
  const [points, setPoints] = useState([]); // { xpct, ypct, text, emoji }
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/creativity/admin');
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      setError('');
      const data = new FormData();
      data.append('image', file);
      const res = await api.post('/api/creativity/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData(prev => ({ ...prev, image: res.data.url }));
    } catch (err) {
      setError('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImageClick = (e) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const xpct = (e.clientX - rect.left) / rect.width;
    const ypct = (e.clientY - rect.top) / rect.height;
    
    const text = window.prompt('Entrez le mot ou libellé (ex: ROUGE)');
    if (!text) return;
    const emoji = window.prompt('Entrez l\'emoji ou pointeur (ex: 🔴) - Optionnel') || '●';
    
    setPoints(prev => [...prev, { xpct, ypct, text, emoji }]);
  };

  const handleEdit = async (item) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/api/creativity/${item.id}`);
      const data = res.data;
      setFormData({
        id: data.id,
        title: data.title || '',
        description: data.description || '',
        image: data.image || ''
      });
      setPoints(data.points || []);
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError('Erreur lors du chargement des détails');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.image) {
      setError('Le titre et l\'image sont obligatoires');
      return;
    }
    if (points.length === 0) {
      setError('Veuillez définir au moins un point sur l\'image');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const payload = {
        title: formData.title,
        description: formData.description,
        image: formData.image,
        points
      };
      
      if (formData.id) {
        await api.put(`/api/creativity/${formData.id}`, payload);
      } else {
        await api.post('/api/creativity/save', payload);
      }
      
      setShowForm(false);
      setFormData({ id: null, title: '', description: '', image: '' });
      setPoints([]);
      load();
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setShowForm(false);
    setFormData({ id: null, title: '', description: '', image: '' });
    setPoints([]);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet item ?')) return;
    try {
      await api.delete(`/api/creativity/${id}`);
      load();
    } catch (e) {
      alert('Erreur suppression');
    }
  };

  if (loading && items.length === 0) return <div className="p-6">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Gestion de la Créativité</h2>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 bg-white rounded-lg shadow border hover:bg-gray-50"><RefreshCcw className="w-5 h-5" /></button>
          {!showForm && (
            <button onClick={() => {
              setFormData({ id: null, title: '', description: '', image: '' });
              setPoints([]);
              setShowForm(true);
            }} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700">
              <Plus className="w-4 h-4" /> Nouveau
            </button>
          )}
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>}

      {showForm && (
        <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
          <h3 className="text-lg font-bold mb-4">{formData.id ? 'Modifier l\'Item Créativité' : 'Nouvel Item Créativité'}</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Titre</label>
              <input type="text" className="w-full border rounded-lg p-2" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Description</label>
              <input type="text" className="w-full border rounded-lg p-2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Image de fond</label>
            <div className="flex items-center gap-4">
              <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*" />
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200">
                <ImageIcon className="w-4 h-4" /> {uploading ? 'Upload...' : 'Uploader une image'}
              </button>
              {formData.image && <span className="text-sm text-green-600">Image chargée !</span>}
            </div>
          </div>

          {formData.image && (
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">Cliquez sur l'image pour placer un point (zone de glisser-déposer).</p>
              <div className="relative border-4 border-gray-200 rounded-lg overflow-hidden inline-block" style={{ maxWidth: '100%' }}>
                <img 
                  ref={imgRef}
                  src={getAssetUrl(formData.image)} 
                  alt="Fond" 
                  onClick={handleImageClick}
                  className="cursor-crosshair max-w-full h-auto block"
                />
                {points.map((p, i) => (
                  <div 
                    key={i} 
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
                    style={{ left: `${p.xpct * 100}%`, top: `${p.ypct * 100}%` }}
                  >
                    <span className="text-2xl drop-shadow-md">{p.emoji}</span>
                    <span className="bg-white/90 text-xs px-2 py-1 rounded shadow-sm font-bold mt-1 text-black whitespace-nowrap">{p.text}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Points définis: {points.length}. Pour supprimer les points, annulez et recréez ou ajustez.
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button disabled={saving || !formData.image || points.length === 0} onClick={handleSave} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button onClick={cancelEdit} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden flex flex-col">
            <div className="h-48 bg-gray-100 relative">
              {item.imageUrl && (
                <img src={getAssetUrl(item.imageUrl)} alt={item.title} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <h4 className="font-bold text-gray-900">{item.title}</h4>
              <p className="text-sm text-gray-500 mt-1 flex-1">{item.description}</p>
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Modifier">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="col-span-3 p-6 text-center text-gray-500">Aucune activité de créativité.</div>}
      </div>
    </div>
  );
}
