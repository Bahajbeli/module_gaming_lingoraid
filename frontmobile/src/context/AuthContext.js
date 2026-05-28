import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';
import { API_URL } from '../config';

function formatAuthError(e, fallback) {
  if (!e.response) {
    if (e.code === 'ECONNABORTED') {
      return 'Délai dépassé. Vérifiez que le backend tourne (port 5000).';
    }
    return `Serveur inaccessible (${API_URL}). Téléphone et PC sur le même Wi‑Fi ? Backend démarré ?`;
  }
  return (
    e.response?.data?.error ||
    e.response?.data?.message ||
    fallback
  );
}

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem('token');
      if (stored) {
        setToken(stored);
        try {
          const res = await api.get('/api/auth/verify');
          setUser(res.data.user);
        } catch {
          await AsyncStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const { token: newToken, user: userData } = res.data;
      await AsyncStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: formatAuthError(e, 'Erreur de connexion'),
      };
    }
  };

  const register = async ({ email, password, firstName, lastName, region }) => {
    try {
      const res = await api.post('/api/auth/register', {
        email,
        password,
        firstName,
        lastName,
        region,
      });
      const { token: newToken, user: userData } = res.data;
      await AsyncStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: formatAuthError(e, "Erreur d'inscription"),
      };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
