import axios from 'axios';

// En dev CRA : proxy package.json → localhost:5000. Sinon REACT_APP_API_URL ou :5000.
const API_BASE =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://backend-u6jh.onrender.com' : '');

// Configuration de base d'axios
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Fonction pour créer une instance axios pour les uploads de fichiers
export const apiWithFormData = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  // Pas de Content-Type par défaut pour permettre l'auto-détection avec FormData
});

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour ajouter le token et forcer le bon Content-Type pour FormData
apiWithFormData.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // FormData : ne pas définir Content-Type pour que le navigateur ajoute la boundary
    if (config.data && typeof FormData !== 'undefined' && config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs de réponse
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide
      localStorage.removeItem('token');
      // Éviter la boucle de redirection si on est déjà sur /login
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      // Si on est déjà sur /login, ne rien faire (laisser la page afficher le formulaire)
    }
    return Promise.reject(error);
  }
);

// Fonction utilitaire pour construire les URLs des assets
const UPLOADS_BASE =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://backend-u6jh.onrender.com' : '');

export const getAssetUrl = (url) => {
  if (!url) return '';
  const value = typeof url === 'string' ? url : '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return value.startsWith('/uploads/') ? `${UPLOADS_BASE}${value}` : value;
};

export default api;
