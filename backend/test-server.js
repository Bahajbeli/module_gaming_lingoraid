const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Test de connexion simple
app.post('/test-login', async (req, res) => {
  try {
    console.log('Test login request received:', req.body);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    console.log('Searching for user:', email);
    
    // Test de connexion à la base de données
    const user = await prisma.user.findUnique({
      where: { email }
    });

    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      console.log('User not found, creating admin user...');
      
      // Créer l'utilisateur admin s'il n'existe pas
      const hash = await bcrypt.hash('admin123', 12);
      const newUser = await prisma.user.create({
        data: {
          email: 'admin@deutsche-lernen.com',
          passwordHash: hash,
          role: 'ADMIN'
        }
      });
      
      console.log('Admin user created:', newUser.email);
      
      if (email === 'admin@deutsche-lernen.com') {
        const token = jwt.sign(
          { id: newUser.id, email: newUser.email, role: newUser.role },
          process.env.JWT_SECRET || 'fallback-secret',
          { expiresIn: '24h' }
        );
        
        return res.json({
          message: 'Connexion réussie (nouvel utilisateur)',
          user: { id: newUser.id, email: newUser.email, role: newUser.role },
          token
        });
      } else {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }
    }

    console.log('Verifying password...');
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      console.log('Invalid password');
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    console.log('Password valid, generating token...');
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    console.log('Login successful');
    
    res.json({
      message: 'Connexion réussie',
      user: { id: user.id, email: user.email, role: user.role },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la connexion',
      details: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`🧪 Test server running on port ${PORT}`);
});
