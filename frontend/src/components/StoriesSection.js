import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Book, FileText, Headphones, Play, Search, Grid, List, Star, Clock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { getAssetUrl } from '../utils/axios';


const StoriesSection = () => {
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [filteredStories, setFilteredStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState(null);
  const [fontSize, setFontSize] = useState(18);
  const [twoPages, setTwoPages] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const [voices, setVoices] = useState([]);
  const [voiceIndex, setVoiceIndex] = useState(-1);
  const [sentences, setSentences] = useState([]);
  const [currentSentence, setCurrentSentence] = useState(-1);
  const isSpeakingRef = useRef(false);

  // Nouveaux états pour les améliorations
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' ou 'list'
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('story_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [readingProgress, setReadingProgress] = useState(() => {
    const saved = localStorage.getItem('story_progress');
    return saved ? JSON.parse(saved) : {};
  });

  // Load voices for Web Speech API
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    const loadVoices = () => {
      const v = synth.getVoices();
      setVoices(v);
      // Pick default voice by language of story
      if (active) {
        const isGerman = (active.language || '').toLowerCase().includes('allemand') || (active.type||'').toLowerCase()==='histoire';
        const pref = isGerman ? 'de' : 'fr';
        const idx = v.findIndex((vv) => (vv.lang || '').toLowerCase().startsWith(pref));
        if (idx >= 0) setVoiceIndex(idx);
      }
    };
    loadVoices();
    synth.onvoiceschanged = loadVoices;
    return () => { synth.onvoiceschanged = null; };
  }, [active]);

  // Stop TTS when modal closes
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch {}
      }
    };
  }, []);

  // Build sentences when story changes
  useEffect(() => {
    if (!active?.content) { setSentences([]); setCurrentSentence(-1); return; }
    const text = active.content.replace(/\s+\n/g, '\n').replace(/\n+/g, '\n');
    const parts = text.match(/[^.!?…\n]+[.!?…]?/g) || [text];
    const trimmed = parts.map(p => p.trim()).filter(p => p.length > 0);
    setSentences(trimmed);
    setCurrentSentence(-1);
  }, [active]);

  // Keep ref in sync to avoid stale closure in onend
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

  const speakSentence = (idx) => {
    if (!sentences[idx]) { setIsSpeaking(false); setIsPaused(false); setCurrentSentence(-1); return; }
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(sentences[idx]);
    const langGuess = ((active?.language || '').toLowerCase().includes('allemand')) ? 'de-DE' : 'fr-FR';
    utter.lang = voices[voiceIndex]?.lang || langGuess;
    if (voices[voiceIndex]) utter.voice = voices[voiceIndex];
    utter.rate = rate;
    utter.onstart = () => {
      setCurrentSentence(idx);
      // Auto-scroll to current sentence
      const el = document.getElementById(`sent-${idx}`);
      if (el) {
        try { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); } catch {}
      }
    };
    utter.onend = () => {
      if (!synth.paused && isSpeakingRef.current) {
        speakSentence(idx + 1);
      } else if (!isSpeaking) {
        setCurrentSentence(-1);
      }
    };
    utter.onerror = () => { setIsSpeaking(false); setIsPaused(false); };
    synth.speak(utter);
  };

  const handleSpeak = () => {
    if (!('speechSynthesis' in window) || sentences.length === 0) return;
    try { window.speechSynthesis.cancel(); } catch {}
    isSpeakingRef.current = true;
    setIsSpeaking(true);
    setIsPaused(false);
    speakSentence(0);
  };

  const handlePause = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  };

  const handleResume = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  };

  const handleStop = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentSentence(-1);
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/stories');
        const items = Array.isArray(res.data) ? res.data : [];
        setStories(items.map(s => ({ 
          ...s, 
          imageUrl: getAssetUrl(s.imageUrl), 
          pdfUrl: getAssetUrl(s.pdfUrl), 
          audioUrl: getAssetUrl(s.audioUrl),
          wordCount: s.content ? s.content.split(/\s+/).length : 0,
          readingTime: s.content ? Math.ceil(s.content.split(/\s+/).length / 200) : 0
        })));
      } catch (e) {
        console.error('Error histoires:', e);
        setError('Error while chargement des histoires');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filtrer et trier les histoires
  useEffect(() => {
    let filtered = [...stories];

    // Recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(query) ||
        (s.description && s.description.toLowerCase().includes(query))
      );
    }

    // Filtres
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(s => s.languageLevel === selectedLevel);
    }
    if (selectedType !== 'all') {
      filtered = filtered.filter(s => s.type === selectedType);
    }
    if (selectedLanguage !== 'all') {
      filtered = filtered.filter(s => 
        (s.language || '').toLowerCase().includes(selectedLanguage.toLowerCase())
      );
    }

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'level':
          const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
          return levels.indexOf(a.languageLevel) - levels.indexOf(b.languageLevel);
        case 'date':
        default:
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
    });

    setFilteredStories(filtered);
  }, [stories, searchQuery, selectedLevel, selectedType, selectedLanguage, sortBy]);

  // Toggle favoris
  const toggleFavorite = (storyId, e) => {
    e.stopPropagation();
    const newFavorites = favorites.includes(storyId)
      ? favorites.filter(id => id !== storyId)
      : [...favorites, storyId];
    setFavorites(newFavorites);
    localStorage.setItem('story_favorites', JSON.stringify(newFavorites));
  };

  // Sauvegarder la progression
  const saveProgress = (storyId, progress) => {
    const newProgress = { ...readingProgress, [storyId]: progress };
    setReadingProgress(newProgress);
    localStorage.setItem('story_progress', JSON.stringify(newProgress));
  };

  // Obtenir les niveaux uniques
  const uniqueLevels = [...new Set(stories.map(s => s.languageLevel).filter(Boolean))].sort();
  const uniqueTypes = [...new Set(stories.map(s => s.type).filter(Boolean))];
  const uniqueLanguages = [...new Set(stories.map(s => s.language).filter(Boolean))];

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-pink-600 mx-auto mb-4"></div>
        <p className="text-gray-700 text-lg">Loading des histoires...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-600 text-lg mb-4">{error}</p>
        <button onClick={() => navigate('/')} className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-lg transition-colors">Back à l'accueil</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ 
      background: 'linear-gradient(135deg, #f5f1e8 0%, #e8e0d1 50%, #d4c5b0 100%)',
      backgroundImage: `
        repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.03) 2px, rgba(0,0,0,.03) 4px),
        repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,.03) 2px, rgba(0,0,0,.03) 4px)
      `
    }}>
      {/* Header style archiviste */}
      <div className="sticky top-0 z-40" style={{ 
        background: 'linear-gradient(to bottom, rgba(139, 155, 105, 0.95), rgba(139, 155, 105, 0.9))',
        borderBottom: '3px solid #8b9b69',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate('/')} 
              className="flex items-center text-amber-900 hover:text-amber-950 transition-colors group font-semibold"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}
            >
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back
            </button>
            <div className="text-center">
              <h1 className="text-4xl font-bold" style={{ 
                color: '#5a4a3a',
                textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
                fontFamily: 'serif',
                letterSpacing: '2px'
              }}>
                HISTOIRES
              </h1>
              <p className="text-amber-900 mt-1 text-sm font-medium" style={{ textShadow: '1px 1px 1px rgba(0,0,0,0.1)' }}>
                Découvrez nos histoires, livres et articles
              </p>
            </div>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      {/* Barre de recherche et filtres - Style archiviste */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="p-6 mb-8" style={{
          background: 'linear-gradient(135deg, rgba(255, 250, 240, 0.9), rgba(245, 240, 230, 0.9))',
          border: '2px solid #8b9b69',
          borderRadius: '8px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.15)',
          position: 'relative'
        }}>
          {/* Effet de papier vieilli */}
          <div className="absolute inset-0 pointer-events-none opacity-30" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
            borderRadius: '6px'
          }}></div>
          <div className="flex flex-col md:flex-row gap-4 mb-4 relative z-10">
            {/* Recherche */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#8b9b69' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une histoire..."
                className="w-full pl-12 pr-10 py-3 rounded-lg transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  border: '2px solid #8b9b69',
                  color: '#5a4a3a',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                  fontFamily: 'serif'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors"
                  style={{ color: '#8b9b69' }}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Mode d'affichage */}
            <div className="flex items-center gap-2 p-1" style={{
              background: 'rgba(139, 155, 105, 0.2)',
              borderRadius: '8px',
              border: '1px solid #8b9b69'
            }}>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-all ${viewMode === 'grid' ? '' : ''}`}
                style={viewMode === 'grid' ? {
                  background: '#8b9b69',
                  color: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                } : {
                  color: '#5a4a3a'
                }}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-all ${viewMode === 'list' ? '' : ''}`}
                style={viewMode === 'list' ? {
                  background: '#8b9b69',
                  color: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                } : {
                  color: '#5a4a3a'
                }}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filtres */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-4 py-2.5 rounded-lg transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.8)',
                border: '2px solid #8b9b69',
                color: '#5a4a3a',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                fontFamily: 'serif'
              }}
            >
              <option value="all">Tous les niveaux</option>
              {uniqueLevels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2.5 rounded-lg transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.8)',
                border: '2px solid #8b9b69',
                color: '#5a4a3a',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                fontFamily: 'serif'
              }}
            >
              <option value="all">Tous les types</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-4 py-2.5 rounded-lg transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.8)',
                border: '2px solid #8b9b69',
                color: '#5a4a3a',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                fontFamily: 'serif'
              }}
            >
              <option value="all">Toutes les langues</option>
              {uniqueLanguages.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2.5 rounded-lg transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.8)',
                border: '2px solid #8b9b69',
                color: '#5a4a3a',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                fontFamily: 'serif'
              }}
            >
              <option value="date">Plus récent</option>
              <option value="title">Titre (A-Z)</option>
              <option value="level">Niveau</option>
            </select>
          </div>

          {/* Résultats */}
          <div className="mt-4 text-sm relative z-10" style={{ color: '#5a4a3a', fontFamily: 'serif', fontWeight: '600' }}>
            {filteredStories.length} histoire{filteredStories.length > 1 ? 's' : ''} trouvée{filteredStories.length > 1 ? 's' : ''}
          </div>
        </div>

        {/* Liste des histoires - Style dossiers archivistes */}
        {filteredStories.length === 0 ? (
          <div className="text-center py-20">
            <Book className="w-20 h-20 mx-auto mb-6" style={{ color: '#8b9b69', filter: 'sepia(0.3)' }} />
            <p className="text-lg" style={{ color: '#5a4a3a', fontFamily: 'serif' }}>Aucune histoire trouvée</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            : "space-y-4"
          }>
            {filteredStories.map(story => (
              <div
                key={story.id}
                className={`group relative cursor-pointer transition-all duration-300 ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
                onClick={() => {
                  if (story.pdfUrl) {
                    window.open(story.pdfUrl, '_blank', 'noopener,noreferrer');
                  } else {
                    setActive(story);
                  }
                }}
              >
                {/* Carte principale - Style dossier vert */}
                <div className={`relative ${viewMode === 'list' ? 'w-40 h-56 flex-shrink-0' : 'h-80'} transition-all duration-300`} style={{
                  background: 'linear-gradient(135deg, #a8b88a 0%, #8b9b69 50%, #7a8a5a 100%)',
                  borderRadius: '4px',
                  boxShadow: `
                    0 4px 8px rgba(0,0,0,0.2),
                    inset 0 1px 0 rgba(255,255,255,0.2),
                    inset 0 -1px 0 rgba(0,0,0,0.1)
                  `,
                  transform: viewMode === 'grid' ? 'rotate(-1deg)' : 'none',
                  border: '2px solid #6b7a4a',
                  position: 'relative',
                  overflow: 'visible'
                }}>
                  {/* Onglet du dossier */}
                  <div className="absolute -top-3 left-4 w-16 h-6" style={{
                    background: 'linear-gradient(135deg, #a8b88a 0%, #8b9b69 100%)',
                    borderRadius: '4px 4px 0 0',
                    border: '2px solid #6b7a4a',
                    borderBottom: 'none',
                    boxShadow: '0 -2px 4px rgba(0,0,0,0.1)',
                    zIndex: 1
                  }}>
                    <div className="text-center text-xs font-bold pt-0.5" style={{ color: '#5a4a3a' }}>
                      {story.languageLevel || 'DOC'}
                    </div>
                  </div>

                  {/* Contenu du dossier */}
                  <div className="h-full p-4 pt-6 relative" style={{
                    background: 'linear-gradient(135deg, rgba(255, 250, 240, 0.95), rgba(245, 240, 230, 0.95))',
                    margin: '8px',
                    borderRadius: '2px',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {/* Effet de texture papier */}
                    <div className="absolute inset-0 pointer-events-none opacity-20" style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
                      borderRadius: '2px'
                    }}></div>

                    {/* Image ou placeholder */}
                    <div className="relative mb-3" style={{ height: viewMode === 'list' ? '120px' : '180px' }}>
                      {story.imageUrl ? (
                        <img 
                          src={story.imageUrl} 
                          alt={story.title} 
                          className="w-full h-full object-cover rounded"
                          style={{
                            filter: 'sepia(0.4) contrast(1.1)',
                            border: '1px solid rgba(139, 155, 105, 0.3)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center rounded" style={{
                          background: 'linear-gradient(135deg, rgba(200, 180, 160, 0.3), rgba(180, 160, 140, 0.3))',
                          border: '1px dashed #8b9b69'
                        }}>
                          <Book className="w-12 h-12" style={{ color: '#8b9b69', opacity: 0.5 }} />
                        </div>
                      )}
                      
                      {/* Badge niveau sur l'image */}
                      <div className="absolute top-2 left-2 px-2 py-1 rounded" style={{
                        background: 'rgba(139, 155, 105, 0.9)',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                      }}>
                        {story.languageLevel}
                      </div>

                      {/* Bouton favoris */}
                      <button
                        onClick={(e) => toggleFavorite(story.id, e)}
                        className="absolute top-2 right-2 p-1.5 rounded-full transition-all"
                        style={{
                          background: favorites.includes(story.id) 
                            ? 'rgba(255, 215, 0, 0.9)' 
                            : 'rgba(255, 255, 255, 0.8)',
                          color: favorites.includes(story.id) ? '#8b6914' : '#8b9b69',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                      >
                        <Star className={`w-4 h-4 ${favorites.includes(story.id) ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    {/* Titre */}
                    <h3 className="font-bold mb-2 line-clamp-2 relative z-10" style={{
                      color: '#5a4a3a',
                      fontSize: '14px',
                      fontFamily: 'serif',
                      textShadow: '1px 1px 1px rgba(0,0,0,0.1)'
                    }}>
                      {story.title}
                    </h3>

                    {/* Description */}
                    {story.description && (
                      <p className="text-xs mb-2 line-clamp-2 relative z-10" style={{
                        color: '#6b5a4a',
                        fontFamily: 'serif'
                      }}>
                        {story.description}
                      </p>
                    )}

                    {/* Statistiques */}
                    <div className="flex items-center gap-3 text-xs relative z-10 mb-2" style={{ color: '#7a6a5a' }}>
                      {story.readingTime > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {story.readingTime}min
                        </span>
                      )}
                    </div>

                    {/* Barre de progression */}
                    {readingProgress[story.id] && (
                      <div className="absolute bottom-2 left-2 right-2 h-1 rounded-full" style={{
                        background: 'rgba(139, 155, 105, 0.3)',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)'
                      }}>
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${readingProgress[story.id]}%`,
                            background: 'linear-gradient(90deg, #8b9b69, #a8b88a)',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                          }}
                        />
                      </div>
                    )}

                    {/* Boutons d'action au survol */}
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-center items-center gap-2 rounded" style={{
                      background: 'linear-gradient(135deg, rgba(139, 155, 105, 0.95), rgba(122, 138, 90, 0.95))'
                    }}>
                      <h4 className="text-white font-bold text-sm text-center mb-2" style={{ fontFamily: 'serif' }}>
                        {story.title}
                      </h4>
                      <div className="flex gap-2 w-full">
                        {story.pdfUrl && (
                          <a 
                            href={story.pdfUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onClick={(e)=>e.stopPropagation()} 
                            className="flex-1 px-3 py-2 rounded text-xs font-semibold text-center transition-colors"
                            style={{
                              background: 'rgba(255, 255, 255, 0.9)',
                              color: '#5a4a3a',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}
                          >
                            PDF
                          </a>
                        )}
                        {story.audioUrl && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActive(story); }} 
                            className="flex-1 px-3 py-2 rounded text-xs font-semibold transition-colors"
                            style={{
                              background: 'rgba(255, 255, 255, 0.9)',
                              color: '#5a4a3a',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}
                          >
                            Écouter
                          </button>
                        )}
                        {!story.pdfUrl && !story.audioUrl && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActive(story); }}
                            className="w-full px-3 py-2 rounded text-xs font-semibold transition-colors"
                            style={{
                              background: 'rgba(255, 255, 255, 0.9)',
                              color: '#5a4a3a',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}
                          >
                            Lire
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info sous la carte (mode grille) */}
                {viewMode === 'grid' && (
                  <div className="mt-3 text-center">
                    <h4 className="font-semibold text-sm line-clamp-1 group-hover:underline transition-all" style={{
                      color: '#5a4a3a',
                      fontFamily: 'serif'
                    }}>
                      {story.title}
                    </h4>
                  </div>
                )}

                {/* Info mode liste */}
                {viewMode === 'list' && (
                  <div className="p-4 flex-1 flex flex-col justify-between" style={{
                    background: 'linear-gradient(135deg, rgba(255, 250, 240, 0.9), rgba(245, 240, 230, 0.9))',
                    border: '2px solid #8b9b69',
                    borderRadius: '4px',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                    marginLeft: '8px'
                  }}>
                    <div>
                      <h3 className="font-semibold text-lg mb-2" style={{ color: '#5a4a3a', fontFamily: 'serif' }}>
                        {story.title}
                      </h3>
                      {story.description && (
                        <p className="text-sm line-clamp-2 mb-3" style={{ color: '#6b5a4a', fontFamily: 'serif' }}>
                          {story.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs" style={{ color: '#7a6a5a' }}>
                        {story.wordCount > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {story.wordCount} mots
                          </span>
                        )}
                        {story.readingTime > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {story.readingTime} min
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      {story.pdfUrl && (
                        <a 
                          href={story.pdfUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          onClick={(e)=>e.stopPropagation()} 
                          className="px-4 py-2 rounded text-sm font-semibold transition-colors"
                          style={{
                            background: '#8b9b69',
                            color: 'white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            fontFamily: 'serif'
                          }}
                        >
                          <FileText className="w-4 h-4 inline mr-1" /> PDF
                        </a>
                      )}
                      {story.audioUrl && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActive(story); }} 
                          className="px-4 py-2 rounded text-sm font-semibold transition-colors"
                          style={{
                            background: '#8b9b69',
                            color: 'white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            fontFamily: 'serif'
                          }}
                        >
                          <Headphones className="w-4 h-4 inline mr-1" /> Écouter
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {active && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{
          background: 'rgba(90, 74, 58, 0.7)',
          backdropFilter: 'blur(4px)'
        }} onClick={() => {
          setActive(null);
          if (active.content) {
            // Sauvegarder la progression
            const progress = Math.min(100, Math.round((currentSentence + 1) / sentences.length * 100));
            saveProgress(active.id, progress);
          }
        }}>
          <div className="max-w-6xl w-full overflow-hidden" style={{
            background: 'linear-gradient(135deg, rgba(255, 250, 240, 0.98), rgba(245, 240, 230, 0.98))',
            border: '3px solid #8b9b69',
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            position: 'relative'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Effet de texture papier */}
            <div className="absolute inset-0 pointer-events-none opacity-30" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
              borderRadius: '5px'
            }}></div>

            {/* Header */}
              <div className="px-6 py-4 border-b-2 flex items-center justify-between relative z-10" style={{
                borderColor: '#8b9b69',
                background: 'linear-gradient(135deg, rgba(139, 155, 105, 0.2), rgba(122, 138, 90, 0.2))'
              }}>
              <h3 className="text-lg md:text-xl font-semibold" style={{ 
                color: '#5a4a3a',
                fontFamily: 'serif',
                textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
              }}>{active.title}</h3>
              <div className="flex items-center gap-2">
                {active.pdfUrl && (
                  <a
                    href={active.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden md:inline px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    style={{
                      background: '#8b9b69',
                      color: 'white',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      fontFamily: 'serif'
                    }}
                  >
                    Ouvrir le PDF
                  </a>
                )}
                <div className="hidden md:flex items-center gap-1 rounded-lg px-2 py-1" style={{
                  background: 'rgba(139, 155, 105, 0.2)',
                  border: '1px solid #8b9b69'
                }}>
                  <button onClick={() => setFontSize(f => Math.max(14, f - 2))} className="px-2 transition-colors" style={{ color: '#5a4a3a' }}>A-</button>
                  <span className="px-1 text-xs" style={{ color: '#5a4a3a' }}>{fontSize}px</span>
                  <button onClick={() => setFontSize(f => Math.min(26, f + 2))} className="px-2 transition-colors" style={{ color: '#5a4a3a' }}>A+</button>
                </div>
                {/* TTS controls */}
                <div className="hidden md:flex items-center gap-2 rounded-lg px-2 py-1" style={{
                  background: 'rgba(139, 155, 105, 0.2)',
                  border: '1px solid #8b9b69'
                }}>
                  {!isSpeaking && (
                    <button onClick={handleSpeak} className="px-3 py-1 rounded text-white text-sm transition-colors" style={{ background: '#8b9b69' }}>Lire</button>
                  )}
                  {isSpeaking && !isPaused && (
                    <button onClick={handlePause} className="px-3 py-1 rounded text-white text-sm transition-colors" style={{ background: '#b8860b' }}>Pause</button>
                  )}
                  {isSpeaking && isPaused && (
                    <button onClick={handleResume} className="px-3 py-1 rounded text-white text-sm transition-colors" style={{ background: '#8b9b69' }}>Continue</button>
                  )}
                  {isSpeaking && (
                    <button onClick={handleStop} className="px-3 py-1 rounded text-white text-sm transition-colors" style={{ background: '#8b4a3a' }}>Stop</button>
                  )}
                  <select
                    value={voiceIndex}
                    onChange={(e)=> setVoiceIndex(parseInt(e.target.value,10))}
                    className="text-xs rounded px-2 py-1"
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      border: '1px solid #8b9b69',
                      color: '#5a4a3a'
                    }}
                  >
                    <option value={-1}>Voix auto</option>
                    {voices.map((v, i)=> (
                      <option key={i} value={i}>{v.name} ({v.lang})</option>
                    ))}
                  </select>
                  <select value={rate} onChange={(e)=> setRate(parseFloat(e.target.value))} className="text-xs rounded px-2 py-1" style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid #8b9b69',
                    color: '#5a4a3a'
                  }}>
                    <option value={0.8}>0.8x</option>
                    <option value={1}>1.0x</option>
                    <option value={1.2}>1.2x</option>
                  </select>
                </div>
                <button onClick={() => setTwoPages(v => !v)} className="hidden md:inline px-3 py-2 rounded-lg text-sm transition-colors" style={{
                  background: 'rgba(139, 155, 105, 0.2)',
                  border: '1px solid #8b9b69',
                  color: '#5a4a3a'
                }}>
                  {twoPages ? '1 page' : '2 pages'}
                </button>
                <button onClick={() => setActive(null)} className="ml-1 transition-colors text-2xl leading-none" style={{ color: '#5a4a3a' }}>✕</button>
              </div>
            </div>
            {/* Body */}
            <div className="p-4 md:p-6 space-y-4 relative z-10">
              {/* Audio row */}
              <div className="rounded-xl p-4" style={{
                background: 'rgba(255, 250, 240, 0.6)',
                border: '2px solid #8b9b69',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
              }}>
                {active.audioUrl ? (
                  <audio controls className="w-full" src={active.audioUrl} />
                ) : (
                  <div className="py-2 text-sm flex items-center" style={{ color: '#7a6a5a', fontFamily: 'serif' }}>
                    <Play className="inline w-5 h-5 mr-2" /> Pas d'audio disponible
                  </div>
                )}
              </div>

              {active.content && (
                <div className="flex justify-center">
                  <div
                    className="rounded-2xl p-6 md:p-10 max-w-5xl w-full relative"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 250, 240, 0.95), rgba(245, 240, 230, 0.95))',
                      border: '2px solid #8b9b69',
                      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.15)',
                      fontSize: `${fontSize}px`,
                      lineHeight: 1.9,
                      columnCount: twoPages ? 2 : 1,
                      columnGap: '3rem',
                      hyphens: 'auto',
                      textAlign: 'justify',
                      color: '#5a4a3a',
                      fontFamily: 'serif'
                    }}
                  >
                    {/* Texture papier sur le contenu */}
                    <div className="absolute inset-0 pointer-events-none opacity-20 rounded-2xl" style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`
                    }}></div>
                    {sentences.map((s, i) => (
                      <div key={i} id={`sent-${i}`} className="relative z-10" style={i===currentSentence ? {
                        background: 'rgba(255, 215, 0, 0.3)',
                        borderRadius: '4px',
                        padding: '2px 4px',
                        border: '1px solid rgba(255, 200, 0, 0.5)'
                      } : {}}>
                        <WordByWord content={s} highlighted={i===currentSentence} onTranslate={async (word) => {
                          try {
                            const res = await fetch('http://localhost:5000/api/translate', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ q: word, source: 'de', target: 'fr' })
                            });
                            const data = await res.json();
                            return data.translation || '';
                          } catch (e) { return ''; }
                        }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const WordByWord = ({ content, onTranslate, highlighted }) => {
  const [tooltip, setTooltip] = useState(null);
  const hide = () => setTooltip(null);

  const handleClick = async (e, w) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const t = (await onTranslate(w)) || '';
    setTooltip({ x: rect.left + rect.width / 2, y: rect.top, word: w, text: t });
    setTimeout(() => {
      const el = document.getElementById('story-tooltip');
      if (el) {
        const close = () => setTooltip(null);
        el.addEventListener('click', close, { once: true });
      }
    }, 0);
  };

  const tokens = (content || '').split(/(\s+|\n+)/g);

  return (
    <div>
      <div className={highlighted ? 'font-medium' : ''} style={{ 
        userSelect: 'text',
        color: '#5a4a3a',
        fontFamily: 'serif'
      }}>
        {tokens.map((tok, i) => {
          const clean = tok.replace(/[^\p{L}\-']/gu, '');
          const isWord = /\p{L}/u.test(clean);
          if (!isWord) return <span key={i}>{tok}</span>;
          return (
            <span
              key={i}
              onClick={(e) => handleClick(e, clean)}
              className="cursor-pointer rounded px-0.5 transition-colors"
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 215, 0, 0.4)';
                e.target.style.color = '#8b6914';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '';
              }}
            >
              {tok}
            </span>
          );
        })}
      </div>

      {tooltip && (
        <div id="story-tooltip" className="fixed z-[100]" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="transform -translate-x-1/2 -translate-y-full text-xs md:text-sm px-4 py-3 rounded-lg shadow-2xl whitespace-nowrap" style={{
            background: 'linear-gradient(135deg, rgba(255, 250, 240, 0.98), rgba(245, 240, 230, 0.98))',
            border: '2px solid #8b9b69',
            color: '#5a4a3a',
            fontFamily: 'serif',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <div className="font-semibold mb-1" style={{ color: '#8b9b69' }}>{tooltip.word}</div>
            <div className="opacity-90">{tooltip.text || '...'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoriesSection;


