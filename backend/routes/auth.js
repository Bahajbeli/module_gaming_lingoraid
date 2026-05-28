const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { validateLogin } = require('../middleware/validation');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const dns = require('dns');
const { promisify } = require('util');
const resolveMx = promisify(dns.resolveMx);
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY || 're_LQbidZ5V_BQCn8AiZHaZHDW1hWdKHM2vj');

const axios = require('axios');

const verifyEmailWithZeroBounce = async (email) => {
  try {
    const apiKey = process.env.ZEROBOUNCE_API_KEY || '661f5458bd06457682bbff092f96c354';
    const response = await axios.get(`https://api.zerobounce.net/v2/validate?api_key=${apiKey}&email=${email}&ip_address=`);
    
    // Si ZeroBounce renvoie une erreur (ex: limite de crédits atteinte)
    if (response.data.error) {
      console.warn('Avertissement ZeroBounce (Limites de crédit ou clé invalide):', response.data.error);
      return { isValid: true };
    }

    const status = response.data.status;
    console.log(`Vérification ZeroBounce pour ${email}: statut = ${status}`);
    
    // Si le statut est invalide, spamtrap, ou abuse, on rejette
    if (status === 'invalid' || status === 'spamtrap' || status === 'abuse') {
      return { isValid: false, message: "Cette adresse email n'existe pas ou est invalide." };
    }
    
    // catch-all, unknown, ou valid sont acceptés
    return { isValid: true };
  } catch (error) {
    console.error('Erreur lors de la vérification ZeroBounce (Peut-être plus de crédits):', error.message);
    // En cas d'erreur API, on autorise l'inscription pour ne pas bloquer le service
    return { isValid: true };
  }
};

const router = express.Router();
const prisma = new PrismaClient();
const googleClient = new OAuth2Client('964615058500-4sk2747ga4t6gt5if22g0rvrq2aaqtpv.apps.googleusercontent.com');

// Inscription
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, region } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'L\'adresse email n\'est pas valide' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.' });
    }

    const emailValidation = await verifyEmailWithZeroBounce(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ error: emailValidation.message });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    // Hasher le mot de passe
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        region: region || null,
        isEmailVerified: true, // Automatiquement vérifié
        verificationToken: null, // Plus de token
        // Inscription publique => USER uniquement (l'admin est géré via backoffice)
        role: 'USER'
      }
    });

    // Générer le token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        region: user.region,
        isEmailVerified: user.isEmailVerified,
        role: user.role
      },
      token
    });

  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création du compte',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Route de connexion
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation basique
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    // Rechercher l'utilisateur par email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Vérifier que JWT_SECRET existe
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET non défini dans les variables d\'environnement');
      return res.status(500).json({ error: 'Configuration serveur manquante' });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Retourner les informations utilisateur et le token
    res.json({
      message: 'Connexion réussie',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        region: user.region,
        role: user.role
      },
      token
    });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la connexion',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Vérification du token d'email
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ error: 'Email et code requis' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email déjà vérifié' });
    }

    if (user.verificationToken !== code) {
      return res.status(400).json({ error: 'Code de vérification incorrect' });
    }

    await prisma.user.update({
      where: { email },
      data: { isEmailVerified: true, verificationToken: null }
    });

    res.json({ success: true, message: 'Email vérifié avec succès' });
  } catch (error) {
    console.error('Erreur de vérification d\'email:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
});

// Vérifier le token
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Vérifier que l'utilisateur existe toujours
    const userId = decoded.id || decoded.userId; // compatibilité anciennes versions
    if (!userId) {
      return res.status(401).json({ error: 'Token invalide' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({
      success: true,
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
    console.error('Erreur lors de la vérification du token:', error);
    res.status(401).json({ error: 'Token invalide' });
  }
});

// Déconnexion (côté client principalement)
router.post('/logout', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Déconnexion réussie' 
  });
});

// Google sign-in: exchanges Google ID token for our JWT
router.post('/google', async (req, res) => {
	try {
		const { idToken } = req.body;
		if (!idToken) return res.status(400).json({ error: 'Token Google manquant' });

		const ticket = await googleClient.verifyIdToken({ idToken, audience: '964615058500-4sk2747ga4t6gt5if22g0rvrq2aaqtpv.apps.googleusercontent.com' });
		const payload = ticket.getPayload();
		const email = payload?.email;
		if (!email) return res.status(400).json({ error: 'Email Google non disponible' });

		// Get or create user
		let user = await prisma.user.findUnique({ where: { email } });
		if (!user) {
			user = await prisma.user.create({ data: { email, passwordHash: '', role: 'USER' } });
		}

		const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
		return res.json({ user: { id: user.id, email: user.email, role: user.role }, token });
	} catch (error) {
		console.error('Erreur Google OAuth:', error);
		return res.status(401).json({ error: 'Vérification Google échouée' });
	}
});

module.exports = router;
