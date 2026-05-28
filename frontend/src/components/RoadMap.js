import React, { useState, useEffect } from 'react';
import './RoadMap.css';

const RoadMap = ({ 
  title = "PUZZLE TIME", 
  subtitle = "HELP THE CAR GET TO THE GAS STATION",
  totalStages = 25,
  currentStage = 1,
  onStageClick,
  completedStages = [],
  isInteractive = true,
  theme = "default" // "default", "creativity", "crossword"
}) => {
  const [hoveredStage, setHoveredStage] = useState(null);

  // Configuration des thèmes
  const themes = {
    default: {
      primaryColor: "#4A90E2",
      secondaryColor: "#2E5BBA",
      accentColor: "#F5A623",
      backgroundColor: "#FFFFFF",
      roadColor: "#2C3E50"
    },
    creativity: {
      primaryColor: "#9B59B6",
      secondaryColor: "#8E44AD",
      accentColor: "#E74C3C",
      backgroundColor: "#F8F9FA",
      roadColor: "#34495E"
    },
    crossword: {
      primaryColor: "#27AE60",
      secondaryColor: "#229954",
      accentColor: "#F39C12",
      backgroundColor: "#FEFEFE",
      roadColor: "#2C3E50"
    }
  };

  const currentTheme = themes[theme];

  // Générer les positions des cercles en forme de route sinueuse
  const generateStagePositions = () => {
    const positions = [];
    const centerX = 50; // Pourcentage du centre
    const centerY = 50;
    const radius = 35; // Rayon de la route
    
    for (let i = 1; i <= totalStages; i++) {
      // Créer une route sinueuse avec des variations
      const angle = (i - 1) * (360 / totalStages) * (Math.PI / 180);
      const variation = Math.sin(i * 0.5) * 10; // Variation pour rendre la route plus naturelle
      
      const x = centerX + (radius + variation) * Math.cos(angle);
      const y = centerY + (radius + variation) * Math.sin(angle);
      
      positions.push({ x, y, stage: i });
    }
    
    return positions;
  };

  const stagePositions = generateStagePositions();

  const getStageStatus = (stageNumber) => {
    if (stageNumber === currentStage) return 'current';
    if (completedStages.includes(stageNumber)) return 'completed';
    if (stageNumber < currentStage) return 'completed';
    return 'locked';
  };

  const getStageColor = (stageNumber) => {
    const status = getStageStatus(stageNumber);
    switch (status) {
      case 'current':
        return currentTheme.accentColor;
      case 'completed':
        return currentTheme.secondaryColor;
      case 'locked':
        return '#E0E0E0';
      default:
        return currentTheme.primaryColor;
    }
  };

  const handleStageClick = (stageNumber) => {
    if (!isInteractive) return;
    
    const status = getStageStatus(stageNumber);
    if (status === 'locked') return;
    
    if (onStageClick) {
      onStageClick(stageNumber);
    }
  };

  return (
    <div className="road-map-container" style={{ backgroundColor: currentTheme.backgroundColor }}>
      {/* En-tête */}
      <div className="road-map-header">
        <div className="road-map-title">
          <span className="puzzle-time">{title}</span>
          <h2 className="main-title">{subtitle}</h2>
        </div>
        <div className="car-icon">🚗</div>
      </div>

      {/* Conteneur de la carte */}
      <div className="road-map-content">
        {/* Route de base */}
        <svg className="road-path" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          {/* Route principale */}
          <path
            d={stagePositions.map((pos, index) => 
              `${index === 0 ? 'M' : 'L'} ${pos.x} ${pos.y}`
            ).join(' ')}
            stroke={currentTheme.roadColor}
            strokeWidth="2"
            fill="none"
            strokeDasharray="2,2"
          />
          
          {/* Flèches directionnelles */}
          {stagePositions.map((pos, index) => {
            if (index === stagePositions.length - 1) return null;
            const nextPos = stagePositions[index + 1];
            const angle = Math.atan2(nextPos.y - pos.y, nextPos.x - pos.x);
            const midX = (pos.x + nextPos.x) / 2;
            const midY = (pos.y + nextPos.y) / 2;
            
            return (
              <g key={`arrow-${index}`}>
                <line
                  x1={midX - Math.cos(angle) * 2}
                  y1={midY - Math.sin(angle) * 2}
                  x2={midX + Math.cos(angle) * 2}
                  y2={midY + Math.sin(angle) * 2}
                  stroke={currentTheme.roadColor}
                  strokeWidth="1"
                />
              </g>
            );
          })}
        </svg>

        {/* Cercles des étapes */}
        {stagePositions.map((pos) => {
          const stageNumber = pos.stage;
          const status = getStageStatus(stageNumber);
          const isHovered = hoveredStage === stageNumber;
          
          return (
            <div
              key={stageNumber}
              className={`stage-circle ${status} ${isHovered ? 'hovered' : ''}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                backgroundColor: getStageColor(stageNumber),
                transform: `translate(-50%, -50%) scale(${isHovered ? 1.2 : 1})`,
                cursor: isInteractive && status !== 'locked' ? 'pointer' : 'default'
              }}
              onClick={() => handleStageClick(stageNumber)}
              onMouseEnter={() => setHoveredStage(stageNumber)}
              onMouseLeave={() => setHoveredStage(null)}
            >
              <span className="stage-number">{stageNumber}</span>
              
              {/* Indicateur de progression */}
              {status === 'current' && (
                <div className="current-indicator">
                  <div className="pulse"></div>
                </div>
              )}
              
              {/* Icône de complétion */}
              {status === 'completed' && (
                <div className="completed-icon">✓</div>
              )}
            </div>
          );
        })}

        {/* Point de départ */}
        <div className="start-point" style={{ left: `${stagePositions[0].x}%`, top: `${stagePositions[0].y}%` }}>
          <div className="car-start">🚗</div>
          <span className="start-label">Départ</span>
        </div>

        {/* Point d'arrivée */}
        <div className="end-point" style={{ left: `${stagePositions[stagePositions.length - 1].x}%`, top: `${stagePositions[stagePositions.length - 1].y}%` }}>
          <div className="gas-station">⛽</div>
          <span className="end-label">Arrivée</span>
        </div>
      </div>

      {/* Légende */}
      <div className="road-map-legend">
        <div className="legend-item">
          <div className="legend-circle current"></div>
          <span>Étape actuelle</span>
        </div>
        <div className="legend-item">
          <div className="legend-circle completed"></div>
          <span>Étape terminée</span>
        </div>
        <div className="legend-item">
          <div className="legend-circle locked"></div>
          <span>Étape verrouillée</span>
        </div>
      </div>
    </div>
  );
};

export default RoadMap;
