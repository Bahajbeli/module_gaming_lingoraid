import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRightLeft, ArrowDown, ArrowRight, Clock } from 'lucide-react';
import api from '../utils/axios';
import { useSound } from '../hooks/useSound';
import './CrosswordRunner.css';

const Cell = ({
  value,
  onChange,
  disabled,
  number,
  isActive,
  isFocused,
  status,
  onKeyDown,
  onFocus,
  inputRef,
}) => {
  if (disabled) {
    return <div className="cw-cell-block" aria-hidden="true" />;
  }

  const wrapClass = [
    'cw-cell-wrap',
    isActive && 'cw-cell-wrap--active',
    isFocused && 'cw-cell-wrap--focused',
    status === 'correct' && 'cw-cell-wrap--correct',
    status === 'wrong' && 'cw-cell-wrap--wrong',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapClass}>
      {number ? <span className="cw-cell-num">{number}</span> : null}
      <input
        ref={inputRef}
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={1}
        value={value || ''}
        onChange={(e) => onChange(e.target.value.toUpperCase().slice(0, 1))}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        className="cw-cell-input"
        aria-label={number ? `Case ${number}` : 'Case'}
      />
    </div>
  );
};

const CrosswordRunner = ({ onComplete, itemId, timerSeconds }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { playCorrect, playWrong } = useSound();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cw, setCw] = useState(null);
  const [grid, setGrid] = useState([]);
  const [currentDirection, setCurrentDirection] = useState('across');
  const [focused, setFocused] = useState({ r: 0, c: 0 });
  const [activeEntryId, setActiveEntryId] = useState(null);
  const [validated, setValidated] = useState(false);
  const cellRefs = useRef({});

  const [timeLeft, setTimeLeft] = useState(timerSeconds || 0);
  const [timerActive, setTimerActive] = useState(!!timerSeconds);
  const [timeTaken, setTimeTaken] = useState(0);

  useEffect(() => {
    if (timerSeconds) {
      setTimeLeft(timerSeconds);
      setTimerActive(true);
      setTimeTaken(0);
    }
  }, [timerSeconds]);

  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    const timerId = setInterval(() => {
      setTimeLeft((t) => t - 1);
      setTimeTaken((t) => t + 1);
    }, 1000);
    return () => clearInterval(timerId);
  }, [timerActive, timeLeft]);

  const cefrLevel = useMemo(() => {
    if (!cw?.title) return null;
    const m = cw.title.match(/^(A1|A2|B1|B2)\b/i);
    return m ? m[1].toUpperCase() : null;
  }, [cw?.title]);

  useEffect(() => {
    const load = async () => {
      try {
        let data;
        if (itemId) {
          const cwRes = await api.get(`/api/crosswords/${itemId}`);
          data = cwRes.data;
        } else {
          const listRes = await api.get('/api/crosswords');
          const list = listRes.data || [];
          if (list.length === 0) {
            if (user?.role === 'ADMIN') {
              try {
                const adminRes = await api.get('/api/crosswords/admin');
                const all = adminRes.data || [];
                if (all.length > 0) {
                  const cwRes = await api.get(`/api/crosswords/${all[0].id}`);
                  data = cwRes.data;
                }
              } catch {
                /* fall through */
              }
            }
            if (!data) {
              setError("Aucun mots croisés publié n'est disponible");
              setLoading(false);
              return;
            }
          } else {
            const cwRes = await api.get(`/api/crosswords/${list[0].id}`);
            data = cwRes.data;
          }
        }

        const base = Array.from({ length: data.height }, () =>
          Array.from({ length: data.width }, () => null)
        );
        setCw(data);
        setGrid(base);
        setValidated(false);

        const first = data.entries?.[0];
        if (first) {
          setFocused({ r: first.row, c: first.col });
          setActiveEntryId(first.id);
          setCurrentDirection(first.direction);
        }
        setLoading(false);
      } catch (e) {
        setError(e?.response?.data?.error || 'Erreur de chargement du mots croisés');
        setLoading(false);
      }
    };
    load();
  }, [user, itemId]);

  const targets = useMemo(() => {
    if (!cw) return {};
    const map = {};
    for (const e of cw.entries) {
      const len = e.answer.length;
      for (let i = 0; i < len; i++) {
        const r = e.row + (e.direction === 'down' ? i : 0);
        const c = e.col + (e.direction === 'across' ? i : 0);
        map[`${r},${c}`] = e.answer[i];
      }
    }
    return map;
  }, [cw]);

  const startNumbers = useMemo(() => {
    if (!cw) return {};
    const starts = {};
    const positionMap = new Map();
    const sortedEntries = [...cw.entries].sort((a, b) => a.number - b.number);

    for (const e of sortedEntries) {
      const key = `${e.row},${e.col}`;
      if (!positionMap.has(key)) {
        positionMap.set(key, e.number);
        starts[key] = e.number;
      } else {
        const existingNumber = positionMap.get(key);
        if (e.number < existingNumber) {
          positionMap.set(key, e.number);
          starts[key] = e.number;
        }
      }
    }
    return starts;
  }, [cw]);

  const activeCells = useMemo(() => {
    if (!cw || !activeEntryId) return new Set();
    const entry = cw.entries.find((e) => e.id === activeEntryId);
    if (!entry) return new Set();
    const cells = new Set();
    for (let i = 0; i < entry.answer.length; i++) {
      const r = entry.row + (entry.direction === 'down' ? i : 0);
      const c = entry.col + (entry.direction === 'across' ? i : 0);
      cells.add(`${r},${c}`);
    }
    return cells;
  }, [cw, activeEntryId]);

  const filledCount = useMemo(() => {
    let n = 0;
    for (const key in targets) {
      const [r, c] = key.split(',').map(Number);
      if (grid[r]?.[c]) n++;
    }
    return n;
  }, [grid, targets]);

  const totalCells = useMemo(() => Object.keys(targets).length, [targets]);
  const fillPercent = totalCells ? Math.round((filledCount / totalCells) * 100) : 0;

  const setCell = (r, c, val) => {
    setValidated(false);
    setGrid((g) => {
      const copy = g.map((row) => row.slice());
      copy[r][c] = val ? val.toUpperCase() : null;
      return copy;
    });
  };

  const focusCell = useCallback((r, c, entry) => {
    setFocused({ r, c });
    if (entry) {
      setActiveEntryId(entry.id);
      setCurrentDirection(entry.direction);
    } else if (cw) {
      const at = cw.entries.find((e) => {
        const len = e.answer.length;
        for (let i = 0; i < len; i++) {
          const er = e.row + (e.direction === 'down' ? i : 0);
          const ec = e.col + (e.direction === 'across' ? i : 0);
          if (er === r && ec === c) return true;
        }
        return false;
      });
      if (at) {
        setActiveEntryId(at.id);
        setCurrentDirection(at.direction);
      }
    }
    const ref = cellRefs.current[`${r},${c}`];
    ref?.current?.focus();
  }, [cw]);

  const findNextCell = (r, c, direction) => {
    if (direction === 'across') {
      for (let nextC = c + 1; nextC < cw.width; nextC++) {
        if (`${r},${nextC}` in targets) return { r, c: nextC };
      }
    } else {
      for (let nextR = r + 1; nextR < cw.height; nextR++) {
        if (`${nextR},${c}` in targets) return { r: nextR, c };
      }
    }
    return null;
  };

  const findPrevCell = (r, c, direction) => {
    if (direction === 'across') {
      for (let prevC = c - 1; prevC >= 0; prevC--) {
        if (`${r},${prevC}` in targets) return { r, c: prevC };
      }
    } else {
      for (let prevR = r - 1; prevR >= 0; prevR--) {
        if (`${prevR},${c}` in targets) return { r: prevR, c };
      }
    }
    return null;
  };

  const handleCellKeyDown = (e, r, c) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      setCurrentDirection((d) => (d === 'across' ? 'down' : 'across'));
      return;
    }

    if (e.key === 'Backspace' && !e.target.value) {
      e.preventDefault();
      const prev = findPrevCell(r, c, currentDirection);
      if (prev) focusCell(prev.r, prev.c);
      return;
    }

    if (e.key.length === 1 && /[a-zA-ZäöüßÄÖÜ]/.test(e.key)) {
      setTimeout(() => {
        const next = findNextCell(r, c, currentDirection);
        if (next) focusCell(next.r, next.c);
      }, 50);
    }
  };

  const selectClue = (entry) => {
    focusCell(entry.row, entry.col, entry);
  };

  const allFilled = useMemo(() => {
    for (const key in targets) {
      const [r, c] = key.split(',').map(Number);
      if (!grid[r]?.[c]) return false;
    }
    return true;
  }, [grid, targets]);

  const isCorrect = useMemo(() => {
    for (const key in targets) {
      const [r, c] = key.split(',').map(Number);
      const val = (grid[r]?.[c] || '').toUpperCase();
      if (val !== targets[key]) return false;
    }
    return true;
  }, [grid, targets]);

  const handleSubmit = useCallback(() => {
    setValidated(true);
    setTimerActive(false);

    if (timerSeconds) {
      let totalScore = 0;
      let errors = 0;
      for (const key in targets) {
        const [r, c] = key.split(',').map(Number);
        const val = (grid[r]?.[c] || '').toUpperCase();
        if (!val) {
          totalScore -= 1;
          errors++;
        } else if (val === targets[key]) {
          totalScore += 5;
        } else {
          totalScore -= 2;
          errors++;
        }
      }
      if (errors === 0) playCorrect();
      else playWrong();
      onComplete?.(totalScore, timeTaken);
    } else {
      if (!allFilled) return;
      if (isCorrect) {
        playCorrect();
        onComplete?.(100, timeTaken);
      } else {
        playWrong();
        let ok = 0;
        let total = 0;
        for (const key in targets) {
          total++;
          const [r, c] = key.split(',').map(Number);
          const val = (grid[r]?.[c] || '').toUpperCase();
          if (val === targets[key]) ok++;
        }
        onComplete?.(Math.round((ok / total) * 100), timeTaken);
      }
    }
  }, [grid, targets, timerSeconds, allFilled, isCorrect, timeTaken, onComplete]);

  useEffect(() => {
    if (timerActive && timeLeft <= 0 && !validated) {
      handleSubmit();
    }
  }, [timeLeft, timerActive, validated, handleSubmit]);

  if (loading) {
    return (
      <div className="cw-root cw-loading">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3" />
        <p className="text-slate-600">Chargement du mots croisés…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cw-root cw-error">
        <div className="cw-error-box">{error}</div>
        {user?.role === 'ADMIN' && (
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Backoffice admin
          </button>
        )}
      </div>
    );
  }

  if (!cw) return null;

  const across = cw.entries.filter((e) => e.direction === 'across').sort((a, b) => a.number - b.number);
  const down = cw.entries.filter((e) => e.direction === 'down').sort((a, b) => a.number - b.number);

  return (
    <div className="cw-root">
      <div className="cw-shell">
        <div className="cw-panel cw-panel-grid">
          <div className="cw-header">
            <h2 className="cw-title">{cw.title}</h2>
            {cefrLevel && <span className="cw-badge">{cefrLevel}</span>}
            {timerSeconds > 0 && (
              <div className="ml-auto flex items-center font-bold text-orange-600 bg-orange-100 px-4 py-2 rounded-xl">
                <Clock className="w-5 h-5 mr-2" />
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>

          <div className="cw-progress-wrap">
            <div className="cw-progress-label">
              <span>Progression</span>
              <span>
                {filledCount} / {totalCells} cases ({fillPercent}%)
              </span>
            </div>
            <div className="cw-progress-bar">
              <div className="cw-progress-fill" style={{ width: `${fillPercent}%` }} />
            </div>
          </div>

          <div className="cw-grid-wrap">
            <div className="cw-grid" role="grid" aria-label="Grille de mots croisés">
              {Array.from({ length: cw.height }).map((_, r) => (
                <div key={r} className="cw-row">
                  {Array.from({ length: cw.width }).map((__, c) => {
                    const key = `${r},${c}`;
                    const isTarget = key in targets;
                    const number = startNumbers[key];
                    const val = grid[r][c];
                    const isFocused = focused.r === r && focused.c === c;
                    const isActive = activeCells.has(key);

                    let status = 'empty';
                    if (validated && isTarget && val) {
                      status = val.toUpperCase() === targets[key] ? 'correct' : 'wrong';
                    }

                    if (isTarget && !cellRefs.current[key]) {
                      cellRefs.current[key] = React.createRef();
                    }

                    return (
                      <Cell
                        key={c}
                        value={grid[r][c]}
                        onChange={(v) => isTarget && setCell(r, c, v)}
                        disabled={!isTarget}
                        number={number}
                        isActive={isActive}
                        isFocused={isFocused}
                        status={status}
                        onKeyDown={(e) => handleCellKeyDown(e, r, c)}
                        onFocus={() => {
                          setFocused({ r, c });
                          const entry = cw.entries.find((e) => e.id === activeEntryId);
                          const covers = entry && (() => {
                            for (let i = 0; i < entry.answer.length; i++) {
                              const er = entry.row + (entry.direction === 'down' ? i : 0);
                              const ec = entry.col + (entry.direction === 'across' ? i : 0);
                              if (er === r && ec === c) return true;
                            }
                            return false;
                          })();
                          if (!covers) {
                            const at = cw.entries.find((e) => {
                              for (let i = 0; i < e.answer.length; i++) {
                                const er = e.row + (e.direction === 'down' ? i : 0);
                                const ec = e.col + (e.direction === 'across' ? i : 0);
                                if (er === r && ec === c) return true;
                              }
                              return false;
                            });
                            if (at) {
                              setActiveEntryId(at.id);
                              setCurrentDirection(at.direction);
                            }
                          }
                        }}
                        inputRef={isTarget ? cellRefs.current[key] : null}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="cw-toolbar">
            <div className="cw-dir-toggle" role="group" aria-label="Direction">
              <button
                type="button"
                className={`cw-dir-btn ${currentDirection === 'across' ? 'cw-dir-btn--on' : ''}`}
                onClick={() => setCurrentDirection('across')}
              >
                <ArrowRight className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                Horizontal
              </button>
              <button
                type="button"
                className={`cw-dir-btn ${currentDirection === 'down' ? 'cw-dir-btn--on' : ''}`}
                onClick={() => setCurrentDirection('down')}
              >
                <ArrowDown className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                Vertical
              </button>
            </div>
            <p className="cw-hint-text">
              <ArrowRightLeft className="inline w-3 h-3 mr-0.5 -mt-0.5" />
              Tab pour changer · Clic sur un indice pour aller à la case
            </p>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={(!timerSeconds && !allFilled) || validated}
              className="cw-btn-validate"
            >
              <Check className="w-4 h-4" />
              Valider
            </button>
          </div>

          {validated && !allFilled && !timerSeconds && (
            <p className="text-amber-700 text-sm mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Remplissez toutes les cases avant de valider.
            </p>
          )}
          {validated && allFilled && !isCorrect && !timerSeconds && (
            <p className="text-amber-800 text-sm mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Certaines lettres sont incorrectes (en rouge). Corrigez puis validez à nouveau.
            </p>
          )}
        </div>

        <aside className="cw-panel cw-panel-clues">
          <div className="cw-clues-head">
            <h3>Indices</h3>
            <p>Cliquez sur un indice pour surligner le mot dans la grille</p>
          </div>
          <div className="cw-clues-body">
            <div className="cw-clues-cols">
              <section className="cw-clues-section">
                <h4>Horizontaux</h4>
                {across.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className={`cw-clue-item ${activeEntryId === e.id ? 'cw-clue-item--active' : ''}`}
                    onClick={() => selectClue(e)}
                  >
                    <span className="cw-clue-num">{e.number}</span>
                    <span className="cw-clue-text">{e.clue}</span>
                  </button>
                ))}
              </section>
              <section className="cw-clues-section">
                <h4>Verticaux</h4>
                {down.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className={`cw-clue-item ${activeEntryId === e.id ? 'cw-clue-item--active' : ''}`}
                    onClick={() => selectClue(e)}
                  >
                    <span className="cw-clue-num">{e.number}</span>
                    <span className="cw-clue-text">{e.clue}</span>
                  </button>
                ))}
              </section>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CrosswordRunner;
