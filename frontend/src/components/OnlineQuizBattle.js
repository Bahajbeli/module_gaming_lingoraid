import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import io from 'socket.io-client';
import { ArrowLeft, Clock, Trophy, Users } from 'lucide-react';
import api from '../utils/axios';

const OPTIONS = ['der', 'die', 'das'];

const OnlineQuizBattle = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [room, setRoom] = useState(null);
  const [round, setRound] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selected, setSelected] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [roundResult, setRoundResult] = useState(null);
  const [scores, setScores] = useState({});
  const [finished, setFinished] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState('');

  const socketRef = useRef(null);
  const endsAtRef = useRef(null);

  useEffect(() => {
    const loadRoom = async () => {
      try {
        const res = await api.get(`/api/rooms/${roomId}`);
        if (res.data.success) setRoom(res.data.room);
      } catch (e) {
        setError(e.response?.data?.error || 'Salle introuvable');
      }
    };
    loadRoom();
  }, [roomId]);

  useEffect(() => {
    if (!token || !roomId) return undefined;

    const socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
      auth: { token },
    });
    socketRef.current = socket;

    socket.emit('join-room', { roomId });
    socket.emit('quiz-sync', { roomId });

    socket.on('quiz-game-sync', (payload) => {
      if (payload.status === 'finished') {
        setFinished(true);
        return;
      }
      if (payload.question && payload.currentRound >= 0) {
        setRound({
          roundIndex: payload.currentRound,
          totalRounds: payload.totalRounds,
          question: payload.question,
          timerSeconds: payload.gameConfig?.timerSeconds || 30,
          endsAt: payload.endsAt,
        });
        endsAtRef.current = payload.endsAt;
        setScores(payload.scores || {});
        setSubmitted(false);
        setSelected('');
        setRoundResult(null);
      }
    });

    socket.on('quiz-round-start', (payload) => {
      setRound(payload);
      endsAtRef.current = payload.endsAt;
      setSubmitted(false);
      setSelected('');
      setRoundResult(null);
    });

    socket.on('quiz-round-end', (payload) => {
      setRoundResult(payload);
      setScores(payload.scores || {});
    });

    socket.on('quiz-game-finished', (payload) => {
      setFinished(true);
      setLeaderboard(payload.leaderboard || []);
    });

    return () => {
      socket.disconnect();
    };
  }, [token, roomId]);

  useEffect(() => {
    if (!round?.endsAt) return undefined;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000));
      setTimeLeft(left);
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [round]);

  const submitAnswer = (opt) => {
    if (submitted || !round || timeLeft <= 0) return;
    setSelected(opt);
    setSubmitted(true);
    socketRef.current?.emit('quiz-submit-answer', {
      roomId,
      roundIndex: round.roundIndex,
      answer: opt,
    });
  };

  const leaveBattle = async () => {
    try {
      socketRef.current?.emit('leave-room', { roomId });
      await api.post(`/api/rooms/${roomId}/leave`);
    } catch (_) {
      /* ignore */
    }
    navigate('/gaming');
  };

  const myScore = scores[user?.id]?.total ?? 0;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
        <div className="max-w-lg mx-auto mt-12 bg-white rounded-3xl shadow-2xl p-8">
          <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">Partie terminée</h1>
          <ol className="space-y-3 mb-8">
            {leaderboard.map((entry, i) => (
              <li
                key={entry.userId}
                className={`flex justify-between items-center p-4 rounded-xl ${
                  entry.userId === user?.id ? 'bg-purple-100 ring-2 ring-purple-400' : 'bg-gray-50'
                }`}
              >
                <span className="font-medium">
                  #{i + 1} {entry.userId === user?.id ? 'Vous' : entry.email}
                </span>
                <span className="font-bold text-purple-700">{entry.total} pts</span>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => navigate('/gaming')} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold">
            Back au gaming
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="bg-white/90 shadow-lg border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button type="button" onClick={leaveBattle} className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5 mr-1" />
            Leave
          </button>
          <div className="text-center">
            <p className="text-sm text-gray-500">{room?.name || 'Quiz en ligne'}</p>
            <p className="font-bold text-purple-700 flex items-center justify-center gap-1">
              <Trophy className="w-4 h-4" />
              {myScore} pts
            </p>
          </div>
          <div className="flex items-center text-orange-600 font-mono font-bold">
            <Clock className="w-4 h-4 mr-1" />
            {timeLeft}s
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {round ? (
          <>
            <p className="text-center text-gray-600 mb-2">
              Question {round.roundIndex + 1} / {round.totalRounds}
            </p>

            <div className="bg-white rounded-3xl shadow-xl p-8 mb-6 text-center">
              <p className="text-3xl font-bold text-gray-900 mb-2">{round.question?.word}</p>
              {round.question?.translation && (
                <p className="text-gray-500 italic">{round.question.translation}</p>
              )}
              <p className="mt-4 text-sm text-purple-600">Choisissez l&apos;article correct</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {OPTIONS.map((opt) => {
                const isSelected = selected === opt;
                let style = 'bg-white border-2 border-gray-200 hover:border-purple-400 text-gray-800';
                if (roundResult) {
                  if (opt === roundResult.correctArticle) style = 'bg-green-500 text-white border-green-600';
                  else if (isSelected) style = 'bg-red-500 text-white border-red-600';
                } else if (isSelected) {
                  style = 'bg-purple-600 text-white border-purple-700';
                }
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={submitted || !!roundResult || timeLeft <= 0}
                    onClick={() => submitAnswer(opt)}
                    className={`py-6 rounded-2xl text-xl font-bold transition-all ${style} disabled:opacity-70`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {submitted && !roundResult && (
              <p className="text-center text-gray-600 animate-pulse">Waiting de l&apos;adversaire...</p>
            )}

            {roundResult && (
              <div className="bg-white/80 rounded-2xl p-4 space-y-2">
                <p className="text-center font-semibold text-gray-800">
                  Bonne réponse : <span className="text-green-600">{roundResult.correctArticle}</span>
                </p>
                {roundResult.playerResults?.map((pr) => (
                  <div
                    key={pr.userId}
                    className="flex justify-between text-sm p-2 rounded-lg bg-gray-50"
                  >
                    <span>{pr.userId === user?.id ? 'Vous' : pr.email}</span>
                    <span className={pr.isCorrect ? 'text-green-600 font-semibold' : 'text-red-600'}>
                      {pr.isCorrect ? `+${pr.points} pts` : '0 pts'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">Démarrage de la partie...</p>
          </div>
        )}

        {room?.players?.length > 0 && (
          <div className="mt-8 flex justify-center gap-4">
            {room.players.map((p) => (
              <div key={p.id} className="bg-white/80 px-4 py-2 rounded-full text-sm shadow">
                {p.id === user?.id ? 'Vous' : p.email?.split('@')[0]}
                <span className="ml-2 font-bold text-purple-600">
                  {scores[p.id]?.total ?? 0}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OnlineQuizBattle;
