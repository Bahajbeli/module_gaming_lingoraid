import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiWithFormData, getAssetUrl } from '../utils/axios';
import { ArrowLeft, Trash2, Plus, Image as ImageIcon } from 'lucide-react';

const AdminGermanBingoManager = () => {
  const [classes, setClasses] = useState([]);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [classLabel, setClassLabel] = useState('');
  const [classFile, setClassFile] = useState(null);
  const [classPreview, setClassPreview] = useState(null);
  const [savingClass, setSavingClass] = useState(false);

  const [newWord, setNewWord] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [savingWord, setSavingWord] = useState(false);

  const load = async () => {
    try {
      setError('');
      const res = await api.get('/api/german-bingo/admin');
      setClasses(res.data.classes || []);
      setWords(res.data.words || []);
    } catch (e) {
      setError(e?.response?.data?.error || 'Error de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setClassFile(file || null);
    if (file) {
      setClassPreview(URL.createObjectURL(file));
    } else {
      setClassPreview(null);
    }
  };

  const createClass = async (e) => {
    e.preventDefault();
    if (!classLabel.trim() || !classFile) {
      alert('Nom et image obligatoires');
      return;
    }
    setSavingClass(true);
    try {
      const form = new FormData();
      form.append('label', classLabel.trim());
      form.append('file', classFile);
      await apiWithFormData.post('/api/german-bingo/classes', form);
      setClassLabel('');
      setClassFile(null);
      setClassPreview(null);
      await load();
    } catch (err) {
      alert(err?.response?.data?.error || 'Error lors de la création');
    } finally {
      setSavingClass(false);
    }
  };

  const deleteClass = async (id) => {
    if (!window.confirm('Supprimer cette classe ? Les mots orphelins seront aussi supprimés.')) return;
    try {
      await api.delete(`/api/german-bingo/classes/${id}`);
      await load();
    } catch (err) {
      alert(err?.response?.data?.error || 'Error de suppression');
    }
  };

  const toggleClassId = (id) => {
    setSelectedClassIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const createWord = async (e) => {
    e.preventDefault();
    if (!newWord.trim()) {
      alert('Le mot est obligatoire');
      return;
    }
    if (selectedClassIds.length === 0) {
      alert('Cochez au moins une classe');
      return;
    }
    setSavingWord(true);
    try {
      await api.post('/api/german-bingo/words', {
        word: newWord.trim(),
        correctClassIds: selectedClassIds,
      });
      setNewWord('');
      setSelectedClassIds([]);
      await load();
    } catch (err) {
      alert(err?.response?.data?.error || 'Error lors de la création');
    } finally {
      setSavingWord(false);
    }
  };

  const deleteWord = async (id) => {
    if (!window.confirm('Supprimer ce mot ?')) return;
    try {
      await api.delete(`/api/german-bingo/words/${id}`);
      await load();
    } catch (err) {
      alert(err?.response?.data?.error || 'Error de suppression');
    }
  };

  const classLabelById = (id) =>
    classes.find((c) => c.id === id)?.label || id;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-german-50">
        <p className="text-german-700">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-german-50 to-german-100 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        <div className="flex items-center gap-4">
          <Link
            to="/admin"
            className="flex items-center gap-2 text-german-600 hover:text-german-800"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </Link>
          <h1 className="text-2xl font-bold text-german-900">
            Deutsch Bingo — Administration
          </h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <section className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-german-900 mb-4 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-german-600" />
            Classes (catégories)
          </h2>

          <form onSubmit={createClass} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de la classe
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="ex. Gemüse, Essen, Getränke"
                value={classLabel}
                onChange={(e) => setClassLabel(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image
              </label>
              <input
                type="file"
                accept="image/*"
                className="w-full text-sm"
                onChange={handleFileChange}
              />
              {classPreview && (
                <img
                  src={classPreview}
                  alt="Aperçu"
                  className="mt-2 h-16 w-16 object-cover rounded-lg border"
                />
              )}
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={savingClass}
                className="w-full bg-german-600 text-white py-2 px-4 rounded-lg hover:bg-german-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {savingClass ? 'Création...' : 'Ajouter la classe'}
              </button>
            </div>
          </form>

          {classes.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune classe pour l&apos;instant.</p>
          ) : (
            <ul className="space-y-3">
              {classes.map((cls) => (
                <li
                  key={cls.id}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <img
                    src={getAssetUrl(cls.imageUrl)}
                    alt={cls.label}
                    className="h-14 w-14 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{cls.label}</p>
                    <p className="text-xs text-gray-500">ID: {cls.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteClass(cls.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Supprimer"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-german-900 mb-4">Mots allemands</h2>

          {classes.length === 0 ? (
            <p className="text-amber-700 text-sm bg-amber-50 p-3 rounded-lg">
              Créez d&apos;abord au moins une classe avant d&apos;ajouter des mots.
            </p>
          ) : (
            <form onSubmit={createWord} className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot ou expression
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="ex. Apfel, Milch, Karotte"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Classes correctes (1 à 9)
                </p>
                <div className="flex flex-wrap gap-3">
                  {classes.map((cls) => (
                    <label
                      key={cls.id}
                      className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:border-german-400"
                    >
                      <input
                        type="checkbox"
                        checked={selectedClassIds.includes(cls.id)}
                        onChange={() => toggleClassId(cls.id)}
                      />
                      <img
                        src={getAssetUrl(cls.imageUrl)}
                        alt=""
                        className="h-8 w-8 object-cover rounded"
                      />
                      <span className="text-sm">{cls.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={savingWord}
                className="bg-german-600 text-white py-2 px-6 rounded-lg hover:bg-german-700 disabled:opacity-50"
              >
                {savingWord ? 'Ajout...' : 'Ajouter le mot'}
              </button>
            </form>
          )}

          {words.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucun mot pour l&apos;instant.</p>
          ) : (
            <ul className="space-y-2">
              {words.map((w) => (
                <li
                  key={w.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <div>
                    <span className="font-semibold text-gray-900">{w.word}</span>
                    <p className="text-sm text-gray-600 mt-1">
                      {(w.correctClassIds || [])
                        .map(classLabelById)
                        .join(', ') || '—'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteWord(w.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-center text-sm text-gray-500">
          <Link to="/german-bingo" className="text-german-600 hover:underline">
            Tester le jeu →
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AdminGermanBingoManager;
