import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getAssetUrl } from '../utils/axios';
import './GermanBingo.css';

const GAME_SECONDS = 180;

const GermanBingoRunner = () => {
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const toastHideRef = useRef(null);

  const [sessionNonce, setSessionNonce] = useState(0);
  const [gridClasses, setGridClasses] = useState([]);
  const [words, setWords] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [assignment, setAssignment] = useState({});
  const [gameResults, setGameResults] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(GAME_SECONDS);
  const [gameOver, setGameOver] = useState(false);
  const [endReason, setEndReason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    if (toastHideRef.current) clearTimeout(toastHideRef.current);
    setToast({ message, type });
    toastHideRef.current = setTimeout(() => {
      setToast(null);
      toastHideRef.current = null;
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (toastHideRef.current) clearTimeout(toastHideRef.current);
    };
  }, []);

  const endGame = useCallback((reason) => {
    setGameOver(true);
    setEndReason(reason);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError('');
    setGameOver(false);
    setEndReason(null);
    setCurrentWordIndex(0);
    setAssignment({});
    setGameResults([]);
    setSecondsLeft(GAME_SECONDS);

    try {
      const res = await api.get('/api/german-bingo/play/game-session');
      setGridClasses(res.data.gridClasses || []);
      setWords(res.data.words || []);
      setSessionNonce((n) => n + 1);
    } catch (e) {
      setError(e?.response?.data?.error || 'Unable to charger la partie');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (loading || gameOver || gridClasses.length === 0) return;

    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          endGame('timer');
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, gameOver, gridClasses.length, endGame]);

  const currentWord = words[currentWordIndex];
  const filledCount = Object.keys(assignment).length;
  const progressPct =
    gridClasses.length > 0 ? (filledCount / gridClasses.length) * 100 : 0;

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleNext = () => {
    if (gameOver) return;
    if (words.length > 0) {
      setCurrentWordIndex((i) => (i + 1) % words.length);
    }
  };

  const currentWordPlacedClassId = currentWord
    ? Object.entries(assignment).find(([, wId]) => wId === currentWord.wordId)?.[0]
    : null;

  const resultByClassId = gameResults.reduce((acc, r) => {
    acc[r.classId] = r;
    return acc;
  }, {});

  const handleTileClick = async (classId) => {
    if (gameOver || !currentWord) return;

    if (assignment[classId]) {
      showToast('Cette case est already  utilisee', 'warning');
      return;
    }

    if (currentWordPlacedClassId) {
      showToast('Ce mot est already  place â€” passez au suivant', 'warning');
      return;
    }

    try {
      const res = await api.post('/api/german-bingo/play/check', {
        wordId: currentWord.wordId,
        selectedClassIds: [classId],
      });

      const tile = gridClasses.find((c) => c.id === classId);
      setAssignment((prev) => ({ ...prev, [classId]: currentWord.wordId }));
      setGameResults((prev) => [
        ...prev,
        {
          word: currentWord.word,
          tile: tile?.label || classId,
          isCorrect: res.data.perfectMatch,
          wordId: currentWord.wordId,
          classId,
        },
      ]);

      const newFilled = filledCount + 1;
      if (newFilled >= gridClasses.length) {
        endGame('board-full');
      }
    } catch (e) {
      showToast(e?.response?.data?.error || 'Error de validation', 'warning');
    }
  };

  const score = gameResults.filter((r) => r.isCorrect).length;

  const endTitle = {
    timer: 'Temps elapsed',
    'all-words': 'Bravo !',
    'board-full': 'Plateau complet',
  }[endReason] || 'Partie completede';

  if (loading) {
    return (
      <div className="german-bingo german-bingo-loading" translate="no" lang="de">
        <p>Loading de la partie...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="german-bingo german-bingo-error" translate="no" lang="de">
        <p>{error}</p>
        <button type="button" onClick={() => navigate('/gaming')}>
          Back
        </button>
        <Link to="/admin/german-bingo">Configurer le jeu (admin)</Link>
      </div>
    );
  }

  return (
    <div className="german-bingo" translate="no" lang="de">
      <div className="german-bingo-inner">
        <nav className="german-bingo-nav">
          <button type="button" onClick={() => navigate('/gaming')}>
            â† Back
          </button>
          <button type="button" onClick={loadSession}>
            Recommencer
          </button>
        </nav>

        <header className="german-bingo-header">
          <p className="german-bingo-title">Deutsch Bingo</p>
          <div className="german-bingo-word-row">
            <span className="german-bingo-word-num">
              {currentWordIndex + 1}
            </span>
            <span className="german-bingo-current-word">
              {currentWord?.emoji ? `${currentWord.emoji} ` : ''}
              {currentWord?.word || '—'}
            </span>
            <button
              type="button"
              className="german-bingo-next"
              onClick={handleNext}
              disabled={gameOver}
            >
              NEXT
            </button>
          </div>
          <div className="german-bingo-timer-row">
            <span>WILDCARD</span>
            <span className="german-bingo-timer">{formatTime(secondsLeft)}</span>
          </div>
        </header>

        <div className="german-bingo-grid">
          {gridClasses.map((cls) => {
            const wordId = assignment[cls.id];
            const placedWord = words.find((w) => w.wordId === wordId);
            const result = resultByClassId[cls.id];
            const showVerdict = gameOver && result;
            const tileState = showVerdict
              ? result.isCorrect
                ? 'correct'
                : 'wrong'
              : wordId
                ? 'placed'
                : '';

            return (
              <button
                key={`${sessionNonce}-${cls.id}`}
                type="button"
                className={`german-bingo-tile ${tileState}`}
                onClick={() => handleTileClick(cls.id)}
                disabled={gameOver || !!wordId}
              >
                <div
                  className={`german-bingo-tile-bg ${cls.icon && !cls.imageUrl ? 'german-bingo-tile-bg--emoji' : ''}`}
                  style={
                    cls.imageUrl
                      ? { backgroundImage: `url(${getAssetUrl(cls.imageUrl)})` }
                      : undefined
                  }
                >
                  {cls.icon && !cls.imageUrl && (
                    <span className="german-bingo-tile-emoji" aria-hidden="true">
                      {cls.icon}
                    </span>
                  )}
                </div>
                <span className="german-bingo-tile-label">{cls.label}</span>
                {placedWord && (
                  <div
                    className={`german-bingo-tile-overlay ${
                      showVerdict ? (result.isCorrect ? 'correct' : 'wrong') : 'placed'
                    }`}
                  >
                    <span>{placedWord.word}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <footer className="german-bingo-footer">
          <p className="german-bingo-progress-label">
            {filledCount} / {gridClasses.length}
          </p>
          <div className="german-bingo-progress-bar">
            <div
              className="german-bingo-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </footer>
      </div>

      {toast && (
        <div className={`german-bingo-toast ${toast.type}`}>{toast.message}</div>
      )}

      {gameOver && (
        <div className="german-bingo-modal">
          <h2>{endTitle}</h2>
          <p className="score">
            {score} / {gridClasses.length}
          </p>
          <ul className="german-bingo-results">
            {gameResults.map((r, i) => (
              <li
                key={`${r.wordId}-${r.classId}-${i}`}
                className={r.isCorrect ? 'result-correct' : 'result-wrong'}
              >
                <span>
                  {r.word} → {r.tile}
                </span>
                <span className="result-badge">
                  {r.isCorrect ? 'Correct' : 'Faux'}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="german-bingo-replay"
            onClick={loadSession}
          >
            REPLAY MAINTENANT
          </button>
        </div>
      )}
    </div>
  );
};

export default GermanBingoRunner;
