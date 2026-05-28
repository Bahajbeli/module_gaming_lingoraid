const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const germanBingoData = require('../services/germanBingoDataService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const prisma = new PrismaClient();

const GAME_GRID_MAX = 9;
const GAME_WORD_COUNT = 20;
const MAX_CLASSES_PER_WORD = 9;

const defaultAssetBase = `http://localhost:${process.env.PORT || 5000}`;

function getAssetBaseUrl(req) {
  if (process.env.ASSET_BASE_URL) {
    return String(process.env.ASSET_BASE_URL).replace(/\/$/, '');
  }
  if (req?.get) {
    const host = req.get('x-forwarded-host') || req.get('host');
    const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
    if (host) return `${proto}://${host}`.replace(/\/$/, '');
  }
  return defaultAssetBase;
}

const uploadDir = path.join(__dirname, '../uploads/german-bingo');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont autorisées'), false);
  },
});

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toImageUrl(imagePath, assetBaseUrl) {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath;
  const base = assetBaseUrl || defaultAssetBase;
  return `${base}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
}

function formatClass(cls, assetBaseUrl) {
  return {
    id: cls.id,
    label: cls.label,
    imageUrl: toImageUrl(cls.imagePath, assetBaseUrl),
  };
}

async function deleteOrphanWords() {
  const words = await prisma.germanBingoWord.findMany({
    include: { classes: true },
  });
  const orphanIds = words.filter((w) => w.classes.length === 0).map((w) => w.id);
  if (orphanIds.length > 0) {
    await prisma.germanBingoWord.deleteMany({ where: { id: { in: orphanIds } } });
  }
}

// -------------------- Admin --------------------

router.get('/admin', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const [classes, words] = await Promise.all([
      prisma.germanBingoClass.findMany({ orderBy: { label: 'asc' } }),
      prisma.germanBingoWord.findMany({
        include: { classes: true },
        orderBy: { word: 'asc' },
      }),
    ]);

    const assetBase = getAssetBaseUrl(_req);
    res.json({
      classes: classes.map((c) => formatClass(c, assetBase)),
      words: words.map((w) => ({
        id: w.id,
        word: w.word,
        correctClassIds: w.classes.map((c) => c.classId),
      })),
    });
  } catch (error) {
    console.error('German Bingo admin list:', error);
    res.status(500).json({ error: 'Erreur lors du chargement' });
  }
});

router.post(
  '/classes',
  authenticateToken,
  requireAdmin,
  upload.single('file'),
  async (req, res) => {
    try {
      const label = String(req.body.label || '').trim();
      if (!label) return res.status(400).json({ error: 'Le label est obligatoire' });
      if (!req.file) return res.status(400).json({ error: 'L\'image est obligatoire' });

      const imagePath = `/uploads/german-bingo/${req.file.filename}`;
      const created = await prisma.germanBingoClass.create({
        data: { label, imagePath },
      });
      res.status(201).json(formatClass(created, getAssetBaseUrl(req)));
    } catch (error) {
      console.error('German Bingo create class:', error);
      res.status(500).json({ error: 'Erreur lors de la création de la classe' });
    }
  }
);

router.delete(
  '/classes/:classId',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const cls = await prisma.germanBingoClass.findUnique({
        where: { id: req.params.classId },
      });
      if (!cls) return res.status(404).json({ error: 'Classe introuvable' });

      if (cls.imagePath) {
        const filePath = path.join(
          __dirname,
          '..',
          cls.imagePath.replace(/^\//, '')
        );
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }

      await prisma.germanBingoClass.delete({ where: { id: req.params.classId } });
      await deleteOrphanWords();
      res.status(204).send();
    } catch (error) {
      console.error('German Bingo delete class:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
  }
);

router.post('/words', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const word = String(req.body.word || '').trim();
    const correctClassIds = Array.isArray(req.body.correctClassIds)
      ? req.body.correctClassIds
      : [];

    if (!word) return res.status(400).json({ error: 'Le mot est obligatoire' });
    if (correctClassIds.length === 0) {
      return res.status(400).json({ error: 'Au moins une classe est requise' });
    }
    if (correctClassIds.length > MAX_CLASSES_PER_WORD) {
      return res
        .status(400)
        .json({ error: `Maximum ${MAX_CLASSES_PER_WORD} classes par mot` });
    }

    const existingClasses = await prisma.germanBingoClass.findMany({
      where: { id: { in: correctClassIds } },
    });
    if (existingClasses.length !== correctClassIds.length) {
      return res.status(400).json({ error: 'Une ou plusieurs classes sont invalides' });
    }

    const created = await prisma.germanBingoWord.create({
      data: {
        word,
        classes: {
          create: correctClassIds.map((classId) => ({ classId })),
        },
      },
      include: { classes: true },
    });

    res.status(201).json({
      id: created.id,
      word: created.word,
      correctClassIds: created.classes.map((c) => c.classId),
    });
  } catch (error) {
    console.error('German Bingo create word:', error);
    res.status(500).json({ error: 'Erreur lors de la création du mot' });
  }
});

router.delete(
  '/words/:wordId',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const word = await prisma.germanBingoWord.findUnique({
        where: { id: req.params.wordId },
      });
      if (!word) return res.status(404).json({ error: 'Mot introuvable' });

      await prisma.germanBingoWord.delete({ where: { id: req.params.wordId } });
      res.status(204).send();
    } catch (error) {
      console.error('German Bingo delete word:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
  }
);

// -------------------- Play --------------------

router.get(
  '/play/game-session',
  authenticateToken,
  async (_req, res) => {
    try {
      const session = await germanBingoData.createGameSession();
      res.json(session);
    } catch (error) {
      console.error('German Bingo game session:', error);
      res.status(500).json({
        error: error.message || 'Erreur lors de la création de la session',
      });
    }
  }
);

router.post('/play/check', authenticateToken, async (req, res) => {
  try {
    const { wordId, selectedClassIds } = req.body;
    if (!wordId || !Array.isArray(selectedClassIds) || selectedClassIds.length === 0) {
      return res.status(400).json({ error: 'wordId et selectedClassIds requis' });
    }

    const result = await germanBingoData.checkPlacement(wordId, selectedClassIds);
    if (!result) return res.status(404).json({ error: 'Mot introuvable' });
    res.json(result);
  } catch (error) {
    console.error('German Bingo check:', error);
    res.status(500).json({ error: 'Erreur lors de la validation' });
  }
});

module.exports = router;
