import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

/**
 * URL absolue pour images/uploads.
 * Réécrit localhost → API_URL (indispensable sur téléphone en dev).
 */
export const getAssetUrl = (path) => {
  if (!path) return '';
  const value = String(path).trim();
  if (!value) return '';

  if (value.startsWith('http://') || value.startsWith('https://')) {
    if (/localhost|127\.0\.0\.1/i.test(value)) {
      const pathname = value.replace(/^https?:\/\/[^/]+/i, '') || '/';
      return `${API_URL}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
    }
    return value;
  }

  return `${API_URL}${value.startsWith('/') ? value : `/${value}`}`;
};

export default api;
