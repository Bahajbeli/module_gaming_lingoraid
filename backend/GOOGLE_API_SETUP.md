# Configuration de l'API DeepSeek

## Problème identifié
Le jeu de simulation affiche des réponses statiques au lieu d'utiliser l'API DeepSeek car la clé API n'est pas correctement configurée.

## Solution

### 1. Obtenir une clé API DeepSeek
1. Allez sur [DeepSeek Platform](https://platform.deepseek.com/)
2. Créez un compte si nécessaire
3. Accédez à votre tableau de bord API
4. Créez une nouvelle clé API
5. Copiez la clé API générée

### 2. Configurer la clé API
Créez un fichier `.env` dans le dossier `backend/` avec le contenu suivant :

```env
# Configuration de la base de données
DATABASE_URL="file:./dev.db"

# Configuration JWT
JWT_SECRET="votre-secret-jwt-super-securise-changez-en-production"

# Configuration Google OAuth
GOOGLE_CLIENT_ID="964615058500-4sk2747ga4t6gt5if22g0rvrq2aaqtpv.apps.googleusercontent.com"

# Configuration DeepSeek API
DEEPSEEK_API_KEY="VOTRE_CLE_API_DEEPSEEK_ICI"
DEEPSEEK_MODEL="deepseek-chat"
DEEPSEEK_BASE_URL="https://api.deepseek.com/v1"

# Configuration du serveur
PORT=5000
NODE_ENV="development"
```

### 3. Redémarrer le serveur
Après avoir configuré la clé API, redémarrez le serveur :

```bash
cd backend
npm start
```

### 4. Tester la configuration
Testez l'endpoint de santé :
```bash
curl http://localhost:5000/api/deepseek/health
```

## Vérification
Une fois configuré correctement, le jeu de simulation devrait utiliser l'API DeepSeek au lieu des réponses statiques.
