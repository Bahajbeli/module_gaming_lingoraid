import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import GameRoadMap from "./GameRoadMap";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/axios";

const CreativityRoadMap = () => {
  const navigate = useNavigate();
  const { gameType } = useParams();
  // eslint-disable-next-line no-unused-vars
  const { user } = useAuth();
  
  const [games, setGames] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(true);
  const [roadMapProgress, setRoadMapProgress] = useState({
    creativite: {
      currentStage: 1,
      completedStages: []
    },
    "mots-croises": {
      currentStage: 1,
      completedStages: []
    }
  });

  // Charger les jeux depuis l'API
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchGames();
  }, [gameType]);

  const fetchGames = async () => {
    try {
      setLoading(true);
      let totalStages = 0;
      if (gameType === 'creativite') {
        const resCreat = await api.get('/api/creativity/list');
        const items = resCreat.data.items || [];
        console.log('Creativity items loaded:', items);
        setGames(items);
        totalStages = items.length;
      } else if (gameType === 'mots-croises') {
        const resCross = await api.get('/api/crosswords/list');
        const items = resCross.data.items || [];
        console.log('Crossword items loaded:', items);
        setGames(items);
        totalStages = items.length;
      } else {
        const response = await api.get(`/api/games/${gameType}`);
        const list = response.data.games || [];
        setGames(list);
        totalStages = list.length;
      }

      const currentProgress = roadMapProgress[gameType];
      if (totalStages > 0 && currentProgress?.currentStage <= totalStages) {
        setRoadMapProgress(prev => ({
          ...prev,
          [gameType]: {
            ...prev[gameType],
            totalStages
          }
        }));
      }
    } catch (error) {
      console.error("Error loading games:", error);
    } finally {
      setLoading(false);
    }
  };

  // Charger la progression depuis le localStorage ou l'état initial
  useEffect(() => {
    const savedProgress = localStorage.getItem(`roadMapProgress_${gameType}`);
    if (savedProgress) {
      setRoadMapProgress(prev => ({
        ...prev,
        [gameType]: JSON.parse(savedProgress)
      }));
    }
  }, [gameType]);

  // Si aucune progression sauvegardée n'existe encore, initialiser une valeur par défaut
  useEffect(() => {
    const key = `roadMapProgress_${gameType}`;
    const saved = localStorage.getItem(key);
    if (!saved && games.length > 0) {
      const initial = { currentStage: 1, completedStages: [] };
      localStorage.setItem(key, JSON.stringify(initial));
      setRoadMapProgress(prev => ({ ...prev, [gameType]: initial }));
    }
  }, [gameType, games.length]);

  // Sauvegarder la progression dans le localStorage
  // eslint-disable-next-line no-unused-vars
  const saveProgress = (newProgress) => {
    setRoadMapProgress(newProgress);
    localStorage.setItem(`roadMapProgress_${gameType}`, JSON.stringify(newProgress[gameType]));
  };

  const handleStageClick = (stageNumber) => {
    console.log(`Stage ${stageNumber} clicked for ${gameType}`);
    console.log('Available games:', games);
    
    // Trouver le jeu correspondant à ce stage
    const game = games[stageNumber - 1];
    console.log(`Selected game for stage ${stageNumber}:`, game);
    
    if (game) {
      // Naviguer vers le jeu
      navigate(`/game/${gameType}/solo`, { 
        state: { 
          gameId: game.id,
          gameTitle: game.title,
          gameType: gameType,
          stageNumber
        } 
      });
    } else {
      console.error(`No game found for stage ${stageNumber}`);
    }
  };



  const getGameTypeInfo = () => {
    const gameTypes = {
      creativite: {
        title: "Creativity",
        description: "Create sentences and stories en allemand",
        color: "from-green-500 to-green-600",
        icon: "✨",
        theme: "creativite"
      },
      "mots-croises": {
        title: "Crosswords",
        description: "Solve German crosswords",
        color: "from-blue-500 to-blue-600",
        icon: "🔤",
        theme: "mots-croises"
      }
    };
    
    return gameTypes[gameType] || gameTypes.creativite;
  };

  const gameInfo = getGameTypeInfo();

  const isCreativity = gameType === 'creativite';
  const headingGradient = isCreativity 
    ? "from-emerald-600 to-teal-500" 
    : "from-blue-600 to-indigo-500";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/60 text-slate-800 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/gaming")}
              className="flex items-center text-slate-500 hover:text-slate-800 transition-colors bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200/50 px-4 py-2 rounded-xl text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back au Gaming
            </button>

            <div className="text-center">
              <h1 className={`text-2xl md:text-3xl font-extrabold bg-gradient-to-r ${headingGradient} bg-clip-text text-transparent`}>
                Road Map - {gameInfo.title}
              </h1>
              <p className="text-slate-500 text-xs md:text-sm mt-1.5 font-medium">
                {gameInfo.description}
              </p>
            </div>

            <div className="w-20"></div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-4xl mx-auto px-6 py-8 w-full">
        {/* Statistiques (Light Glassmorphism) */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="border-r border-slate-100">
              <div className="text-xl md:text-2xl font-extrabold text-emerald-600">
                {roadMapProgress[gameType]?.completedStages?.length || 0}
              </div>
              <div className="text-[10px] md:text-xs text-slate-500 font-semibold uppercase mt-1 tracking-wider">Completed games</div>
            </div>
            <div className="border-r border-slate-100">
              <div className="text-xl md:text-2xl font-extrabold text-amber-600">
                {Math.min(roadMapProgress[gameType]?.currentStage || 1, Math.max(1, games.length || 1))}
              </div>
              <div className="text-[10px] md:text-xs text-slate-500 font-semibold uppercase mt-1 tracking-wider">Prochain jeu</div>
            </div>
            <div>
              <div className="text-xl md:text-2xl font-extrabold text-blue-600">
                {games.length}
              </div>
              <div className="text-[10px] md:text-xs text-slate-500 font-semibold uppercase mt-1 tracking-wider">Total games</div>
            </div>
          </div>
        </div>

        {/* Road Map Card */}
        <div className="bg-white border border-slate-150 rounded-3xl p-8 mb-8 shadow-sm relative overflow-visible">
          <div className="text-center mb-10">
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 mb-1.5">🗺️ Votre Progress</h2>
            <p className="text-slate-500 text-xs md:text-sm font-medium">Cliquez sur les étapes pour voir les détails</p>
          </div>
          
          <div className="flex justify-center mb-6 overflow-visible">
            <GameRoadMap
              gameType={gameInfo.theme}
              currentStage={roadMapProgress[gameType]?.currentStage || 1}
              completedStages={roadMapProgress[gameType]?.completedStages || []}
              onStageClick={handleStageClick}
              compact={false}
              totalStages={games.length}
              games={games}
            />
          </div>

          {/* Légende */}
          <div className="flex justify-center space-x-6 text-xs text-slate-500 mt-10 border-t border-slate-100 pt-6">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-amber-500 mr-2 shadow-sm shadow-amber-500/25"></div>
              <span>Actuel</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2 shadow-sm shadow-emerald-500/25"></div>
              <span>Terminé</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-slate-300 mr-2"></div>
              <span>Verrouillé</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreativityRoadMap;
