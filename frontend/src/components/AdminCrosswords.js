import React, { useEffect, useState } from 'react';
import api from '../utils/axios';
import { Plus, Trash2, Globe, EyeOff, RefreshCcw } from 'lucide-react';

export default function AdminCrosswords() {
  const [crosswords, setCrosswords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', width: 15, height: 15 });
  const [wordsText, setWordsText] = useState(''); // format: ANSWER|Clue
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/crosswords/admin');
      setCrosswords(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleGenerateAndSave = async () => {
    try {
      setError('');
      setSaving(true);
      const lines = wordsText.split('\n').map(l => l.trim()).filter(Boolean);
      const words = lines.map(line => {
        const [ans, ...clueParts] = line.split('|');
        return { answer: ans.trim(), clue: clueParts.join('|').trim() };
      }).filter(w => w.answer);

      if (words.length === 0) {
        throw new Error('Veuillez fournir au moins un mot au format REPONSE|Indice');
      }

      // Step 1: Auto-layout
      const layoutRes = await api.post('/api/crosswords/auto-layout', {
        width: Number(formData.width),
        height: Number(formData.height),
        words
      });
      
      const entries = layoutRes.data.entries;
      if (!entries || entries.length === 0) {
        throw new Error('Impossible de générer une grille avec ces mots.');
      }

      // Step 2: Save
      await api.post('/api/crosswords', {
        title: formData.title || 'Nouveau Mots-Croisés',
        description: formData.description,
        width: layoutRes.data.width,
        height: layoutRes.data.height,
        entries
      });

      setShowForm(false);
      setFormData({ title: '', description: '', width: 15, height: 15 });
      setWordsText('');
      load();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (id, currentStatus) => {
    try {
      await api.post(`/api/crosswords/${id}/publish`, { isPublished: !currentStatus });
      load();
    } catch (e) {
      alert('Erreur lors du changement de statut');
    }
  };

  const deleteCw = async (id) => {
    if (!window.confirm('Supprimer ce mots-croisés ?')) return;
    try {
      await api.delete(`/api/crosswords/${id}`);
      load();
    } catch (e) {
      alert('Erreur suppression');
    }
  };

  if (loading && crosswords.length === 0) return <div className="p-6">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Gestion des Mots-Croisés</h2>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 bg-white rounded-lg shadow border hover:bg-gray-50"><RefreshCcw className="w-5 h-5" /></button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700">
            <Plus className="w-4 h-4" /> Nouveau
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>}

      {showForm && (
        <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
          <h3 className="text-lg font-bold mb-4">Générer une grille</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Titre</label>
              <input type="text" className="w-full border rounded-lg p-2" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Description</label>
              <input type="text" className="w-full border rounded-lg p-2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Largeur (max)</label>
              <input type="number" className="w-full border rounded-lg p-2" value={formData.width} onChange={e => setFormData({...formData, width: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Hauteur (max)</label>
              <input type="number" className="w-full border rounded-lg p-2" value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Mots & Indices (Format: REPONSE|Indice de devinette, 1 par ligne)</label>
            <textarea 
              rows={6}
              className="w-full border rounded-lg p-2 font-mono text-sm"
              placeholder="HUND|Le meilleur ami de l'homme&#10;KATZE|Aime chasser les souris"
              value={wordsText}
              onChange={e => setWordsText(e.target.value)}
            />
          </div>
          <button disabled={saving} onClick={handleGenerateAndSave} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            {saving ? 'Génération...' : 'Créer et Sauvegarder'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Titre</th>
              <th className="p-4 font-semibold text-gray-600">Taille</th>
              <th className="p-4 font-semibold text-gray-600">Date</th>
              <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {crosswords.map(cw => (
              <tr key={cw.id} className="hover:bg-gray-50">
                <td className="p-4">
                  <div className="font-semibold text-gray-800">{cw.title}</div>
                  <div className="text-xs text-gray-500">{cw.description}</div>
                </td>
                <td className="p-4 text-gray-600">{cw.width}x{cw.height}</td>
                <td className="p-4 text-gray-600">{new Date(cw.createdAt).toLocaleDateString()}</td>
                <td className="p-4 flex gap-2 justify-end">
                  <button onClick={() => togglePublish(cw.id, cw.isPublished)} className={`p-2 rounded-lg ${cw.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`} title={cw.isPublished ? 'Cacher' : 'Publier'}>
                    {cw.isPublished ? <Globe className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => deleteCw(cw.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {crosswords.length === 0 && <div className="p-6 text-center text-gray-500">Aucun mots-croisés.</div>}
      </div>
    </div>
  );
}
