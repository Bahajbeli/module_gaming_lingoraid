import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const AuthDebug = () => {
  const { user, loading, token } = useAuth();
  const localStorageToken = localStorage.getItem('token');

  return (
    <div className="min-h-screen bg-gradient-to-br from-german-50 to-german-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-german-800">
          🔍 Debug de l'Authentification
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">État de l'authentification</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">État du contexte :</h3>
              <p><strong>Loading:</strong> {loading ? '🔄 In progress...' : '✅ Terminé'}</p>
              <p><strong>User:</strong> {user ? `👤 ${user.email} (${user.role})` : '❌ Aucun utilisateur'}</p>
              <p><strong>Token (contexte):</strong> {token ? `🔑 ${token.substring(0, 50)}...` : '❌ Aucun token'}</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">localStorage :</h3>
              <p><strong>Token (localStorage):</strong> {localStorageToken ? `🔑 ${localStorageToken.substring(0, 50)}...` : '❌ Aucun token'}</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Test de connexion API :</h3>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('http://localhost:5000/api/courses/levels', {
                      headers: {
                        'Authorization': `Bearer ${localStorageToken}`
                      }
                    });
                    alert(`API des cours: ${response.status} - ${response.ok ? 'OK' : 'Error'}`);
                  } catch (error) {
                    alert(`Error: ${error.message}`);
                  }
                }}
                className="bg-german-600 text-white px-4 py-2 rounded-lg hover:bg-german-700"
              >
                Tester API des cours
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          
          <div className="space-y-4">
            <button
              onClick={() => {
                localStorage.removeItem('token');
                window.location.reload();
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 mr-4"
            >
              Supprimer le token et recharger
            </button>
            
            <button
              onClick={() => {
                window.location.href = '/login';
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Aller à la page de connexion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthDebug;
