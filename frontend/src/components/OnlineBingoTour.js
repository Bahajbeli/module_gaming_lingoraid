import React, { useCallback, useEffect, useRef, useState } from 'react';
import api, { getAssetUrl } from '../utils/axios';
import { useSound } from '../hooks/useSound';
import './GermanBingo.css';

const OnlineBingoTour = ({ payload, onComplete }) => {
  const duration = payload?.durationSeconds || 90;
  const [gridClasses] = useState(() => payload?.gridClasses || []);
  const [words] = useState(() => payload?.words || []);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [assignment, setAssignment] = useState({});
  const [gameResults, setGameResults] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(duration);
  const [gameOver, setGameOver] = useState(false);
  const [endReason, setEndReason] = useState(null);
  const [waitingOpponent, setWaitingOpponent] = useState(false);
  const timerRef = useRef(null);
  const { playClick, playCorrect, playWrong } = useSound();

  const endGame = useCallback((reason) => {
    if (gameOver) return;
    setGameOver(true);
    setEndReason(reason);
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Play end sound based on current filled/score
    // Since state might be stale, we rely on the effect below or we can just trigger it here.
    // Wait, endGame is a dependency. It's better to use an effect when gameOver changes.
  }, [gameOver]);

  useEffect(() => {
    if (gameOver) {
      const isPerfect = score >= gridClasses.length;
      if (isPerfect && gridClasses.length > 0) playCorrect();
      else if (score < gridClasses.length) playWrong();
    }
  }, [gameOver, score, gridClasses.length, playCorrect, playWrong]);

  useEffect(() => {
    if (gameOver || !gridClasses.length) return undefined;

    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [gameOver, gridClasses.length]);

  useEffect(() => {
    if (!gameOver && secondsLeft === 0 && gridClasses.length > 0) {
      endGame('timer');
    }
  }, [secondsLeft, gameOver, gridClasses.length, endGame]);

  const currentWord = words[currentWordIndex];
  const filledCount = Object.keys(assignment).length;

  const resultByClassId = gameResults.reduce((acc, r) => {
    acc[r.classId] = r;
    return acc;
  }, {});

  const score = gameResults.filter((r) => r.isCorrect).length;
  const scorePercent = gridClasses.length
    ? Math.round((score / gridClasses.length) * 100)
    : 0;

  const endTitle = {
    timer: 'Temps écoulé',
    'all-words': 'Bravo !',
    'board-full': 'Plateau complet',
  }[endReason] || 'Tour terminé';

  const handleNext = () => {
    if (gameOver) return;
    if (currentWordIndex >= words.length - 1) {
      endGame('all-words');
    } else {
      setCurrentWordIndex((i) => i + 1);
    }
  };

  const handleClassClick = async (classId) => {
    if (!currentWord || gameOver) return;
    const key = String(classId);
    if (assignment[key]) return;

    const placedElsewhere = Object.values(assignment).includes(currentWord.wordId);
    if (placedElsewhere) return;

    playClick();

    try {
      const res = await api.post('/api/german-bingo/play/check', {
        wordId: currentWord.wordId,
        selectedClassIds: [classId],
      });

      const tile = gridClasses.find((c) => c.id === classId);
      const isCorrect = res.data.perfectMatch;

      setAssignment((prev) => ({ ...prev, [key]: currentWord.wordId }));
      setGameResults((prev) => [
        ...prev,
        {
          word: currentWord.word,
          tile: tile?.label || classId,
          isCorrect,
          wordId: currentWord.wordId,
          classId: key,
        },
      ]);

      const newFilled = filledCount + 1;
      if (newFilled >= gridClasses.length) {
        endGame('board-full');
        return;
      }

      if (currentWordIndex + 1 >= words.length) {
        endGame('all-words');
      } else {
        setCurrentWordIndex((i) => i + 1);
      }
    } catch {
      /* ignore */
    }
  };

  const confirmAndSubmit = () => {
    if (waitingOpponent) return;
    setWaitingOpponent(true);
    setTimeout(() => onComplete?.(scorePercent), 0);
  };

  if (!gridClasses.length) {
    return <p className="text-center text-gray-600">Bingo indisponible.</p>;
  }

  return (
    <div className="german-bingo german-bingo--embedded">
      <div className="german-bingo-inner">
        <header className="german-bingo-header">
          <p className="german-bingo-title">Deutsch Bingo — Tour en ligne</p>
          {!gameOver && currentWord && (
            <div className="german-bingo-word-row">
              <span className="german-bingo-word-num">{currentWordIndex + 1}</span>
              <span className="german-bingo-current-word">
              {currentWord?.emoji ? `${currentWord.emoji} ` : ''}
              {currentWord?.word}
            </span>
              <button type="button" className="german-bingo-next" onClick={handleNext}>
                NEXT
              </button>
            </div>
          )}
          <div className="german-bingo-timer-row">
            <span>{filledCount} / {gridClasses.length}</span>
            <span className="german-bingo-timer">{secondsLeft}s</span>
          </div>
        </header>

        <div className="german-bingo-grid">
          {gridClasses.map((cls) => {
            const key = String(cls.id);
            const wordId = assignment[key];
            const placedWord = words.find((w) => w.wordId === wordId);
            const result = resultByClassId[key];
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
                key={cls.id}
                type="button"
                className={`german-bingo-tile ${tileState}`}
                onClick={() => handleClassClick(cls.id)}
                disabled={gameOver || !!wordId}
              >
                <div
                  className={`german-bingo-tile-bg ${cls.icon && !cls.imageUrl ? 'german-bingo-tile-bg--emoji' : ''}`}
                  style={{
                    backgroundImage: cls.imageUrl
                      ? `url(${getAssetUrl(cls.imageUrl)})`
                      : undefined,
                  }}
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
      </div>

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
          {!waitingOpponent ? (
            <button
              type="button"
              className="german-bingo-replay"
              onClick={confirmAndSubmit}
            >
              VALIDER — ATTENDRE L&apos;ADVERSAIRE
            </button>
          ) : (
            <p className="german-bingo-wait-opponent">
              Waiting de l&apos;adversaire…
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default OnlineBingoTour;
