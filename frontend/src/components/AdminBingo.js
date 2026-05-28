import React, { useEffect, useState, useRef } from 'react';
import api from '../utils/axios';
import { Plus, Trash2, RefreshCcw, Image as ImageIcon } from 'lucide-react';

export default function AdminBingo() {
  const [data, setData] = useState({ classes: [], words: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Class Form
  const [showClassForm, setShowClassForm] = useState(false);
  const [classLabel, setClassLabel] = useState('');
  const [savingClass, setSavingClass] = useState(false);
  const classFileRef = useRef(null);

  // Word Form
  const [showWordForm, setShowWordForm] = useState(false);
  const [wordText, setWordText] = useState('');
  const [selectedClasses, setSelectedClasses] = useState([]); // array of class IDs
  const [savingWord, setSavingWord] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/german-bingo/admin');
      setData({ classes: res.data.classes || [], words: res.data.words || [] });
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSaveClass = async () => {
    const file = classFileRef.current?.files?.[0];
    if (!file || !classLabel.trim()) {
      setError('Label et image obligatoires pour une classe');
      return;
    }
    try {
      setSavingClass(true);
      setError('');
      const fd = new FormData();
      fd.append('label', classLabel.trim());
      fd.append('file', file);
      
      await api.post('/api/german-bingo/classes', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowClassForm(false);
      setClassLabel('');
      if (classFileRef.current) classFileRef.current.value = '';
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur sauvegarde classe');
    } finally {
      setSavingClass(false);
    }
  };

  const handleDeleteClass = async (id) => {
    if (!window.confirm('Supprimer cette classe et tous les mots exclusifs à celle-ci ?')) return;
    try {
      await api.delete(`/api/german-bingo/classes/${id}`);
      load();
    } catch (err) {
      alert('Erreur suppression');
    }
  };

  const handleSaveWord = async () => {
    if (!wordText.trim() || selectedClasses.length === 0) {
      setError('Mot et au moins une classe obligatoires');
      return;
    }
    try {
      setSavingWord(true);
      setError('');
      await api.post('/api/german-bingo/words', {
        word: wordText.trim(),
        correctClassIds: selectedClasses
      });
      setShowWordForm(false);
      setWordText('');
      setSelectedClasses([]);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur sauvegarde mot');
    } finally {
      setSavingWord(false);
    }
  };

  const handleDeleteWord = async (id) => {
    if (!window.confirm('Supprimer ce mot ?')) return;
    try {
      await api.delete(`/api/german-bingo/words/${id}`);
      load();
    } catch (err) {
      alert('Erreur suppression');
    }
  };

  const toggleClassSelection = (id) => {
    setSelectedClasses(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  if (loading && data.classes.length === 0) return <div className="p-6">Chargement...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Gestion du Loto Allemand</h2>
        <button onClick={load} className="p-2 bg-white rounded-lg shadow border hover:bg-gray-50"><RefreshCcw className="w-5 h-5" /></button>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>}

      {/* --- CLASSES --- */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Catégories / Classes ({data.classes.length})</h3>
          <button onClick={() => setShowClassForm(!showClassForm)} className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 font-semibold rounded-lg hover:bg-purple-200">
            <Plus className="w-4 h-4" /> Ajouter une classe
          </button>
        </div>

        {showClassForm && (
          <div className="p-4 bg-white rounded-xl shadow border border-gray-100 mb-4 flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold mb-1">Nom de la catégorie (ex: ALIMENTS)</label>
              <input type="text" className="w-full border rounded-lg p-2" value={classLabel} onChange={e => setClassLabel(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold mb-1">Image (.png, .jpg)</label>
              <input type="file" ref={classFileRef} className="w-full border rounded-lg p-1.5 bg-gray-50" accept="image/*" />
            </div>
            <button disabled={savingClass} onClick={handleSaveClass} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              {savingClass ? '...' : 'Sauvegarder'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {data.classes.map(c => (
            <div key={c.id} className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden text-center group relative">
              <div className="h-24 bg-gray-100 p-2 flex items-center justify-center">
                {c.imageUrl && <img src={c.imageUrl} alt={c.label} className="max-h-full max-w-full object-contain" />}
              </div>
              <div className="p-2 font-bold text-sm bg-purple-50 text-purple-900 border-t border-purple-100">{c.label}</div>
              <button onClick={() => handleDeleteClass(c.id)} className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {data.classes.length === 0 && <div className="col-span-full text-gray-500">Aucune classe définie.</div>}
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* --- WORDS --- */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Mots ({data.words.length})</h3>
          <button onClick={() => setShowWordForm(!showWordForm)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 font-semibold rounded-lg hover:bg-blue-200">
            <Plus className="w-4 h-4" /> Ajouter un mot
          </button>
        </div>

        {showWordForm && (
          <div className="p-4 bg-white rounded-xl shadow border border-gray-100 mb-4">
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-1">Mot (Allemand)</label>
              <input type="text" className="w-full border rounded-lg p-2" value={wordText} onChange={e => setWordText(e.target.value)} placeholder="ex: Apfel" />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Sélectionnez les classes correctes pour ce mot :</label>
              <div className="flex flex-wrap gap-2">
                {data.classes.map(c => {
                  const isSelected = selectedClasses.includes(c.id);
                  return (
                    <button 
                      key={c.id} 
                      onClick={() => toggleClassSelection(c.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${isSelected ? 'bg-purple-600 text-white border-purple-700' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'}`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <button disabled={savingWord} onClick={handleSaveWord} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              {savingWord ? '...' : 'Sauvegarder le mot'}
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-semibold text-gray-600">Mot</th>
                <th className="p-4 font-semibold text-gray-600">Classes associées</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.words.map(w => {
                const associatedClasses = w.correctClassIds.map(cid => data.classes.find(c => c.id === cid)?.label).filter(Boolean);
                return (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="p-4 font-bold text-gray-800">{w.word}</td>
                    <td className="p-4 flex gap-1 flex-wrap">
                      {associatedClasses.map((label, idx) => (
                        <span key={idx} className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-semibold">{label}</span>
                      ))}
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleDeleteWord(w.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 inline-block">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data.words.length === 0 && <div className="p-6 text-center text-gray-500">Aucun mot.</div>}
        </div>
      </div>
    </div>
  );
}
