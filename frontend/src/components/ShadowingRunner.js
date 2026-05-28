import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mic,
  Play,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../utils/axios';

const PHASE = {
  INPUT: 'input',
  PRACTICE: 'practice',
  QUIZ: 'quiz',
  RESULT: 'result',
};

/** Téléchargement YouTube + Whisper peut prendre plusieurs minutes */
const PREPARE_TIMEOUT_MS = 1800000;
const QUIZ_TIMEOUT_MS = 120000;

function shadowingErrorMessage(e, fallback) {
  if (e.code === 'ECONNABORTED' || /timeout/i.test(e.message || '')) {
    return 'La préparation prend trop de temps. Essayez une vidéo plus courte (moins de 30 min) ou réessayez dans un instant.';
  }
  return e.response?.data?.error || e.message || fallback;
}

function formatTime(sec) {
  const s = Math.floor(sec || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/** Index de la phrase active selon le temps de lecture (secondes). */
function findSegmentIndex(segments, timeSec) {
  if (!segments.length) return 0;
  const t = Number(timeSec) || 0;
  let idx = 0;
  for (let i = 0; i < segments.length; i++) {
    if (t + 0.15 >= segments[i].start) idx = i;
    else break;
  }
  return idx;
}

const SYNC_POLL_MS = 350;
const MANUAL_SYNC_LOCK_MS = 4500;

const ShadowingRunner = () => {
  const navigate = useNavigate();
  const iframeRef = useRef(null);
  const indexRef = useRef(0);
  const manualLockUntilRef = useRef(0);
  const segmentListRef = useRef(null);
  const [phase, setPhase] = useState(PHASE.INPUT);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [video, setVideo] = useState(null);
  const [index, setIndex] = useState(0);
  const [quizLoading, setQuizLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [autoSync, setAutoSync] = useState(true);

  const segments = useMemo(() => video?.segments || [], [video?.segments]);
  const current = segments[index];

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const saveProgress = useCallback(
    async (idx) => {
      if (!video?.youtubeId) return;
      try {
        await api.patch('/api/shadowing/progress', {
          youtubeId: video.youtubeId,
          currentIndex: idx,
        });
      } catch {
        /* ignore */
      }
    },
    [video?.youtubeId]
  );

  useEffect(() => {
    if (phase === PHASE.PRACTICE && video?.youtubeId) {
      saveProgress(index);
    }
  }, [index, phase, video?.youtubeId, saveProgress]);

  const postYoutubeCommand = useCallback((func, args = []) => {
    const el = iframeRef.current;
    if (!el?.contentWindow || !video?.youtubeId) return;
    el.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      '*'
    );
  }, [video?.youtubeId]);

  const lockManualSync = useCallback(() => {
    manualLockUntilRef.current = Date.now() + MANUAL_SYNC_LOCK_MS;
  }, []);

  const seekYoutube = useCallback(
    (seconds, { manual = false } = {}) => {
      if (manual) lockManualSync();
      postYoutubeCommand('seekTo', [seconds, true]);
    },
    [lockManualSync, postYoutubeCommand]
  );

  const playFromSegment = useCallback(
    (seg) => {
      if (!seg) return;
      lockManualSync();
      seekYoutube(seg.start);
      postYoutubeCommand('playVideo');
    },
    [lockManualSync, postYoutubeCommand, seekYoutube]
  );

  // Suivi du temps YouTube → phrase active
  useEffect(() => {
    if (phase !== PHASE.PRACTICE || !video?.youtubeId || !autoSync || !segments.length) {
      return undefined;
    }

    const subscribe = () => {
      const el = iframeRef.current;
      if (!el?.contentWindow) return;
      el.contentWindow.postMessage(
        JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }),
        '*'
      );
    };

    const onMessage = (event) => {
      if (event.origin !== 'https://www.youtube.com') return;
      let data;
      try {
        data =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (data?.event !== 'infoDelivery') return;
      const currentTime = data.info?.currentTime;
      if (currentTime == null || Date.now() < manualLockUntilRef.current) return;

      const nextIdx = findSegmentIndex(segments, currentTime);
      if (nextIdx !== indexRef.current) {
        setIndex(nextIdx);
      }
    };

    window.addEventListener('message', onMessage);

    const poll = setInterval(() => {
      postYoutubeCommand('getCurrentTime');
    }, SYNC_POLL_MS);

    const iframe = iframeRef.current;
    iframe?.addEventListener('load', subscribe);
    subscribe();

    return () => {
      window.removeEventListener('message', onMessage);
      clearInterval(poll);
      iframe?.removeEventListener('load', subscribe);
    };
  }, [
    phase,
    video?.youtubeId,
    autoSync,
    segments,
    postYoutubeCommand,
  ]);

  // Faire défiler la liste vers la phrase active
  useEffect(() => {
    if (phase !== PHASE.PRACTICE) return;
    const list = segmentListRef.current;
    const active = list?.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [index, phase]);

  const prepare = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post(
        '/api/shadowing/prepare',
        { url },
        { timeout: PREPARE_TIMEOUT_MS }
      );
      setVideo(res.data.video);
      setIndex(res.data.session?.currentIndex || 0);
      setPhase(PHASE.PRACTICE);
    } catch (e) {
      setError(shadowingErrorMessage(e, 'Error de préparation'));
    } finally {
      setLoading(false);
    }
  };

  const loadQuiz = async () => {
    setQuizLoading(true);
    setError('');
    try {
      const res = await api.post(
        '/api/shadowing/quiz',
        { youtubeId: video.youtubeId },
        { timeout: QUIZ_TIMEOUT_MS }
      );
      setQuestions(res.data.questions || []);
      setAnswers({});
      setPhase(PHASE.QUIZ);
    } catch (e) {
      setError(shadowingErrorMessage(e, 'Unable to générer le quiz'));
    } finally {
      setQuizLoading(false);
    }
  };

  const submitQuiz = async () => {
    setLoading(true);
    try {
      const res = await api.post('/api/shadowing/quiz/submit', {
        youtubeId: video.youtubeId,
        answers: questions.map((_, i) => answers[i] ?? -1),
      });
      setQuizResult(res.data);
      setPhase(PHASE.RESULT);
    } catch (e) {
      setError(e.response?.data?.error || 'Error envoi quiz');
    } finally {
      setLoading(false);
    }
  };

  const goSegment = (delta) => {
    const next = Math.min(Math.max(0, index + delta), segments.length - 1);
    setIndex(next);
    if (segments[next]) seekYoutube(segments[next].start, { manual: true });
  };

  const embedOrigin =
    typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white"
    >
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border-b border-white/10 bg-black/30 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4"
        >
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/gaming')}
            className="flex items-center gap-2 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </motion.button>
          <motion.div className="flex items-center gap-2">
            <Mic className="w-6 h-6 text-violet-400" />
            <h1 className="text-xl font-bold">Shadowing</h1>
          </motion.div>
        </motion.div>
      </motion.header>

      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="max-w-6xl mx-auto px-4 py-8"
      >
        {phase === PHASE.INPUT && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto bg-white/10 rounded-2xl p-8 border border-white/20"
          >
            <h2 className="text-2xl font-bold mb-2">Vidéo YouTube en allemand</h2>
            <p className="text-slate-300 mb-6 text-sm">
              Collez un lien (max. ~30 min). Whisper transcrit les paroles ; vous
              pratiquez le shadowing phrase par phrase, puis un quiz IA. La
              première préparation peut prendre 1 à 3 minutes.
            </p>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white mb-4"
            />
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <button
              type="button"
              onClick={prepare}
              disabled={loading || !url.trim()}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Téléchargement et transcription… (1–3 min)
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Préparer le shadowing
                </>
              )}
            </button>
          </motion.div>
        )}

        {(phase === PHASE.PRACTICE || phase === PHASE.QUIZ || phase === PHASE.RESULT) &&
          video && (
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h2 className="text-lg font-semibold mb-3 line-clamp-2">
                  {video.title}
                </h2>
                <div className="aspect-video rounded-xl overflow-hidden bg-black shadow-2xl">
                  <iframe
                    ref={iframeRef}
                    title="YouTube"
                    src={`${video.embedUrl}?enablejsapi=1&rel=0&origin=${embedOrigin}`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                {phase === PHASE.PRACTICE && (
                  <button
                    type="button"
                    onClick={loadQuiz}
                    disabled={quizLoading}
                    className="mt-4 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold flex items-center justify-center gap-2"
                  >
                    {quizLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                    J&apos;ai fini — Quiz sur la vidéo
                  </button>
                )}
              </div>

              <div className="bg-white/10 rounded-2xl border border-white/20 p-6 flex flex-col min-h-[400px]">
                {phase === PHASE.PRACTICE && (
                  <>
                    <motion.div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
                      <span className="text-sm text-slate-400">
                        Phrase {index + 1} / {segments.length}
                      </span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoSync}
                            onChange={(e) => setAutoSync(e.target.checked)}
                            className="rounded border-slate-500"
                          />
                          Sync auto
                        </label>
                        <span className="text-sm text-violet-300">
                          {current && formatTime(current.start)} –{' '}
                          {current && formatTime(current.end)}
                        </span>
                      </div>
                    </motion.div>

                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex-1 flex flex-col justify-center"
                    >
                      <p className="text-2xl md:text-3xl font-bold leading-relaxed text-center mb-6">
                        {current?.text}
                      </p>
                      <p className="text-center text-slate-400 text-sm mb-6">
                        Lancez la vidéo : les phrases avancent automatiquement.
                        Répétez chaque ligne en shadowing.
                      </p>
                      <div className="flex justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => goSegment(-1)}
                          disabled={index === 0}
                          className="p-3 rounded-full bg-slate-700 disabled:opacity-40"
                        >
                          <ChevronLeft />
                        </button>
                        <button
                          type="button"
                          onClick={() => playFromSegment(current)}
                          className="px-6 py-3 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Écouter
                        </button>
                        <button
                          type="button"
                          onClick={() => goSegment(1)}
                          disabled={index >= segments.length - 1}
                          className="p-3 rounded-full bg-slate-700 disabled:opacity-40"
                        >
                          <ChevronRight />
                        </button>
                      </div>
                    </motion.div>

                    <motion.div
                      ref={segmentListRef}
                      className="mt-6 max-h-40 overflow-y-auto space-y-2"
                    >
                      {segments.map((seg, i) => (
                        <button
                          key={i}
                          type="button"
                          data-active={i === index ? 'true' : 'false'}
                          onClick={() => {
                            setIndex(i);
                            seekYoutube(seg.start, { manual: true });
                            postYoutubeCommand('playVideo');
                          }}
                          className={`w-full text-left text-sm px-3 py-2 rounded-lg ${
                            i === index
                              ? 'bg-violet-600/50 border border-violet-400'
                              : 'bg-slate-800/50 hover:bg-slate-700/50'
                          }`}
                        >
                          <span className="text-slate-500 mr-2">
                            {formatTime(seg.start)}
                          </span>
                          {seg.text}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}

                {phase === PHASE.QUIZ && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6 overflow-y-auto"
                  >
                    <h3 className="text-xl font-bold">Quiz — Deutsch / English</h3>
                    <p className="text-slate-400 text-sm -mt-4 mb-2">
                      Questions en allemand avec traduction anglaise
                    </p>
                    {questions.map((q, qi) => (
                      <div key={qi} className="bg-slate-800/60 rounded-xl p-4">
                        <p className="font-medium mb-1">
                          {qi + 1}. {q.question}
                        </p>
                        {q.questionEn && (
                          <p className="text-sm text-slate-400 mb-3 italic">
                            {q.questionEn}
                          </p>
                        )}
                        <motion.div layout className="space-y-2">
                          {q.options.map((opt, oi) => (
                            <label
                              key={oi}
                              className={`block px-3 py-2 rounded-lg cursor-pointer border ${
                                answers[qi] === oi
                                  ? 'border-violet-400 bg-violet-600/30'
                                  : 'border-slate-600 hover:bg-slate-700/50'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q-${qi}`}
                                className="sr-only"
                                checked={answers[qi] === oi}
                                onChange={() =>
                                  setAnswers((a) => ({ ...a, [qi]: oi }))
                                }
                              />
                              <span className="block">{opt}</span>
                              {q.optionsEn?.[oi] && (
                                <span className="block text-xs text-slate-400 mt-0.5 italic">
                                  {q.optionsEn[oi]}
                                </span>
                              )}
                            </label>
                          ))}
                        </motion.div>
                      </div>
                    ))}
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <button
                      type="button"
                      onClick={submitQuiz}
                      disabled={
                        loading ||
                        questions.some((_, i) => answers[i] === undefined)
                      }
                      className="w-full py-3 rounded-xl bg-violet-600 font-semibold disabled:opacity-50"
                    >
                      Valider le quiz
                    </button>
                  </motion.div>
                )}

                {phase === PHASE.RESULT && quizResult && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center py-8"
                  >
                    <p className="text-5xl font-bold text-emerald-400 mb-2">
                      {quizResult.score}%
                    </p>
                    <p className="text-slate-300 mb-6">
                      {quizResult.correct} / {quizResult.total} bonnes réponses
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setPhase(PHASE.INPUT);
                        setVideo(null);
                        setUrl('');
                        setQuizResult(null);
                      }}
                      className="px-6 py-3 rounded-xl bg-violet-600"
                    >
                      Nouvelle vidéo
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          )}

        {error && phase !== PHASE.INPUT && (
          <p className="text-red-400 text-center mt-4">{error}</p>
        )}
      </motion.main>
    </motion.div>
  );
};

export default ShadowingRunner;
