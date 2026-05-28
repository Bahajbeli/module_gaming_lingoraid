import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Trophy, BookOpen, ChevronRight } from 'lucide-react';
import api from '../utils/axios';
import { useSound } from '../hooks/useSound';

const LEVEL_OPTIONS = [
  { id: 'all', label: 'All levels (A1 + A2 + B1)', levels: 'a1,a2,b1' },
  { id: 'a1', label: 'A1 only', levels: 'a1' },
  { id: 'a2', label: 'A2 only', levels: 'a2' },
  { id: 'b1', label: 'B1 only', levels: 'b1' },
];

const QUESTION_COUNT = 10;

const VocabQuizRunner = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('setup');
  const [meta, setMeta] = useState(null);
  const [levelChoice, setLevelChoice] = useState('all');
  const [questions, setQuestions] = useState([]);
  const [poolSize, setPoolSize] = useState(0);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { playCorrect, playWrong, playFanfare } = useSound();

  useEffect(() => {
    api
      .get('/api/vocab-quiz/meta')
      .then((res) => setMeta(res.data))
      .catch(() => setMeta(null));
  }, []);

  const startQuiz = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const opt = LEVEL_OPTIONS.find((o) => o.id === levelChoice) || LEVEL_OPTIONS[0];
      const res = await api.get('/api/vocab-quiz/session', {
        params: { count: QUESTION_COUNT, levels: opt.levels },
      });
      if (!res.data.success || !res.data.questions?.length) {
        throw new Error('No questions returned');
      }
      setQuestions(res.data.questions);
      setPoolSize(res.data.poolSize || 0);
      setIndex(0);
      setSelected(null);
      setScore(0);
      setPhase('playing');
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to start quiz');
    } finally {
      setLoading(false);
    }
  }, [levelChoice]);

  const current = questions[index];

  const onSelect = (optionIndex) => {
    if (selected !== null || !current) return;
    setSelected(optionIndex);
    if (optionIndex === current.correctIndex) {
      setScore((s) => s + 1);
      playCorrect();
    } else {
      playWrong();
    }
  };

  const next = () => {
    if (selected === null) return;
    if (index + 1 >= questions.length) {
      setPhase('finished');
      playFanfare();
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50">
      <div className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/gaming')}
            className="flex items-center text-violet-700 hover:text-violet-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <h1 className="text-lg font-bold text-violet-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Vocabulary Quiz
          </h1>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6">
        {phase === 'setup' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">German → English</h2>
            <p className="text-gray-600 mb-6">
              Each question shows a German sentence. Pick the correct English translation.
              Wrong answers are taken from other vocabulary lines across all TSV files.
            </p>

            {meta?.total > 0 && (
              <div className="mb-6 p-4 bg-violet-50 rounded-xl border border-violet-100 text-sm text-violet-900">
                <p className="font-semibold mb-2">
                  {meta.total.toLocaleString()} words loaded from {meta.filesScanned} files
                </p>
                <ul className="space-y-1">
                  <li>A1: {meta.counts?.a1?.toLocaleString() ?? 0}</li>
                  <li>A2: {meta.counts?.a2?.toLocaleString() ?? 0}</li>
                  <li>B1: {meta.counts?.b1?.toLocaleString() ?? 0}</li>
                </ul>
              </div>
            )}

            <label className="block text-sm font-semibold text-gray-700 mb-2">Level</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {LEVEL_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLevelChoice(opt.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-colors ${
                    levelChoice === opt.id
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-gray-200 hover:border-violet-300'
                  }`}
                >
                  <span className="font-semibold text-gray-900">{opt.label}</span>
                </button>
              ))}
            </div>

            {error && (
              <p className="mb-4 text-red-600 text-sm">{error}</p>
            )}

            <button
              type="button"
              onClick={startQuiz}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold hover:opacity-95 disabled:opacity-50"
            >
              {loading ? 'Loading questions…' : `Start quiz (${QUESTION_COUNT} questions)`}
            </button>
          </div>
        )}

        {phase === 'playing' && current && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex justify-between text-sm text-gray-600 mb-4">
              <span>
                Question {index + 1} / {questions.length}
                {current.level && (
                  <span className="ml-2 uppercase text-violet-600 font-bold">{current.level}</span>
                )}
              </span>
              <span className="font-semibold">Score: {score}</span>
            </div>

            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Word</p>
            <p className="text-lg font-bold text-violet-800 mb-4">{current.headword}</p>

            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">German</p>
            <p className="text-xl text-gray-900 mb-2 leading-relaxed">{current.german}</p>
            <p className="text-sm text-gray-500 mb-8">Choose the correct English translation:</p>

            <div className="space-y-3 mb-6">
              {current.options.map((opt, i) => {
                const isSelected = selected === i;
                const isCorrect = current.correctIndex === i;
                let cls =
                  'w-full text-left p-4 rounded-xl border-2 transition-colors ';
                if (selected === null) {
                  cls += 'border-gray-200 hover:border-violet-400 hover:bg-violet-50';
                } else if (isCorrect) {
                  cls += 'border-green-500 bg-green-50 text-green-900';
                } else if (isSelected) {
                  cls += 'border-red-400 bg-red-50 text-red-900';
                } else {
                  cls += 'border-gray-100 bg-gray-50 text-gray-500';
                }
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={selected !== null}
                    onClick={() => onSelect(i)}
                    className={cls}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {selected !== null && (
              <p
                className={`mb-4 font-semibold ${
                  selected === current.correctIndex ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {selected === current.correctIndex
                  ? 'Correct!'
                  : `Wrong. Answer: ${current.correctAnswer}`}
              </p>
            )}

            <button
              type="button"
              onClick={next}
              disabled={selected === null}
              className="w-full py-3 bg-violet-600 text-white rounded-xl font-semibold disabled:bg-gray-300 flex items-center justify-center gap-2"
            >
              {index + 1 >= questions.length ? 'See results' : 'Next'}
              <ChevronRight className="w-5 h-5" />
            </button>

            {poolSize > 0 && (
              <p className="text-xs text-center text-gray-400 mt-4">
                Pool: {poolSize.toLocaleString()} entries · distractors from other lines
              </p>
            )}
          </div>
        )}

        {phase === 'finished' && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Quiz complete!</h2>
            <p className="text-5xl font-extrabold text-violet-600 mb-2">
              {score} / {questions.length}
            </p>
            <p className="text-gray-600 mb-8">
              {Math.round((score / questions.length) * 100)}% correct
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={startQuiz}
                className="px-6 py-3 bg-violet-600 text-white rounded-xl font-semibold inline-flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Play again
              </button>
              <button
                type="button"
                onClick={() => navigate('/gaming')}
                className="px-6 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700"
              >
                Back to games
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VocabQuizRunner;
