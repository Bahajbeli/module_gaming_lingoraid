import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import api, { getAssetUrl } from '../api/client';
import { colors } from '../theme/colors';

export default function OnlineBingoRunner({ payload, onComplete }) {
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef(null);

  const endGame = useCallback(
    (reason) => {
      if (gameOver) return;
      setGameOver(true);
      setEndReason(reason);
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [gameOver]
  );

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
  const score = gameResults.filter((r) => r.ok).length;
  const scorePercent = gridClasses.length
    ? Math.round((score / gridClasses.length) * 100)
    : 0;

  const endTitle = {
    timer: 'Temps écoulé',
    'all-words': 'Bravo !',
    'board-full': 'Plateau complet',
  }[endReason] || 'Tour terminé';

  const onTilePress = async (classId) => {
    if (gameOver || !currentWord || isTransitioning) return;
    if (assignment[classId]) return;

    setIsTransitioning(true);

    let isCorrect = false;
    try {
      const res = await api.post('/api/german-bingo/play/check', {
        wordId: currentWord.wordId,
        selectedClassIds: [classId],
      });
      isCorrect = res.data.perfectMatch;
    } catch {
      /* ignore */
    }

    const tile = gridClasses.find((c) => c.id === classId);
    setAssignment((prev) => ({ ...prev, [classId]: currentWord.wordId }));
    setGameResults((prev) => [
      ...prev,
      { word: currentWord.word, tile: tile?.label, ok: isCorrect, classId },
    ]);

    setTimeout(() => {
      setIsTransitioning(false);
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
    }, 400);
  };

  const skipWord = () => {
    if (isTransitioning || gameOver) return;
    if (currentWordIndex + 1 >= words.length) {
      endGame('all-words');
    } else {
      setCurrentWordIndex((i) => i + 1);
    }
  };

  const confirmAndSubmit = () => {
    if (waitingOpponent) return;
    setWaitingOpponent(true);
    // Évite "Cannot update component while rendering" sur le parent
    setTimeout(() => onComplete?.(scorePercent), 0);
  };

  if (!gridClasses.length) {
    return <Text style={styles.error}>Bingo indisponible.</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Deutsch Bingo — En ligne</Text>
        <Text style={styles.timer}>{secondsLeft}s</Text>
      </View>

      {!gameOver && currentWord && (
        <View style={styles.wordBanner}>
          <Text style={styles.wordNum}>
            {currentWordIndex + 1} / {words.length}
          </Text>
          <Text style={styles.currentWord}>{currentWord.word}</Text>
          <Pressable style={styles.skipBtn} onPress={skipWord} disabled={isTransitioning}>
            <Text style={styles.skipBtnText}>Passer ⏭</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.progress}>
        {filledCount} / {gridClasses.length} cases
      </Text>

      <ScrollView contentContainerStyle={styles.grid}>
        {gridClasses.map((cls) => {
          const result = gameResults.find((r) => r.classId === cls.id);
          const assigned = result || (assignment[cls.id]
            ? { word: words.find((w) => w.wordId === assignment[cls.id])?.word }
            : null);

          let tileStyle = [styles.tile];
          if (gameOver && result) {
            tileStyle.push(result.ok ? styles.tileCorrect : styles.tileIncorrect);
          } else if (assignment[cls.id]) {
            tileStyle.push(styles.tileUsed);
          }

          return (
            <Pressable
              key={cls.id}
              onPress={() => onTilePress(cls.id)}
              disabled={gameOver || isTransitioning || !!assignment[cls.id]}
              style={tileStyle}
            >
              {cls.imageUrl ? (
                <Image
                  source={{ uri: getAssetUrl(cls.imageUrl) }}
                  style={styles.tileImg}
                  resizeMode="cover"
                />
              ) : null}
              <Text style={styles.tileLabel} numberOfLines={2}>
                {cls.label}
              </Text>
              {assigned?.word && (
                <View
                  style={[
                    styles.wordBadge,
                    gameOver && result && (result.ok ? styles.badgeOk : styles.badgeKo),
                  ]}
                >
                  <Text style={styles.wordBadgeText} numberOfLines={1}>
                    {assigned.word}
                  </Text>
                </View>
              )}
              {gameOver && result && (
                <Text style={styles.verdict}>{result.ok ? '✓' : '✗'}</Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal visible={gameOver} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{endTitle}</Text>
            <Text style={styles.modalScore}>
              {score} / {gridClasses.length}
            </Text>
            <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
              {gameResults.map((r, i) => (
                <View
                  key={`${r.classId}-${i}`}
                  style={[styles.resultRow, r.ok ? styles.resultOk : styles.resultKo]}
                >
                  <Text style={styles.resultText} numberOfLines={1}>
                    {r.word} → {r.tile}
                  </Text>
                  <Text style={[styles.resultBadge, r.ok ? styles.badgeOkText : styles.badgeKoText]}>
                    {r.ok ? 'Correct' : 'Faux'}
                  </Text>
                </View>
              ))}
            </ScrollView>
            {!waitingOpponent ? (
              <Pressable style={styles.modalBtn} onPress={confirmAndSubmit}>
                <Text style={styles.modalBtnText}>Valider — attendre l&apos;adversaire</Text>
              </Pressable>
            ) : (
              <Text style={styles.waitText}>En attente de l&apos;adversaire…</Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1625', borderRadius: 16, padding: 12 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 13, fontWeight: '800', color: '#d2f500', letterSpacing: 0.5 },
  timer: { fontSize: 16, fontWeight: '800', color: '#fff' },
  wordBanner: {
    backgroundColor: '#36318e',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  wordNum: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  currentWord: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  skipBtn: {
    marginTop: 10,
    backgroundColor: 'rgba(210,245,0,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  skipBtnText: { color: '#d2f500', fontWeight: '700', fontSize: 13 },
  progress: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginBottom: 8, textAlign: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    paddingBottom: 16,
  },
  tile: {
    width: '31%',
    aspectRatio: 0.85,
    backgroundColor: '#2b2738',
    borderRadius: 12,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3d3850',
  },
  tileUsed: { borderColor: '#7c3aed', backgroundColor: '#2e1065' },
  tileCorrect: { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.15)' },
  tileIncorrect: { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.15)' },
  tileImg: { width: 44, height: 44, borderRadius: 8, marginBottom: 4 },
  tileLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center', color: '#e2e8f0' },
  wordBadge: {
    marginTop: 4,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: '100%',
  },
  badgeOk: { backgroundColor: '#16a34a' },
  badgeKo: { backgroundColor: '#dc2626' },
  wordBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  verdict: {
    position: 'absolute',
    top: 4,
    right: 6,
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
  },
  error: { textAlign: 'center', color: colors.error, marginTop: 20 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,22,37,0.95)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#1a1625',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#36318e',
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#d2f500',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalScore: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  resultsList: { maxHeight: 220, marginBottom: 16 },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    gap: 8,
  },
  resultOk: {
    backgroundColor: 'rgba(34,197,94,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.5)',
  },
  resultKo: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.5)',
  },
  resultText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
  resultBadge: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  badgeOkText: { color: '#4ade80' },
  badgeKoText: { color: '#f87171' },
  modalBtn: {
    backgroundColor: '#d2f500',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#1a1625',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  waitText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '600',
  },
});
