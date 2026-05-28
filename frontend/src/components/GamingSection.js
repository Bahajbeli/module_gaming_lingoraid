import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Lock,
  Trophy,
  Users,
  User,
  Gamepad2,
  Plus,
  Target,
  MessageCircle,
  Puzzle,
  Sparkles,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { motion } from "framer-motion";
import api from "../utils/axios";

const SOLO_GAME_META = {
  quiz: { Icon: Target, accent: "purple" },
  "vocab-quiz": { Icon: BookOpen, accent: "violet" },
  "mots-croises": { Icon: Puzzle, accent: "blue" },
  creativite: { Icon: Sparkles, accent: "green" },
  simulation: { Icon: MessageCircle, accent: "orange" },
};

const GamingSection = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [gameProgress, setGameProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState(null);
  const [error, setError] = useState(null);
  
  // Data de demo pour la road map
  const [roadMapProgress, setRoadMapProgress] = useState({
    creativite: {
      currentStage: 2,
      completedStages: [1]
    },
    "mots-croises": {
      currentStage: 1,
      completedStages: []
    }
  });

  useEffect(() => {
    fetchGames();
    fetchGameProgress();
  }, []);

  const fetchGames = async () => {
    try {
      const response = await api.get("/api/games");
      setGames(response.data);
    } catch (error) {
      console.error("Error loading des jeux:", error);
      setError("Error loading games");
    } finally {
      setLoading(false);
    }
  };

  const fetchGameProgress = async () => {
    try {
      const response = await api.get("/api/games/progress");
      setGameProgress(response.data);
    } catch (error) {
      console.error(
        "Error loading de la progression des jeux:",
        error
      );
    }
  };

  const handleGameClick = async (gameType, mode) => {
    try {
      // Start le jeu
      await api.post(`/api/games/${gameType}/${mode}/play`);

      // Naviguer vers le jeu
      navigate(`/game/${gameType}/${mode}`);
    } catch (error) {
      console.error("Error while start du jeu:", error);
      if (error.response?.status === 403) {
        alert("Jeu locked: " + error.response.data.error);
      } else {
        alert("Error while start du jeu");
      }
    }
  };

  const handleCompleteGame = async (gameType, mode, score) => {
    try {
      await api.post(`/api/games/${gameType}/${mode}/complete`, { score });

      // Refresh les donnees
      fetchGames();
      fetchGameProgress();

      alert(`Jeu completed avec un score de ${score} !`);
    } catch (error) {
      console.error("Error finishing game:", error);
      alert("Error finishing game");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-32 w-32 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">Loading games...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-red-600 text-lg mb-4 font-medium">{error}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/")}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-200"
          >
            Back Ã  l'accueil
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (selectedMode) {
    return (
      <GameTypes
        mode={selectedMode}
        games={games}
        onBack={() => setSelectedMode(null)}
        onGameClick={handleGameClick}
        onCompleteGame={handleCompleteGame}
        roadMapProgress={roadMapProgress}
        setRoadMapProgress={setRoadMapProgress}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
      {/* Header avec navigation */}
      <div className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/")}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors bg-white/60 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back Ã  l'accueil
            </motion.button>

            <div className="text-center">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center mb-2"
              >
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Gaming Arena
                </h1>
              </motion.div>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-gray-600 mt-2 font-medium"
              >
                Master German through play and adventure
              </motion.p>
            </div>

            <div className="w-20"></div>
          </div>
        </div>
      </div>


      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Modes de jeu */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mb-12"
        >
          <motion.h2 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4"
          >
            Choose your game mode
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-gray-600 mb-8 text-lg font-medium"
          >
            Affrontez des challenges solo ou rejoignez la communaute
          </motion.p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <ModeCard
              mode="online"
              title="Online Mode"
              description="Play with other learners"
              icon={Users}
              color="from-blue-500 to-blue-600"
              onClick={() => setSelectedMode("online")}
            />
            <ModeCard
              mode="solo"
              title="Solo Mode"
              description="Train-vous en solo"
              icon={User}
              color="from-green-500 to-green-600"
              onClick={() => setSelectedMode("solo")}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Composant carte de statistique
// Composant carte de statistique
/*
const StatCard = ({ title, value, icon: Icon, color, suffix = "" }) => (
  <motion.div 
    whileHover={{ scale: 1.02, y: -2 }}
    className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 text-center border border-white/20"
  >
    <motion.div 
      whileHover={{ rotate: 5, scale: 1.1 }}
      className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${color} text-white mb-4 shadow-lg`}
    >
      <Icon className="w-8 h-8" />
    </motion.div>
    <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
    <p
      className={`text-3xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}
    >
      {value}
      {suffix}
    </p>
  </motion.div>
);
*/

// Composant carte de mode
const ModeCard = ({ mode, title, description, icon: Icon, color, onClick }) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -5 }}
    whileTap={{ scale: 0.98 }}
    className={`relative bg-gradient-to-br ${color} rounded-3xl p-8 h-72 flex flex-col items-center justify-center text-white shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden`}
    onClick={onClick}
  >
    {/* Overlay pour effet de profondeur */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/10 opacity-0 hover:opacity-100 transition-opacity duration-300" />
    
    {/* Contenu */}
    <div className="relative z-10 text-center">
      <motion.div
        whileHover={{ rotate: 5, scale: 1.1 }}
        className="mb-6"
      >
        <Icon className="w-16 h-16 mx-auto" />
      </motion.div>
      <h3 className="text-2xl font-bold mb-3 text-center">{title}</h3>
      <p className="text-center text-white/90 mb-4 text-lg">{description}</p>
    {mode === "online" && (
        <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-semibold">
        Create une salle ou rejoignez-en une
        </div>
    )}
  </div>
  </motion.div>
);

// Composant carte de type de jeu
const GameTypeCard = ({
  gameType,
  game,
  mode,
  isUnlocked,
  isCompleted,
  isInProgress,
  index,
  onGameClick,
  onCompleteGame,
  roadMapProgress,
  totalStages = 0,
}) => {
  const navigate = useNavigate();
  const [showScoreInput, setShowScoreInput] = useState(false);
  const [score, setScore] = useState("");
  const completedCount = roadMapProgress?.[gameType.id]?.completedStages?.length || 0;
  const meta = SOLO_GAME_META[gameType.id] || { Icon: Gamepad2 };
  const IconComponent = meta.Icon;
  const canPlay = isUnlocked;
  const progressPct = totalStages > 0 ? Math.round((completedCount / totalStages) * 100) : 0;

  const handlePlay = () => {
    if (!canPlay) return;
    if (gameType.id === "creativite" || gameType.id === "mots-croises") {
      navigate(`/roadmap/${gameType.id}`);
    } else if (gameType.id === "shadowing") {
      navigate("/shadowing");
    } else if (gameType.id === "vocab-quiz") {
      navigate("/vocab-quiz");
    } else {
      onGameClick(gameType.id, mode);
    }
  };

  const handleComplete = () => {
    if (showScoreInput) {
      if (score && !isNaN(score)) {
        onCompleteGame(gameType.id, mode, parseInt(score));
        setShowScoreInput(false);
        setScore("");
      }
    } else {
      setShowScoreInput(true);
    }
  };

  const getStatusText = () => {
    if (isCompleted) return "Completed";
    if (isInProgress) return "In progress";
    if (isUnlocked) return "Available";
    return "Locked";
  };

  const getStatusColor = () => {
    if (isCompleted) return "bg-amber-100 text-amber-800 ring-1 ring-amber-200";
    if (isInProgress) return "bg-sky-100 text-sky-800 ring-1 ring-sky-200";
    if (isUnlocked) return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200";
    return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileHover={canPlay ? { y: -4 } : {}}
      className={`bg-white rounded-2xl shadow-md ring-1 ring-slate-200/80 overflow-hidden flex flex-col h-full transition-shadow ${
        canPlay ? "hover:shadow-xl" : "opacity-85"
      } ${isInProgress ? "ring-2 ring-sky-400/50" : ""}`}
    >
      {/* Header de la carte */}
      <div className={`relative bg-gradient-to-br ${gameType.color} p-6 text-white`}>
        {/* Decorations d'background pour plus de profondeur */}
        <div className="pointer-events-none absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-black/10 blur-3xl" />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30">
            <IconComponent className="h-7 w-7" strokeWidth={2} />
          </div>
          <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        <h3 className="relative z-10 mt-4 text-xl font-bold">{gameType.title}</h3>
        <p className="relative z-10 mt-1 text-sm text-white/85 line-clamp-2">{gameType.description}</p>

        {/* Badge etapes X/Y pour roadmaps */}
        {(gameType.id === "creativite" || gameType.id === "mots-croises") && (
          <div className="absolute bottom-4 left-4 z-10 bg-white/90 text-gray-800 text-xs font-semibold px-3 py-1 rounded-full shadow border border-white/60">
            {completedCount} / {totalStages || 0} steps
          </div>
        )}
      </div>

      <div className="p-6 space-y-4 flex-1">
        {/* Score si completed */}
        {isCompleted && game?.score && (
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
            <p className="text-sm text-yellow-800">
              <span className="font-semibold">Final score:</span> {game.score}{" "}
              points
            </p>
          </div>
        )}

        {/* Indicateur de progression pour Creativity et Crosswords */}
        {(gameType.id === "creativite" || gameType.id === "mots-croises") && (
          <div className="mb-4">
            <div className="mb-1.5 flex justify-between text-xs font-medium text-slate-500">
              <span>Progress</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${gameType.color}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

      </div>

      {/* Actions - Footer en bas de la carte */}
      <div className="-mx-6 -mb-6 p-6 pt-4 border-t border-slate-100 bg-slate-50/80 space-y-3">
          {canPlay && (
            <button
              onClick={handlePlay}
              className={`w-full text-white py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 bg-gradient-to-r ${gameType.color} hover:opacity-95 shadow-md font-semibold text-sm`}
            >
              <Play className="w-4 h-4" />
              {isCompleted ? "Play again" : isInProgress ? "Continue" : "Play"}
              <ChevronRight className="w-4 h-4 opacity-80" />
            </button>
          )}

          {isInProgress && gameType.id !== "quiz" && canPlay && (
            <button
              onClick={handleComplete}
              className="w-full bg-green-600 text-white py-2.5 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-green-300 focus:ring-offset-2 focus:ring-offset-white"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Finish game
            </button>
          )}

          {showScoreInput && gameType.id !== "quiz" && (
            <div className="space-y-3">
              <input
                type="number"
                placeholder="Enter your score"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-german-500 focus:border-transparent"
                min="0"
                max="100"
              />
              <button
                onClick={handleComplete}
                disabled={!score || isNaN(score)}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2.5 px-4 rounded-lg hover:opacity-90 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-white"
              >
                <Trophy className="w-4 h-4 mr-2" />
                Submit score
              </button>
            </div>
          )}

          {!isUnlocked && (
            <button
              disabled
              className="w-full bg-gray-300 text-gray-600 py-2.5 px-4 rounded-lg cursor-not-allowed flex items-center justify-center"
            >
              <Lock className="w-4 h-4 mr-2" />
              Locked
            </button>
          )}
        </div>
    </motion.article>
  );
};

// Composant pour afficher les types de jeux
const GameTypes = ({ mode, games, onBack, onGameClick, onCompleteGame, roadMapProgress, setRoadMapProgress }) => {
  const navigate = useNavigate();
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [publicRooms, setPublicRooms] = useState([]);
  const [roomName, setRoomName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedGameType, setSelectedGameType] = useState("quiz");
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [roundsCount, setRoundsCount] = useState(3);
  const [randomMode, setRandomMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customSchedule, setCustomSchedule] = useState([{ gameType: "quiz", timerSeconds: 30 }]);
  const [inviteCode, setInviteCode] = useState("");

  const onlineGameOptions = [
    { id: "quiz", label: "Article Quiz", description: "der / die / das — points + bonus temps" },
    { id: "creativite", label: "Creativity", description: "Match labels to the image" },
    { id: "mots-croises", label: "Crosswords", description: "German crossword grid" },
    { id: "bingo", label: "Deutsch Bingo", description: "Sort words on the grid" },
    { id: "custom", label: "Custom", description: "Create your own schedule" },
  ];
  const timerOptions = [15, 30, 45, 60];
  const roundOptions = [1, 2, 3, 4, 5, 6, 7];

  const showRoundsPicker =
    randomMode ||
    (selectedGameType !== "custom" && (selectedGameType === "creativite" ||
    selectedGameType === "mots-croises"));
  const [onlineCount] = useState(() => Math.floor(Math.random() * 50) + 10);

  const gameTypes = [
    {
      id: "quiz",
      title: "Article Quiz",
      description: "der / die / das — pick the correct article",
      color: "from-purple-500 to-purple-600",
      icon: "",
    },
    {
      id: "vocab-quiz",
      title: "Vocabulary Quiz",
      description: "8,000+ words from A1, A2 & B1 TSV files",
      color: "from-violet-500 to-purple-600",
      icon: "",
    },
    {
      id: "mots-croises",
      title: "Crosswords",
      description: "Solve German crosswords",
      color: "from-blue-500 to-blue-600",
      icon: "",
    },
    {
      id: "creativite",
      title: "Creativity",
      description: "Create sentences and stories",
      color: "from-green-500 to-green-600",
      icon: "",
    },
    {
      id: "simulation",
      title: "Simulation",
      description: "Practice real conversations",
      color: "from-orange-500 to-orange-600",
      icon: "",
    },
    {
      id: "shadowing",
      title: "Shadowing",
      description: "YouTube: listen, repeat, AI quiz",
      color: "from-indigo-500 to-violet-600",
      icon: "🎧",
    },
  ];

  const modeInfo = {
    online: { title: "Online Mode", color: "from-blue-500 to-blue-600" },
    solo: { title: "Solo Mode", color: "from-green-500 to-green-600" },
  };

  const fetchPublicRooms = async () => {
    try {
      const response = await api.get("/api/rooms/public");
      setPublicRooms(response.data.rooms);
    } catch (error) {
      console.error("Error loading rooms:", error);
    }
  };

  const createRoom = async () => {
    if (!roomName.trim()) return;

    setLoading(true);
    try {
      const response = await api.post("/api/rooms/create", {
        name: roomName,
        isPrivate,
        gameType: randomMode ? "random" : selectedGameType,
        timerSeconds,
        roundsCount: selectedGameType === "custom" && !randomMode ? customSchedule.length : (showRoundsPicker ? roundsCount : 1),
        randomMode,
        customSchedule: selectedGameType === "custom" && !randomMode ? customSchedule : undefined,
      });

      if (response.data.success) {
        const roomId = response.data.room.id;
        navigate(`/room/${roomId}`);
      }
    } catch (error) {
      console.error("Error creating room:", error);
      alert("Error creating room");
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (roomId) => {
    setLoading(true);
    try {
      const response = await api.post(`/api/rooms/${roomId}/join`);
      if (response.data.success) {
        navigate(`/room/${roomId}`);
      }
    } catch (error) {
      console.error("Error joining room:", error);
      alert(error.response?.data?.error || "Error joining room");
    } finally {
      setLoading(false);
    }
  };

  const joinRoomByCode = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setLoading(true);
    try {
      const response = await api.post("/api/rooms/join-by-code", { code: inviteCode });
      if (response.data.success) {
        navigate(`/room/${response.data.roomId}`);
      }
    } catch (error) {
      console.error("Error joining room by code:", error);
      alert(error.response?.data?.error || "Code invalide ou erreur");
    } finally {
      setLoading(false);
    }
  };

  // Afficher les modales si elles sont ouvertes
  if (mode === "online" && (showCreateRoom || showJoinRoom)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 relative overflow-hidden">
        {/* Particules animated en background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => {
            const randomX = Math.random() * 100;
            const randomY = Math.random() * 100;
            return (
              <motion.div
                key={i}
                className="absolute w-3 h-3 bg-blue-300/20 rounded-full"
                initial={{
                  x: `${randomX}%`,
                  y: `${randomY}%`,
                  opacity: 0,
                }}
                animate={{
                  y: [`${randomY}%`, `${(randomY + Math.random() * 50 - 25) % 100}%`],
                  x: [`${randomX}%`, `${(randomX + Math.random() * 50 - 25) % 100}%`],
                  opacity: [0, 0.6, 0],
                }}
                transition={{
                  duration: Math.random() * 4 + 3,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            );
          })}
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20 relative z-10"
        >
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <motion.button
                whileHover={{ scale: 1.05, x: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowCreateRoom(false);
                  setShowJoinRoom(false);
                }}
                className="flex items-center text-gray-600 hover:text-gray-800 transition-colors bg-white/60 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </motion.button>

              <div className="text-center">
                <motion.h1
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-3xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent"
                >
                  {showCreateRoom ? "Create a room" : "Join a room"}
                </motion.h1>
              </div>

              <div className="w-20"></div>
            </div>
          </div>
        </motion.div>

        <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
          {showCreateRoom && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 border-2 border-blue-200/50 relative overflow-hidden"
            >
              {/* Effet de glow */}
              <motion.div
                className="absolute -inset-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-3xl opacity-10 blur-xl"
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.1, 0.15, 0.1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
              />

              <div className="relative z-10">
                <motion.h3
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6"
                >
                  Create a new room
                </motion.h3>

                <div className="space-y-5">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Room name
                    </label>
                    <input
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="My conversation room"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.32 }}
                    className="flex items-center p-4 bg-amber-50 rounded-xl border border-amber-200"
                  >
                    <input
                      type="checkbox"
                      id="randomMode"
                      checked={randomMode}
                      onChange={(e) => setRandomMode(e.target.checked)}
                      className="h-5 w-5 text-amber-600 rounded mr-3"
                    />
                    <label htmlFor="randomMode" className="cursor-pointer">
                      <span className="font-semibold text-gray-900">Random mode</span>
                      <p className="text-xs text-gray-600 mt-0.5">A different game each round</p>
                    </label>
                  </motion.div>

                  {!randomMode && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                  >
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Game type
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {onlineGameOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedGameType(opt.id)}
                          className={`text-left p-4 rounded-xl border-2 transition-all ${
                            selectedGameType === opt.id
                              ? "border-purple-500 bg-purple-50 ring-2 ring-purple-200"
                              : "border-gray-200 hover:border-blue-300"
                          }`}
                        >
                          <p className="font-semibold text-gray-900">{opt.label}</p>
                          <p className="text-xs text-gray-600 mt-1">{opt.description}</p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                  )}

                  {selectedGameType === "custom" && !randomMode && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Custom Rounds Schedule
                      </label>
                      <div className="space-y-3">
                        {customSchedule.map((round, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="font-bold text-gray-500 w-6">{idx + 1}.</span>
                            <select
                              value={round.gameType}
                              onChange={(e) => {
                                const newSchedule = [...customSchedule];
                                newSchedule[idx].gameType = e.target.value;
                                setCustomSchedule(newSchedule);
                              }}
                              className="px-3 py-2 border border-gray-300 rounded-lg flex-1 focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="quiz">Article Quiz</option>
                              <option value="creativite">Creativity</option>
                              <option value="mots-croises">Crosswords</option>
                              <option value="bingo">Deutsch Bingo</option>
                            </select>
                            <select
                              value={round.timerSeconds}
                              onChange={(e) => {
                                const newSchedule = [...customSchedule];
                                newSchedule[idx].timerSeconds = parseInt(e.target.value, 10);
                                setCustomSchedule(newSchedule);
                              }}
                              className="px-3 py-2 border border-gray-300 rounded-lg w-24 focus:ring-2 focus:ring-purple-500"
                            >
                              {timerOptions.map(t => <option key={t} value={t}>{t}s</option>)}
                            </select>
                            {customSchedule.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newSchedule = customSchedule.filter((_, i) => i !== idx);
                                  setCustomSchedule(newSchedule);
                                }}
                                className="text-red-500 hover:text-red-700 font-bold px-2 text-xl"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                        {customSchedule.length < 10 && (
                          <button
                            type="button"
                            onClick={() => {
                              setCustomSchedule([...customSchedule, { gameType: "quiz", timerSeconds: 30 }]);
                            }}
                            className="text-blue-600 font-semibold text-sm hover:text-blue-800 transition-colors flex items-center mt-2"
                          >
                            <Plus className="w-4 h-4 mr-1" /> Add Round
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {showRoundsPicker && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nombre de rounds (1 tour = 1 partie)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {roundOptions.map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setRoundsCount(n)}
                            className={`w-11 h-11 rounded-lg font-bold border-2 ${
                              roundsCount === n
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white border-gray-200"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {(selectedGameType === "quiz" || randomMode) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Temps par question
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {timerOptions.map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => setTimerSeconds(sec)}
                            className={`px-4 py-2 rounded-lg font-semibold border-2 transition-all ${
                              timerSeconds === sec
                                ? "bg-purple-600 text-white border-purple-600"
                                : "bg-white text-gray-700 border-gray-200 hover:border-purple-300"
                            }`}
                          >
                            {sec}s
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Score : 100 pts par bonne réponse + jusqu&apos;à 50 pts de bonus selon le temps restant.
                      </p>
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="flex items-center p-3 bg-gray-50 rounded-xl"
                  >
                    <input
                      type="checkbox"
                      id="private"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                    />
                    <label htmlFor="private" className="text-sm font-medium text-gray-900 cursor-pointer">
                      Salle private (invitation uniquement)
                    </label>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gradient-to-r from-blue-50 to-purple-50 p-5 rounded-xl border border-blue-200"
                  >
                    <p className="text-blue-900 text-sm leading-relaxed">
                      {randomMode ? (
                        <>
                          <strong>Random mode :</strong> {roundsCount} rounds. À chaque tour, un jeu différent
                          est choisi automatiquement. Le joueur avec le plus de points à la fin gagne.
                        </>
                      ) : selectedGameType === "custom" ? (
                        <>
                          <strong>Custom mode :</strong> {customSchedule.length} rounds avec des jeux et timers personnalisés.
                        </>
                      ) : selectedGameType === "quiz" ? (
                        <>
                          <strong>Quiz :</strong> questions synchronisées, score = bonnes réponses + bonus temps.
                        </>
                      ) : selectedGameType === "creativite" ? (
                        <>
                          <strong>Creativity :</strong> {roundsCount} tour{roundsCount > 1 ? "s" : ""} — même activité
                          pour les deux, meilleur score remporte le tour.
                        </>
                      ) : selectedGameType === "mots-croises" ? (
                        <>
                          <strong>Crosswords :</strong> {roundsCount} grille{roundsCount > 1 ? "s" : ""} — le plus
                          rapide et précis gagne chaque tour.
                        </>
                      ) : (
                        <>
                          <strong>Bingo :</strong> course sur la grille — le meilleur score gagne.
                        </>
                      )}
                    </p>
                  </motion.div>

                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={createRoom}
                    disabled={!roomName.trim() || loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl hover:shadow-2xl transition-all duration-300 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center font-semibold text-lg relative overflow-hidden group"
                  >
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="rounded-full h-6 w-6 border-3 border-white border-t-transparent mr-3"
                      />
                    ) : (
                      <motion.span
                        initial={{ x: 0 }}
                        whileHover={{ x: 5 }}
                        className="mr-2"
                      >
                        ðŸš€
                      </motion.span>
                    )}
                    <span>{loading ? "Creation en cours..." : "Creer la salle"}</span>
                    <motion.div
                      className="absolute inset-0 bg-white/20"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.6 }}
                    />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {showJoinRoom && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 border-2 border-green-200/50 relative overflow-hidden"
            >
              {/* Effet de glow */}
              <motion.div
                className="absolute -inset-1 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 rounded-3xl opacity-10 blur-xl"
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.1, 0.15, 0.1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
              />

              <div className="relative z-10">
                <div className="mb-8 p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-3">Rejoindre une salle privée</h4>
                  <form onSubmit={joinRoomByCode} className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Code d'invitation (ex: A7X9V2)"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={!inviteCode.trim() || loading}
                      className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 font-semibold"
                    >
                      Rejoindre
                    </button>
                  </form>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <motion.h3
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent"
                  >
                    Salles publics disponibles
                  </motion.h3>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 180 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={fetchPublicRooms}
                    className="text-blue-600 hover:text-blue-800 text-sm font-semibold bg-blue-50 px-4 py-2 rounded-lg transition-colors"
                  >
                    ðŸ”„ Actualiser
                  </motion.button>
                </div>

                {publicRooms.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-gray-400 mb-4"
                    >
                      <Users className="w-20 h-20 mx-auto" />
                    </motion.div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No rooms available right now
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Soyez le premier Ã  create une salle et commencez Ã  pratiquer avec d'autres apprenants !
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setShowJoinRoom(false);
                        setShowCreateRoom(true);
                      }}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl hover:shadow-xl font-semibold"
                    >
                      Create a room
                    </motion.button>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {publicRooms.map((room, index) => (
                      <motion.div
                        key={room.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="border-2 border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-xl transition-all bg-white/50 backdrop-blur-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-3 h-3 bg-green-500 rounded-full"
                              />
                              <h4 className="font-bold text-lg text-gray-900">
                                {room.name}
                              </h4>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              ðŸ‘¤ Host: <span className="font-semibold">{room.hostEmail}</span>
                            </p>
                            <p className="text-sm text-gray-600 mb-1">
                              ðŸ‘¥ <span className="font-semibold">{room.playersCount}/{room.maxPlayers}</span> players
                            </p>
                            <p className="text-sm text-blue-600 font-medium">
                              {room.gameConfig?.label || "Online match"}
                              {room.gameConfig?.gameType === "quiz" && ` — ${room.gameConfig.timerSeconds}s`}
                              {room.gameConfig?.roundsCount > 1 &&
                                ` — ${room.gameConfig.roundsCount} rounds`}
                            </p>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => joinRoom(room.id)}
                            disabled={loading}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold ml-4"
                          >
                            {loading ? "..." : "Join"}
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors bg-white/60 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to modes
            </button>

            <div className="text-center">
              <h1
                className={`text-3xl font-bold bg-gradient-to-r ${modeInfo[mode].color} bg-clip-text text-transparent`}
              >
                {modeInfo[mode].title}
              </h1>
              <p className="text-german-600 mt-2">
                Choose your game type
              </p>
            </div>

            <div className="w-20" />
          </div>
        </div>
      </div>

      {/* Boutons speciaux pour le mode en ligne avec animations */}
      {mode === "online" && (
        <div className="max-w-7xl mx-auto px-4 py-6 relative overflow-hidden">
          {/* Particules flottantes en background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => {
              const randomX = Math.random() * 100;
              const randomY = Math.random() * 100;
              return (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-blue-400/30 rounded-full"
                  initial={{
                    x: `${randomX}%`,
                    y: `${randomY}%`,
                    opacity: 0,
                  }}
                  animate={{
                    y: [`${randomY}%`, `${(randomY + Math.random() * 50 - 25) % 100}%`],
                    x: [`${randomX}%`, `${(randomX + Math.random() * 50 - 25) % 100}%`],
                    opacity: [0, 0.5, 0],
                  }}
                  transition={{
                    duration: Math.random() * 3 + 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                />
              );
            })}
          </div>

          {/* Carte principale avec effets speciaux */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200/50 rounded-3xl p-8 mb-8 shadow-2xl overflow-hidden"
          >
            {/* Effet de glow anime */}
            <motion.div
              className="absolute -inset-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-3xl opacity-20 blur-xl"
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.2, 0.3, 0.2],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Indicateur de personnes en ligne */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center mb-6"
            >
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="relative"
                >
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <motion.div
                    className="absolute inset-0 bg-green-500 rounded-full"
                    animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.div>
                <span className="text-sm font-semibold text-gray-700">
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="inline-block"
                  >
                    {onlineCount} learners online
                  </motion.span>
                </span>
              </div>
            </motion.div>

            {/* Contenu principal */}
            <div className="relative z-10">
              <motion.h3
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4 text-center"
              >
                Online game — Conversation simulation
              </motion.h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-gray-700 mb-6 text-center text-lg leading-relaxed"
              >
                Connect with learners worldwide! Create a room or join one to practice German in real conversation. You get a random topic and can use voice chat.
              </motion.p>

              {/* Boutons avec animations */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreateRoom(true)}
                  className="relative bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 flex items-center group overflow-hidden"
                >
                  {/* Effet de brillance au survol */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.6 }}
                  />
                  <Plus className="w-5 h-5 mr-2 relative z-10" />
                  <span className="relative z-10 font-semibold">Create a room</span>
                  <motion.div
                    className="absolute inset-0 bg-blue-400 opacity-0 group-hover:opacity-20"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowJoinRoom(true);
                    fetchPublicRooms();
                  }}
                  className="relative bg-gradient-to-r from-green-600 to-emerald-700 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 flex items-center group overflow-hidden"
                >
                  {/* Effet de brillance au survol */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.6 }}
                  />
                  <Users className="w-5 h-5 mr-2 relative z-10" />
                  <span className="relative z-10 font-semibold">Join une salle</span>
                  <motion.div
                    className="absolute inset-0 bg-green-400 opacity-0 group-hover:opacity-20"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.button>
              </div>

              {/* Avatars flottants suggerant des personnes */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex justify-center items-center mt-8 space-x-4"
              >
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg"
                    animate={{
                      y: [0, -10, 0],
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                      duration: 2 + i * 0.3,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  >
                    {String.fromCharCode(65 + i)}
                  </motion.div>
                ))}
                <motion.span
                  className="text-sm text-gray-600 ml-2"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Join the community!
                </motion.span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Types de jeux - Masques pour le mode en ligne */}
      {mode !== "online" && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 lg:gap-6">
            {/* Composant carte de type de jeu */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-2"
            >
              <button
                type="button"
                onClick={() => navigate("/german-bingo")}
                className="w-full text-left bg-gradient-to-r from-[#36318E] to-[#1a1625] rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border-2 border-[#d2f500]/30 hover:border-[#d2f500]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-3xl"></span>
                    <h3 className="text-xl font-bold text-white mt-2">Deutsch Bingo</h3>
                    <p className="text-sm text-white/70 mt-1">
                      Sort German vocabulary on a grid 3×3
                    </p>
                  </div>
                  <span className="bg-[#d2f500] text-[#1a1625] font-bold px-4 py-2 rounded-lg text-sm">
                    PLAY
                  </span>
                </div>
              </button>
            </motion.div>

            {gameTypes.map((gameType, index) => {
              const game = games[gameType.id]?.[mode];
              const isUnlocked = game?.status !== "locked";
              const isCompleted = game?.status === "completed";
              const isInProgress = game?.status === "in-progress";
              // Determiner dynamiquement le nombre d'steps en fonction des jeux existants
              const totalStages = Array.isArray(games?.[gameType.id]?.list)
                ? games[gameType.id].list.length
                : (Array.isArray(games?.[gameType.id]) ? games[gameType.id].length : 0);

              return (
                <GameTypeCard
                  key={gameType.id}
                  gameType={gameType}
                  game={game}
                  mode={mode}
                  isUnlocked={isUnlocked}
                  isCompleted={isCompleted}
                  isInProgress={isInProgress}
                  index={index}
                  onGameClick={onGameClick}
                  onCompleteGame={onCompleteGame}
                  roadMapProgress={roadMapProgress}
                  totalStages={totalStages}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default GamingSection;
