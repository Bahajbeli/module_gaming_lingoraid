import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Screen from '../components/Screen';
import AppButton from '../components/AppButton';
import CrosswordGrid, {
  buildTargets,
  buildCellEntries,
  getActiveEntry,
} from '../components/CrosswordGrid';
import api from '../api/client';
import { colors } from '../theme/colors';
import { markStageComplete } from '../utils/roadMapProgress';

export default function SoloCrosswordScreen({ navigation, route }) {
  const itemId = route.params?.itemId;
  const stageNumber = route.params?.stageNumber;
  const totalStages = route.params?.totalStages || 1;

  const gridRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cw, setCw] = useState(null);
  const [grid, setGrid] = useState([]);
  const [activeCell, setActiveCell] = useState(null);
  const [direction, setDirection] = useState('across');
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState(false);
  const [clueTab, setClueTab] = useState('across');

  useEffect(() => {
    if (!itemId) {
      navigation.replace('SoloRoadMap', { gameType: 'mots-croises' });
      return;
    }
    (async () => {
      try {
        await loadCrossword(itemId);
      } catch (e) {
        setError(e.response?.data?.error || 'Impossible de charger les mots croisés');
      } finally {
        setLoading(false);
      }
    })();
  }, [itemId, navigation]);

  const loadCrossword = async (id) => {
    const res = await api.get(`/api/crosswords/${id}`);
    const data = res.data;
    const base = Array.from({ length: data.height }, () =>
      Array.from({ length: data.width }, () => null)
    );
    setCw(data);
    setGrid(base);
    setActiveCell(null);
    setDirection('across');
    setChecked(false);
    setDone(false);
    setTimeout(() => {
      const first = [...(data.entries || [])].sort((a, b) => a.number - b.number)[0];
      if (first) gridRef.current?.selectEntry(first);
    }, 100);
  };

  const targets = useMemo(() => buildTargets(cw?.entries), [cw]);
  const cellEntries = useMemo(() => buildCellEntries(cw?.entries), [cw]);

  const activeEntry = useMemo(() => {
    if (!activeCell || !cw?.entries) return null;
    return getActiveEntry(cw.entries, cellEntries, activeCell.r, activeCell.c, direction);
  }, [activeCell, cellEntries, cw, direction]);

  const filledCount = useMemo(() => {
    let n = 0;
    let total = 0;
    for (const key in targets) {
      total++;
      const [r, c] = key.split(',').map(Number);
      if (grid[r]?.[c]) n++;
    }
    return { n, total };
  }, [grid, targets]);

  const score = useMemo(() => {
    if (!Object.keys(targets).length) return 0;
    let ok = 0;
    let total = 0;
    for (const key in targets) {
      total++;
      const [r, c] = key.split(',').map(Number);
      const val = (grid[r]?.[c] || '').toUpperCase();
      if (val === targets[key]) ok++;
    }
    return Math.round((ok / total) * 100);
  }, [grid, targets]);

  const allFilled = filledCount.n === filledCount.total && filledCount.total > 0;
  const allCorrect = score === 100 && filledCount.total > 0;

  const acrossClues = useMemo(
    () =>
      (cw?.entries || [])
        .filter((e) => e.direction === 'across')
        .sort((a, b) => a.number - b.number),
    [cw]
  );

  const downClues = useMemo(
    () =>
      (cw?.entries || [])
        .filter((e) => e.direction === 'down')
        .sort((a, b) => a.number - b.number),
    [cw]
  );

  const clues = clueTab === 'across' ? acrossClues : downClues;

  const handleVerify = async () => {
    if (!checked) {
      if (!allFilled) return;
      setChecked(true);
      return;
    }
    if (stageNumber) {
      await markStageComplete('mots-croises', stageNumber, totalStages);
    }
    setDone(true);
  };

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
        <AppButton title="Retour" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  if (done) {
    return (
      <Screen>
        <Text style={styles.doneTitle}>Mots croisés terminés</Text>
        {stageNumber ? (
          <Text style={styles.stageLbl}>
            Étape {stageNumber} / {totalStages}
          </Text>
        ) : null}
        <Text style={[styles.doneScore, allCorrect && { color: colors.success }]}>
          Score : {score}%
        </Text>
        <AppButton
          title="Retour au parcours"
          onPress={() => navigation.navigate('SoloRoadMap', { gameType: 'mots-croises' })}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} style={styles.screen}>
      <View style={styles.header}>
        <AppButton
          title="← Retour"
          variant="outline"
          onPress={() => navigation.goBack()}
          style={styles.back}
        />
        <Text style={styles.title} numberOfLines={2}>
          {cw?.title || 'Mots croisés'}
        </Text>
        {stageNumber ? (
          <Text style={styles.stageLbl}>
            Étape {stageNumber} / {totalStages}
          </Text>
        ) : null}
        <Text style={styles.progress}>
          {filledCount.n}/{filledCount.total} lettres
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <CrosswordGrid
          ref={gridRef}
          width={cw.width}
          height={cw.height}
          entries={cw.entries}
          grid={grid}
          onGridChange={setGrid}
          checked={checked}
          activeCell={activeCell}
          onActiveCellChange={setActiveCell}
          direction={direction}
          onDirectionChange={setDirection}
        />

        {activeEntry ? (
          <View style={styles.activeClue}>
            <Text style={styles.activeClueNum}>
              {activeEntry.number}. {activeEntry.direction === 'down' ? '↓' : '→'}
            </Text>
            <Text style={styles.activeClueText}>{activeEntry.clue}</Text>
          </View>
        ) : (
          <Text style={styles.hint}>Touchez une case pour commencer</Text>
        )}

        <View style={styles.cluePanel}>
          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, clueTab === 'across' && styles.tabActive]}
              onPress={() => setClueTab('across')}
            >
              <Text style={[styles.tabText, clueTab === 'across' && styles.tabTextActive]}>
                → Horizontales ({acrossClues.length})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, clueTab === 'down' && styles.tabActive]}
              onPress={() => setClueTab('down')}
            >
              <Text style={[styles.tabText, clueTab === 'down' && styles.tabTextActive]}>
                ↓ Verticales ({downClues.length})
              </Text>
            </Pressable>
          </View>

          {clues.map((e) => {
            const isActive = activeEntry?.id === e.id;
            return (
              <Pressable
                key={e.id}
                style={[styles.clueRow, isActive && styles.clueRowActive]}
                onPress={() => gridRef.current?.selectEntry(e)}
              >
                <Text style={[styles.clueNum, isActive && styles.clueNumActive]}>
                  {e.number}.
                </Text>
                <View style={styles.clueBody}>
                  <Text style={[styles.clueLine, isActive && styles.clueLineActive]}>
                    {e.clue}
                  </Text>
                  <Text style={styles.clueMeta}>{e.answer.length} lettres</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {checked && (
          <Text style={[styles.feedback, allCorrect && { color: colors.success }]}>
            {allCorrect ? 'Bravo, tout est correct !' : `${score}% de bonnes lettres`}
          </Text>
        )}
        <AppButton
          title={checked ? 'Terminer' : 'Vérifier'}
          onPress={handleVerify}
          disabled={!checked && !allFilled}
        />
        {!allFilled && !checked ? (
          <Text style={styles.footerHint}>Remplissez toutes les cases pour vérifier</Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  header: { paddingHorizontal: 4, marginBottom: 8 },
  back: { alignSelf: 'flex-start', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  stageLbl: { fontSize: 13, color: colors.primary, fontWeight: '700', marginTop: 2 },
  progress: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },
  hint: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 12,
  },
  activeClue: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  activeClueNum: { fontWeight: '800', color: colors.primary, marginBottom: 4 },
  activeClueText: { fontSize: 15, color: colors.text, lineHeight: 22 },
  cluePanel: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  tabTextActive: { color: '#fff' },
  clueRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  clueRowActive: { backgroundColor: '#eef2ff' },
  clueNum: { width: 28, fontWeight: '800', color: colors.primary, fontSize: 15 },
  clueNumActive: { color: colors.primaryDark },
  clueBody: { flex: 1 },
  clueLine: { fontSize: 14, color: colors.text, lineHeight: 20 },
  clueLineActive: { fontWeight: '600' },
  clueMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  feedback: {
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '600',
    color: colors.error,
  },
  footerHint: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
  },
  muted: { textAlign: 'center', marginTop: 12, color: colors.textMuted },
  error: { color: colors.error, marginBottom: 16, textAlign: 'center' },
  doneTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  doneScore: { fontSize: 18, textAlign: 'center', color: colors.textMuted, marginBottom: 24 },
});
