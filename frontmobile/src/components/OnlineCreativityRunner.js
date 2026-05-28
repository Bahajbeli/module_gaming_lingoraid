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
import AppButton from './AppButton';
import api, { getAssetUrl } from '../api/client';
import { colors } from '../theme/colors';

const MARKER_SIZE = 40;

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

export default function OnlineCreativityRunner({ itemId, onComplete }) {
  const { height: windowH, width: windowW } = useWindowDimensions();
  const imageHeight = Math.min(windowH * 0.4, 280);
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
    if (itemId) loadItem(itemId);
  }, [itemId, loadItem]);

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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.muted}>Chargement…</Text>
      </View>
    );
  }

  if (error && !cfg) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (done) {
    return (
      <View style={styles.center}>
        <Text style={styles.doneEmoji}>🎉</Text>
        <Text style={styles.doneTitle}>Bravo !</Text>
        <Text style={styles.doneScore}>{score}%</Text>
        <Text style={styles.waitMessage}>En attente de l'adversaire...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {cfg?.title || 'Créativité'}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {assignedCount}/{totalPoints}
          </Text>
        </View>
      </View>

      <View style={[styles.imageBox, { height: imageHeight, width: imageWidth }]} onLayout={onImageLayout}>
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
                >
                  <Text style={styles.markerNum}>{i + 1}</Text>
                </Pressable>
                {word ? (
                  <View style={styles.markerTag}>
                    <Text style={styles.markerTagText} numberOfLines={1}>
                      {word}
                    </Text>
                    <Pressable onPress={() => clearPoint(i)} hitSlop={6} style={styles.markerTagClear}>
                      <Text style={styles.markerTagClearText}>✕</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
      </View>

      <View style={styles.wordPanel}>
        <Text style={styles.wordPanelTitle}>Mots à placer</Text>
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
            <Text style={styles.resetText}>Effacer</Text>
          </Pressable>
          <AppButton
            title="Valider"
            onPress={() => {
              setDone(true);
              onComplete?.(score);
            }}
            disabled={assignedCount < totalPoints}
            style={styles.validateBtn}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
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
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerActive: { backgroundColor: colors.secondary, transform: [{ scale: 1.1 }] },
  markerFilled: { backgroundColor: colors.success },
  markerNum: { color: '#fff', fontWeight: '900', fontSize: 16 },
  markerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    backgroundColor: colors.surface,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.success,
  },
  markerTagText: { fontSize: 10, fontWeight: '700', color: colors.text, maxWidth: 60 },
  markerTagClear: { marginLeft: 2 },
  markerTagClearText: { fontSize: 10, color: colors.error, fontWeight: '700' },
  wordPanel: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wordPanelTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 8 },
  wordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  wordChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wordChipSelected: { borderColor: colors.primary, backgroundColor: '#eef2ff' },
  wordChipUsed: { opacity: 0.35 },
  wordChipText: { fontSize: 13, fontWeight: '700', color: colors.text },
  wordChipTextSelected: { color: colors.primary },
  wordChipTextUsed: { color: colors.textMuted },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 'auto' },
  resetText: { fontSize: 13, color: colors.primary, fontWeight: '600', width: 60 },
  validateBtn: { flex: 1, paddingVertical: 10 },
  muted: { textAlign: 'center', marginTop: 12, color: colors.textMuted },
  error: { color: colors.error, marginBottom: 16, textAlign: 'center' },
  doneEmoji: { fontSize: 40, marginBottom: 8 },
  doneTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  doneScore: { fontSize: 32, fontWeight: '800', color: colors.primary, marginVertical: 8 },
  waitMessage: { textAlign: 'center', color: '#10b981', fontWeight: '700', marginTop: 16 },
});
