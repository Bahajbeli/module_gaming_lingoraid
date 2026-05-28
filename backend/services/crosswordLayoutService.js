/**
 * Crossword grid placement (same algorithm as routes/crosswords.js).
 */

function normalizeEntryNumbers(entries) {
  if (!Array.isArray(entries)) return [];
  const out = entries.map((e) => ({ ...e }));
  const positionMap = new Map();
  let number = 1;

  out.sort((a, b) => (a.row === b.row ? a.col - b.col : a.row - b.row));

  for (const e of out) {
    const key = `${e.row},${e.col}`;
    if (!positionMap.has(key)) {
      positionMap.set(key, number++);
    }
    e.number = positionMap.get(key);
  }

  return out;
}

function tryAutoLayout(width, height, words) {
  const grid = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => null)
  );
  const entries = [];
  let number = 1;

  const inBounds = (r, c) => r >= 0 && r < height && c >= 0 && c < width;

  const canPlace = (r, c, dir, word) => {
    const len = word.length;
    for (let i = 0; i < len; i++) {
      const rr = r + (dir === 'down' ? i : 0);
      const cc = c + (dir === 'across' ? i : 0);
      if (!inBounds(rr, cc)) return false;
      const cell = grid[rr][cc];
      if (cell && cell !== word[i]) return false;
    }
    return true;
  };

  const place = (r, c, dir, word, clue) => {
    for (let i = 0; i < word.length; i++) {
      const rr = r + (dir === 'down' ? i : 0);
      const cc = c + (dir === 'across' ? i : 0);
      grid[rr][cc] = word[i];
    }

    let existingNumber = null;
    for (const entry of entries) {
      if (entry.row === r && entry.col === c) {
        existingNumber = entry.number;
        break;
      }
    }

    const finalNumber = existingNumber || number++;
    entries.push({
      row: r,
      col: c,
      direction: dir,
      number: finalNumber,
      clue,
      answer: word,
    });
  };

  const indexByLetter = new Map();
  const addIndexForPlaced = () => {
    indexByLetter.clear();
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const ch = grid[r][c];
        if (!ch) continue;
        if (!indexByLetter.has(ch)) indexByLetter.set(ch, []);
        indexByLetter.get(ch).push({ r, c });
      }
    }
  };

  const shuffled = [...words].sort(() => Math.random() - 0.5);

  for (let w = 0; w < shuffled.length; w++) {
    const raw = String(shuffled[w].answer || '')
      .toUpperCase()
      .replace(/[^A-ZÄÖÜẞ]/g, '');
    const clue = String(shuffled[w].clue || '').trim();
    if (!raw) continue;

    if (entries.length === 0) {
      if (raw.length <= width) {
        const startC = Math.max(0, Math.floor((width - raw.length) / 2));
        const startR = Math.floor(height / 2);
        place(startR, startC, 'across', raw, clue);
      } else if (raw.length <= height) {
        const startR = Math.max(0, Math.floor((height - raw.length) / 2));
        const startC = Math.floor(width / 2);
        place(startR, startC, 'down', raw, clue);
      }
      addIndexForPlaced();
      continue;
    }

    addIndexForPlaced();
    let placed = false;
    let best = null;

    for (let i = 0; i < raw.length; i++) {
      const letter = raw[i];
      const spots = indexByLetter.get(letter) || [];
      for (const spot of spots) {
        const startCol = spot.c - i;
        const startRow = spot.r - i;
        if (canPlace(spot.r, startCol, 'across', raw)) {
          let score = 0;
          for (let k = 0; k < raw.length; k++) {
            if (grid[spot.r][startCol + k]) score++;
          }
          if (!best || score > best.score) {
            best = { r: spot.r, c: startCol, dir: 'across', score };
          }
        }
        if (canPlace(startRow, spot.c, 'down', raw)) {
          let score = 0;
          for (let k = 0; k < raw.length; k++) {
            if (grid[startRow + k][spot.c]) score++;
          }
          if (!best || score > best.score) {
            best = { r: startRow, c: spot.c, dir: 'down', score };
          }
        }
      }
    }

    if (best) {
      place(best.r, best.c, best.dir, raw, clue);
      placed = true;
    }
    if (placed) continue;

    outer: for (let r = 0; r < height && !placed; r++) {
      for (let c = 0; c <= width - raw.length; c++) {
        if (canPlace(r, c, 'across', raw)) {
          place(r, c, 'across', raw, clue);
          placed = true;
          break outer;
        }
      }
    }

    if (!placed) {
      outer2: for (let c = 0; c < width && !placed; c++) {
        for (let r = 0; r <= height - raw.length; r++) {
          if (canPlace(r, c, 'down', raw)) {
            place(r, c, 'down', raw, clue);
            placed = true;
            break outer2;
          }
        }
      }
    }
  }

  return normalizeEntryNumbers(entries);
}

module.exports = {
  tryAutoLayout,
  normalizeEntryNumbers,
};
