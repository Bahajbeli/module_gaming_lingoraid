const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const prisma = new PrismaClient();

// Storage for image/pdf/audio uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'uploads/stories/';
    if (file.mimetype.startsWith('image/')) uploadPath += 'images/';
    else if (file.mimetype === 'application/pdf') uploadPath += 'pdfs/';
    else if (file.mimetype.startsWith('audio/')) uploadPath += 'audios/';
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

// Public: list active stories
router.get('/', async (req, res) => {
  try {
    const stories = await prisma.story.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(stories);
  } catch (error) {
    console.error('Erreur lors de la récupération des histoires:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des histoires' });
  }
});

// Admin: list all stories (including inactive)
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stories = await prisma.story.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(stories);
  } catch (error) {
    console.error('Erreur lors de la récupération des histoires:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des histoires' });
  }
});

// Public: get one
router.get('/:id', async (req, res) => {
  try {
    const story = await prisma.story.findUnique({ where: { id: req.params.id } });
    if (!story) return res.status(404).json({ error: 'Histoire non trouvée' });
    res.json(story);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'histoire:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'histoire' });
  }
});

// Admin: create
router.post('/admin/create', authenticateToken, requireAdmin, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'pdf', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  try {
    const data = req.body;
    const files = req.files;
    const toCreate = {
      title: data.title,
      description: data.description || null,
      type: data.type || 'histoire',
      content: data.content || null,
      language: data.language || 'Allemand',
      languageLevel: data.languageLevel || 'A1',
      userId: req.user.id,
      isActive: data.isActive === 'false' ? false : true
    };
    if (files?.image?.[0]) toCreate.imageUrl = `/uploads/stories/images/${files.image[0].filename}`;
    if (files?.pdf?.[0]) toCreate.pdfUrl = `/uploads/stories/pdfs/${files.pdf[0].filename}`;
    if (files?.audio?.[0]) toCreate.audioUrl = `/uploads/stories/audios/${files.audio[0].filename}`;
    const story = await prisma.story.create({ data: toCreate });
    res.status(201).json({ success: true, story });
  } catch (error) {
    console.error('Erreur lors de la création de l\'histoire:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'histoire' });
  }
});

// Admin: update
router.put('/admin/:id', authenticateToken, requireAdmin, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'pdf', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.story.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Histoire non trouvée' });

    const data = req.body;
    const files = req.files;
    const toUpdate = { ...data };
    if (typeof toUpdate.isActive === 'string') toUpdate.isActive = toUpdate.isActive === 'true' || toUpdate.isActive === '1' || toUpdate.isActive === 'on';

    if (files?.image?.[0]) {
      toUpdate.imageUrl = `/uploads/stories/images/${files.image[0].filename}`;
      if (existing.imageUrl) {
        const oldPath = path.join(__dirname, '..', existing.imageUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }
    if (files?.pdf?.[0]) {
      toUpdate.pdfUrl = `/uploads/stories/pdfs/${files.pdf[0].filename}`;
      if (existing.pdfUrl) {
        const oldPath = path.join(__dirname, '..', existing.pdfUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }
    if (files?.audio?.[0]) {
      toUpdate.audioUrl = `/uploads/stories/audios/${files.audio[0].filename}`;
      if (existing.audioUrl) {
        const oldPath = path.join(__dirname, '..', existing.audioUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    Object.keys(toUpdate).forEach(k => { if (toUpdate[k] === '' || toUpdate[k] === null) delete toUpdate[k]; });

    const story = await prisma.story.update({ where: { id }, data: toUpdate });
    res.json({ success: true, story });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'histoire:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'histoire' });
  }
});

// Admin: delete
router.delete('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.story.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Histoire non trouvée' });
    await prisma.story.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'histoire:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'histoire' });
  }
});

module.exports = router;


