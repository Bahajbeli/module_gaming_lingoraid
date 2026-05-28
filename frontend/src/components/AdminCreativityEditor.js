import React, { useRef, useState } from 'react';
import api, { getAssetUrl } from '../utils/axios';

const AdminCreativityEditor = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [points, setPoints] = useState([]);
  const imgRef = useRef(null);
  const [items, setItems] = useState([]);

  // Helper pour construire l'URL complète des assets

  const loadItems = async () => {
    try {
      const res = await api.get('/api/creativity/admin');
      setItems(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('image', file);
    const res = await api.post('/api/creativity/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    setImageUrl(res.data.url);
  };

  const handleClick = (e) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const nx = imgRef.current.naturalWidth || rect.width;
    const ny = imgRef.current.naturalHeight || rect.height;
    const xpct = (e.clientX - rect.left) / rect.width;
    const ypct = (e.clientY - rect.top) / rect.height;
    // Sauvegarder à la fois en coordonnées naturelles (px) et en pourcentage pour compatibilité
    const x = Math.round(xpct * nx);
    const y = Math.round(ypct * ny);
    setPoints((arr) => [...arr, { x, y, xpct, ypct, text: '' }]);
  };

  const updateText = (idx, text) => {
    setPoints((arr) => arr.map((p, i) => (i === idx ? { ...p, text } : p)));
  };

  const removePoint = (idx) => {
    setPoints((arr) => arr.filter((_, i) => i !== idx));
  };

  const save = async () => {
    if (!imageUrl) return alert("Upload image d'abord");
    const payload = { title: 'Drag & Drop Matching', description: 'Jeu de créativité (hotspots)', image: imageUrl, points };
    await api.post('/api/creativity/save', payload);
    alert('Enregistré');
    loadItems();
  };

  const remove = async (id) => {
    if (!window.confirm('Supprimer cet élément ?')) return;
    await api.delete(`/api/creativity/${id}`);
    loadItems();
  };

  React.useEffect(() => { loadItems(); }, []);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Éditeur – Drag & Drop Matching</h1>
      <div className="flex items-center gap-4">
        <input type="file" accept="image/*" onChange={onUpload} />
        <button onClick={save} className="bg-green-600 text-white px-4 py-2 rounded">Sauvegarder</button>
      </div>
      <div className="flex gap-6">
        <div className="relative border rounded overflow-hidden" style={{ maxWidth: '100%' }}>
          {imageUrl ? (
            <img src={getAssetUrl(imageUrl)} ref={imgRef} alt="background" onClick={handleClick} className="max-w-full h-auto select-none" />
          ) : (
            <div className="p-6 text-gray-500">Uploader une image pour commencer</div>
          )}
          {imageUrl && points.map((p, i) => {
            const rect = imgRef.current?.getBoundingClientRect();
            const left = p.xpct != null && rect ? p.xpct * rect.width - 8 : (p.x - 8);
            const top  = p.ypct != null && rect ? p.ypct * rect.height - 8 : (p.y - 8);
            return (
            <div key={i} className="absolute" style={{ left, top }}>
              <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow" />
            </div>
          );})}
        </div>
        <div className="flex-1">
          <h2 className="font-semibold mb-2">Points</h2>
          <ul className="space-y-3">
            {points.map((p, i) => (
              <li key={i} className="p-3 bg-white rounded shadow flex items-start gap-2">
                <div className="text-sm text-gray-600 w-24">x:{p.x} y:{p.y}</div>
                <input
                  className="flex-1 border rounded px-2 py-1"
                  placeholder="Texte (DE)"
                  value={p.text}
                  onChange={(e) => updateText(i, e.target.value)}
                />
                <button onClick={() => removePoint(i)} className="text-red-600">Supprimer</button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Éléments enregistrés</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map(it => (
            <li key={it.id} className="bg-white rounded shadow p-3 flex items-center gap-3">
              <img src={getAssetUrl(it.imageUrl)} alt="thumb" className="w-16 h-16 object-cover rounded" />
              <div className="flex-1">
                <div className="font-semibold">{it.title}</div>
                <div className="text-sm text-gray-600">{new Date(it.createdAt).toLocaleString()}</div>
              </div>
              <button onClick={() => remove(it.id)} className="text-red-600">Supprimer</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AdminCreativityEditor;


