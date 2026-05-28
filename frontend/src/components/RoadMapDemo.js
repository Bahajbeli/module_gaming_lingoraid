import React, { useState } from 'react';
import GameRoadMap from './GameRoadMap';

const RoadMapDemo = () => {
  const [creativityProgress, setCreativityProgress] = useState({
    currentStage: 2,
    completedStages: [1]
  });

  const [crosswordProgress, setCrosswordProgress] = useState({
    currentStage: 1,
    completedStages: []
  });

  const handleStageClick = (gameType, stageNumber, currentProgress, setProgress) => {
    if (stageNumber <= currentProgress.currentStage) {
      const newProgress = { ...currentProgress };
      if (!newProgress.completedStages.includes(stageNumber)) {
        newProgress.completedStages.push(stageNumber);
        if (stageNumber === newProgress.currentStage) {
          newProgress.currentStage = Math.min(5, newProgress.currentStage + 1);
        }
        setProgress(newProgress);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🗺️ Démonstration de la Road Map
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            La road map est maintenant intégrée directement dans les cartes de jeu de la section Gaming
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Creativity */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🎨</div>
              <h2 className="text-2xl font-bold text-purple-600 mb-2">Creativity</h2>
              <p className="text-gray-600">Développez votre créativité linguistique</p>
            </div>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-center mb-2">
                <span className="text-xs font-medium text-gray-600">🗺️ Progress</span>
              </div>
              <GameRoadMap
                gameType="creativite"
                currentStage={creativityProgress.currentStage}
                completedStages={creativityProgress.completedStages}
                onStageClick={(stageNumber) => handleStageClick('creativite', stageNumber, creativityProgress, setCreativityProgress)}
              />
              <div className="text-center mt-2">
                <span className="text-xs text-gray-500">
                  {creativityProgress.completedStages.length} / 5 étapes
                </span>
              </div>
              
              {/* Légende */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-orange-500 mr-1"></div>
                    <span>Actuel</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                    <span>Terminé</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-gray-400 mr-1"></div>
                    <span>Verrouillé</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Stage actuel :</strong> {creativityProgress.currentStage}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Stages terminés :</strong> {creativityProgress.completedStages.join(', ') || 'Aucun'}
              </p>
            </div>
          </div>

          {/* Crosswords */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🧩</div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">Crosswords</h2>
              <p className="text-gray-600">Améliorez votre vocabulaire</p>
            </div>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-center mb-2">
                <span className="text-xs font-medium text-gray-600">🗺️ Progress</span>
              </div>
              <GameRoadMap
                gameType="mots-croises"
                currentStage={crosswordProgress.currentStage}
                completedStages={crosswordProgress.completedStages}
                onStageClick={(stageNumber) => handleStageClick('mots-croises', stageNumber, crosswordProgress, setCrosswordProgress)}
              />
              <div className="text-center mt-2">
                <span className="text-xs text-gray-500">
                  {crosswordProgress.completedStages.length} / 5 étapes
                </span>
              </div>
              
              {/* Légende */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-orange-500 mr-1"></div>
                    <span>Actuel</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                    <span>Terminé</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-gray-400 mr-1"></div>
                    <span>Verrouillé</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Stage actuel :</strong> {crosswordProgress.currentStage}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Stages terminés :</strong> {crosswordProgress.completedStages.join(', ') || 'Aucun'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">📋 Instructions</h3>
          <div className="space-y-3 text-gray-600">
            <p>• <strong>Cliquez sur les cercles numérotés</strong> pour simuler la progression des stages</p>
            <p>• <strong>Cercles orange</strong> = Stage actuel (clignotant)</p>
            <p>• <strong>Cercles verts</strong> = Stages terminés (avec ✓)</p>
            <p>• <strong>Cercles gris</strong> = Stages verrouillés (non cliquables)</p>
            <p>• <strong>🚀</strong> = Point de départ, <strong>🏆</strong> = Point d'arrivée</p>
            <p>• La progression est <strong>interactive et en temps réel</strong></p>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">💡 Comment l'utiliser dans votre application :</h4>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. Allez dans la <strong>Section Gaming</strong> de votre application</li>
              <li>2. Choisissez le <strong>Solo Mode</strong> ou <strong>Online Mode</strong></li>
              <li>3. Regardez les cartes de <strong>Creativity</strong> et <strong>Crosswords</strong></li>
              <li>4. Vous verrez la <strong>road map intégrée</strong> dans chaque carte</li>
              <li>5. Cliquez sur les stages pour <strong>tester l'interactivité</strong></li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoadMapDemo;
