# Instructions de Configuration pour les Simulations Vocales

## Problème Identifié

Le message vocal de l'IA est toujours le même : "Entschuldigung, ich habe dich nicht gut verstanden. Könntest du das bitte wiederholen?"

**Cause :** La clé API OpenAI n'est pas configurée, ce qui fait échouer la transcription Whisper.

## Solutions

### Solution 1 : Configurer OpenAI (Recommandée)

1. **Créez un fichier `.env`** dans le dossier `backend/` :
```env
# Configuration de la base de données
DATABASE_URL="file:./dev.db"

# Configuration JWT
JWT_SECRET="votre-secret-jwt-super-securise-changez-en-production"

# Configuration du serveur
PORT=5000
NODE_ENV="development"

# Configuration des uploads
UPLOAD_PATH="./uploads"
MAX_FILE_SIZE=10485760

# IA – Ollama (optionnel)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3

# IA – Mistral AI
MISTRAL_API_KEY=votre-cle-api-mistral
MISTRAL_API_URL=https://api.mistral.ai/v1/chat/completions

# IA – OpenAI (pour Whisper et TTS)
OPENAI_API_KEY=votre-cle-api-openai
```

2. **Remplacez les valeurs :**
   - `votre-cle-api-openai` → Votre vraie clé API OpenAI
   - `votre-cle-api-mistral` → Votre vraie clé API Mistral

3. **Redémarrez le serveur** après avoir créé le fichier `.env`

### Solution 2 : Utiliser Mistral AI uniquement

Si vous ne voulez pas configurer OpenAI, le système utilisera automatiquement Mistral AI comme fallback avec des réponses variées.

## Où Obtenir les Clés API

### OpenAI
1. Allez sur [platform.openai.com](https://platform.openai.com)
2. Créez un compte ou connectez-vous
3. Allez dans "API Keys"
4. Créez une nouvelle clé secrète

### Mistral AI
1. Allez sur [console.mistral.ai](https://console.mistral.ai)
2. Créez un compte ou connectez-vous
3. Allez dans "API Keys"
4. Créez une nouvelle clé

## Vérification

Après configuration, testez une simulation vocale. Vous devriez voir :
- Des réponses variées de l'IA
- Une transcription correcte de votre voix
- Des réponses contextuelles

## Dépannage

Si le problème persiste :
1. Vérifiez que le fichier `.env` est dans le bon dossier (`backend/`)
2. Vérifiez que les clés API sont correctes
3. Redémarrez le serveur
4. Vérifiez les logs du serveur pour les erreurs

## Notes

- Le système utilise Whisper pour la transcription (OpenAI)
- Le système utilise GPT-4o pour les réponses (OpenAI)
- Le système utilise Mistral AI comme fallback
- Toutes les réponses sont en allemand pour l'immersion linguistique
