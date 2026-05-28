import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import AppButton from '../components/AppButton';
import api from '../api/client';
import { colors } from '../theme/colors';

const OPTIONS = ['der', 'die', 'das'];
const QUESTION_COUNT = 10;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SoloQuizScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [nouns, setNouns] = useState([]);
  const [order, setOrder] = useState([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState('');
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        await api.post('/api/games/quiz/solo/play');
        const res = await api.get('/api/games/quiz/nouns');
        const clean = (res.data || [])
          .map((n) => ({
            word: n.word,
            article: String(n.article || '').trim().toLowerCase(),
            translation: n.englishTranslation || n.translation || '',
          }))
          .filter((n) => n.word && OPTIONS.includes(n.article));
        const indices = shuffle([...Array(clean.length).keys()]).slice(
          0,
          Math.min(QUESTION_COUNT, clean.length)
        );
        setNouns(clean);
        setOrder(indices);
      } catch (e) {
        setError(e.response?.data?.error || 'Impossible de charger le quiz');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const current = order.length ? nouns[order[index]] : null;

  const onSelect = (opt) => {
    if (!current || selected) return;
    setSelected(opt);
    if (opt === current.article) setScore((s) => s + 1);
  };

  const next = () => {
    if (!selected) return;
    if (index + 1 >= order.length) {
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      setSelected('');
    }
  };

  const submitScore = async () => {
    const percent = Math.round((score / order.length) * 100);
    try {
      await api.post('/api/games/quiz/solo/complete', { score: percent });
    } catch {
      /* ignore */
    }
    navigation.goBack();
  };

  if (loading) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement du quiz…</Text>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <Text style={styles.error}>{error}</Text>
        <AppButton title="Retour" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  if (finished) {
    return (
      <Screen>
        <Text style={styles.doneTitle}>Quiz terminé</Text>
        <Text style={styles.doneScore}>
          {score} / {order.length} bonnes réponses
        </Text>
        <AppButton title="Enregistrer et quitter" onPress={submitScore} />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppButton
        title="← Retour"
        variant="outline"
        onPress={() => navigation.goBack()}
        style={{ alignSelf: 'flex-start', marginBottom: 8 }}
      />
      <Text style={styles.progress}>
        Question {index + 1} / {order.length} · Score {score}
      </Text>
      <View style={styles.card}>
        <Text style={styles.word}>{current?.word}</Text>
        {current?.translation ? (
          <Text style={styles.translation}>{current.translation}</Text>
        ) : null}
      </View>
      <View style={styles.options}>
        {OPTIONS.map((opt) => {
          let bg = colors.surface;
          let border = colors.border;
          if (selected) {
            if (opt === current.article) {
              bg = '#dcfce7';
              border = colors.success;
            } else if (opt === selected) {
              bg = '#fee2e2';
              border = colors.error;
            }
          }
          return (
            <Pressable
              key={opt}
              style={[styles.opt, { backgroundColor: bg, borderColor: border }]}
              onPress={() => onSelect(opt)}
              disabled={!!selected}
            >
              <Text style={styles.optText}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
      {selected ? (
        <AppButton title="Suivant" onPress={next} style={{ marginTop: 16 }} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingText: { marginTop: 12, textAlign: 'center', color: colors.textMuted },
  error: { color: colors.error, marginBottom: 16, textAlign: 'center' },
  progress: { textAlign: 'center', color: colors.textMuted, marginBottom: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
  },
  word: { fontSize: 32, fontWeight: '800', color: colors.text },
  translation: { marginTop: 8, color: colors.textMuted, fontStyle: 'italic' },
  options: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  opt: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
  },
  optText: { fontSize: 18, fontWeight: '700' },
  doneTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  doneScore: { fontSize: 18, textAlign: 'center', color: colors.textMuted, marginBottom: 24 },
});
