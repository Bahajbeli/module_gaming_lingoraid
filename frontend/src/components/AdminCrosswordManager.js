import React, { useEffect, useMemo, useState } from 'react';
import api from '../utils/axios';

// Simple admin tool to create/manage crosswords with auto-layout helper
const AdminCrosswordManager = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // create form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [width, setWidth] = useState(15);
  const [height, setHeight] = useState(15);
  const [entries, setEntries] = useState([]); // {row,col,direction,number,clue,answer}

  // word helper list for auto-layout
  const [word, setWord] = useState('');
  const [clue, setClue] = useState('');
  const [words, setWords] = useState([]); // {answer, clue}

  const load = async () => {
    try {
      const res = await api.get('/api/crosswords/admin');
      setList(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.error || 'Error de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addWord = () => {
    const clean = String(word).trim();
    if (!clean) return;
    setWords((w) => [...w, { answer: clean, clue }]);
    setWord('');
    setClue('');
  };

  const autoLayout = async () => {
    try {
      const res = await api.post('/api/crosswords/auto-layout', {
        width: Number(width) || 15,
        height: Number(height) || 15,
        words
      });
      setEntries(res.data.entries || []);
    } catch (e) {
      alert(e?.response?.data?.error || 'Error de génération');
    }
  };

  const aiLayout = async () => {
    try {
      const res = await api.post('/api/crosswords/ai-layout', {
        width: Number(width) || 15,
        height: Number(height) || 15,
        words
      });
      setEntries(res.data.entries || []);
    } catch (e) {
      alert(e?.response?.data?.error || 'Error IA (vérifiez OpenAI)');
    }
  };

  const aiHealth = async () => {
    try {
      const res = await api.get('/api/crosswords/ai-health');
      const d = res.data || {};
      alert(`OpenAI OK\nModèle: ${d.model}`);
    } catch (e) {
      alert(e?.response?.data?.error || 'OpenAI non joignable');
    }
  };

  const create = async () => {
    try {
      const payload = { title, description, width: Number(width) || 15, height: Number(height) || 15, entries };
      await api.post('/api/crosswords', payload);
      setTitle(''); setDescription(''); setEntries([]); setWords([]);
      await load();
      alert('Crosswords créé');
    } catch (e) {
      alert(e?.response?.data?.error || 'Error lors de la création');
    }
  };

  const togglePublish = async (id, isPublished) => {
    try {
      await api.post(`/api/crosswords/${id}/publish`, { isPublished: !isPublished });
      await load();
    } catch (e) {
      alert('Error de publication');
    }
  };

  const del = async (id) => {
    if (!window.confirm('Supprimer ce mots croisés ?')) return;
    try {
      await api.delete(`/api/crosswords/${id}`);
      await load();
    } catch (e) {
      alert('Error de suppression');
    }
  };

  const previewGrid = useMemo(() => {
    const g = Array.from({ length: height }, () => Array.from({ length: width }, () => '#'));
    for (const e of entries) {
      for (let i = 0; i < e.answer.length; i++) {
        const r = e.row + (e.direction === 'down' ? i : 0);
        const c = e.col + (e.direction === 'across' ? i : 0);
        if (g[r] && g[r][c] !== undefined) g[r][c] = e.answer[i];
      }
    }
    return g;
  }, [entries, width, height]);

  if (loading) {
    return (
      <div className="p-6 text-center">Loading...</div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Gestion des Crosswords</h1>

      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="font-semibold mb-3">Créer un puzzle</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Titre</label>
            <input className="w-full border p-2 rounded" value={title} onChange={(e)=>setTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Description</label>
            <input className="w-full border p-2 rounded" value={description} onChange={(e)=>setDescription(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Largeur</label>
            <input type="number" className="w-full border p-2 rounded" value={width} onChange={(e)=>setWidth(parseInt(e.target.value||'0',10))} />
          </div>
          <div>
            <label className="block text-sm mb-1">Hauteur</label>
            <input type="number" className="w-full border p-2 rounded" value={height} onChange={(e)=>setHeight(parseInt(e.target.value||'0',10))} />
          </div>
        </div>

        <div className="mt-4">
          <h3 className="font-medium mb-2">Liste des mots à placer (aide auto-layout)</h3>
          <div className="flex gap-2 mb-2">
            <input placeholder="Mot (réponse)" className="border p-2 rounded flex-1" value={word} onChange={(e)=>setWord(e.target.value)} />
            <input placeholder="Indice" className="border p-2 rounded flex-1" value={clue} onChange={(e)=>setClue(e.target.value)} />
            <button onClick={addWord} className="bg-blue-600 text-white px-3 rounded">Ajouter</button>
            <button onClick={autoLayout} className="bg-purple-600 text-white px-3 rounded">Auto (rapide)</button>
            <button onClick={aiLayout} className="bg-emerald-600 text-white px-3 rounded">IA (OpenAI)</button>
            <button onClick={aiHealth} type="button" className="bg-gray-600 text-white px-3 rounded">Tester IA</button>
          </div>
          {words.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-gray-700">
              {words.map((w,i)=>(<li key={i}>{w.answer} – {w.clue}</li>))}
            </ul>
          )}
        </div>

        {entries.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Aperçu</h3>
            <div className="inline-block">
              {previewGrid.map((row, r)=> (
                <div key={r} className="flex">
                  {row.map((ch,c)=> (
                    <div key={c} className={`w-6 h-6 border text-center text-xs ${ch==='#'?'bg-gray-800':''}`}>{ch==='#'?'':ch}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <button onClick={create} className="bg-green-600 text-white px-4 py-2 rounded">Créer</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="font-semibold mb-3">Puzzles existants</h2>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">Titre</th>
                <th className="p-2">Taille</th>
                <th className="p-2">Publié</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map(item => (
                <tr key={item.id} className="border-t">
                  <td className="p-2">{item.title}</td>
                  <td className="p-2">{item.width}×{item.height}</td>
                  <td className="p-2">{item.isPublished? 'Oui':'Non'}</td>
                  <td className="p-2 space-x-2">
                    <button onClick={()=>togglePublish(item.id, item.isPublished)} className="px-2 py-1 bg-blue-600 text-white rounded">
                      {item.isPublished? 'Dépublier':'Publier'}
                    </button>
                    <button onClick={()=>del(item.id)} className="px-2 py-1 bg-red-600 text-white rounded">Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminCrosswordManager;


