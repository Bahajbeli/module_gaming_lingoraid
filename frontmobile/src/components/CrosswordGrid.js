import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { colors } from '../theme/colors';

function buildTargets(entries) {
  const map = {};
  if (!entries) return map;
  for (const e of entries) {
    for (let i = 0; i < e.answer.length; i++) {
      const r = e.row + (e.direction === 'down' ? i : 0);
      const c = e.col + (e.direction === 'across' ? i : 0);
      map[`${r},${c}`] = e.answer[i].toUpperCase();
    }
  }
  return map;
}

function buildStartNumbers(entries) {
  const starts = {};
  if (!entries) return starts;
  const positionMap = new Map();
  const sorted = [...entries].sort((a, b) => a.number - b.number);
  for (const e of sorted) {
    const key = `${e.row},${e.col}`;
    if (!positionMap.has(key)) {
      positionMap.set(key, e.number);
      starts[key] = e.number;
    } else if (e.number < positionMap.get(key)) {
      positionMap.set(key, e.number);
      starts[key] = e.number;
    }
  }
  return starts;
}

function buildCellEntries(entries) {
  const map = {};
  if (!entries) return map;
  for (const e of entries) {
    for (let i = 0; i < e.answer.length; i++) {
      const r = e.row + (e.direction === 'down' ? i : 0);
      const c = e.col + (e.direction === 'across' ? i : 0);
      const key = `${r},${c}`;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    }
  }
  return map;
}

function getWordCells(entry) {
  const cells = [];
  for (let i = 0; i < entry.answer.length; i++) {
    cells.push({
      r: entry.row + (entry.direction === 'down' ? i : 0),
      c: entry.col + (entry.direction === 'across' ? i : 0),
    });
  }
  return cells;
}

export function getActiveEntry(entries, cellEntries, r, c, direction) {
  const list = cellEntries[`${r},${c}`] || [];
  return list.find((e) => e.direction === direction) || list[0] || null;
}

const CrosswordGrid = forwardRef(function CrosswordGrid(
  {
    width,
    height,
    entries,
    grid,
    onGridChange,
    checked,
    activeCell,
    onActiveCellChange,
    direction,
    onDirectionChange,
  },
  ref
) {
  const { width: windowW } = useWindowDimensions();
  const inputRef = useRef(null);
  const [inputVal, setInputVal] = useState('');

  const targets = useMemo(() => buildTargets(entries), [entries]);
  const startNumbers = useMemo(() => buildStartNumbers(entries), [entries]);
  const cellEntries = useMemo(() => buildCellEntries(entries), [entries]);

  const padding = 48;
  const cellSize = Math.max(
    22,
    Math.min(40, Math.floor((windowW - padding) / Math.max(width, 1)))
  );

  const highlighted = useMemo(() => {
    const set = new Set();
    if (!activeCell) return set;
    const entry = getActiveEntry(entries, cellEntries, activeCell.r, activeCell.c, direction);
    if (!entry) return set;
    getWordCells(entry).forEach(({ r, c }) => set.add(`${r},${c}`));
    return set;
  }, [activeCell, cellEntries, direction, entries]);

  const setCell = useCallback(
    (r, c, val) => {
      onGridChange((g) => {
        const copy = g.map((row) => row.slice());
        copy[r][c] = val ? val.toUpperCase() : null;
        return copy;
      });
    },
    [onGridChange]
  );

  const findNextCell = useCallback(
    (r, c, dir) => {
      if (dir === 'across') {
        for (let nc = c + 1; nc < width; nc++) {
          if (`${r},${nc}` in targets) return { r, c: nc };
        }
      } else {
        for (let nr = r + 1; nr < height; nr++) {
          if (`${nr},${c}` in targets) return { r: nr, c };
        }
      }
      return null;
    },
    [height, targets, width]
  );

  const findPrevCell = useCallback(
    (r, c, dir) => {
      if (dir === 'across') {
        for (let nc = c - 1; nc >= 0; nc--) {
          if (`${r},${nc}` in targets) return { r, c: nc };
        }
      } else {
        for (let nr = r - 1; nr >= 0; nr--) {
          if (`${nr},${c}` in targets) return { r: nr, c };
        }
      }
      return null;
    },
    [targets]
  );

  const focusCell = useCallback(
    (r, c) => {
      const list = cellEntries[`${r},${c}`];
      if (!list?.length) return;
      if (activeCell?.r === r && activeCell?.c === c && list.length > 1) {
        const other = list.find((e) => e.direction !== direction);
        if (other) onDirectionChange(other.direction);
      } else if (!list.some((e) => e.direction === direction)) {
        onDirectionChange(list[0].direction);
      }
      onActiveCellChange({ r, c });
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [activeCell, cellEntries, direction, onActiveCellChange, onDirectionChange]
  );

  const selectEntry = useCallback(
    (entry) => {
      onDirectionChange(entry.direction);
      const cells = getWordCells(entry);
      const empty = cells.find(({ r, c }) => !grid[r]?.[c]);
      const target = empty || cells[0];
      onActiveCellChange({ r: target.r, c: target.c });
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [grid, onActiveCellChange, onDirectionChange]
  );

  useImperativeHandle(ref, () => ({ selectEntry, focusCell }), [selectEntry, focusCell]);

  const handleLetter = useCallback(
    (text) => {
      if (!activeCell) return;
      const letter = text.replace(/[^a-zA-ZäöüßÄÖÜ]/gi, '').slice(-1).toUpperCase();
      if (!letter) return;
      const { r, c } = activeCell;
      setCell(r, c, letter);
      setInputVal('');
      const next = findNextCell(r, c, direction);
      if (next) onActiveCellChange(next);
    },
    [activeCell, direction, findNextCell, onActiveCellChange, setCell]
  );

  const handleBackspace = useCallback(() => {
    if (!activeCell) return;
    const { r, c } = activeCell;
    const val = grid[r]?.[c];
    if (val) {
      setCell(r, c, null);
      return;
    }
    const prev = findPrevCell(r, c, direction);
    if (prev) {
      setCell(prev.r, prev.c, null);
      onActiveCellChange(prev);
    }
  }, [activeCell, direction, findPrevCell, grid, onActiveCellChange, setCell]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.grid, { borderColor: colors.border }]}>
        {Array.from({ length: height }).map((_, r) => (
          <View key={r} style={styles.row}>
            {Array.from({ length: width }).map((__, c) => {
              const key = `${r},${c}`;
              const isTarget = key in targets;
              if (!isTarget) {
                return (
                  <View
                    key={c}
                    style={[
                      styles.cell,
                      styles.black,
                      { width: cellSize, height: cellSize },
                    ]}
                  />
                );
              }

              const number = startNumbers[key];
              const val = grid[r]?.[c] || '';
              const isActive = activeCell?.r === r && activeCell?.c === c;
              const isHighlight = highlighted.has(key);
              let bg = colors.surface;
              let border = colors.border;
              let textColor = colors.text;

              if (checked && val) {
                if (val.toUpperCase() === targets[key]) {
                  bg = '#dcfce7';
                  border = colors.success;
                  textColor = '#166534';
                } else {
                  bg = '#fee2e2';
                  border = colors.error;
                  textColor = '#991b1b';
                }
              } else if (isActive) {
                bg = '#c7d2fe';
                border = colors.primary;
              } else if (isHighlight) {
                bg = '#e0e7ff';
                border = '#a5b4fc';
              }

              return (
                <Pressable
                  key={c}
                  onPress={() => focusCell(r, c)}
                  style={[
                    styles.cell,
                    styles.letterCell,
                    {
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: bg,
                      borderColor: border,
                    },
                  ]}
                >
                  {number ? (
                    <Text style={[styles.number, { fontSize: Math.max(8, cellSize * 0.28) }]}>
                      {number}
                    </Text>
                  ) : null}
                  <Text
                    style={[
                      styles.letter,
                      {
                        fontSize: Math.max(14, cellSize * 0.48),
                        color: textColor,
                      },
                    ]}
                  >
                    {val}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <TextInput
        ref={inputRef}
        value={inputVal}
        onChangeText={handleLetter}
        onKeyPress={({ nativeEvent }) => {
          if (nativeEvent.key === 'Backspace') handleBackspace();
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        style={styles.hiddenInput}
        caretHidden
      />

      <View style={styles.dirRow}>
        <Pressable
          style={[styles.dirBtn, direction === 'across' && styles.dirBtnActive]}
          onPress={() => onDirectionChange('across')}
        >
          <Text style={[styles.dirText, direction === 'across' && styles.dirTextActive]}>
            → Horizontal
          </Text>
        </Pressable>
        <Pressable
          style={[styles.dirBtn, direction === 'down' && styles.dirBtnActive]}
          onPress={() => onDirectionChange('down')}
        >
          <Text style={[styles.dirText, direction === 'down' && styles.dirTextActive]}>
            ↓ Vertical
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

export default CrosswordGrid;
export { buildTargets, buildCellEntries };

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: 8 },
  grid: {
    borderWidth: 2,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
  },
  row: { flexDirection: 'row' },
  cell: { borderWidth: StyleSheet.hairlineWidth },
  black: { backgroundColor: '#1e293b', borderColor: '#334155' },
  letterCell: { alignItems: 'center', justifyContent: 'center' },
  number: {
    position: 'absolute',
    top: 1,
    left: 2,
    fontWeight: '700',
    color: colors.textMuted,
  },
  letter: { fontWeight: '800', textTransform: 'uppercase' },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
  dirRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    width: '100%',
    justifyContent: 'center',
  },
  dirBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dirBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dirText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  dirTextActive: { color: '#fff' },
});
