import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { io } from 'socket.io-client';
import Screen from '../components/Screen';
import AppButton from '../components/AppButton';
import OnlineBingoRunner from '../components/OnlineBingoRunner';
import OnlineCrosswordRunner from '../components/OnlineCrosswordRunner';
import OnlineCreativityRunner from '../components/OnlineCreativityRunner';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import { colors } from '../theme/colors';

const OPTIONS = ['der', 'die', 'das'];

export default function MatchPlayScreen({ route, navigation }) {
  const { roomId } = route.params;
  const { user, token } = useAuth();
  const socketRef = useRef(null);
  const endsAtRef = useRef(null);

  const [tourInfo, setTourInfo] = useState(null);
  const [quizRound, setQuizRound] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selected, setSelected] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [matchScores, setMatchScores] = useState({});
  const [finished, setFinished] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [intermission, setIntermission] = useState(null);
  
  const [tourPayload, setTourPayload] = useState(null);
  const [tourSubmitted, setTourSubmitted] = useState(false);
  const currentTourRef = useRef(-1);

  useEffect(() => {
    if (!token) return undefined;
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;
    socket.emit('join-room', { roomId });
    socket.emit('match-sync', { roomId });

    socket.on('match-sync-state', (p) => {
      if (p.matchScores) setMatchScores(p.matchScores);
      if (p.status === 'finished') setFinished(true);
      if (p.currentTour >= 0) {
        currentTourRef.current = p.currentTour;
        setTourInfo({
          tourIndex: p.currentTour,
          totalTours: p.totalTours,
          gameType: p.activeGameType,
          label: p.activeGameType,
        });
      }
      if (p.tourPayload) setTourPayload(p.tourPayload);
    });
    
    socket.on('match-tour-start', (p) => {
      currentTourRef.current = p.tourIndex;
      setTourInfo(p);
      setTourPayload(null);
      setIntermission(null);
      setTourSubmitted(false);
      setQuizRound(null);
      setSubmitted(false);
    });

    socket.on('match-tour-payload', (p) => {
      if (p.tourIndex === currentTourRef.current) {
        setTourPayload(p.payload);
      }
    });

    socket.on('quiz-round-start', (p) => {
      setQuizRound(p);
      endsAtRef.current = p.endsAt;
      setSubmitted(false);
      setSelected('');
    });
    socket.on('quiz-round-end', (p) => {
      if (p.scores) setMatchScores(p.scores);
    });
    socket.on('match-tour-end', (p) => {
      setIntermission(p);
      setQuizRound(null);
      setTourPayload(null);
      if (p.matchScores) setMatchScores(p.matchScores);
    });
    socket.on('match-finished', (p) => {
      setFinished(true);
      setLeaderboard(p.leaderboard || []);
    });

    return () => socket.disconnect();
  }, [token, roomId]);

  useEffect(() => {
    if (!quizRound?.endsAt) return undefined;
    const tick = () => {
      setTimeLeft(Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [quizRound]);

  const submitAnswer = (opt) => {
    if (submitted || !quizRound || timeLeft <= 0) return;
    setSelected(opt);
    setSubmitted(true);
    socketRef.current?.emit('quiz-submit-answer', {
      roomId,
      roundIndex: quizRound.roundIndex,
      answer: opt,
    });
  };

  const submitTourScore = useCallback((score) => {
    if (tourSubmitted || currentTourRef.current < 0) return;
    setTourSubmitted(true);
    socketRef.current?.emit('tour-complete', {
      roomId,
      tourIndex: currentTourRef.current,
      score,
    });
  }, [roomId, tourSubmitted]);

  const leave = async () => {
    socketRef.current?.emit('leave-room', { roomId });
    try {
      await api.post(`/api/rooms/${roomId}/leave`);
    } catch {
      /* ignore */
    }
    navigation.navigate('Welcome');
  };

  const myTotal = matchScores[user?.id]?.total ?? 0;

  if (finished) {
    return (
      <Screen>
        <Text style={styles.doneTitle}>Partie terminée</Text>
        {leaderboard.map((e, i) => (
          <View key={e.userId} style={styles.lbRow}>
            <Text>#{i + 1} {e.userId === user?.id ? 'Vous' : e.email}</Text>
            <Text style={styles.lbPts}>{e.total} pts</Text>
          </View>
        ))}
        <AppButton title="Retour à l'accueil" onPress={leave} style={{ marginTop: 20 }} />
      </Screen>
    );
  }

  const activeGame = tourInfo?.gameType;
  const isQuiz = activeGame === 'quiz' && quizRound;

  return (
    <Screen>
      {tourInfo && (
        <Text style={styles.tour}>
          Tour {tourInfo.tourIndex + 1}/{tourInfo.totalTours} — {tourInfo.label}
        </Text>
      )}
      <Text style={styles.score}>Score : {myTotal} pts {isQuiz ? `· ${timeLeft}s` : ''}</Text>

      {intermission && (
        <View style={styles.inter}>
          <Text style={styles.interTitle}>Fin du tour</Text>
          {intermission.results?.map((r) => (
            <Text key={r.userId} style={styles.interLine}>
              {r.userId === user?.id ? 'Vous' : r.email} : {r.matchTotal} pts
            </Text>
          ))}
        </View>
      )}

      {isQuiz ? (
        <>
          <View style={styles.card}>
            <Text style={styles.word}>{quizRound.question?.word}</Text>
            {quizRound.question?.translation ? (
              <Text style={styles.trans}>{quizRound.question.translation}</Text>
            ) : null}
          </View>
          <View style={styles.opts}>
            {OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                style={[
                  styles.opt,
                  selected === opt && styles.optSel,
                ]}
                onPress={() => submitAnswer(opt)}
                disabled={submitted}
              >
                <Text style={styles.optText}>{opt}</Text>
              </Pressable>
            ))}
          </View>
          {submitted && (
            <Text style={styles.wait}>En attente de l&apos;adversaire…</Text>
          )}
        </>
      ) : activeGame === 'bingo' && tourPayload && !tourSubmitted ? (
        <View style={{ flex: 1 }}>
          <OnlineBingoRunner payload={tourPayload} onComplete={submitTourScore} />
        </View>
      ) : activeGame === 'mots-croises' && tourPayload && !tourSubmitted ? (
        <View style={{ flex: 1 }}>
          <OnlineCrosswordRunner payload={tourPayload} onComplete={submitTourScore} />
        </View>
      ) : activeGame === 'creativite' && tourPayload && !tourSubmitted ? (
        <View style={{ flex: 1 }}>
          <OnlineCreativityRunner itemId={tourPayload.itemId} onComplete={submitTourScore} />
        </View>
      ) : tourSubmitted && !intermission && activeGame === 'bingo' ? (
        <View style={styles.bingoWaitCard}>
          <Text style={styles.bingoWaitTitle}>Tour bingo terminé</Text>
          <Text style={styles.wait}>En attente de l&apos;adversaire…</Text>
        </View>
      ) : tourSubmitted && !intermission && activeGame !== 'quiz' ? (
        <Text style={styles.wait}>Tour terminé — en attente de l&apos;adversaire…</Text>
      ) : !intermission && !tourInfo ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.wait}>Démarrage de la partie…</Text>
        </View>
      ) : !intermission ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.wait}>Chargement du tour…</Text>
        </View>
      ) : null}

      <AppButton title="Quitter" variant="outline" onPress={leave} style={{ marginTop: 24 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tour: { fontSize: 14, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  score: { textAlign: 'center', color: colors.textMuted, marginBottom: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  word: { fontSize: 28, fontWeight: '800' },
  trans: { color: colors.textMuted, marginTop: 6 },
  opts: { flexDirection: 'row', gap: 8 },
  opt: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  optSel: { borderColor: colors.primary, backgroundColor: '#eef2ff' },
  optText: { fontSize: 16, fontWeight: '700' },
  wait: { textAlign: 'center', marginTop: 16, color: colors.textMuted },
  waitSmall: { textAlign: 'center', fontSize: 12, color: colors.textMuted, marginTop: 8 },
  loadingBox: { alignItems: 'center', marginTop: 32 },
  inter: { backgroundColor: colors.surface, padding: 16, borderRadius: 12, marginBottom: 16 },
  interTitle: { fontWeight: '700', marginBottom: 8 },
  interLine: { fontSize: 14, color: colors.textMuted },
  doneTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  lbRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    marginBottom: 8,
  },
  lbPts: { fontWeight: '700', color: colors.primary },
  bingoWaitCard: {
    backgroundColor: '#1a1625',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  bingoWaitTitle: {
    color: '#d2f500',
    fontWeight: '800',
    fontSize: 17,
    marginBottom: 8,
  },
});
