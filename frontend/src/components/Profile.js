import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Shield, Lock, Save, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { WORLD_REGIONS } from '../constants/worldRegions';

const Profile = () => {
  const { user, updateUser } = useAuth();
  
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    region: user?.region || '',
    email: user?.email || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Update local state if user context updates
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        region: user.region || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          region: profileData.region,
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la mise à jour.');
      }

      setMessage({ type: 'success', text: 'Profil mis à jour avec succès.' });
      
      if (updateUser && data.user) {
        updateUser(data.user);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Les nouveaux mots de passe ne correspondent pas.' });
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la mise à jour du mot de passe.');
      }

      setMessage({ type: 'success', text: 'Mot de passe mis à jour avec succès.' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <div className="text-center">
          <motion.h2 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-extrabold text-gray-900"
          >
            Mon Profil
          </motion.h2>
          <p className="mt-2 text-gray-600">Gérez vos informations personnelles et votre sécurité.</p>
        </div>

        {message.text && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-4 rounded-xl flex items-center justify-center font-medium ${
              message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {message.text}
          </motion.div>
        )}

        {/* Formulaire Informations Personnelles */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 bg-white/50 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-800">Informations Personnelles</h3>
          </div>
          <form onSubmit={handleProfileUpdate} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Prénom</label>
                <input
                  type="text"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Jean"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nom</label>
                <input
                  type="text"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Dupont"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={profileData.email}
                disabled
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                title="L'adresse email ne peut pas être modifiée."
              />
              <p className="mt-1 text-xs text-gray-500">L'adresse email sert d'identifiant unique et n'est pas modifiable.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Pays / Région</label>
              <div className="relative">
                <Globe className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                <select
                  value={profileData.region}
                  onChange={(e) => setProfileData({...profileData, region: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                >
                  <option value="" disabled>Sélectionnez une région</option>
                  {WORLD_REGIONS?.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-md transition-colors flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Enregistrer les modifications
              </button>
            </div>
          </form>
        </motion.div>

        {/* Formulaire Mot de passe */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 bg-white/50 flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-800">Sécurité & Mot de passe</h3>
          </div>
          <form onSubmit={handlePasswordUpdate} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Mot de passe actuel</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  required
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nouveau mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="Nouveau mot de passe"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirmer le nouveau</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="Confirmer"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mt-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Règles de sécurité :</p>
              <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                <li>Au moins 8 caractères</li>
                <li>Une lettre majuscule et minuscule</li>
                <li>Au moins un chiffre</li>
                <li>Un caractère spécial (ex: ! @ # $ %)</li>
              </ul>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-md transition-colors flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Mettre à jour le mot de passe
              </button>
            </div>
          </form>
        </motion.div>

      </div>
    </div>
  );
};

export default Profile;
