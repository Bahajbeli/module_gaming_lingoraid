import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Screen from '../components/Screen';
import AppButton from '../components/AppButton';
import api from '../api/client';
import { colors } from '../theme/colors';

const LEVEL_OPTIONS = [
  { id: 'all', label: 'All levels (A1 + A2 + B1)', levels: 'a1,a2,b1' },
  { id: 'a1', label: 'A1 only', levels: 'a1' },
  { id: 'a2', label: 'A2 only', levels: 'a2' },
  { id: 'b1', label: 'B1 only', levels: 'b1' },
];

const QUESTION_COUNT = 10;

export default function SoloVocabQuizScreen({ navigation }) {
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
        timeout: 30000,
      });
      if (!res.data?.success || !res.data.questions?.length) {
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
    }
  };

  const next = () => {
    if (selected === null) return;
    if (index + 1 >= questions.length) {
      setPhase('finished');
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
    }
  };

  if (phase === 'setup') {
    return (
      <Screen>
        <AppButton
          title="← Back"
          variant="outline"
          onPress={() => navigation.goBack()}
          style={styles.back}
        />
        <Text style={styles.heading}>Vocabulary Quiz</Text>
        <Text style={styles.sub}>
          German sentence → pick the correct English translation. Wrong answers come
          from other vocabulary lines (all TSV files).
        </Text>

        {meta?.total > 0 ? (
          <View style={styles.metaBox}>
            <Text style={styles.metaTitle}>
              {meta.total.toLocaleString()} words · {meta.filesScanned} files
            </Text>
            <Text style={styles.metaLine}>A1: {meta.counts?.a1?.toLocaleString()}</Text>
            <Text style={styles.metaLine}>A2: {meta.counts?.a2?.toLocaleString()}</Text>
            <Text style={styles.metaLine}>B1: {meta.counts?.b1?.toLocaleString()}</Text>
          </View>
        ) : null}

        <Text style={styles.levelLabel}>Level</Text>
        {LEVEL_OPTIONS.map((opt) => (
          <Pressable
            key={opt.id}
            style={[
              styles.levelCard,
              levelChoice === opt.id && styles.levelCardActive,
            ]}
            onPress={() => setLevelChoice(opt.id)}
          >
            <Text
              style={[
                styles.levelCardText,
                levelChoice === opt.id && styles.levelCardTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AppButton
          title={loading ? 'Loading…' : `Start quiz (${QUESTION_COUNT} questions)`}
          onPress={startQuiz}
          loading={loading}
          style={{ marginTop: 16 }}
        />
      </Screen>
    );
  }

  if (phase === 'finished') {
    const pct = questions.length
      ? Math.round((score / questions.length) * 100)
      : 0;
    return (
      <Screen>
        <Text style={styles.doneTitle}>Quiz complete!</Text>
        <Text style={styles.doneScore}>
          {score} / {questions.length}
        </Text>
        <Text style={styles.donePct}>{pct}% correct</Text>
        <AppButton title="Play again" onPress={() => setPhase('setup')} />
        <AppButton
          title="Back to solo menu"
          variant="outline"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 10 }}
        />
      </Screen>
    );
  }

  if (!current) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppButton
        title="← Back"
        variant="outline"
        onPress={() => navigation.goBack()}
        style={styles.back}
      />
      <Text style={styles.progress}>
        Question {index + 1} / {questions.length}
        {current.level ? (
          <Text style={styles.levelBadge}> · {current.level.toUpperCase()}</Text>
        ) : null}
        {' · Score '}
        {score}
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Word</Text>
        <Text style={styles.headword}>{current.headword}</Text>
        <Text style={[styles.label, { marginTop: 12 }]}>German</Text>
        <Text style={styles.german}>{current.german}</Text>
        <Text style={styles.hint}>Choose the correct English translation:</Text>
      </View>

      <View style={styles.options}>
        {current.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = current.correctIndex === i;
          let bg = colors.surface;
          let border = colors.border;
          if (selected !== null) {
            if (isCorrect) {
              bg = '#dcfce7';
              border = colors.success;
            } else if (isSelected) {
              bg = '#fee2e2';
              border = colors.error;
            } else {
              bg = '#f8fafc';
              border = '#e2e8f0';
            }
          }
          return (
            <Pressable
              key={`${current.id}-${i}`}
              style={[styles.opt, { backgroundColor: bg, borderColor: border }]}
              onPress={() => onSelect(i)}
              disabled={selected !== null}
            >
              <Text style={styles.optText}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>

      {selected !== null ? (
        <Text
          style={[
            styles.feedback,
            selected === current.correctIndex ? styles.feedbackOk : styles.feedbackBad,
          ]}
        >
          {selected === current.correctIndex
            ? 'Correct!'
            : `Wrong. Answer: ${current.correctAnswer}`}
        </Text>
      ) : null}

      {selected !== null ? (
        <AppButton
          title={index + 1 >= questions.length ? 'See results' : 'Next'}
          onPress={next}
          style={{ marginTop: 12 }}
        />
      ) : null}

      {poolSize > 0 ? (
        <Text style={styles.poolHint}>
          Pool: {poolSize.toLocaleString()} entries
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start', marginBottom: 8 },
  heading: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 6 },
  sub: { fontSize: 14, color: colors.textMuted, marginBottom: 16, lineHeight: 20 },
  metaBox: {
    backgroundColor: '#f5f3ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  metaTitle: { fontWeight: '700', color: '#5b21b6', marginBottom: 6 },
  metaLine: { fontSize: 13, color: '#6d28d9' },
  levelLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  levelCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: 8,
    backgroundColor: colors.surface,
  },
  levelCardActive: { borderColor: '#7c3aed', backgroundColor: '#f5f3ff' },
  levelCardText: { fontSize: 15, color: colors.text },
  levelCardTextActive: { fontWeight: '700', color: '#5b21b6' },
  error: { color: colors.error, marginTop: 8, textAlign: 'center' },
  progress: { textAlign: 'center', color: colors.textMuted, marginBottom: 12, fontSize: 14 },
  levelBadge: { color: '#7c3aed', fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headword: { fontSize: 20, fontWeight: '800', color: '#5b21b6', marginTop: 4 },
  german: { fontSize: 18, color: colors.text, marginTop: 4, lineHeight: 26 },
  hint: { fontSize: 13, color: colors.textMuted, marginTop: 12 },
  options: { gap: 10 },
  opt: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
  },
  optText: { fontSize: 16, color: colors.text, lineHeight: 22 },
  feedback: { textAlign: 'center', fontWeight: '700', marginTop: 8, fontSize: 15 },
  feedbackOk: { color: colors.success },
  feedbackBad: { color: colors.error },
  poolHint: { textAlign: 'center', fontSize: 11, color: colors.textMuted, marginTop: 12 },
  doneTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  doneScore: { fontSize: 40, fontWeight: '800', textAlign: 'center', color: '#7c3aed' },
  donePct: {
    fontSize: 16,
    textAlign: 'center',
    color: colors.textMuted,
    marginBottom: 24,
  },
});
