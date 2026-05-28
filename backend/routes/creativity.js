const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');

const router = express.Router();
const prisma = new PrismaClient();

// Upload image for creativity game (ADMIN)
router.post('/upload', authenticateToken, requireAdmin, uploadImage, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucune image fournie' });
    const filename = req.file.filename; // stored in /uploads
    res.json({ filename, url: `/uploads/${filename}` });
  } catch (e) {
    console.error('Creativity upload error:', e);
    res.status(500).json({ error: 'Erreur lors de l\'upload de l\'image' });
  }
});

// Save a creativity config (ADMIN)
router.post('/save', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, description, image, points = [] } = req.body;
    // For now, reuse Media table to persist the JSON in streamingUrl
    const created = await prisma.media.create({
      data: {
        title: title || 'Créativité',
        description: description || 'Jeu de créativité',
        type: 'creativity',
        language: 'Allemand',
        imageUrl: image?.startsWith('/uploads/') ? image : `/uploads/${image}`,
        streamingUrl: JSON.stringify({ image, points }),
        userId: req.user.id,
        categoryId: (await prisma.mediaCategory.findFirst())?.id || (await prisma.mediaCategory.create({ data: { name: 'creativity', displayName: 'Créativité' } })).id
      }
    });
    res.status(201).json(created);
  } catch (e) {
    console.error('Creativity save error:', e);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
  }
});

// Latest creativity for players
router.get('/latest', authenticateToken, async (req, res) => {
  try {
    const m = await prisma.media.findFirst({
      where: { type: 'creativity', isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    if (!m) return res.status(404).json({ error: 'Aucune activité créativité disponible' });
    let cfg = {};
    try { cfg = JSON.parse(m.streamingUrl || '{}'); } catch { cfg = {}; }
    return res.json({ id: m.id, title: m.title, image: m.imageUrl, points: cfg.points || [] });
  } catch (e) {
    console.error('Creativity latest error:', e);
    res.status(500).json({ error: 'Erreur lors du chargement' });
  }
});

// List creativity items (ADMIN)
router.get('/admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const items = await prisma.media.findMany({
      where: { type: 'creativity' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, description: true, imageUrl: true, createdAt: true, updatedAt: true }
    });
    res.json(items);
  } catch (e) {
    console.error('Creativity list error:', e);
    res.status(500).json({ error: 'Erreur lors du chargement' });
  }
});

// Public list of active creativity items (for players)
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const items = await prisma.media.findMany({
      where: { type: 'creativity', isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, title: true, imageUrl: true }
    });
    res.json({ items, total: items.length });
  } catch (e) {
    console.error('Creativity public list error:', e);
    res.status(500).json({ error: 'Erreur lors du chargement' });
  }
});

// Public get one creativity item by id (for players)
router.get('/item/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const m = await prisma.media.findUnique({ where: { id } });
    if (!m || m.type !== 'creativity' || !m.isActive) {
      return res.status(404).json({ error: 'Aucune activité créativité' });
    }
    let cfg = {};
    try { cfg = JSON.parse(m.streamingUrl || '{}'); } catch { cfg = {}; }
    return res.json({ id: m.id, title: m.title, image: m.imageUrl, points: cfg.points || [] });
  } catch (e) {
    console.error('Creativity get item error:', e);
    res.status(500).json({ error: 'Erreur lors du chargement' });
  }
});

// Get one creativity item (ADMIN)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const m = await prisma.media.findUnique({ where: { id } });
    if (!m || m.type !== 'creativity') return res.status(404).json({ error: 'Introuvable' });
    let cfg = {};
    try { cfg = JSON.parse(m.streamingUrl || '{}'); } catch { cfg = {}; }
    res.json({ id: m.id, title: m.title, description: m.description, image: m.imageUrl, points: cfg.points || [] });
  } catch (e) {
    console.error('Creativity get error:', e);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

// Update creativity item (ADMIN)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, image, points = [] } = req.body;
    const updated = await prisma.media.update({
      where: { id },
      data: {
        title,
        description,
        imageUrl: image?.startsWith('/uploads/') ? image : image,
        streamingUrl: JSON.stringify({ image, points })
      }
    });
    res.json(updated);
  } catch (e) {
    console.error('Creativity update error:', e);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// Delete creativity item (ADMIN)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.media.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('Creativity delete error:', e);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

module.exports = router;


