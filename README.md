# LingoRaid

Version allégée : **landing page**, **login** et **jeux** uniquement.

## Architecture

```
LingoRaid/
├── frontend/          # React (landing, login, jeux)
│   ├── public/
│   └── src/
├── backend/           # API Express + Prisma
│   ├── routes/
│   ├── prisma/
│   ├── index.js
│   └── german_nouns.json
├── package.json       # Scripts racine (dev, build, db)
└── README.md
```

## Pages

| Page | Route |
|------|-------|
| Site vitrine (public) | `/` |
| Login | `/login` |
| Accueil app (connecté) | `/app` |
| Gaming Arena | `/gaming` |
| Jeux | `/game/:type/:mode`, `/german-bingo`, `/room/:roomId`, `/roadmap/:gameType` |

## Démarrage

```bash
cd LingoRaid
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Config DB : copier env.example vers backend/.env et ajuster DATABASE_URL (PostgreSQL)
# copy backend\env.example backend\.env

# PostgreSQL : serveur existant OU `cd backend && docker compose up -d` (port 5433)
# Puis :
npm run db:migrate
npm run db:seed
npm run dev

# Jeux créativité (1200+, IA + fichiers files/croswords/) :
cd backend
npm run seed:creativity:test      # test dry-run
npm run seed:creativity           # génère en base (Groq recommandé)
npm run seed:creativity:clear     # supprime anciens seeds puis régénère
```

- **Frontend** : http://localhost:3000  
- **Backend** : http://localhost:5000  

Comptes démo : `user@deutsche-lernen.com` / `user123`
