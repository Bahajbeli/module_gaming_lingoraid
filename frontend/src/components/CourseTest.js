import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/axios';

const CourseTest = () => {
  const { user, token } = useAuth();
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const runCourseTests = async () => {
    setLoading(true);
    setTestResults([]);
    
    const results = [];
    
    try {
      // Test 1: Vérifier l'authentification
      console.log('🧪 Test 1: Vérification de l\'authentification...');
      results.push({
        test: 'Authentification',
        status: user ? '✅ Connecté' : '❌ Non connecté',
        details: user ? `${user.email} (${user.role})` : 'Aucun utilisateur'
      });
      
      // Test 2: Vérifier le token
      console.log('🧪 Test 2: Vérification du token...');
      const hasToken = token || localStorage.getItem('token');
      results.push({
        test: 'Token disponible',
        status: hasToken ? '✅ Token présent' : '❌ Aucun token',
        details: hasToken ? 'Token disponible pour les requêtes API' : 'Unable to faire des requêtes authentifiées'
      });
      
      // Test 3: Test de l'API des cours
      if (hasToken) {
        try {
          console.log('🧪 Test 3: Test de l\'API des cours...');
          const response = await api.get('/api/courses/levels');
          results.push({
            test: 'API des cours',
            status: '✅ Succès',
            details: `Status: ${response.status}, Niveaux: ${Object.keys(response.data).join(', ')}`
          });
          
          // Test 4: Test d'un niveau spécifique
          if (response.data.A1 && response.data.A1.length > 0) {
            const firstCourse = response.data.A1[0];
            results.push({
              test: 'Cours A1 disponible',
              status: '✅ Succès',
              details: `Premier cours: ${firstCourse.title} (ID: ${firstCourse.id})`
            });
            
            // Test 5: Test de démarrage d'un cours
            try {
              console.log('🧪 Test 5: Test de démarrage d\'un cours...');
              const startResponse = await api.post(`/api/progress/courses/${firstCourse.id}/start`);
              results.push({
                test: 'Démarrage de cours',
                status: '✅ Succès',
                details: `Status: ${startResponse.status}, Message: ${startResponse.data.message}`
              });
            } catch (error) {
              results.push({
                test: 'Démarrage de cours',
                status: '❌ Échec',
                details: `Error: ${error.response?.data?.error || error.message}`
              });
            }
          } else {
            results.push({
              test: 'Cours A1 disponible',
              status: '❌ Échec',
              details: 'Aucun cours trouvé dans le niveau A1'
            });
          }
          
        } catch (error) {
          results.push({
            test: 'API des cours',
            status: '❌ Échec',
            details: `Error: ${error.response?.data?.error || error.message}`
          });
        }
      } else {
        results.push({
          test: 'API des cours',
          status: '⏭️ Ignoré',
          details: 'Pas de token disponible'
        });
      }
      
    } catch (error) {
      results.push({
        test: 'Tests généraux',
        status: '❌ Error',
        details: `Error: ${error.message}`
      });
    }
    
    setTestResults(results);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-german-50 to-german-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-german-800">
          🧪 Test des Cours
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">État actuel</h2>
          <div className="space-y-2">
            <p><strong>Utilisateur:</strong> {user ? `${user.email} (${user.role})` : 'Non connecté'}</p>
            <p><strong>Token:</strong> {token ? 'Présent' : 'Absent'}</p>
            <p><strong>localStorage:</strong> {localStorage.getItem('token') ? 'Présent' : 'Absent'}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <button
            onClick={runCourseTests}
            disabled={loading}
            className="bg-german-600 text-white px-6 py-3 rounded-lg hover:bg-german-700 disabled:opacity-50"
          >
            {loading ? 'Tests en cours...' : 'Lancer les tests des cours'}
          </button>
        </div>

        {testResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Résultats des tests</h2>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.status.includes('✅') 
                      ? 'bg-green-50 border-green-200' 
                      : result.status.includes('❌')
                      ? 'bg-red-50 border-red-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{result.test}</h3>
                    <span className={`px-2 py-1 rounded text-sm ${
                      result.status.includes('✅') 
                        ? 'bg-green-100 text-green-800' 
                        : result.status.includes('❌')
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {result.status}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {result.details}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseTest;
