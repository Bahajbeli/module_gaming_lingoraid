import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../utils/axios';
import CrosswordRunner from './CrosswordRunner';
import CreativityRunner from './CreativityRunner';
import SimulationRunner from './SimulationRunner';

const QUESTION_COUNT = 10;
const OPTIONS = ['der', 'die', 'das'];

const GameRunner = () => {
  const { type, mode } = useParams();
  const location = useLocation();
  const stageNumber = location.state?.stageNumber;
  const creativityItemId = location.state?.gameId;
  const crosswordItemId = location.state?.gameId;
  const navigate = useNavigate();

  // Loading/errors
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  // Quiz state
  const [nouns, setNouns] = useState([]);
  const [order, setOrder] = useState([]); // indexes shuffled
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState('');
  const [finished, setFinished] = useState(false);
  
  // End Screen state for Creativity/Crosswords
  const [gameResult, setGameResult] = useState(null);
  const [gameKey, setGameKey] = useState(0);

  // Prepare game and load data
  useEffect(() => {
    const init = async () => {
      try {
        // Start game (ensures record exists)
        await api.post(`/api/games/${type}/${mode}/play`);

        if (type === 'quiz') {
          // Load nouns for quiz
          const res = await api.get('/api/games/quiz/nouns');
          const data = Array.isArray(res.data) ? res.data : [];
          // Normalize articles to lower-case
          const clean = data.map(n => ({
            word: n.word,
            article: String(n.article || '').trim().toLowerCase(),
            translation: n.englishTranslation || n.translation || ''
          })).filter(n => n.word && OPTIONS.includes(n.article));
          // Shuffle order
          const total = Math.min(QUESTION_COUNT, clean.length);
          const indices = [...Array(clean.length).keys()];
          for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
          }
          setNouns(clean);
          setOrder(indices.slice(0, total));
          setIndex(0);
          setScore(0);
          setSelected('');
          setFinished(false);
        }
        setStatus('ready');
      } catch (e) {
        const msg = e?.response?.data?.error || 'Error while démarrage/chargement du jeu';
        setError(msg);
        setStatus('error');
      }
    };
    init();
  }, [type, mode]);

  const current = useMemo(() => {
    if (status !== 'ready' || finished) return null;
    if (order.length === 0) return null;
    const idx = order[index];
    return nouns[idx];
  }, [status, finished, order, index, nouns]);

  const onSelect = (opt) => {
    if (!current || selected) return; // prevent double answer
    setSelected(opt);
    if (opt === current.article) {
      setScore((s) => s + 1);
    }
  };

  const next = () => {
    if (!selected) return; // must answer first
    const lastQuestion = index + 1 >= order.length;
    if (lastQuestion) {
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      setSelected('');
    }
  };

  const restart = () => {
    // re-init by toggling status to loading and re-running init via effect
    setStatus('loading');
    setError('');
    setNouns([]);
    setOrder([]);
    setIndex(0);
    setScore(0);
    setSelected('');
    setFinished(false);
    // trigger init again
    (async () => {
      try {
        await api.post(`/api/games/${type}/${mode}/play`);
        const res = await api.get('/api/games/quiz/nouns');
        const data = Array.isArray(res.data) ? res.data : [];
        const clean = data.map(n => ({ word: n.word, article: String(n.article || '').trim().toLowerCase(), translation: n.englishTranslation || n.translation || '' }))
          .filter(n => n.word && OPTIONS.includes(n.article));
        const total = Math.min(QUESTION_COUNT, clean.length);
        const indices = [...Array(clean.length).keys()];
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        setNouns(clean);
        setOrder(indices.slice(0, total));
        setStatus('ready');
      } catch (e) {
        const msg = e?.response?.data?.error || 'Error while redémarrage du quiz';
        setError(msg);
        setStatus('error');
      }
    })();
  };

  const submitScore = async () => {
    try {
      // Score sur 100 (cohérent avec l'UI admin de saisie 0-100)
      const percent = Math.round((score / order.length) * 100);
      await api.post(`/api/games/${type}/${mode}/complete`, { score: percent });
      navigate('/gaming', { state: { toast: { title: 'Quiz terminé', message: `Score ${percent} / 100`, type: 'success' } } });
    } catch (e) {
      const msg = e?.response?.data?.error || 'Error lors de l\'enregistrement du score';
      alert(msg);
    }
  };

  const handleGameComplete = async (percent) => {
    try {
      await api.post(`/api/games/${type}/${mode}/complete`, { score: percent, stage: stageNumber });

      let nextItemId = null;
      let nextStageNumber = null;
      try {
        const endpoint = type === 'creativite' ? '/api/creativity/list' : '/api/crosswords/list';
        const res = await api.get(endpoint);
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        const total = items.length;
        
        const key = `roadMapProgress_${type}`;
        const saved = localStorage.getItem(key);
        const current = saved ? JSON.parse(saved) : { currentStage: 1, completedStages: [] };
        const stage = Number(stageNumber) || current.currentStage || 1;

        const completed = new Set(current.completedStages || []);
        completed.add(stage);
        const nextStage = Math.min(stage + 1, Math.max(1, total));

        const updated = { currentStage: nextStage, completedStages: Array.from(completed).sort((a,b)=>a-b) };
        localStorage.setItem(key, JSON.stringify(updated));

        // items are ordered by creation. index = stage - 1. So next item is at index = stage.
        if (stage < total && items[stage]) {
           nextItemId = items[stage].id;
           nextStageNumber = stage + 1;
        }
      } catch (e) {
        console.error("Error fetching next stage", e);
      }

      setGameResult({ score: percent, nextItemId, nextStageNumber });
    } catch (e) {
      const msg = e?.response?.data?.error || "Error lors de l'enregistrement du score";
      alert(msg);
    }
  };

  const renderEndScreen = () => {
    if (!gameResult) return null;

    let title = "Good job!";
    let subtitle = "You completed this stage.";
    let emoji = "👍";
    let color = "text-blue-600";

    if (gameResult.score === 100) {
      title = "Perfect!";
      subtitle = "Outstanding performance!";
      emoji = "🌟";
      color = "text-yellow-500";
    } else if (gameResult.score >= 80) {
      title = "Excellent!";
      subtitle = "You are doing great!";
      emoji = "🔥";
      color = "text-green-600";
    } else if (gameResult.score >= 50) {
      title = "Not bad!";
      subtitle = "Keep practicing to improve.";
      emoji = "💪";
      color = "text-orange-500";
    } else {
      title = "Keep trying!";
      subtitle = "Don't give up, you'll get it next time.";
      emoji = "🌱";
      color = "text-red-500";
    }

    return (
      <div className="text-center py-8 animate-in fade-in zoom-in duration-500">
        <div className="text-6xl mb-4">{emoji}</div>
        <h2 className={`text-4xl font-extrabold mb-2 ${color}`}>{title}</h2>
        <p className="text-gray-600 text-lg mb-6">{subtitle}</p>
        
        <div className="bg-gray-50 rounded-2xl p-6 max-w-sm mx-auto mb-8 shadow-inner border border-gray-100">
          <p className="text-gray-500 font-medium mb-1">Your Score</p>
          <p className={`text-5xl font-black ${color}`}>{gameResult.score}<span className="text-3xl text-gray-400">%</span></p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate(`/roadmap/${type}`)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-gray-600 bg-white border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            Quit
          </button>
          
          <button
            onClick={() => {
              setGameResult(null);
              setGameKey(k => k + 1);
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-white bg-blue-500 hover:bg-blue-600 shadow-md hover:shadow-lg transition-all"
          >
            Replay
          </button>

          {gameResult.nextItemId && (
            <button
              onClick={() => {
                setGameResult(null);
                setGameKey(k => k + 1);
                navigate(`/game/${type}/${mode}`, {
                  state: { stageNumber: gameResult.nextStageNumber, gameId: gameResult.nextItemId },
                  replace: true
                });
              }}
              className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
            >
              Next Stage
            </button>
          )}
        </div>
      </div>
    );
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-german-50 to-german-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-german-600 mx-auto mb-4"></div>
          <p className="text-german-700 text-lg">Préparation du jeu...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-german-50 to-german-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full text-center">
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button 
            onClick={() => navigate('/gaming')}
            className="bg-german-600 text-white px-6 py-2 rounded-lg hover:bg-german-700 transition-colors inline-flex items-center"
          >
            <ArrowLeft className="w-5 h-5 mr-2" /> Back to games
          </button>
        </div>
      </div>
    );
  }

  // Crossword onComplete handler - supprimé car plus utilisé

  // Afficher l'écran de fin en priorité s'il y a un résultat
  if (gameResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-german-50 to-german-100">
        <div className="bg-white shadow">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={() => navigate(`/roadmap/${type}`)}
              className="flex items-center text-german-600 hover:text-german-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" /> Back
            </button>
            <h1 className="text-xl font-bold text-german-800">{type === 'mots-croises' ? 'Crosswords' : type === 'creativite' ? 'Creativity' : 'Game'} · Completed</h1>
            <div className="w-12" />
          </div>
        </div>
        <div className="max-w-3xl mx-auto p-6 mt-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            {renderEndScreen()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-german-50 to-german-100">
      <div className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/gaming')}
            className="flex items-center text-german-600 hover:text-german-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" /> Back
          </button>
          <h1 className="text-xl font-bold text-german-800">{type === 'mots-croises' ? 'Crosswords' : type === 'creativite' ? 'Creativity' : 'Article Quiz'} · {mode}</h1>
          <div className="w-12" />
        </div>
      </div>

      <div className={type === 'mots-croises' ? 'max-w-7xl mx-auto p-4 sm:p-6' : 'max-w-3xl mx-auto p-6'}>
        <div
          className={
            type === 'mots-croises' || type === 'creativite'
              ? 'bg-transparent p-0 text-left'
              : 'bg-white rounded-xl shadow-lg p-8 text-center'
          }
        >
          {/* Supprimé le CrosswordRunner dupliqué - gardé seulement celui avec la logique de roadmap */}

          {type === 'quiz' && !finished && current && (
            <>
              <div className="flex items-center justify-between mb-6">
                <span className="text-german-700">Question {index + 1} / {order.length}</span>
                <span className="font-semibold">Score: {score}</span>
              </div>

              <div className="mb-2">
                <p className="text-4xl font-extrabold tracking-wide">{current.word}</p>
              </div>
              {current.translation && (
                <div className="mb-6">
                  <p className="text-gray-600 text-sm">Traduction: <span className="font-medium">{current.translation}</span></p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {OPTIONS.map(opt => {
                  const isSelected = selected === opt;
                  const isCorrect = current.article === opt;
                  const base = 'py-3 px-4 rounded-lg text-lg font-semibold transition-colors';
                  let classes = 'bg-german-600 text-white hover:bg-german-700';
                  if (selected) {
                    if (isCorrect) classes = 'bg-green-600 text-white';
                    else if (isSelected) classes = 'bg-red-600 text-white';
                    else classes = 'bg-gray-200 text-gray-600';
                  }
                  return (
                    <button
                      key={opt}
                      disabled={!!selected}
                      onClick={() => onSelect(opt)}
                      className={`${base} ${classes}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {selected && (
                <div className="mb-4">
                  {selected === current.article ? (
                    <p className="text-green-700 font-semibold">Correct !</p>
                  ) : (
                    <p className="text-red-700 font-semibold">Faux. Réponse: {current.article}</p>
                  )}
                </div>
              )}

              <button
                onClick={next}
                disabled={!selected}
                className="bg-blue-600 disabled:bg-gray-300 disabled:text-gray-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Suivant
              </button>
            </>
          )}

          {type === 'creativite' && (
            <CreativityRunner 
              key={gameKey} 
              itemId={creativityItemId} 
              onComplete={handleGameComplete} 
            />
          )}

          {type === 'mots-croises' && (
            <CrosswordRunner 
              key={gameKey} 
              itemId={crosswordItemId} 
              onComplete={handleGameComplete} 
            />
          )}

          {type === 'simulation' && (
            <SimulationRunner />
          )}

          {type === 'quiz' && finished && (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Terminé !</h2>
              <p className="text-german-700 mb-6">
                Score: {score} / {order.length} ({Math.round((score / order.length) * 100)}%)
              </p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={submitScore}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Enregistrer le score
                </button>
                <button
                  onClick={restart}
                  className="bg-german-600 text-white px-6 py-2 rounded-lg hover:bg-german-700 transition-colors"
                >
                  Play again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameRunner;

