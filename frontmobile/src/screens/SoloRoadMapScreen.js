import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import SoloGameRoadMap from '../components/SoloGameRoadMap';
import api from '../api/client';
import { colors } from '../theme/colors';
import { loadProgress } from '../utils/roadMapProgress';

const META = {
  creativite: {
    title: 'Créativité',
    subtitle: 'Associez les mots à l’image',
    emoji: '✨',
    playScreen: 'SoloCreativity',
    headerColors: ['#7c3aed', '#db2777'], // Violet à Rose vif
    screenBg: '#1e1b4b', // Indigo très profond
    accentColor: '#db2777',
  },
  'mots-croises': {
    title: 'Mots croisés',
    subtitle: 'Grilles en allemand',
    emoji: '📝',
    playScreen: 'SoloCrossword',
    headerColors: ['#1e3a8a', '#2563eb'], // Indigo à Bleu électrique
    screenBg: '#0f172a', // Slate très profond
    accentColor: '#2563eb',
  },
};

function HeaderBackground({ colors }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors[0]} />
            <Stop offset="100%" stopColor={colors[1]} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#headerGrad)" />
      </Svg>
    </View>
  );
}

export default function SoloRoadMapScreen({ route, navigation }) {
  const gameType = route.params?.gameType || 'creativite';
  const meta = META[gameType] || META.creativite;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [games, setGames] = useState([]);
  const [progress, setProgress] = useState({ currentStage: 1, completedStages: [] });

  const fetchGames = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (gameType === 'creativite') {
        const res = await api.get('/api/creativity/list');
        setGames(res.data?.items || []);
      } else if (gameType === 'mots-croises') {
        const res = await api.get('/api/crosswords/list');
        setGames(res.data?.items || []);
      }
      const saved = await loadProgress(gameType);
      setProgress(saved);
    } catch (e) {
      setError(e.response?.data?.error || 'Impossible de charger la progression');
    } finally {
      setLoading(false);
    }
  }, [gameType]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      loadProgress(gameType).then(setProgress);
    });
    return unsub;
  }, [navigation, gameType]);

  const handleStagePress = (stageNumber, game) => {
    navigation.navigate(meta.playScreen, {
      itemId: game.id,
      stageNumber,
      gameType,
      totalStages: games.length,
    });
  };

  const completed = progress.completedStages?.length || 0;
  const current = Math.min(progress.currentStage || 1, Math.max(1, games.length));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: meta.screenBg }]} edges={['top', 'left', 'right']}>
      {/* Header avec dégradé SVG personnalisé */}
      <View style={styles.header}>
        <HeaderBackground colors={meta.headerColors} />
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backText}>← Retour</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{meta.title}</Text>
          <Text style={styles.headerSub}>{meta.subtitle}</Text>
        </View>
        <View style={styles.progressPill}>
          <Text style={styles.progressPillText}>
            {completed}/{games.length || 0}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={meta.accentColor} />
          <Text style={styles.loadingText}>Chargement de l'aventure...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={fetchGames} style={[styles.retryBtn, { backgroundColor: meta.accentColor }]}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Bannière effet Verre Dépoli */}
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>🚀 PUZZLE TIME</Text>
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeText}>NIVEAU {current}</Text>
            </View>
            <Text style={styles.bannerSub}>
              {games.length} étapes à franchir
            </Text>
          </View>

          <SoloGameRoadMap
            gameType={gameType}
            games={games}
            currentStage={progress.currentStage || 1}
            completedStages={progress.completedStages || []}
            onStagePress={handleStagePress}
          />

          {/* Boîte d'aide modernisée */}
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>
              💡 Touchez une pastille colorée pour jouer. Les niveaux gris sont verrouillés.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
  },
  backBtn: {
    minWidth: 70,
    paddingVertical: 6,
    zIndex: 10,
  },
  backText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    marginTop: 2,
  },
  progressPill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 54,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    zIndex: 10,
  },
  progressPillText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', marginTop: 12, fontSize: 14 },
  error: { color: '#fff', textAlign: 'center', marginBottom: 16, fontWeight: '700', fontSize: 15 },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  retryText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
    alignItems: 'center',
  },
  banner: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 20,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  bannerBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  bannerBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#1e1b4b',
    letterSpacing: 0.5,
  },
  bannerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    marginTop: 8,
  },
  hintBox: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 14,
    maxWidth: 340,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  hintText: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '600',
  },
});
