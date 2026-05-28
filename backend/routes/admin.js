const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
 
const router = express.Router();
const prisma = new PrismaClient();
 
// All admin routes require ADMIN
router.use(authenticateToken, requireAdmin);
 
// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [users, games, courses, progress, media, crosswords, stories] = await Promise.all([
      prisma.user.count(),
      prisma.game.count(),
      prisma.course.count(),
      prisma.progress.count(),
      prisma.media.count(),
      prisma.crossword.count(),
      prisma.story.count(),
    ]);
 
    return res.json({
      success: true,
      data: { users, games, courses, progress, media, crosswords, stories },
    });
  } catch (error) {
    console.error('Error admin stats:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors du chargement des stats admin' });
  }
});
 
// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, role: true, createdAt: true, updatedAt: true },
    });
    return res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error admin users:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors du chargement des utilisateurs' });
  }
});
 
// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const nextRole = String(req.body?.role || '').toUpperCase();
 
    if (!['ADMIN', 'USER'].includes(nextRole)) {
      return res.status(400).json({ success: false, error: 'Rôle invalide (ADMIN|USER)' });
    }
 
    // prevent demoting yourself to lock yourself out
    if (targetUserId === req.user.id && nextRole !== 'ADMIN') {
      return res.status(400).json({ success: false, error: 'Impossible de retirer vos propres droits admin' });
    }
 
    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: nextRole },
      select: { id: true, email: true, role: true, updatedAt: true },
    });
 
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error admin update role:', error);
    return res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour du rôle' });
  }
});
 
module.exports = router;

