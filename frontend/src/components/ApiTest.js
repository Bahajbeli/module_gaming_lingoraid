import React, { useState } from 'react';
import api from '../utils/axios';

const ApiTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    setTestResults([]);
    
    const results = [];
    
    try {
      // Test 1: API de santé
      console.log('🧪 Test 1: API de santé...');
      const healthResponse = await fetch('https://backend-u6jh.onrender.com/api/health');
      results.push({
        test: 'API de santé',
        status: healthResponse.status,
        success: healthResponse.ok,
        error: healthResponse.ok ? null : await healthResponse.text()
      });
    } catch (error) {
      results.push({
        test: 'API de santé',
        status: 'ERROR',
        success: false,
        error: error.message
      });
    }

    try {
      // Test 2: Authentification
      console.log('🧪 Test 2: Authentification...');
      const loginResponse = await fetch('https://backend-u6jh.onrender.com/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@deutsche-lernen.com',
          password: 'admin123'
        })
      });
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        results.push({
          test: 'Authentification admin',
          status: loginResponse.status,
          success: true,
          token: loginData.token.substring(0, 50) + '...'
        });
        
        // Test 3: API des cours avec token
        try {
          console.log('🧪 Test 3: API des cours...');
          const coursesResponse = await fetch('https://backend-u6jh.onrender.com/api/courses/levels', {
            headers: {
              'Authorization': `Bearer ${loginData.token}`
            }
          });
          
          results.push({
            test: 'API des cours',
            status: coursesResponse.status,
            success: coursesResponse.ok,
            error: coursesResponse.ok ? null : await coursesResponse.text()
          });
        } catch (error) {
          results.push({
            test: 'API des cours',
            status: 'ERROR',
            success: false,
            error: error.message
          });
        }
      } else {
        results.push({
          test: 'Authentification admin',
          status: loginResponse.status,
          success: false,
          error: await loginResponse.text()
        });
      }
    } catch (error) {
      results.push({
        test: 'Authentification admin',
        status: 'ERROR',
        success: false,
        error: error.message
      });
    }

    // Test 4: Axios avec intercepteur
    try {
      console.log('🧪 Test 4: Axios avec intercepteur...');
      const axiosResponse = await api.get('/api/courses/levels');
      results.push({
        test: 'Axios avec intercepteur',
        status: axiosResponse.status,
        success: true,
        data: `Niveaux: ${Object.keys(axiosResponse.data).join(', ')}`
      });
    } catch (error) {
      results.push({
        test: 'Axios avec intercepteur',
        status: error.response?.status || 'ERROR',
        success: false,
        error: error.response?.data?.error || error.message
      });
    }

    setTestResults(results);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-german-50 to-german-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-german-800">
          🧪 Test de Sign in API
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <button
            onClick={runTests}
            disabled={loading}
            className="bg-german-600 text-white px-6 py-3 rounded-lg hover:bg-german-700 disabled:opacity-50"
          >
            {loading ? 'Tests en cours...' : 'Lancer les tests'}
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
                    result.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{result.test}</h3>
                    <span className={`px-2 py-1 rounded text-sm ${
                      result.success 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {result.success ? '✅ Succès' : '❌ Échec'}
                    </span>
                  </div>
                  <div className="mt-2 text-sm">
                    <p><strong>Status:</strong> {result.status}</p>
                    {result.token && <p><strong>Token:</strong> {result.token}</p>}
                    {result.data && <p><strong>Données:</strong> {result.data}</p>}
                    {result.error && <p><strong>Error:</strong> {result.error}</p>}
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

export default ApiTest;
