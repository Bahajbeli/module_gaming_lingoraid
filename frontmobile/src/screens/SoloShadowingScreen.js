import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import Screen from '../components/Screen';
import AppButton from '../components/AppButton';
import api from '../api/client';
import { colors } from '../theme/colors';

const PREPARE_TIMEOUT_MS = 1800000;
const QUIZ_TIMEOUT_MS = 120000;
const MANUAL_SYNC_LOCK_MS = 4500;

function formatTime(sec) {
  const s = Math.floor(sec || 0);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

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

const PLAYER_HEIGHT = 220;
const PLAYER_WIDTH = Dimensions.get('window').width - 40;

export default function SoloShadowingScreen({ navigation }) {
  const playerRef = useRef(null);
  const segmentScrollRef = useRef(null);
  const indexRef = useRef(0);
  const manualLockUntilRef = useRef(0);

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [video, setVideo] = useState(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('input');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [autoSync, setAutoSync] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState('');

  const segments = video?.segments || [];
  const current = segments[index];

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const lockManualSync = useCallback(() => {
    manualLockUntilRef.current = Date.now() + MANUAL_SYNC_LOCK_MS;
  }, []);

  const seekInPlayer = useCallback((seconds, play = true) => {
    const sec = Number(seconds) || 0;
    playerRef.current?.seekTo(sec, true);
    if (play) setPlaying(true);
  }, []);

  const openInYoutube = useCallback(() => {
    if (!video?.youtubeId) return;
    const t = Math.floor(current?.start || 0);
    Linking.openURL(
      `https://www.youtube.com/watch?v=${video.youtubeId}&t=${t}s`
    );
  }, [video?.youtubeId, current?.start]);

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
    if (phase === 'practice' && video?.youtubeId) {
      saveProgress(index);
    }
  }, [index, phase, video?.youtubeId, saveProgress]);

  useEffect(() => {
    if (phase !== 'practice' || !autoSync) return;
    segmentScrollRef.current?.scrollTo({
      y: Math.max(0, index * 56 - 80),
      animated: true,
    });
  }, [index, phase, autoSync]);

  useEffect(() => {
    if (!playerReady || !autoSync || phase !== 'practice' || !segments.length) {
      return undefined;
    }
    const poll = setInterval(async () => {
      try {
        const t = await playerRef.current?.getCurrentTime();
        if (t == null || Date.now() < manualLockUntilRef.current) return;
        const nextIdx = findSegmentIndex(segments, t);
        if (nextIdx !== indexRef.current) setIndex(nextIdx);
      } catch {
        /* ignore */
      }
    }, 350);
    return () => clearInterval(poll);
  }, [playerReady, autoSync, phase, segments]);

  const prepare = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post(
        '/api/shadowing/prepare',
        { url: url.trim() },
        { timeout: PREPARE_TIMEOUT_MS }
      );
      setVideo(res.data.video);
      setIndex(res.data.session?.currentIndex || 0);
      setPlayerReady(false);
      setPlayerError('');
      setPlaying(false);
      setPhase('practice');
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Erreur de préparation';
      setError(
        e.code === 'ECONNABORTED'
          ? 'Préparation trop longue — essayez une vidéo plus courte.'
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  const loadQuiz = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post(
        '/api/shadowing/quiz',
        { youtubeId: video.youtubeId },
        { timeout: QUIZ_TIMEOUT_MS }
      );
      setQuestions(res.data.questions || []);
      setAnswers({});
      setPhase('quiz');
    } catch (e) {
      setError(e.response?.data?.error || 'Impossible de générer le quiz');
    } finally {
      setLoading(false);
    }
  };

  const submitQuiz = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/shadowing/quiz/submit', {
        youtubeId: video.youtubeId,
        answers: questions.map((_, i) => answers[i] ?? -1),
      });
      setResult(res.data);
      setPhase('result');
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur envoi quiz');
    } finally {
      setLoading(false);
    }
  };

  const goSegment = (delta) => {
    const next = Math.min(Math.max(0, index + delta), segments.length - 1);
    lockManualSync();
    setIndex(next);
    if (segments[next]) seekInPlayer(segments[next].start);
  };

  const selectSegment = (i) => {
    lockManualSync();
    setIndex(i);
    if (segments[i]) seekInPlayer(segments[i].start);
  };

  if (phase === 'input') {
    return (
      <Screen>
        <AppButton
          title="← Retour"
          variant="outline"
          onPress={() => navigation.goBack()}
          style={styles.back}
        />
        <Text style={styles.title}>Shadowing</Text>
        <Text style={styles.hint}>
          Lien YouTube en allemand (max ~30 min). Transcription puis pratique
          phrase par phrase avec sync automatique. Quiz en allemand + traduction
          anglaise.
        </Text>
        <Text style={styles.hintSmall}>
          La première préparation peut prendre 1 à 3 minutes.
        </Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="https://youtube.com/watch?v=..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="url"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AppButton
          title="Préparer le shadowing"
          onPress={prepare}
          loading={loading}
          disabled={!url.trim()}
        />
      </Screen>
    );
  }

  if (phase === 'result' && result) {
    return (
      <Screen>
        <Text style={styles.doneTitle}>Quiz : {result.score}%</Text>
        <Text style={styles.doneSub}>
          {result.correct}/{result.total} bonnes réponses
        </Text>
        <AppButton
          title="Nouvelle vidéo"
          onPress={() => {
            setPhase('input');
            setVideo(null);
            setUrl('');
            setResult(null);
            setQuestions([]);
          }}
        />
        <AppButton
          title="Retour au menu"
          variant="outline"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 8 }}
        />
      </Screen>
    );
  }

  if (phase === 'quiz') {
    return (
      <Screen>
        <AppButton
          title="← Pratique"
          variant="outline"
          onPress={() => setPhase('practice')}
          style={styles.back}
        />
        <Text style={styles.title}>Quiz — Deutsch / English</Text>
        <Text style={styles.hintSmall}>Questions en allemand, traduction en anglais</Text>
        <ScrollView style={styles.quizScroll}>
          {questions.map((q, qi) => (
            <View key={qi} style={styles.quizCard}>
              <Text style={styles.quizQ}>
                {qi + 1}. {q.question}
              </Text>
              {q.questionEn ? (
                <Text style={styles.quizEn}>{q.questionEn}</Text>
              ) : null}
              {q.options.map((opt, oi) => (
                <Pressable
                  key={oi}
                  onPress={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                  style={[
                    styles.quizOpt,
                    answers[qi] === oi && styles.quizOptSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.quizOptDe,
                      answers[qi] === oi && styles.quizOptTextSelected,
                    ]}
                  >
                    {opt}
                  </Text>
                  {q.optionsEn?.[oi] ? (
                    <Text
                      style={[
                        styles.quizOptEn,
                        answers[qi] === oi && styles.quizOptEnSelected,
                      ]}
                    >
                      {q.optionsEn[oi]}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AppButton
          title="Valider le quiz"
          onPress={submitQuiz}
          loading={loading}
          disabled={questions.some((_, i) => answers[i] === undefined)}
        />
      </Screen>
    );
  }

  return (
    <Screen style={styles.practiceRoot}>
      <AppButton
        title="← Retour"
        variant="outline"
        onPress={() => navigation.goBack()}
        style={styles.back}
      />
      <Text style={styles.videoTitle} numberOfLines={2}>
        {video?.title}
      </Text>

      <View style={styles.player}>
        <YoutubePlayer
          ref={playerRef}
          height={PLAYER_HEIGHT}
          width={PLAYER_WIDTH}
          videoId={video.youtubeId}
          play={playing}
          forceAndroidAutoplay
          onReady={() => {
            setPlayerReady(true);
            setPlayerError('');
            const start = segments[index]?.start ?? 0;
            playerRef.current?.seekTo(start, true);
          }}
          onChangeState={(state) => {
            if (state === 'playing') setPlaying(true);
            if (state === 'paused' || state === 'ended') setPlaying(false);
          }}
          onError={() => {
            setPlayerError(
              'Lecture impossible dans l’app. Ouvrez la vidéo dans YouTube.'
            );
            setPlaying(false);
          }}
          initialPlayerParams={{
            controls: true,
            preventFullScreen: false,
            rel: false,
          }}
          webViewProps={{
            androidLayerType: 'hardware',
            allowsInlineMediaPlayback: true,
            mediaPlaybackRequiresUserAction: false,
          }}
        />
      </View>
      {playerError ? (
        <>
          <Text style={styles.playerError}>{playerError}</Text>
          <AppButton
            title="Ouvrir dans YouTube"
            variant="outline"
            onPress={openInYoutube}
            style={styles.youtubeFallback}
          />
        </>
      ) : null}

      <View style={styles.phraseBox}>
        <View style={styles.phraseHeader}>
          <Text style={styles.phraseMeta}>
            Phrase {index + 1}/{segments.length} ·{' '}
            {formatTime(current?.start)} – {formatTime(current?.end)}
          </Text>
          <View style={styles.syncRow}>
            <Text style={styles.syncLabel}>Sync auto</Text>
            <Switch
              value={autoSync}
              onValueChange={setAutoSync}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </View>
        <Text style={styles.phrase}>{current?.text}</Text>
        <Text style={styles.phraseHint}>
          Lancez la vidéo : les phrases avancent automatiquement.
        </Text>
        <View style={styles.row}>
          <AppButton
            title="◀"
            variant="outline"
            onPress={() => goSegment(-1)}
            style={styles.navBtn}
            disabled={index === 0}
          />
          <AppButton
            title="▶ Écouter"
            onPress={() => {
              lockManualSync();
              seekInPlayer(current?.start || 0);
            }}
            style={styles.navBtn}
          />
          <AppButton
            title="▶"
            variant="outline"
            onPress={() => goSegment(1)}
            style={styles.navBtn}
            disabled={index >= segments.length - 1}
          />
        </View>
      </View>

      <ScrollView
        ref={segmentScrollRef}
        style={styles.segmentList}
        nestedScrollEnabled
      >
        {segments.map((seg, i) => (
          <AppButton
            key={`${seg.start}-${i}`}
            title={`${formatTime(seg.start)}  ${seg.text}`}
            variant={i === index ? 'primary' : 'outline'}
            onPress={() => selectSegment(i)}
            style={styles.segmentBtn}
          />
        ))}
      </ScrollView>

      <AppButton
        title="J'ai fini — Quiz sur la vidéo"
        onPress={loadQuiz}
        loading={loading}
        style={styles.quizBtn}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  practiceRoot: { paddingBottom: 12 },
  back: { alignSelf: 'flex-start', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 8 },
  hint: { fontSize: 14, color: colors.textMuted, marginBottom: 8 },
  hintSmall: { fontSize: 12, color: colors.textMuted, marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  error: { color: colors.error, marginVertical: 8, textAlign: 'center' },
  videoTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: colors.text },
  player: {
    height: PLAYER_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  playerError: {
    color: colors.error,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  youtubeFallback: { marginBottom: 12 },
  phraseBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  phraseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  phraseMeta: { color: colors.textMuted, fontSize: 12, flex: 1 },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  syncLabel: { fontSize: 11, color: colors.textMuted },
  phrase: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  phraseHint: { fontSize: 12, color: colors.textMuted, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8 },
  navBtn: { flex: 1 },
  segmentList: { maxHeight: 120, marginBottom: 10 },
  segmentBtn: { marginBottom: 6 },
  quizBtn: { marginTop: 4 },
  quizScroll: { maxHeight: 420, marginBottom: 12 },
  quizCard: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quizQ: { fontWeight: '700', color: colors.text, marginBottom: 4 },
  quizEn: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic', marginBottom: 10 },
  quizOpt: {
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  quizOptSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '22',
  },
  quizOptDe: { fontSize: 15, fontWeight: '600', color: colors.text },
  quizOptEn: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginTop: 4 },
  quizOptTextSelected: { color: colors.primary },
  quizOptEnSelected: { color: colors.textMuted },
  doneTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    color: colors.text,
  },
  doneSub: { textAlign: 'center', color: colors.textMuted, marginBottom: 24 },
});
