import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import io from 'socket.io-client';
import { ArrowLeft, Clock, Trophy, Users } from 'lucide-react';
import api from '../utils/axios';
import CreativityRunner from './CreativityRunner';
import CrosswordRunner from './CrosswordRunner';
import OnlineBingoTour from './OnlineBingoTour';
import { useSound } from '../hooks/useSound';

const OPTIONS = ['der', 'die', 'das'];

const TOUR_NAMES = {
  quiz: 'Article Quiz',
  creativite: 'Creativity',
  'mots-croises': 'Crosswords',
  bingo: 'Deutsch Bingo',
};

const OnlineMatchPlay = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  const [schedule, setSchedule] = useState([]);
  const [tourInfo, setTourInfo] = useState(null);
  const [tourPayload, setTourPayload] = useState(null);
  const [tourError, setTourError] = useState(null);
  const [matchCancelled, setMatchCancelled] = useState(null);
  const [matchScores, setMatchScores] = useState({});
  const [tourSubmitted, setTourSubmitted] = useState(false);
  const [tourIntermission, setTourIntermission] = useState(null);

  const { playCorrect, playWrong, playFanfare } = useSound();

  const [quizRound, setQuizRound] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selected, setSelected] = useState('');
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizRoundResult, setQuizRoundResult] = useState(null);
  const [quizScores, setQuizScores] = useState({});

  const socketRef = useRef(null);
  const endsAtRef = useRef(null);
  const currentTourRef = useRef(-1);

  useEffect(() => {
    api.get(`/api/rooms/${roomId}`).then((res) => {
      if (res.data.success) setRoom(res.data.room);
    }).catch((e) => {
      setError(e.response?.data?.error || 'Salle introuvable');
    });
  }, [roomId]);

  useEffect(() => {
    if (!token || !roomId) return undefined;

    const socket = io(process.env.REACT_APP_SERVER_URL || 'https://backend-u6jh.onrender.com', {
      auth: { token },
    });
    socketRef.current = socket;
    socket.emit('join-room', { roomId });
    socket.emit('match-sync', { roomId });

    const applySync = (payload) => {
      if (payload.schedule) setSchedule(payload.schedule);
      if (payload.matchScores) setMatchScores(payload.matchScores);
      if (payload.status === 'finished') {
        setFinished(true);
        return;
      }
      if (payload.currentTour >= 0) {
        currentTourRef.current = payload.currentTour;
        setTourInfo({
          tourIndex: payload.currentTour,
          totalTours: payload.totalTours,
          gameType: payload.activeGameType,
          label: TOUR_NAMES[payload.activeGameType] || payload.activeGameType,
        });
      }
      if (payload.tourPayload) setTourPayload(payload.tourPayload);
      if (payload.quiz?.question) {
        setQuizRound({
          roundIndex: payload.quiz.currentRound,
          totalRounds: payload.quiz.totalRounds,
          question: payload.quiz.question,
          endsAt: payload.quiz.endsAt,
        });
        endsAtRef.current = payload.quiz.endsAt;
        setQuizScores(payload.quiz.scores || {});
      }
    };

    socket.on('match-sync-state', applySync);

    socket.on('game-started', (p) => {
      setSchedule(p.schedule || []);
    });

    socket.on('match-tour-start', (p) => {
      currentTourRef.current = p.tourIndex;
      setTourInfo(p);
      setTourPayload(null);
      setTourIntermission(null);
      setTourSubmitted(false);
      setQuizRound(null);
      setQuizRoundResult(null);
      setQuizSubmitted(false);
    });

    socket.on('match-tour-payload', (p) => {
      if (p.tourIndex === currentTourRef.current) {
        setTourPayload(p.payload);
      }
    });

    socket.on('quiz-round-start', (p) => {
      setQuizRound(p);
      endsAtRef.current = p.endsAt;
      setQuizSubmitted(false);
      setSelected('');
      setQuizRoundResult(null);
    });

    socket.on('quiz-round-end', (p) => {
      setQuizRoundResult(p);
      setQuizScores(p.scores || {});
    });

    socket.on('match-tour-error', (p) => {
      setTourError(p.message || 'Erreur sur ce tour');
    });

    socket.on('match-cancelled', (p) => {
      setMatchCancelled(p.message || 'Partie annulée — contenu indisponible');
    });

    socket.on('match-tour-end', (p) => {
      setTourError(null);
      setTourIntermission(p);
      setMatchScores(p.matchScores || {});
      setQuizRound(null);
      setTourPayload(null);
    });

    socket.on('match-finished', (p) => {
      setFinished(true);
      setLeaderboard(p.leaderboard || []);
      playFanfare();
    });

    return () => socket.disconnect();
  }, [token, roomId, playFanfare]);

  useEffect(() => {
    if (quizRoundResult && selected) {
      if (selected === quizRoundResult.correctArticle) {
        playCorrect();
      } else {
        playWrong();
      }
    }
  }, [quizRoundResult, selected, playCorrect, playWrong]);

  useEffect(() => {
    if (!quizRound?.endsAt) return undefined;
    const tick = () => {
      setTimeLeft(Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [quizRound]);

  const submitTourScore = useCallback((score, timeTaken = 0) => {
    if (tourSubmitted || currentTourRef.current < 0) return;
    setTourSubmitted(true);
    socketRef.current?.emit('tour-complete', {
      roomId,
      tourIndex: currentTourRef.current,
      score,
      timeTaken,
    });
  }, [roomId, tourSubmitted]);

  const submitQuizAnswer = (opt) => {
    if (quizSubmitted || !quizRound || timeLeft <= 0) return;
    setSelected(opt);
    setQuizSubmitted(true);
    socketRef.current?.emit('quiz-submit-answer', {
      roomId,
      roundIndex: quizRound.roundIndex,
      answer: opt,
    });
  };

  const leave = async () => {
    try {
      socketRef.current?.emit('leave-room', { roomId });
      await api.post(`/api/rooms/${roomId}/leave`);
    } catch {
      /* ignore */
    }
    navigate('/gaming');
  };

  const myMatchTotal = matchScores[user?.id]?.total ?? quizScores[user?.id]?.total ?? 0;
  const activeGame = tourInfo?.gameType;
  const showQuiz = activeGame === 'quiz' && quizRound;

  if (matchCancelled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-orange-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <p className="text-red-700 mb-4">{matchCancelled}</p>
          <button
            type="button"
            onClick={() => navigate(`/room/${roomId}`)}
            className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold mb-2"
          >
            Retour au lobby
          </button>
          <button type="button" onClick={() => navigate('/gaming')} className="w-full text-gray-600 py-2">
            Gaming
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button type="button" onClick={() => navigate('/gaming')} className="bg-blue-600 text-white px-6 py-2 rounded-lg">
            Back
          </button>
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
        <div className="max-w-lg mx-auto mt-12 bg-white rounded-3xl shadow-2xl p-8">
          <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-center mb-6">Partie terminée</h1>
          <ol className="space-y-3 mb-8">
            {leaderboard.map((entry, i) => (
              <li
                key={entry.userId}
                className={`flex justify-between p-4 rounded-xl ${
                  entry.userId === user?.id ? 'bg-purple-100 ring-2 ring-purple-400' : 'bg-gray-50'
                }`}
              >
                <span>#{i + 1} {entry.userId === user?.id ? 'Vous' : entry.email}</span>
                <span className="font-bold text-purple-700">{entry.total} pts</span>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => navigate('/gaming')} className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold">
            Back au gaming
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="bg-white/90 shadow border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-2">
          <button type="button" onClick={leave} className="flex items-center text-gray-600 shrink-0">
            <ArrowLeft className="w-5 h-5 mr-1" />
            Leave
          </button>
          <div className="text-center min-w-0">
            <p className="text-sm text-gray-500 truncate">{room?.name}</p>
            {tourInfo && (
              <p className="text-xs font-semibold text-purple-700">
                Tour {tourInfo.tourIndex + 1}/{tourInfo.totalTours} — {tourInfo.label || TOUR_NAMES[tourInfo.gameType]}
              </p>
            )}
            <p className="font-bold text-purple-700 flex items-center justify-center gap-1">
              <Trophy className="w-4 h-4" />
              {myMatchTotal} pts
            </p>
          </div>
          {showQuiz && (
            <div className="flex items-center text-orange-600 font-mono font-bold shrink-0">
              <Clock className="w-4 h-4 mr-1" />
              {timeLeft}s
            </div>
          )}
          {!showQuiz && <div className="w-12" />}
        </div>
      </div>

      {schedule.length > 1 && (
        <div className="max-w-4xl mx-auto px-4 pt-3 flex flex-wrap gap-1 justify-center">
          {schedule.map((t, i) => (
            <span
              key={i}
              className={`text-xs px-2 py-1 rounded-full ${
                tourInfo?.tourIndex === i
                  ? 'bg-purple-600 text-white'
                  : i < (tourInfo?.tourIndex ?? -1)
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-200 text-gray-600'
              }`}
            >
              {i + 1}. {TOUR_NAMES[t.gameType] || t.gameType}
            </span>
          ))}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6">
        {tourError && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 mb-4 text-center text-sm">
            {tourError}
          </div>
        )}

        {tourIntermission && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 text-center">
            <p className="font-semibold text-lg mb-3">Fin du tour {tourIntermission.tourIndex + 1}</p>
            <div className="space-y-2">
              {tourIntermission.results?.map((r) => (
                <div key={r.userId} className="flex justify-between text-sm bg-gray-50 p-2 rounded-lg">
                  <span>{r.userId === user?.id ? 'Vous' : r.email}</span>
                  <span className="font-bold">{r.matchTotal} pts total</span>
                </div>
              ))}
            </div>
            <p className="text-gray-500 text-sm mt-4 animate-pulse">Prochain tour dans quelques secondes…</p>
          </div>
        )}

        {showQuiz && (
          <>
            <p className="text-center text-gray-600 mb-2">
              Question {quizRound.roundIndex + 1} / {quizRound.totalRounds}
            </p>
            <div className="bg-white rounded-3xl shadow-xl p-8 mb-6 text-center">
              <p className="text-3xl font-bold">{quizRound.question?.word}</p>
              {quizRound.question?.translation && (
                <p className="text-gray-500 italic mt-1">{quizRound.question.translation}</p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {OPTIONS.map((opt) => {
                const isSel = selected === opt;
                let cls = 'bg-white border-2 border-gray-200 text-gray-800';
                if (quizRoundResult) {
                  if (opt === quizRoundResult.correctArticle) cls = 'bg-green-500 text-white border-green-600';
                  else if (isSel) cls = 'bg-red-500 text-white border-red-600';
                } else if (isSel) cls = 'bg-purple-600 text-white border-purple-700';
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={quizSubmitted || !!quizRoundResult || timeLeft <= 0}
                    onClick={() => submitQuizAnswer(opt)}
                    className={`py-5 rounded-xl text-lg font-bold ${cls} disabled:opacity-70`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {quizSubmitted && !quizRoundResult && (
              <p className="text-center text-gray-500 animate-pulse">Waiting de l&apos;adversaire…</p>
            )}
          </>
        )}

        {activeGame === 'creativite' && tourPayload && !tourSubmitted && (
          <div className="bg-white rounded-2xl shadow-lg p-4 overflow-auto max-h-[70vh]">
            <CreativityRunner
              itemId={tourPayload.itemId}
              timerSeconds={tourInfo.timerSeconds}
              onComplete={(score, timeTaken) => submitTourScore(score, timeTaken)}
            />
          </div>
        )}

        {activeGame === 'mots-croises' && tourPayload && !tourSubmitted && (
          <div className="bg-white rounded-2xl shadow-lg p-4 overflow-auto max-h-[70vh]">
            <CrosswordRunner
              itemId={tourPayload.itemId}
              timerSeconds={tourInfo.timerSeconds}
              onComplete={(score, timeTaken) => submitTourScore(score, timeTaken)}
            />
          </div>
        )}

        {activeGame === 'bingo' && tourPayload && !tourSubmitted && (
          <OnlineBingoTour 
            payload={tourPayload} 
            timerSeconds={tourInfo.timerSeconds}
            onComplete={(score, timeTaken) => submitTourScore(score, timeTaken)} 
          />
        )}

        {tourSubmitted && !tourIntermission && activeGame === 'bingo' && (
          <div className="bg-[#1a1625] rounded-3xl p-8 text-center shadow-2xl">
            <p className="text-[#d2f500] font-bold text-lg mb-2">Tour bingo terminé</p>
            <p className="text-white/80 animate-pulse">Waiting de l&apos;adversaire…</p>
          </div>
        )}

        {tourSubmitted && !tourIntermission && activeGame !== 'quiz' && activeGame !== 'bingo' && (
          <p className="text-center text-gray-600 py-12 animate-pulse">
            Tour terminé — en attente de l&apos;adversaire…
          </p>
        )}

        {!tourInfo && !tourIntermission && (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">Démarrage de la partie…</p>
          </div>
        )}

        {room?.players?.length > 0 && (
          <div className="mt-8 flex justify-center gap-3 flex-wrap">
            {room.players.map((p) => (
              <div key={p.id} className="bg-white/90 px-4 py-2 rounded-full text-sm shadow">
                {p.id === user?.id ? 'Vous' : p.email?.split('@')[0]}
                <span className="ml-2 font-bold text-purple-600">
                  {matchScores[p.id]?.total ?? quizScores[p.id]?.total ?? 0}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OnlineMatchPlay;
