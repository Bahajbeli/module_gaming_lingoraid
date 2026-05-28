import React, { useMemo, useState } from 'react';
import './GameRoadMap.css';

const GameRoadMap = ({ 
  gameType, 
  currentStage = 1, 
  completedStages = [], 
  onStageClick,
  compact = true,
  totalStages = 5,
  pageSize = 5,
  page: controlledPage,
  onPageChange,
  games = []
}) => {
  const [hoveredStage, setHoveredStage] = useState(null);
  const derivedInitialPage = Math.max(1, Math.min(Math.ceil((currentStage || 1) / pageSize), Math.max(1, Math.ceil(totalStages / pageSize))));
  const [internalPage, setInternalPage] = useState(derivedInitialPage);
  const page = controlledPage || internalPage;

  // Configuration des thèmes par type de jeu (Light Premium)
  const themes = {
    creativite: {
      primaryColor: "#a78bfa",
      secondaryColor: "#10b981",
      accentColor: "#f59e0b",
      backgroundColor: "#ffffff",
      roadColor: "rgba(148, 163, 184, 0.35)"
    },
    "mots-croises": {
      primaryColor: "#60a5fa",
      secondaryColor: "#10b981",
      accentColor: "#f59e0b",
      backgroundColor: "#ffffff",
      roadColor: "rgba(148, 163, 184, 0.35)"
    }
  };

  const currentTheme = themes[gameType] || themes.creativite;
  const totalPages = Math.max(1, Math.ceil(totalStages / pageSize));
  const startStage = (page - 1) * pageSize + 1;
  const endStage = Math.min(page * pageSize, totalStages);
  const visibleStages = useMemo(() => {
    if (totalStages <= 0) return [];
    const arr = [];
    for (let n = startStage; n <= endStage; n++) arr.push(n);
    return arr;
  }, [startStage, endStage, totalStages]);

  // Générer des positions sinueuses (S-curve) pour les étapes
  const generateStagePositions = () => {
    const positions = [];
    if (visibleStages.length <= 0) return positions;
    
    const top = compact ? 15 : 12;
    const bottom = compact ? 85 : 88;
    const count = visibleStages.length;
    const step = (bottom - top) / Math.max(1, count - 1);
    const amplitude = compact ? 10 : 24;

    visibleStages.forEach((stageNum, idx) => {
      const y = top + idx * step;
      // S-curve formula using sine wave
      const x = 50 + Math.sin(idx * 1.5) * amplitude;
      positions.push({ x, y, stage: stageNum });
    });
    
    return positions;
  };

  const stagePositions = generateStagePositions();

  // Générer un tracé de courbe sinueuse parfait en SVG
  const pathD = useMemo(() => {
    if (visibleStages.length === 0) return "";
    const points = [];
    const top = compact ? 15 : 12;
    const bottom = compact ? 85 : 88;
    const step = (bottom - top) / 100;
    const amplitude = compact ? 10 : 24;
    
    for (let i = 0; i <= 100; i++) {
      const y = top + i * step;
      const idxFloat = (i / 100) * (visibleStages.length - 1);
      const x = 50 + Math.sin(idxFloat * 1.5) * amplitude;
      points.push({ x, y });
    }
    
    return points.map((p, index) =>
      `${index === 0 ? 'M' : 'L'} ${p.x * 2.4} ${p.y * 2.4}`
    ).join(' ');
  }, [visibleStages.length, compact]);

  const pathDCompact = useMemo(() => {
    if (visibleStages.length === 0) return "";
    const points = [];
    const top = compact ? 15 : 12;
    const bottom = compact ? 85 : 88;
    const step = (bottom - top) / 100;
    const amplitude = compact ? 10 : 24;
    
    for (let i = 0; i <= 100; i++) {
      const y = top + i * step;
      const idxFloat = (i / 100) * (visibleStages.length - 1);
      const x = 50 + Math.sin(idxFloat * 1.5) * amplitude;
      points.push({ x, y });
    }
    
    return points.map((p, index) =>
      `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');
  }, [visibleStages.length, compact]);

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
        return '#475569';
      default:
        return currentTheme.primaryColor;
    }
  };

  const handleStageClick = (stageNumber) => {
    const status = getStageStatus(stageNumber);
    if (status === 'locked') return;
    
    if (onStageClick) {
      onStageClick(stageNumber);
    }
  };

  const changePage = (nextPage) => {
    const clamped = Math.min(Math.max(1, nextPage), totalPages);
    if (controlledPage && onPageChange) onPageChange(clamped);
    else setInternalPage(clamped);
  };

  const getStageTitle = (stageNumber) => {
    const game = games && games[stageNumber - 1];
    return game ? game.title : `Level ${stageNumber}`;
  };

  if (!compact) {
    return (
      <div className="game-road-map-full">
        {stagePositions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 text-lg mb-2">🎮</div>
            <div className="text-gray-600 font-medium">Aucun jeu disponible</div>
            <div className="text-gray-500 text-sm">L'administrateur n'a pas encore créé de jeux pour ce type</div>
          </div>
        ) : (
          <>
            <svg className="road-path-full" viewBox="0 0 240 240" preserveAspectRatio="xMidYMid meet">
              <path
                d={pathD}
                stroke={currentTheme.roadColor}
                strokeWidth="5"
                fill="none"
                strokeDasharray="6,8"
                strokeLinecap="round"
              />
            </svg>

            {stagePositions.map((pos) => {
              const stageNumber = pos.stage;
              const status = getStageStatus(stageNumber);
              const isHovered = hoveredStage === stageNumber;
              const stageTitle = getStageTitle(stageNumber);
              
              return (
                <div
                  key={stageNumber}
                  className={`stage-hexagon-container ${status} ${isHovered ? 'hovered' : ''}`}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                  }}
                  onClick={() => handleStageClick(stageNumber)}
                  onMouseEnter={() => setHoveredStage(stageNumber)}
                  onMouseLeave={() => setHoveredStage(null)}
                >
                  <div className={`hexagon-outer ${status}`}>
                    <div className={`hexagon-inner ${status}`}>
                      <svg className="hexagon-star" viewBox="0 0 24 24" fill={status === 'locked' ? 'rgba(255,255,255,0.12)' : status === 'completed' ? '#10b981' : '#f59e0b'} stroke="none">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                      <span className="hexagon-number">{stageNumber}</span>
                    </div>
                  </div>

                  <div className="hexagon-label-container">
                    <span className="hexagon-label-title">
                      {stageTitle}
                    </span>
                    <span className="hexagon-label-status">
                      {status === 'completed' ? 'Play again' : status === 'current' ? 'Play' : 'Verrouillé'}
                    </span>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {totalPages > 1 && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-4 py-1.5 rounded-full shadow-md border border-slate-200/80 flex items-center space-x-2 text-sm select-none z-30">
            <button
              onClick={() => changePage(page - 1)}
              disabled={page <= 1}
              className={`px-2 py-0.5 rounded-full border border-slate-200 text-slate-700 ${page <= 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100'}`}
            >
              ◀
            </button>
            <span className="font-medium text-slate-500">Page {page}/{totalPages}</span>
            <button
              onClick={() => changePage(page + 1)}
              disabled={page >= totalPages}
              className={`px-2 py-0.5 rounded-full border border-slate-200 text-slate-700 ${page >= totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100'}`}
            >
              ▶
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="game-road-map-compact">
      {stagePositions.length > 0 && (
        <svg className="road-path-compact" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <path
            d={pathDCompact}
            stroke={currentTheme.roadColor}
            strokeWidth="2.5"
            fill="none"
            strokeDasharray="4,5"
            strokeLinecap="round"
          />
        </svg>
      )}

      {stagePositions.map((pos) => {
        const stageNumber = pos.stage;
        const status = getStageStatus(stageNumber);
        const isHovered = hoveredStage === stageNumber;
        
        return (
          <div
            key={stageNumber}
            className={`stage-circle-compact ${status} ${isHovered ? 'hovered' : ''}`}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              backgroundColor: getStageColor(stageNumber),
              transform: `translate(-50%, -50%) scale(${isHovered ? 1.2 : 1})`,
              cursor: status !== 'locked' ? 'pointer' : 'default'
            }}
            onClick={() => handleStageClick(stageNumber)}
            onMouseEnter={() => setHoveredStage(stageNumber)}
            onMouseLeave={() => setHoveredStage(null)}
            title={`Stage ${stageNumber} - ${status === 'completed' ? 'Terminé' : status === 'current' ? 'Actuel' : 'Verrouillé'}`}
          >
            <span className="stage-number-compact">{stageNumber}</span>
            
            {status === 'current' && (
              <div className="current-indicator-compact">
                <div className="pulse-compact"></div>
              </div>
            )}
            
            {status === 'completed' && (
              <div className="completed-icon-compact">✓</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GameRoadMap;
