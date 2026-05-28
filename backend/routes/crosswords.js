const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  tryAutoLayout,
  normalizeEntryNumbers,
} = require('../services/crosswordLayoutService');

const router = express.Router();
const prisma = new PrismaClient();

// ------------------------
// Helpers
// ------------------------
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

async function fetchCompat(url, options) {
  if (typeof fetch !== 'undefined') {
    return fetch(url, options);
  }
  const mod = await import('node-fetch');
  const fn = mod.default || mod;
  return fn(url, options);
}

async function aiSuggestLayout({ width, height, words }) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY manquant');

  const prompt = `You are a crossword constructor. Place the following words into a ${width}x${height} crossword grid.
Return ONLY strict JSON with this schema: {"entries":[{"row":0,"col":0,"direction":"across|down","number":1,"clue":"...","answer":"UPPERCASE"}]}
Rules:
- Use 0-based row/col and keep within bounds.
- Words cross only on identical letters; no conflicts.
- Distribute words across the grid, maximize intersections, avoid long unbroken lines.
- Do not include any commentary.
Words (answer|clue):\n${words.map(w => `${String(w.answer||'')}|${String(w.clue||'')}`).join('\n')}`;

  const res = await fetchCompat('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful crossword constructor that outputs strict JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    })
  });

  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';

  // Try to extract JSON
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON in response');
  const json = JSON.parse(text.slice(start, end + 1));
  if (!json || !Array.isArray(json.entries)) throw new Error('Bad JSON');

  const entries = json.entries.map((e, idx) => ({
    row: Number(e.row),
    col: Number(e.col),
    direction: String(e.direction).toLowerCase() === 'down' ? 'down' : 'across',
    number: Number(e.number) || idx + 1,
    clue: String(e.clue || ''),
    answer: String(e.answer || '').toUpperCase().replace(/[^A-ZÄÖÜẞÉÈÊËÎÏÔÖÛÜÀÂÇ]/g, '')
  }));
  // Normalize numbering so that entries starting at the same cell share the
  // same number and numbering increases by scan order (row, then col)
  const normalized = normalizeEntryNumbers(entries);
  return { width, height, entries: normalized };
}

// Create crossword (ADMIN)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, description, width = 15, height = 15, entries = [] } = req.body;
    const userId = req.user.id;

    const crossword = await prisma.crossword.create({
      data: {
        title,
        description,
        width,
        height,
        userId,
        entries: {
          create: normalizeEntryNumbers(entries).map(e => ({
            row: e.row,
            col: e.col,
            direction: e.direction,
            clue: e.clue,
            answer: (e.answer || '').toUpperCase().replace(/[^A-ZÄÖÜẞßÉÈÊËÎÏÔÖÛÜÀÂÇ]/g, ''),
            number: e.number,
          }))
        }
      },
      include: { entries: true }
    });

    res.status(201).json(crossword);
  } catch (error) {
    console.error('Create crossword error:', error);
    res.status(500).json({ error: 'Erreur lors de la création du mots croisés' });
  }
});

// Auto layout generator (ADMIN)
router.post('/auto-layout', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { width = 15, height = 15, words = [] } = req.body;
    const entries = tryAutoLayout(width, height, words);
    res.json({ width, height, entries: normalizeEntryNumbers(entries) });
  } catch (error) {
    console.error('Auto-layout crossword error:', error);
    res.status(500).json({ error: 'Erreur lors de la génération automatique de la grille' });
  }
});

// AI-powered layout (ADMIN)
router.post('/ai-layout', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { width = 15, height = 15, words = [] } = req.body;
    const result = await aiSuggestLayout({ width, height, words });
    res.json(result);
  } catch (error) {
    console.error('AI layout error:', error);
    const message = typeof error?.message === 'string' ? error.message : String(error);
    res.status(500).json({ error: `Erreur IA lors de la génération de la grille: ${message}` });
  }
});

// Health check for OpenAI connectivity (ADMIN)
router.get('/ai-health', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (!OPENAI_API_KEY) return res.status(500).json({ ok: false, error: 'OPENAI_API_KEY manquant' });
    const r = await fetchCompat('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You answer with a single word.' },
          { role: 'user', content: 'ok' }
        ],
        max_tokens: 1,
        temperature: 0
      })
    });
    if (!r.ok) return res.status(500).json({ ok: false, error: `HTTP ${r.status}` });
    res.json({ ok: true, provider: 'openai', model: OPENAI_MODEL });
  } catch (e) {
    const message = typeof e?.message === 'string' ? e.message : String(e);
    res.status(500).json({ ok: false, error: message });
  }
});

// Update crossword (ADMIN)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, width, height, entries = [] } = req.body;

    // Replace entries for simplicity
    const updated = await prisma.crossword.update({
      where: { id },
      data: {
        title,
        description,
        width,
        height,
        entries: {
          deleteMany: {},
          create: normalizeEntryNumbers(entries).map(e => ({
            row: e.row,
            col: e.col,
            direction: e.direction,
            clue: e.clue,
            answer: (e.answer || '').toUpperCase().replace(/[^A-ZÄÖÜẞßÉÈÊËÎÏÔÖÛÜÀÂÇ]/g, ''),
            number: e.number,
          }))
        }
      },
      include: { entries: true }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update crossword error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du mots croisés' });
  }
});

// Publish/unpublish (ADMIN)
router.post('/:id/publish', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;
    const cw = await prisma.crossword.update({
      where: { id },
      data: { isPublished: !!isPublished }
    });
    res.json(cw);
  } catch (error) {
    console.error('Publish crossword error:', error);
    res.status(500).json({ error: 'Erreur lors du changement du statut' });
  }
});

// List all crosswords (ADMIN)
router.get('/admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const list = await prisma.crossword.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, description: true, width: true, height: true, isPublished: true, createdAt: true, updatedAt: true }
    });
    res.json(list);
  } catch (error) {
    console.error('Admin list crosswords error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des mots croisés (admin)' });
  }
});

// Delete crossword (ADMIN)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.crossword.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete crossword error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du mots croisés' });
  }
});

// List published crosswords (for players)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const list = await prisma.crossword.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, title: true, description: true, width: true, height: true }
    });
    res.json(list);
  } catch (error) {
    console.error('List crosswords error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des mots croisés' });
  }
});

// Public list of active crosswords (for players) - ordered by creation
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const items = await prisma.crossword.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, title: true, description: true }
    });
    res.json({ items, total: items.length });
  } catch (e) {
    console.error('Crosswords public list error:', e);
    res.status(500).json({ error: 'Erreur lors du chargement' });
  }
});

// Get one crossword with entries
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const cw = await prisma.crossword.findUnique({
      where: { id },
      include: { entries: true }
    });
    if (!cw || !cw.isPublished) {
      return res.status(404).json({ error: 'Mots croisés introuvable' });
    }
    res.json(cw);
  } catch (error) {
    console.error('Get crossword error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du mots croisés' });
  }
});

// Fix numbering for existing crosswords (ADMIN)
router.post('/:id/fix-numbering', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const cw = await prisma.crossword.findUnique({
      where: { id },
      include: { entries: true }
    });
    
    if (!cw) {
      return res.status(404).json({ error: 'Mots croisés introuvable' });
    }

    // Créer un map des positions avec leurs numéros
    const positionMap = new Map();
    let number = 1;

    // Trier les entrées par position (ligne, colonne)
    const sortedEntries = cw.entries.sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });

    // Assigner les numéros en tenant compte des positions partagées
    for (const entry of sortedEntries) {
      const key = `${entry.row},${entry.col}`;
      
      if (!positionMap.has(key)) {
        positionMap.set(key, number++);
      }
      
      // Mettre à jour l'entrée avec le bon numéro
      await prisma.crosswordEntry.update({
        where: { id: entry.id },
        data: { number: positionMap.get(key) }
      });
    }

    // Récupérer le mots croisés mis à jour
    const updatedCw = await prisma.crossword.findUnique({
      where: { id },
      include: { entries: true }
    });

    res.json({ 
      message: 'Numérotation corrigée avec succès',
      crossword: updatedCw 
    });
  } catch (error) {
    console.error('Fix numbering error:', error);
    res.status(500).json({ error: 'Erreur lors de la correction de la numérotation' });
  }
});

module.exports = router;
