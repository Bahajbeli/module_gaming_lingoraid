import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Vérifier la validité du token
  const verifyToken = async () => {
    try {
      const response = await api.get('/api/auth/verify');
      setUser(response.data.user);
    } catch (error) {
      console.error('Token invalide:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  // Configuration du token et vérification
  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Sign in
  const login = async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      
      if (response.data.requiresVerification) {
        return { success: false, requiresVerification: true, email: response.data.email };
      }

      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      console.error('Error de connexion:', error);
      if (error.response?.status === 403 && error.response?.data?.requiresVerification) {
        return { success: false, requiresVerification: true, email: error.response.data.email, error: error.response.data.error };
      }
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error de connexion' 
      };
    }
  };

  // Sign up (rôle USER uniquement, imposé côté serveur)
  const register = async ({ email, password, firstName, lastName, region }) => {
    try {
      const response = await api.post('/api/auth/register', {
        email,
        password,
        firstName,
        lastName,
        region,
      });
      
      if (response.data.requiresVerification) {
        return { success: true, requiresVerification: true, email: response.data.user.email, message: response.data.message };
      }

      const { token: newToken, user: userData } = response.data;

      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);

      return { success: true };
    } catch (error) {
      console.error('Error d\'inscription:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error lors de la création du compte',
      };
    }
  };

  // Sign in via Google (idToken from Google Identity Services)
  const googleLogin = async (idToken) => {
    try {
      const response = await api.post('/api/auth/google', { idToken });
      const { token: newToken, user: userData } = response.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error('Error Google login:', error);
      return { success: false, error: error.response?.data?.error || 'Google login échoué' };
    }
  };

  // Déconnexion
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // Mettre à jour les informations utilisateur
  const updateUser = (newUserData) => {
    setUser(newUserData);
  };

  const value = {
    user,
    loading,
    token,
    login,
    register,
    googleLogin,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
