import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../components/AppButton';
import api, { getAssetUrl } from '../api/client';
import { colors } from '../theme/colors';
import { markStageComplete } from '../utils/roadMapProgress';

const MARKER_SIZE = 44;

function getContainedImageRect(containerW, containerH, naturalW, naturalH) {
  if (!containerW || !containerH) return { x: 0, y: 0, w: 0, h: 0 };
  if (!naturalW || !naturalH) {
    return { x: 0, y: 0, w: containerW, h: containerH };
  }
  const scale = Math.min(containerW / naturalW, containerH / naturalH);
  const w = naturalW * scale;
  const h = naturalH * scale;
  return { x: (containerW - w) / 2, y: (containerH - h) / 2, w, h };
}

function getMarkerCenter(point, imgRect, natural) {
  const { w: nw, h: nh } = natural;
  let cx;
  let cy;
  if (point.xpct != null && point.ypct != null) {
    cx = point.xpct * imgRect.w;
    cy = point.ypct * imgRect.h;
  } else if (nw && nh) {
    cx = (point.x / nw) * imgRect.w;
    cy = (point.y / nh) * imgRect.h;
  } else {
    cx = point.x ?? 0;
    cy = point.y ?? 0;
  }
  return {
    left: imgRect.x + cx - MARKER_SIZE / 2,
    top: imgRect.y + cy - MARKER_SIZE / 2,
  };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SoloCreativityScreen({ navigation, route }) {
  const itemId = route.params?.itemId;
  const stageNumber = route.params?.stageNumber;
  const totalStages = route.params?.totalStages || 1;

  const { height: windowH, width: windowW } = useWindowDimensions();
  const imageHeight = Math.min(windowH * 0.42, 320);
  const imageWidth = windowW - 32;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cfg, setCfg] = useState(null);
  const [assign, setAssign] = useState({});
  const [pickedLabel, setPickedLabel] = useState(null);
  const [activePoint, setActivePoint] = useState(null);
  const [done, setDone] = useState(false);
  const [layoutSize, setLayoutSize] = useState({ w: 0, h: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });

  const loadItem = useCallback(async (id) => {
    if (!id) {
      setError('Aucune activité sélectionnée');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    setAssign({});
    setPickedLabel(null);
    setActivePoint(null);
    setDone(false);
    setLayoutSize({ w: 0, h: 0 });
    setNaturalSize({ w: 0, h: 0 });
    try {
      const res = await api.get(`/api/creativity/item/${id}`);
      setCfg(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!itemId) {
      navigation.replace('SoloRoadMap', { gameType: 'creativite' });
      return;
    }
    loadItem(itemId);
  }, [itemId, loadItem, navigation]);

  // Ordre fixe = numéros sur l’image (1, 2, 3…)
  const points = useMemo(() => {
    if (!cfg?.points?.length) return [];
    return [...cfg.points];
  }, [cfg]);

  const labels = useMemo(() => {
    if (!cfg?.points?.length) return [];
    return shuffle(cfg.points.map((p) => p.text).filter(Boolean));
  }, [cfg]);

  const assignedCount = Object.keys(assign).length;
  const totalPoints = points.length;

  const score = useMemo(() => {
    if (!points.length) return 0;
    let ok = 0;
    points.forEach((p, i) => {
      const li = assign[i];
      if (li != null && labels[li] === p.text) ok += 1;
    });
    return Math.round((ok / points.length) * 100);
  }, [assign, labels, points]);

  const isLabelUsed = (labelIndex) => Object.values(assign).includes(labelIndex);

  const clearPoint = (pointIndex) => {
    setAssign((a) => {
      const next = { ...a };
      delete next[pointIndex];
      return next;
    });
    if (activePoint === pointIndex) setActivePoint(null);
  };

  const resetAll = () => {
    setAssign({});
    setPickedLabel(null);
    setActivePoint(null);
  };

  const onWordPress = (labelIndex) => {
    if (isLabelUsed(labelIndex)) return;
    if (activePoint != null) {
      setAssign((a) => ({ ...a, [activePoint]: labelIndex }));
      setActivePoint(null);
      setPickedLabel(null);
      return;
    }
    setPickedLabel((prev) => (prev === labelIndex ? null : labelIndex));
    setActivePoint(null);
  };

  const onMarkerPress = (pointIndex) => {
    if (pickedLabel != null) {
      setAssign((a) => ({ ...a, [pointIndex]: pickedLabel }));
      setPickedLabel(null);
      setActivePoint(null);
      return;
    }
    if (assign[pointIndex] != null) {
      clearPoint(pointIndex);
      return;
    }
    setActivePoint((prev) => (prev === pointIndex ? null : pointIndex));
    setPickedLabel(null);
  };

  const imgRect = useMemo(
    () => getContainedImageRect(layoutSize.w, layoutSize.h, naturalSize.w, naturalSize.h),
    [layoutSize, naturalSize]
  );

  const instruction = useMemo(() => {
    if (pickedLabel != null) {
      return `Touchez le numéro sur l’image pour placer « ${labels[pickedLabel]} »`;
    }
    if (activePoint != null) {
      return `Choisissez le mot allemand pour le n° ${activePoint + 1} sur l’image`;
    }
    return '1. Touchez un mot · 2. Touchez le numéro correspondant sur l’image';
  }, [pickedLabel, activePoint, labels]);

  const onImageLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    setLayoutSize({ w: width, h: height });
  }, []);

  const onImageLoad = useCallback((e) => {
    const { width, height } = e.nativeEvent.source;
    setNaturalSize({ w: width, h: height });
  }, []);

  if (loading && !cfg) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        <Text style={styles.muted}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  if (error && !cfg) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.pad}>
          <Text style={styles.error}>{error}</Text>
          <AppButton title="Retour" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  if (done) {
    const correct = points.filter((p, i) => labels[assign[i]] === p.text).length;
    const goRoadMap = () =>
      navigation.navigate('SoloRoadMap', { gameType: 'creativite' });

    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.pad, styles.centered]}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneTitle}>Bravo !</Text>
          <Text style={styles.doneScore}>{score}%</Text>
          <Text style={styles.doneDetail}>
            {correct} / {totalPoints} associations correctes
          </Text>
          <AppButton title="Retour au parcours" onPress={goRoadMap} />
          <AppButton
            title="Recommencer"
            variant="outline"
            onPress={() => {
              setDone(false);
              resetAll();
            }}
            style={{ marginTop: 10, width: '100%' }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* En-tête fixe */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.backLink}>←</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {cfg?.title || 'Associer les mots'}
          </Text>
          {stageNumber ? (
            <Text style={styles.headerSub} numberOfLines={1}>
              Étape {stageNumber} / {totalStages}
            </Text>
          ) : null}
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {assignedCount}/{totalPoints}
          </Text>
        </View>
      </View>

      {/* Bandeau instruction */}
      <View
        style={[
          styles.instructionBar,
          (pickedLabel != null || activePoint != null) && styles.instructionBarActive,
        ]}
      >
        <Text style={styles.instructionText}>{instruction}</Text>
      </View>

      {/* Image + repères numérotés positionnés sur les personnes / objets */}
      <View
        style={[styles.imageBox, { height: imageHeight, width: imageWidth }]}
        onLayout={onImageLayout}
      >
        <Image
          source={{ uri: getAssetUrl(cfg?.image) }}
          style={styles.image}
          resizeMode="contain"
          onLoad={onImageLoad}
        />
        {layoutSize.w > 0 &&
          points.map((p, i) => {
            const { left, top } = getMarkerCenter(p, imgRect, naturalSize);
            const labelIdx = assign[i];
            const isActive = activePoint === i;
            const isFilled = labelIdx != null;
            const word = isFilled ? labels[labelIdx] : null;
            return (
              <View key={i} style={[styles.markerWrap, { left, top }]}>
                <Pressable
                  onPress={() => onMarkerPress(i)}
                  style={[
                    styles.marker,
                    isActive && styles.markerActive,
                    isFilled && styles.markerFilled,
                  ]}
                  accessibilityLabel={`Point ${i + 1}${word ? `, ${word}` : ''}`}
                >
                  <Text style={styles.markerNum}>{i + 1}</Text>
                </Pressable>
                {word ? (
                  <View style={styles.markerTag}>
                    <Text style={styles.markerTagText} numberOfLines={1}>
                      {word}
                    </Text>
                    <Pressable
                      onPress={() => clearPoint(i)}
                      hitSlop={6}
                      style={styles.markerTagClear}
                    >
                      <Text style={styles.markerTagClearText}>✕</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
      </View>

      {/* Légende rapide sous l’image */}
      <View style={styles.legendRow}>
        {points.map((_, i) => {
          const filled = assign[i] != null;
          return (
            <View
              key={i}
              style={[styles.legendChip, filled && styles.legendChipFilled]}
            >
              <Text style={styles.legendNum}>{i + 1}</Text>
              <Text style={styles.legendWord} numberOfLines={1}>
                {filled ? labels[assign[i]] : '—'}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.spacer} />

      {/* Banque de mots — panneau bas fixe */}
      <View style={styles.wordPanel}>
        <Text style={styles.wordPanelTitle}>Mots allemands</Text>
        <View style={styles.wordGrid}>
          {labels.map((label, i) => {
            const used = isLabelUsed(i);
            const selected = pickedLabel === i;
            return (
              <Pressable
                key={`${label}-${i}`}
                onPress={() => onWordPress(i)}
                disabled={used}
                style={[
                  styles.wordChip,
                  selected && styles.wordChipSelected,
                  used && styles.wordChipUsed,
                ]}
              >
                <Text
                  style={[
                    styles.wordChipText,
                    selected && styles.wordChipTextSelected,
                    used && styles.wordChipTextUsed,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.footerRow}>
          <Pressable onPress={resetAll}>
            <Text style={styles.resetText}>Réinitialiser</Text>
          </Pressable>
          <Text style={styles.scoreMini}>{score}%</Text>
          <AppButton
            title="Valider"
            onPress={async () => {
              if (stageNumber) {
                await markStageComplete('creativite', stageNumber, totalStages);
              }
              setDone(true);
            }}
            disabled={assignedCount < totalPoints}
            style={styles.validateBtn}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  pad: { padding: 20, flexGrow: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backLink: { fontSize: 22, color: colors.primary, fontWeight: '600', width: 32 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  headerSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  instructionBar: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  instructionBarActive: {
    borderColor: colors.primary,
    backgroundColor: '#eef2ff',
  },
  instructionText: {
    fontSize: 13,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 18,
  },

  imageBox: {
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },

  markerWrap: {
    position: 'absolute',
    width: MARKER_SIZE,
    alignItems: 'center',
    zIndex: 10,
  },
  marker: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerActive: {
    backgroundColor: colors.secondary,
    transform: [{ scale: 1.12 }],
    borderColor: '#fde68a',
  },
  markerFilled: {
    backgroundColor: colors.success,
  },
  markerNum: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
  },
  markerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    maxWidth: 100,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: 4,
    paddingLeft: 8,
    paddingRight: 4,
    borderWidth: 1,
    borderColor: colors.success,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  markerTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
    maxWidth: 72,
  },
  markerTagClear: {
    marginLeft: 2,
    padding: 2,
  },
  markerTagClearText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '700',
  },

  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  legendChipFilled: {
    borderColor: colors.success,
    backgroundColor: '#f0fdf4',
  },
  legendNum: {
    fontWeight: '800',
    color: colors.primary,
    fontSize: 13,
  },
  legendWord: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    maxWidth: 72,
  },
  spacer: { flex: 1, minHeight: 8 },

  wordPanel: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  wordPanelTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  wordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  wordChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    minWidth: '30%',
    flexGrow: 1,
    alignItems: 'center',
  },
  wordChipSelected: {
    borderColor: colors.primary,
    backgroundColor: '#eef2ff',
  },
  wordChipUsed: { opacity: 0.35 },
  wordChipText: { fontSize: 15, fontWeight: '700', color: colors.text },
  wordChipTextSelected: { color: colors.primary },
  wordChipTextUsed: { color: colors.textMuted },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resetText: { fontSize: 13, color: colors.primary, fontWeight: '600', width: 80 },
  scoreMini: { fontSize: 16, fontWeight: '800', color: colors.primary, width: 44 },
  validateBtn: { flex: 1 },

  muted: { textAlign: 'center', marginTop: 12, color: colors.textMuted },
  error: { color: colors.error, marginBottom: 16, textAlign: 'center' },
  screenTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 16 },
  pickCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  doneEmoji: { fontSize: 48, marginBottom: 8 },
  doneTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  doneScore: { fontSize: 40, fontWeight: '800', color: colors.primary, marginVertical: 8 },
  doneDetail: { fontSize: 15, color: colors.textMuted, marginBottom: 28 },
});
