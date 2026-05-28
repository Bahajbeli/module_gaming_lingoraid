import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Import des composants de gamification
import GamifiedCourse from './GamifiedCourse';
import EnhancedCourseDetail from './EnhancedCourseDetail';

// Exemple d'intégration dans App.js
const ExampleIntegration = () => {
  return (
    <Routes>
      {/* Route pour le cours gamifié complet */}
      <Route 
        path="/gamified-course/:courseId/:chapterId/:lessonId" 
        element={<GamifiedCourse />} 
      />
      
      {/* Route pour le détail de cours amélioré */}
      <Route 
        path="/enhanced-course/:courseId" 
        element={<EnhancedCourseDetail />} 
      />
      
      {/* Autres routes existantes... */}
    </Routes>
  );
};

export default ExampleIntegration;

// Exemple d'utilisation dans un composant existant
export const ExampleUsage = () => {
  const [showGamification, setShowGamification] = useState(false);
  
  return (
    <div>
      {/* Bouton pour activer la gamification */}
      <button
        onClick={() => setShowGamification(true)}
        className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200"
      >
        🎮 Activer la Gamification
      </button>
      
      {/* Affichage conditionnel */}
      {showGamification && (
        <GamifiedCourse 
          courseId="A1"
          chapterId="A1-1"
          lessonId="A1-1-1"
        />
      )}
    </div>
  );
};





















