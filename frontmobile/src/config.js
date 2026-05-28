import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 5000;

function isLocalhost(url) {
  return !url || /localhost|127\.0\.0\.1/i.test(url);
}

/** IP de votre PC telle qu'Expo Go la voit (ex. 10.91.90.241 depuis exp://…) */
function getMetroHost() {
  const raw =
    Constants.expoConfig?.hostUri ??
    Constants.expoGoConfig?.debuggerHost;

  if (!raw) return null;

  const host = String(raw)
    .replace(/^exp:\/\//, '')
    .replace(/^https?:\/\//, '')
    .split(':')[0]
    ?.trim();

  if (!host || isLocalhost(host)) return null;
  return host;
}

/**
 * URL de l'API backend.
 * - EXPO_PUBLIC_API_URL dans .env (si ce n'est pas localhost)
 * - En dev sur téléphone : même IP que Metro (scan QR code)
 * - Émulateur Android : 10.0.2.2
 */
function resolveApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (fromEnv && !isLocalhost(fromEnv)) return fromEnv;

  const metroHost = getMetroHost();
  if (__DEV__ && metroHost) {
    return `http://${metroHost}:${API_PORT}`;
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${API_PORT}`;
  }

  const extra = Constants.expoConfig?.extra?.apiUrl?.replace(/\/$/, '');
  if (extra && !isLocalhost(extra)) return extra;

  return fromEnv || `http://localhost:${API_PORT}`;
}

export const API_URL = resolveApiUrl();

export const GAME_TYPES = [
  { id: 'quiz', label: 'Quiz Articles', emoji: '🎯', color: '#7c3aed' },
  { id: 'creativite', label: 'Créativité', emoji: '✨', color: '#16a34a' },
  { id: 'mots-croises', label: 'Mots croisés', emoji: '📝', color: '#2563eb' },
  { id: 'bingo', label: 'Deutsch Bingo', emoji: '🎱', color: '#ea580c' },
];

export const SOLO_GAMES = [
  {
    id: 'quiz',
    title: 'Article Quiz',
    description: 'Articles der / die / das',
    emoji: '🎯',
    color: '#7c3aed',
    screen: 'SoloQuiz',
  },
  {
    id: 'vocab-quiz',
    title: 'Vocabulary Quiz',
    description: '8,000+ words · A1, A2 & B1 TSV files',
    emoji: '📚',
    color: '#8b5cf6',
    screen: 'SoloVocabQuiz',
  },
  {
    id: 'creativite',
    title: 'Créativité',
    description: 'Parcours par étapes — associer les mots',
    emoji: '✨',
    color: '#16a34a',
    screen: 'SoloRoadMap',
    params: { gameType: 'creativite' },
  },
  {
    id: 'mots-croises',
    title: 'Mots croisés',
    description: 'Parcours par étapes — grilles en allemand',
    emoji: '📝',
    color: '#2563eb',
    screen: 'SoloRoadMap',
    params: { gameType: 'mots-croises' },
  },
  {
    id: 'bingo',
    title: 'Deutsch Bingo',
    description: 'Classer les mots sur la grille',
    emoji: '🎱',
    color: '#ea580c',
    screen: 'SoloBingo',
  },
  {
    id: 'simulation',
    title: 'Simulation',
    description: 'Conversation en allemand avec l’IA',
    emoji: '🎭',
    color: '#d97706',
    screen: 'SoloSimulation',
  },
  {
    id: 'shadowing',
    title: 'Shadowing',
    description: 'YouTube · sync auto · quiz DE/EN',
    emoji: '🎧',
    color: '#6366f1',
    screen: 'SoloShadowing',
  },
];

export const TIMER_OPTIONS = [15, 30, 45, 60];
export const ROUND_OPTIONS = [1, 2, 3, 4, 5, 6, 7];
