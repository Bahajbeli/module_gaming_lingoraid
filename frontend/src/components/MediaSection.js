import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, ExternalLink, Film, Headphones, ChevronRight, X, Clock } from 'lucide-react';
import api, { getAssetUrl } from '../utils/axios';

// Normalise un item média pour garantir des champs cohérents côté UI
const normalizeMediaItem = (item) => {
  return {
    ...item,
    imageUrl: getAssetUrl(item.imageUrl || item.image || item.imagePath),
    mediaFileUrl: getAssetUrl(item.mediaFileUrl || item.fileUrl || item.media_url || item.file_url),
    streamingUrl: item.streamingUrl || item.streaming_url || '',
    type: (item.type || item.mediaType || item.category?.name || 'media').toString().toLowerCase(),
    languageLevel: item.languageLevel || item.level || item.language_level,
  };
};

// Composant MediaCard réutilisable avec effets hover modernes
const MediaCard = ({ item, onPlayMedia, index }) => {
  const [isHovered, setIsHovered] = useState(false);

  const getTypeIcon = (type) => {
    const key = (type || '').toString().toLowerCase();
    switch (key) {
      case 'musique':
        return <Headphones className="w-8 h-8 text-blue-400" />;
      case 'podcast':
        return <Headphones className="w-8 h-8 text-green-400" />;
      case 'film':
        return <Film className="w-8 h-8 text-purple-400" />;
      default:
        return <Headphones className="w-8 h-8 text-gray-400" />;
    }
  };

  const getPlaceholderGradient = (type) => {
    const key = (type || '').toString().toLowerCase();
    switch (key) {
      case 'musique':
        return 'from-blue-900/80 via-blue-800/60 to-blue-900/80';
      case 'podcast':
        return 'from-green-900/80 via-green-800/60 to-green-900/80';
      case 'film':
        return 'from-purple-900/80 via-purple-800/60 to-purple-900/80';
      default:
        return 'from-gray-900/80 via-gray-800/60 to-gray-900/80';
    }
  };

  const handleClick = () => {
    if (item.mediaFileUrl) {
      onPlayMedia(item);
    } else if (item.streamingUrl) {
      window.open(item.streamingUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className="w-[200px] sm:w-[240px] md:w-[280px] lg:w-full flex-shrink-0 lg:flex-shrink transition-all duration-300 ease-out"
      style={{
        transform: isHovered ? 'scale(1.08) translateY(-8px)' : 'scale(1)',
        zIndex: isHovered ? 30 : 10,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden cursor-pointer group"
        onClick={handleClick}
        style={{
          boxShadow: isHovered
            ? '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(59, 130, 246, 0.3)'
            : '0 4px 6px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Image ou placeholder */}
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getPlaceholderGradient(item.type)}`}>
            <div className="text-center">
              {getTypeIcon(item.type)}
              <p className="text-white/60 text-xs mt-2 font-medium">
                {item.type === 'musique' ? 'Musique' : item.type === 'podcast' ? 'Podcast' : item.type === 'film' ? 'Film' : 'Média'}
              </p>
            </div>
          </div>
        )}

        {/* Overlay gradient au survol */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Badge niveau (top-left) */}
        {item.languageLevel && (
          <div className="absolute top-2 left-2 z-20">
            <span className="bg-black/80 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-md border border-white/20 shadow-lg">
              {item.languageLevel}
            </span>
          </div>
        )}

        {/* Bouton play au centre au survol */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
            isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}
        >
          <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white p-4 rounded-full transition-all transform hover:scale-110 shadow-2xl border-2 border-white/20">
            <Play className="w-6 h-6 fill-current" />
          </button>
        </div>

        {/* Info au survol (bottom) */}
        <div
          className={`absolute bottom-0 left-0 right-0 p-3 transition-all duration-300 ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <h3 className="text-white font-bold text-sm mb-1 line-clamp-1 drop-shadow-lg">{item.title}</h3>
          {item.description && (
            <p className="text-white/80 text-xs line-clamp-2 drop-shadow-md">{item.description}</p>
          )}
          {item.duration && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-white/70">
              <Clock className="w-3 h-3" />
              <span>{item.duration}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Composant pour une section de catégorie (rangée horizontale ou grille)
const MediaSectionRow = ({ category, media, onViewAll, onPlayMedia }) => {
  const rowRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    const checkScroll = () => {
      if (rowRef.current) {
        setCanScrollLeft(rowRef.current.scrollLeft > 0);
        setCanScrollRight(
          rowRef.current.scrollLeft < rowRef.current.scrollWidth - rowRef.current.clientWidth - 10
        );
      }
    };

    checkScroll();
    rowRef.current?.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      rowRef.current?.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [media]);

  const scroll = (direction) => {
    if (rowRef.current) {
      const scrollAmount = rowRef.current.clientWidth * 0.75;
      rowRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const getCategoryColor = (categoryName) => {
    const key = (categoryName || '').toString().toLowerCase();
    switch (key) {
      case 'musique':
        return 'text-blue-400';
      case 'podcasts':
      case 'podcast':
        return 'text-green-400';
      case 'films':
      case 'film':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

  if (media.length === 0) return null;

  return (
    <div className="mb-8">
      {/* En-tête de section avec titre et "Voir tout" */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className={`text-2xl md:text-[26px] font-bold text-white flex items-center gap-2`}>
          <span className={getCategoryColor(category.name)}>●</span>
          {category.displayName || category.name}
        </h2>
        <button
          onClick={onViewAll}
          className="text-white/70 hover:text-white text-sm font-medium transition-colors flex items-center gap-1.5 group/button"
        >
          <span>Voir tout</span>
          <ChevronRight className="w-4 h-4 transition-transform group-hover/button:translate-x-1" />
        </button>
      </div>

      {/* Grille pour desktop, scroll horizontal pour mobile */}
      <div className="relative group/row">
        {/* Bouton scroll gauche (mobile seulement) */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="lg:hidden absolute left-0 top-0 bottom-0 z-20 w-14 bg-gradient-to-r from-black/90 via-black/70 to-transparent flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover/row:opacity-100 transition-opacity duration-300 hover:from-black/95"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-full p-2 hover:bg-white/20 transition-colors">
              <ArrowLeft className="w-5 h-5 text-white" />
            </div>
          </button>
        )}

        {/* Container: grille sur desktop, scroll horizontal sur mobile */}
        <div
          ref={rowRef}
          className="flex lg:grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 lg:gap-4 gap-3 overflow-x-auto lg:overflow-x-visible scrollbar-hide pb-2 lg:pb-0 px-1 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {media.map((item, index) => (
            <div key={item.id} className="lg:w-full">
              <MediaCard item={item} onPlayMedia={onPlayMedia} index={index} />
            </div>
          ))}
        </div>

        {/* Bouton scroll droit (mobile seulement) */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="lg:hidden absolute right-0 top-0 bottom-0 z-20 w-14 bg-gradient-to-l from-black/90 via-black/70 to-transparent flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover/row:opacity-100 transition-opacity duration-300 hover:from-black/95"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-full p-2 hover:bg-white/20 transition-colors">
              <ChevronRight className="w-5 h-5 text-white" />
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

// Composant principal MediaSection
const MediaSection = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    fetchMedia();
  }, []);

  const deriveCategories = (items) => {
    const countByType = items.reduce((acc, it) => {
      const t = it.type;
      if (!acc[t]) acc[t] = 0;
      acc[t] += 1;
      return acc;
    }, {});

    const defs = [
      { name: 'musique', displayName: 'Musique', description: 'Chansons et musiques en allemand' },
      { name: 'podcast', displayName: 'Podcasts', description: 'Podcasts natifs pour entraîner l\'oreille' },
      { name: 'film', displayName: 'Films', description: 'Films et courts métrages' },
    ];

    return defs.map((d) => ({
      id: d.name,
      name: d.name,
      displayName: d.displayName,
      description: d.description,
      _count: { media: countByType[d.name] || 0 },
    }));
  };

  const fetchMedia = async () => {
    try {
      const response = await api.get('/api/media');
      const items = Array.isArray(response.data) ? response.data : [];
      const normalized = items.map(normalizeMediaItem);
      setMedia(normalized);
      setCategories(deriveCategories(normalized));
      setLoading(false);
    } catch (error) {
      console.error('Error lors de la récupération des médias:', error);
      setError('Error lors de la récupération des médias');
      setLoading(false);
    }
  };

  const getMediaByCategory = (categoryName) => {
    const key = (categoryName || '').toString().toLowerCase();
    return media.filter((item) => item.type === key);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-blue-500 border-r-purple-500 mx-auto mb-4"></div>
          <p className="text-white/80 text-lg">Loading des médias...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-2.5 rounded-lg transition-all font-medium shadow-lg"
          >
            Back à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // Vue catégorie sélectionnée
  if (selectedCategory) {
    const categoryMedia = getMediaByCategory(selectedCategory.name);
    return (
      <>
        <CategoryView
          category={selectedCategory}
          media={categoryMedia}
          onBack={() => setSelectedCategory(null)}
          onPlayMedia={(media) => {
            setSelectedMedia(media);
            setShowPlayer(true);
          }}
        />
        {showPlayer && selectedMedia && (
          <MediaPlayer
            media={selectedMedia}
            onClose={() => {
              setShowPlayer(false);
              setSelectedMedia(null);
            }}
          />
        )}
      </>
    );
  }

  // Vue principale avec toutes les catégories
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-black text-white">
      {/* Header avec gradient et backdrop blur */}
      <div className="bg-gradient-to-b from-black/95 via-black/90 to-transparent border-b border-white/10 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-white/80 hover:text-white transition-all group/back"
            >
              <ArrowLeft className="w-5 h-5 mr-2 transition-transform group-hover/back:-translate-x-1" />
              <span className="font-medium">Back</span>
            </button>

            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Médias
              </h1>
              <p className="text-white/60 mt-1 text-sm">Séries, podcasts et films</p>
            </div>

            <div className="w-20"></div>
          </div>
        </div>
      </div>

      {/* Contenu principal avec sections de catégories */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {categories.map((category) => {
          const categoryMedia = getMediaByCategory(category.name);
          if (categoryMedia.length === 0) return null;

          return (
            <MediaSectionRow
              key={category.id}
              category={category}
              media={categoryMedia.slice(0, 12)}
              onViewAll={() => setSelectedCategory(category)}
              onPlayMedia={(media) => {
                setSelectedMedia(media);
                setShowPlayer(true);
              }}
            />
          );
        })}

        {/* Message si aucune catégorie n'a de contenu */}
        {categories.filter((cat) => getMediaByCategory(cat.name).length > 0).length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-white mb-2">Aucun contenu disponible</h3>
            <p className="text-white/60">Aucun média n'a encore été ajouté.</p>
          </div>
        )}
      </div>

      {/* Lecteur modal */}
      {showPlayer && selectedMedia && (
        <MediaPlayer
          media={selectedMedia}
          onClose={() => {
            setShowPlayer(false);
            setSelectedMedia(null);
          }}
        />
      )}
    </div>
  );
};

// Vue catégorie individuelle
const CategoryView = ({ category, media, onBack, onPlayMedia }) => {
  const rowRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    const checkScroll = () => {
      if (rowRef.current) {
        setCanScrollLeft(rowRef.current.scrollLeft > 0);
        setCanScrollRight(
          rowRef.current.scrollLeft < rowRef.current.scrollWidth - rowRef.current.clientWidth - 10
        );
      }
    };

    checkScroll();
    rowRef.current?.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      rowRef.current?.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [media]);

  const scroll = (direction) => {
    if (rowRef.current) {
      const scrollAmount = rowRef.current.clientWidth * 0.75;
      rowRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-black/95 via-black/90 to-transparent border-b border-white/10 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center text-white/80 hover:text-white transition-all group/back"
            >
              <ArrowLeft className="w-5 h-5 mr-2 transition-transform group-hover/back:-translate-x-1" />
              <span className="font-medium">Back</span>
            </button>

            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                {category.displayName || category.name}
              </h1>
              <p className="text-white/60 mt-1 text-sm">{category.description}</p>
            </div>

            <div className="w-20"></div>
          </div>
        </div>
      </div>

      {/* Contenu de la catégorie */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {media.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-white mb-2">Aucun contenu disponible</h3>
            <p className="text-white/60">Aucun média n'a encore été ajouté dans cette catégorie.</p>
          </div>
        ) : (
          <div className="relative group/row">
            {canScrollLeft && (
              <button
                onClick={() => scroll('left')}
                className="lg:hidden absolute left-0 top-0 bottom-0 z-20 w-14 bg-gradient-to-r from-black/90 via-black/70 to-transparent flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover/row:opacity-100 transition-opacity duration-300 hover:from-black/95"
              >
                <div className="bg-white/10 backdrop-blur-sm rounded-full p-2 hover:bg-white/20 transition-colors">
                  <ArrowLeft className="w-5 h-5 text-white" />
                </div>
              </button>
            )}

            <div
              ref={rowRef}
              className="flex lg:grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 lg:gap-4 gap-3 overflow-x-auto lg:overflow-x-visible scrollbar-hide pb-2 lg:pb-0 px-1 scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {media.map((item, index) => (
                <div key={item.id} className="lg:w-full">
                  <MediaCard item={item} onPlayMedia={onPlayMedia} index={index} />
                </div>
              ))}
            </div>

            {canScrollRight && (
              <button
                onClick={() => scroll('right')}
                className="lg:hidden absolute right-0 top-0 bottom-0 z-20 w-14 bg-gradient-to-l from-black/90 via-black/70 to-transparent flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover/row:opacity-100 transition-opacity duration-300 hover:from-black/95"
              >
                <div className="bg-white/10 backdrop-blur-sm rounded-full p-2 hover:bg-white/20 transition-colors">
                  <ChevronRight className="w-5 h-5 text-white" />
                </div>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Composant lecteur modal
const MediaPlayer = ({ media, onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-800 rounded-2xl max-w-6xl w-full overflow-hidden shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
          <h3 className="text-lg md:text-xl font-semibold text-white">{media.title}</h3>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors text-2xl leading-none hover:rotate-90 transition-transform"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4 md:p-6 space-y-4 bg-black">
          {media.mediaFileUrl ? (
            <div className="w-full">
              {media.type === 'podcast' ? (
                <audio controls className="w-full" src={media.mediaFileUrl}>
                  Votre navigateur ne supporte pas l'élément audio.
                </audio>
              ) : (
                <video controls className="w-full max-h-[70vh] rounded-lg" src={media.mediaFileUrl}>
                  Votre navigateur ne supporte pas l'élément vidéo.
                </video>
              )}
            </div>
          ) : media.streamingUrl ? (
            <div className="text-center py-8">
              <p className="text-white/80 mb-4">Ce média est disponible en streaming externe.</p>
              <a
                href={media.streamingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-2.5 rounded-lg transition-all font-medium shadow-lg inline-block"
              >
                Regarder sur la plateforme
              </a>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-white/60">Aucun fichier média disponible pour ce contenu.</p>
            </div>
          )}
          {media.description && (
            <div className="mt-4 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
              <h4 className="font-semibold text-white mb-2">Description</h4>
              <p className="text-white/80">{media.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaSection;
