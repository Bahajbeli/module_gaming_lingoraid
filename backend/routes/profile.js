const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Middleware de vérification de token
const authMiddleware = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Accès refusé. Token manquant.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id || decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
};

// Mettre à jour les informations de profil
router.put('/', authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, region } = req.body;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        firstName: firstName || null,
        lastName: lastName || null,
        region: region || null,
      }
    });

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        region: user.region,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil.' });
  }
});

// Mettre à jour le mot de passe
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'L\'ancien et le nouveau mot de passe sont requis.' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ error: 'Le nouveau mot de passe ne respecte pas les critères de sécurité.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await prisma.user.update({
      where: { id: req.userId },
      data: { passwordHash }
    });

    res.json({ success: true, message: 'Mot de passe mis à jour avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la modification du mot de passe:', error);
    res.status(500).json({ error: 'Erreur lors de la modification du mot de passe.' });
  }
});

module.exports = router;
