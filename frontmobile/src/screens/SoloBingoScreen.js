import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Screen from '../components/Screen';
import AppButton from '../components/AppButton';
import api, { getAssetUrl } from '../api/client';
import { colors } from '../theme/colors';

const GAME_SECONDS = 180;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SoloBingoScreen({ navigation }) {
  const timerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gridClasses, setGridClasses] = useState([]);
  const [words, setWords] = useState([]);
  const [wordIndex, setWordIndex] = useState(0);
  const [assignment, setAssignment] = useState({});
  const [tileResults, setTileResults] = useState({}); // Maps classId to { word, ok }
  const [results, setResults] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(GAME_SECONDS);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError('');
    setGameOver(false);
    setWordIndex(0);
    setAssignment({});
    setTileResults({});
    setResults([]);
    setSecondsLeft(GAME_SECONDS);
    setMessage('');
    setIsTransitioning(false);
    try {
      const res = await api.get('/api/german-bingo/play/game-session');
      setGridClasses(res.data.gridClasses || []);
      setWords(shuffle(res.data.words || []));
    } catch (e) {
      setError(e.response?.data?.error || 'Impossible de charger le bingo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (loading || gameOver || gridClasses.length === 0) return undefined;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setGameOver(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [loading, gameOver, gridClasses.length]);

  const currentWord = words[wordIndex];
  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const placedClassId = currentWord
    ? Object.entries(assignment).find(([, wId]) => wId === currentWord.wordId)?.[0]
    : null;

  const onTilePress = async (classId) => {
    if (gameOver || !currentWord || isTransitioning) return;
    if (assignment[classId]) {
      setMessage('Case déjà utilisée');
      return;
    }
    try {
      setIsTransitioning(true);
      
      // Call the check API silently behind the scenes
      const res = await api.post('/api/german-bingo/play/check', {
        wordId: currentWord.wordId,
        selectedClassIds: [classId],
      });
      const tile = gridClasses.find((c) => c.id === classId);
      const isCorrect = res.data.perfectMatch;

      setAssignment((prev) => ({ ...prev, [classId]: currentWord.wordId }));
      setTileResults((prev) => ({
        ...prev,
        [classId]: {
          word: currentWord.word,
          ok: isCorrect,
        },
      }));
      setResults((prev) => [
        ...prev,
        {
          word: currentWord.word,
          tile: tile?.label,
          ok: isCorrect,
        },
      ]);

      setMessage('');

      const filled = Object.keys(assignment).length + 1;
      const isGridFull = filled >= gridClasses.length;

      // Automatically advance to the next word after 500ms
      setTimeout(() => {
        setIsTransitioning(false);
        if (isGridFull || wordIndex >= words.length - 1) {
          setGameOver(true);
        } else {
          setWordIndex((i) => i + 1);
          setMessage('');
        }
      }, 500);

    } catch (e) {
      setIsTransitioning(false);
      setMessage(e.response?.data?.error || 'Erreur');
    }
  };

  const nextWord = () => {
    if (isTransitioning) return;
    if (wordIndex >= words.length - 1) {
      setGameOver(true);
    } else {
      setWordIndex((i) => i + 1);
      setMessage('');
    }
  };

  const score = results.filter((r) => r.ok).length;

  if (loading) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.muted}>Chargement…</Text>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <Text style={styles.error}>{error}</Text>
        <AppButton title="Réessayer" onPress={loadSession} />
        <AppButton title="Retour" variant="outline" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppButton title="← Retour" variant="outline" onPress={() => navigation.goBack()} style={styles.back} />
      
      <View style={styles.headerRow}>
        <Text style={styles.timer}>⏱ {formatTime(secondsLeft)}</Text>
        <Text style={styles.wordCount}>
          Mot {wordIndex + 1}/{words.length}
        </Text>
      </View>

      {gameOver ? (
        <View style={styles.gameOverCard}>
          <Text style={styles.gameOverTitle}>🎉 Partie terminée !</Text>
          <Text style={styles.gameOverSubtitle}>
            Score final : <Text style={styles.scoreHighlight}>{score}</Text> / {gridClasses.length} placements corrects
          </Text>
          <View style={styles.gameOverActions}>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={loadSession}>
              <Text style={styles.btnText}>Rejouer 🔄</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnOutline]} onPress={() => navigation.goBack()}>
              <Text style={styles.btnOutlineText}>Retour ↩</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        currentWord && (
          <View style={styles.wordBanner}>
            <Text style={styles.currentWord}>{currentWord.word}</Text>
            <Text style={styles.instruction}>Choisissez la bonne catégorie ci-dessous</Text>
            
            <Pressable 
              style={styles.skipBtn} 
              onPress={nextWord}
              disabled={isTransitioning}
            >
              <Text style={styles.skipBtnText}>Passer le mot ⏭</Text>
            </Pressable>
          </View>
        )
      )}

      {message ? <Text style={styles.toast}>{message}</Text> : null}

      <ScrollView contentContainerStyle={styles.grid}>
        {gridClasses.map((cls) => {
          const assigned = tileResults[cls.id];
          const isCurrent = placedClassId === cls.id;

          let tileStyle = [styles.tile];
          let badge = null;

          if (gameOver) {
            if (assigned) {
              if (assigned.ok) {
                tileStyle.push(styles.tileCorrect);
                badge = <Text style={styles.badgeText}>✅</Text>;
              } else {
                tileStyle.push(styles.tileIncorrect);
                badge = <Text style={styles.badgeText}>❌</Text>;
              }
            } else {
              tileStyle.push(styles.tileUnused);
            }
          } else {
            if (assigned) {
              tileStyle.push(styles.tileUsed);
            } else if (isCurrent) {
              tileStyle.push(styles.tileCurrent);
            }
          }

          return (
            <Pressable
              key={cls.id}
              onPress={() => onTilePress(cls.id)}
              disabled={gameOver || isTransitioning}
              style={tileStyle}
            >
              {badge && <View style={styles.badgeContainer}>{badge}</View>}

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

              {assigned && (
                <View style={[
                  styles.assignedWordBadge,
                  gameOver && (assigned.ok ? styles.assignedWordBadgeCorrect : styles.assignedWordBadgeIncorrect)
                ]}>
                  <Text style={[
                    styles.assignedWordText,
                    gameOver && (assigned.ok ? styles.assignedWordTextCorrect : styles.assignedWordTextIncorrect)
                  ]} numberOfLines={1}>
                    {assigned.word}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start', marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  timer: { fontSize: 18, fontWeight: '700', color: colors.warning },
  wordCount: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  wordBanner: {
    backgroundColor: '#fff7ed',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#ea580c',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  currentWord: { fontSize: 32, fontWeight: '900', color: '#ea580c', letterSpacing: 0.5 },
  instruction: { fontSize: 13, color: '#9a3412', marginTop: 4, fontWeight: '500' },
  skipBtn: {
    marginTop: 12,
    backgroundColor: '#ffedd5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  skipBtnText: {
    color: '#ea580c',
    fontSize: 13,
    fontWeight: '700',
  },
  toast: { 
    textAlign: 'center', 
    color: colors.primary, 
    marginBottom: 12, 
    fontSize: 14, 
    fontWeight: '700',
    backgroundColor: '#e0f2fe',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    gap: 8, 
    paddingBottom: 24 
  },
  tile: {
    width: '31%',
    aspectRatio: 0.85,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    position: 'relative',
  },
  tileUsed: { 
    borderColor: '#4f46e5', // Bold indigo/purple border during game
    backgroundColor: '#f5f3ff', // Soft violet background during game to show it is chosen
  },
  tileCurrent: { 
    borderColor: colors.primary, 
    backgroundColor: '#eef2ff' 
  },
  tileCorrect: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  tileIncorrect: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  tileUnused: {
    opacity: 0.5,
    borderColor: '#cbd5e1',
  },
  tileImg: { 
    width: 60, 
    height: 60, 
    borderRadius: 12, 
    marginBottom: 6, 
    backgroundColor: colors.border 
  },
  tileLabel: { 
    fontSize: 11, 
    fontWeight: '700', 
    textAlign: 'center',
    color: '#334155'
  },
  badgeContainer: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  badgeText: {
    fontSize: 12,
  },
  assignedWordBadge: {
    marginTop: 6,
    backgroundColor: '#4f46e5', // Bold violet background during gameplay
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4338ca',
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  assignedWordBadgeCorrect: {
    backgroundColor: '#22c55e', // Solid green at game over
    borderColor: '#16a34a',
  },
  assignedWordBadgeIncorrect: {
    backgroundColor: '#ef4444', // Solid red at game over
    borderColor: '#dc2626',
  },
  assignedWordText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff', // Crisp white text during gameplay
  },
  assignedWordTextCorrect: {
    color: '#ffffff',
  },
  assignedWordTextIncorrect: {
    color: '#ffffff',
  },
  gameOverCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  gameOverTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 6,
  },
  gameOverSubtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  scoreHighlight: {
    color: '#22c55e',
    fontWeight: '900',
    fontSize: 18,
  },
  gameOverActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  btnPrimary: {
    backgroundColor: '#4f46e5',
  },
  btnOutline: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  btnOutlineText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '700',
  },
  muted: { textAlign: 'center', marginTop: 12, color: colors.textMuted },
  error: { color: colors.error, marginBottom: 16, textAlign: 'center' },
});
