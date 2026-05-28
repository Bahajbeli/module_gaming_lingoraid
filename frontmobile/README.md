# LingoRaid Mobile (React Native / Expo)

Application mobile pour **LingoRaid**, connectée au backend existant (`LingoRaid/backend`).

## Prérequis

- Node.js 18+
- [Expo Go](https://expo.dev/go) sur téléphone **ou** émulateur Android/iOS
- Backend LingoRaid démarré (`npm run backend:dev` à la racine du monorepo)

## Installation

```bash
cd LingoRaid/frontmobile
npm install
cp .env.example .env
```

Éditez `.env` :

```env
# PC local + émulateur Android
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000

# Téléphone physique (même Wi‑Fi que le PC)
# EXPO_PUBLIC_API_URL=http://192.168.x.x:5000
```

## Lancement

```bash
npm start
```

Puis scannez le QR code avec Expo Go, ou appuyez sur `a` (Android) / `i` (iOS).

Depuis la racine `LingoRaid` :

```bash
npm run mobile:dev
```

## Fonctionnalités

| Écran | Description |
|--------|-------------|
| Connexion / Inscription | API `/api/auth/*` |
| Accueil | Hub vers les jeux |
| Quiz solo | Articles der/die/das |
| Shadowing | YouTube + Whisper + quiz IA |
| Mode en ligne | Créer / rejoindre une salle |
| Lobby | Prêt, Socket.IO |
| Partie | Quiz synchronisé (autres jeux : message + web) |

## Structure

```
frontmobile/
├── App.js
├── app.json
├── src/
│   ├── api/client.js
│   ├── config.js
│   ├── context/AuthContext.js
│   ├── navigation/AppNavigator.js
│   ├── screens/
│   └── components/
```

## Notes

- Le backend doit accepter les requêtes depuis l’IP du téléphone (CORS déjà souvent ouvert en dev).
- Pour les tours **créativité / mots croisés / bingo** en ligne, l’UI complète est sur le web ; le mobile gère le lobby et le **quiz en ligne**.
