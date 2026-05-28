import React, { useMemo } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Circle,
  G,
  Text as SvgText,
} from 'react-native-svg';
import { getStageStatus } from '../utils/roadMapProgress';

const { width: SCREEN_W } = Dimensions.get('window');
const MAP_W = SCREEN_W - 32;
const STAGE_GAP = 120;
const NODE = 64;
const RING = 5;

const THEMES = {
  creativite: {
    bgGrad: ['#1e1b4b', '#311042'], // Indigo très profond à Améthyste
    pathBase: 'rgba(251, 191, 36, 0.08)', // Tracé extérieur or translucide
    pathBorder: '#f59e0b', // Tracé or
    pathInner: '#fef08a', // Tracé sable brillant
    nodeActive: ['#ec4899', '#db2777'],
    nodeDone: ['#fbbf24', '#d97706'], // Gold glossy
    nodeLocked: 'rgba(255, 255, 255, 0.1)',
    ringActive: '#67e8f9', // Pulsation cyan
    ringDone: '#fef08a',
    ringLocked: 'rgba(255, 255, 255, 0.15)',
    textColor: '#ffffff',
  },
  'mots-croises': {
    bgGrad: ['#0f172a', '#1e293b'], // Bleu/Slate très profond
    pathBase: 'rgba(59, 130, 246, 0.08)', // Tracé bleu électrique translucide
    pathBorder: '#2563eb', // Tracé bleu cobalt
    pathInner: '#93c5fd', // Tracé bleu cyan brillant
    nodeActive: ['#8b5cf6', '#6d28d9'],
    nodeDone: ['#10b981', '#06b6d4'], // Vert émeraude/cyan
    nodeLocked: 'rgba(255, 255, 255, 0.1)',
    ringActive: '#a78bfa',
    ringDone: '#34d399',
    ringLocked: 'rgba(255, 255, 255, 0.15)',
    textColor: '#ffffff',
  },
};

// Calcule les positions exactes en pixels dans le cadre MAP_W * mapHeight
function buildStagePositions(count, mapWidth, mapHeight) {
  if (count <= 0) return [];
  const top = 70; // Marge en haut
  const bottom = mapHeight - 90; // Marge en bas
  const step = count === 1 ? 0 : (bottom - top) / (count - 1);
  const amplitude = mapWidth * 0.25; // Amplitude sinusoïdale

  return Array.from({ length: count }, (_, i) => {
    const y = bottom - i * step;
    const x = mapWidth / 2 + Math.sin(i * 1.5) * amplitude;
    return { stage: i + 1, x, y };
  });
}

// Génère la courbe sinueuse parfaite en pixels
function buildPathD(positions, mapWidth, mapHeight) {
  if (positions.length === 0) return '';
  const pts = [];
  const top = 70;
  const bottom = mapHeight - 90;
  const steps = 100;
  const count = positions.length;
  const amplitude = mapWidth * 0.25;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = bottom - t * (bottom - top);
    const idxFloat = t * Math.max(1, count - 1);
    const x = mapWidth / 2 + Math.sin(idxFloat * 1.5) * amplitude;
    pts.push({ x, y });
  }

  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');
}

function StarRating({ count }) {
  return (
    <View style={styles.stars}>
      {[0, 1, 2].map((i) => (
        <Text
          key={i}
          style={[styles.star, i < count ? styles.starOn : styles.starOff]}
        >
          ★
        </Text>
      ))}
    </View>
  );
}

function DecorTree({ style, gameType }) {
  if (gameType === 'creativite') {
    return (
      <View style={[styles.tree, style]}>
        <View style={[styles.treeCrown, { backgroundColor: '#a78bfa', borderColor: '#c084fc' }]} />
        <View style={[styles.treeCrownInner, { backgroundColor: '#db2777' }]} />
        <View style={styles.treeTrunk} />
      </View>
    );
  }
  
  return (
    <View style={[styles.tree, style, { transform: [{ rotate: '-8deg' }] }]}>
      <View style={[styles.book, { backgroundColor: '#3b82f6', width: 28, height: 7 }]} />
      <View style={[styles.book, { backgroundColor: '#1e3a8a', width: 32, height: 8, marginTop: -2 }]} />
      <View style={[styles.book, { backgroundColor: '#10b981', width: 26, height: 7, marginTop: -2 }]} />
    </View>
  );
}

function DecorRock({ style, gameType }) {
  if (gameType === 'creativite') {
    return (
      <View style={[styles.crystalContainer, style]}>
        <Text style={styles.crystalText}>✨</Text>
      </View>
    );
  }

  return (
    <View style={[styles.tileRock, style]}>
      <Text style={styles.tileRockText}>A</Text>
    </View>
  );
}

function LevelNode({ status, theme, stageNumber, onPress, disabled, gameType }) {
  const isCurrent = status === 'current';
  const isCompleted = status === 'completed';
  const isLocked = status === 'locked';

  const bodyColors = isLocked
    ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']
    : isCompleted
      ? theme.nodeDone
      : theme.nodeActive;

  const ringColor = isLocked
    ? theme.ringLocked
    : isCompleted
      ? theme.ringDone
      : theme.ringActive;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.nodePress,
        pressed && !disabled && { transform: [{ scale: 0.93 }] },
      ]}
    >
      <StarRating count={isCompleted ? 3 : 0} />
      
      <View style={styles.nodeStack}>
        {isCurrent && (
          <>
            <View style={[styles.nodeGlow, { borderColor: ringColor }]} />
            <View style={[styles.nodePulse, { borderColor: ringColor }]} />
          </>
        )}

        <Svg width={NODE} height={NODE} viewBox={`0 0 ${NODE} ${NODE}`}>
          <Defs>
            <LinearGradient id={`nodeGrad-${stageNumber}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={bodyColors[0]} />
              <Stop offset="100%" stopColor={bodyColors[1]} />
            </LinearGradient>
            <LinearGradient id="shadow3D" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
              <Stop offset="40%" stopColor="rgba(255,255,255,0.05)" />
              <Stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
            </LinearGradient>
          </Defs>

          {/* Anneau extérieur / Contour */}
          <Circle
            cx={NODE / 2}
            cy={NODE / 2}
            r={NODE / 2 - 2}
            fill="none"
            stroke={ringColor}
            strokeWidth={3}
          />

          {/* Bouton principal */}
          <Circle
            cx={NODE / 2}
            cy={NODE / 2}
            r={NODE / 2 - 5}
            fill={`url(#nodeGrad-${stageNumber})`}
          />

          {/* Reflet glossy 3D */}
          <Circle
            cx={NODE / 2}
            cy={NODE / 2}
            r={NODE / 2 - 5}
            fill="url(#shadow3D)"
          />
        </Svg>

        <View style={styles.iconOverlay}>
          {isLocked ? (
            <Text style={styles.lockIcon}>🔒</Text>
          ) : isCompleted ? (
            <Text style={styles.checkIcon}>✓</Text>
          ) : (
            <Text style={styles.starIcon}>{gameType === 'creativite' ? '✨' : '✍️'}</Text>
          )}
        </View>
      </View>
      
      <Text style={[styles.nodeLabel, { color: theme.textColor }]}>{stageNumber}</Text>
    </Pressable>
  );
}

export default function SoloGameRoadMap({
  gameType,
  games = [],
  currentStage = 1,
  completedStages = [],
  onStagePress,
}) {
  const theme = THEMES[gameType] || THEMES.creativite;
  const mapHeight = Math.max(420, games.length * STAGE_GAP + 160);
  
  const positions = useMemo(() => buildStagePositions(games.length, MAP_W, mapHeight), [games.length, mapHeight]);
  const pathD = useMemo(() => buildPathD(positions, MAP_W, mapHeight), [positions, mapHeight]);

  if (!games.length) {
    return (
      <View style={[styles.empty, { backgroundColor: theme.bgGrad[0] }]}>
        <Text style={styles.emptyEmoji}>🗺️</Text>
        <Text style={styles.emptyTitle}>Aucun niveau disponible</Text>
      </View>
    );
  }

  return (
    <View style={[styles.map, { height: mapHeight, width: MAP_W, borderColor: theme.pathBorder }]}>
      {/* Arrière-plan SVG complet avec dégradés, lueurs et décors spécifiques */}
      <Svg
        width={MAP_W}
        height={mapHeight}
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={theme.bgGrad[0]} />
            <Stop offset="100%" stopColor={theme.bgGrad[1]} />
          </LinearGradient>
          
          <LinearGradient id="glowPurple" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#db2777" stopOpacity={0.15} />
            <Stop offset="100%" stopColor="#7c3aed" stopOpacity={0.02} />
          </LinearGradient>
          <LinearGradient id="glowCyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#06b6d4" stopOpacity={0.14} />
            <Stop offset="100%" stopColor="#2563eb" stopOpacity={0.01} />
          </LinearGradient>
        </Defs>

        {/* Fond principal */}
        <Rect width="100%" height="100%" fill="url(#bgGrad)" />

        {/* Décors spécifiques */}
        {gameType === 'creativite' ? (
          <>
            <Circle cx={MAP_W * 0.2} cy={mapHeight * 0.75} r={140} fill="url(#glowPurple)" />
            <Circle cx={MAP_W * 0.8} cy={mapHeight * 0.25} r={160} fill="url(#glowPurple)" />

            {/* Bulles flottantes */}
            <Circle cx={MAP_W * 0.15} cy={mapHeight * 0.15} r={10} fill="rgba(255, 255, 255, 0.05)" />
            <Circle cx={MAP_W * 0.85} cy={mapHeight * 0.45} r={8} fill="rgba(255, 255, 255, 0.04)" />
            <Circle cx={MAP_W * 0.1} cy={mapHeight * 0.55} r={14} fill="rgba(255, 255, 255, 0.03)" />
            <Circle cx={MAP_W * 0.9} cy={mapHeight * 0.85} r={10} fill="rgba(255, 255, 255, 0.05)" />
            <Circle cx={MAP_W * 0.3} cy={mapHeight * 0.35} r={6} fill="rgba(255, 255, 255, 0.06)" />

            {/* Étoiles scintillantes */}
            <SvgText x={MAP_W * 0.22} y={mapHeight * 0.08} fill="rgba(255,255,255,0.12)" fontSize={22}>✦</SvgText>
            <SvgText x={MAP_W * 0.75} y={mapHeight * 0.55} fill="rgba(255,255,255,0.08)" fontSize={18}>✦</SvgText>
            <SvgText x={MAP_W * 0.82} y={mapHeight * 0.92} fill="rgba(255,255,255,0.14)" fontSize={26}>✦</SvgText>
            <SvgText x={MAP_W * 0.08} y={mapHeight * 0.38} fill="rgba(255,255,255,0.08)" fontSize={20}>✦</SvgText>
          </>
        ) : (
          <>
            <Circle cx={MAP_W * 0.15} cy={mapHeight * 0.65} r={130} fill="url(#glowCyan)" />
            <Circle cx={MAP_W * 0.85} cy={mapHeight * 0.3} r={150} fill="url(#glowCyan)" />

            {/* Grilles de Mots Croisés déco */}
            <G opacity={0.06} transform={`translate(24, ${mapHeight * 0.1}) rotate(-12)`}>
              <Rect x={0} y={0} width={20} height={20} stroke="#fff" strokeWidth={1.5} fill="none" />
              <Rect x={20} y={0} width={20} height={20} stroke="#fff" strokeWidth={1.5} fill="none" />
              <Rect x={20} y={20} width={20} height={20} stroke="#fff" strokeWidth={1.5} fill="none" />
              <Rect x={40} y={20} width={20} height={20} stroke="#fff" strokeWidth={1.5} fill="none" />
            </G>

            <G opacity={0.05} transform={`translate(${MAP_W - 80}, ${mapHeight * 0.5}) rotate(15)`}>
              <Rect x={0} y={0} width={18} height={18} stroke="#fff" strokeWidth={1.5} fill="none" />
              <Rect x={18} y={0} width={18} height={18} stroke="#fff" strokeWidth={1.5} fill="none" />
              <Rect x={18} y={18} width={18} height={18} stroke="#fff" strokeWidth={1.5} fill="none" />
              <Rect x={18} y={36} width={18} height={18} stroke="#fff" strokeWidth={1.5} fill="none" />
            </G>

            {/* Lettres flottantes */}
            <SvgText x={MAP_W * 0.18} y={mapHeight * 0.35} fill="rgba(255,255,255,0.06)" fontSize={34} fontWeight="bold" transform="rotate(-15, 60, 300)">A</SvgText>
            <SvgText x={MAP_W * 0.82} y={mapHeight * 0.18} fill="rgba(255,255,255,0.07)" fontSize={30} fontWeight="bold" transform="rotate(20, 280, 150)">W</SvgText>
            <SvgText x={MAP_W * 0.85} y={mapHeight * 0.72} fill="rgba(255,255,255,0.06)" fontSize={26} fontWeight="bold" transform="rotate(-8, 290, 480)">E</SvgText>
            <SvgText x={MAP_W * 0.12} y={mapHeight * 0.82} fill="rgba(255,255,255,0.07)" fontSize={32} fontWeight="bold" transform="rotate(12, 40, 520)">S</SvgText>
          </>
        )}

        {/* Le Chemin Sinueux multi-couches */}
        <Path
          d={pathD}
          stroke={theme.pathBase}
          strokeWidth={16}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d={pathD}
          stroke={theme.pathBorder}
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d={pathD}
          stroke={theme.pathInner}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={gameType === 'mots-croises' ? '5,6' : undefined}
        />
      </Svg>

      {/* Décorations 3D thématiques positionnées */}
      <DecorTree gameType={gameType} style={{ left: '8%', top: '15%' }} />
      <DecorRock gameType={gameType} style={{ left: '78%', top: '22%' }} />
      <DecorTree gameType={gameType} style={{ left: '82%', top: '40%', transform: [{ scale: 0.8 }] }} />
      <DecorRock gameType={gameType} style={{ left: '10%', top: '50%' }} />
      <DecorTree gameType={gameType} style={{ left: '6%', top: '70%', transform: [{ scale: 0.9 }] }} />
      <DecorRock gameType={gameType} style={{ left: '74%', top: '74%' }} />
      <DecorTree gameType={gameType} style={{ left: '80%', top: '88%', transform: [{ scale: 0.7 }] }} />

      {/* Niveaux */}
      {positions.map((pos, index) => {
        const game = games[index];
        const stageNumber = pos.stage;
        const status = getStageStatus(stageNumber, currentStage, completedStages);
        const canPlay = status !== 'locked';
        const left = pos.x - NODE / 2;
        const top = pos.y - NODE / 2;

        return (
          <View
            key={game?.id || stageNumber}
            style={[styles.stageAnchor, { left, top, width: NODE, height: NODE + 34 }]}
          >
            <LevelNode
              status={status}
              theme={theme}
              stageNumber={stageNumber}
              disabled={!canPlay}
              gameType={gameType}
              onPress={() => canPlay && onStagePress?.(stageNumber, game)}
            />
          </View>
        );
      })}

      {/* Drapeau départ (bas) */}
      <View style={[styles.flag, { bottom: 16, left: MAP_W * 0.16 }]}>
        <Text style={styles.flagEmoji}>🚩</Text>
        <Text style={[styles.flagLabel, { color: theme.textColor }]}>DÉPART</Text>
      </View>
      
      {/* Trophée d'arrivée (haut) */}
      <View style={[styles.flag, { top: 12, right: MAP_W * 0.14 }]}>
        <Text style={styles.flagEmoji}>🏆</Text>
        <Text style={[styles.flagLabel, { color: theme.textColor }]}>ARRIVÉE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    alignSelf: 'center',
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1.5,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },

  // Décors thématiques Créativité
  crystalContainer: {
    position: 'absolute',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crystalText: {
    fontSize: 20,
    textShadowColor: 'rgba(236,72,153,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  treeCrownInner: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    opacity: 0.6,
  },

  // Décors thématiques Mots Croisés
  book: {
    borderRadius: 2,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  tileRock: {
    position: 'absolute',
    width: 24,
    height: 24,
    backgroundColor: '#334155',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
    transform: [{ rotate: '12deg' }],
  },
  tileRockText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '900',
  },

  tree: { position: 'absolute', alignItems: 'center' },
  treeCrown: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  treeTrunk: {
    width: 8,
    height: 12,
    backgroundColor: '#6b3e26',
    borderRadius: 2,
    marginTop: -3,
    zIndex: -1,
  },

  stageAnchor: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  nodePress: { alignItems: 'center' },
  nodeStack: {
    width: NODE,
    height: NODE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    zIndex: 5,
  },
  nodeGlow: {
    position: 'absolute',
    width: NODE + 10,
    height: NODE + 10,
    borderRadius: (NODE + 10) / 2,
    borderWidth: 2,
    opacity: 0.7,
  },
  nodePulse: {
    position: 'absolute',
    width: NODE + 18,
    height: NODE + 18,
    borderRadius: (NODE + 18) / 2,
    borderWidth: 1.5,
    opacity: 0.35,
  },
  starIcon: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 2,
  },
  checkIcon: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  lockIcon: {
    fontSize: 18,
    opacity: 0.85,
  },
  nodeLabel: {
    marginTop: 4,
    fontSize: 12.5,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 3,
  },
  stars: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 1.5,
  },
  star: { fontSize: 13, textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1.5 },
  starOn: { color: '#fbbf24' },
  starOff: { color: 'rgba(251,191,36,0.15)' },

  flag: { position: 'absolute', zIndex: 5, alignItems: 'center' },
  flagEmoji: { fontSize: 26, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' },
  flagLabel: {
    fontSize: 8.5,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 24,
    minHeight: 200,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
