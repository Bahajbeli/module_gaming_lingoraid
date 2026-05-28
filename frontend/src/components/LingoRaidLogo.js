import React from 'react';

const LingoRaidLogo = ({ size = 40, className = "" }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 120" 
      className={className}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle */}
      <circle cx="50" cy="50" r="45" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2"/>
      
      {/* Large "R" letter */}
      <path 
        d="M25 15 L25 85 L45 85 Q60 85 60 70 L60 60 Q60 50 50 50 L45 50 L45 40 L55 40 L55 30 L45 30 L45 20 L25 20 Z M45 60 L50 60 Q55 60 55 65 L55 70 Q55 75 50 75 L45 75 Z" 
        fill="#374151"
      />
      
      {/* Sword pommel */}
      <circle cx="50" cy="12" r="3" fill="#374151"/>
      
      {/* Sword grip */}
      <rect x="47" y="15" width="6" height="8" fill="#374151" rx="1"/>
      
      {/* Sword crossguard */}
      <rect x="35" y="23" width="30" height="4" fill="#374151" rx="2"/>
      
      {/* Sword blade with German flag colors */}
      <rect x="48" y="27" width="4" height="35" fill="#fbbf24"/> {/* Yellow top */}
      <rect x="48" y="42" width="4" height="5" fill="#dc2626"/> {/* Red middle */}
      <rect x="48" y="47" width="4" height="15" fill="#fbbf24"/> {/* Yellow bottom */}
      
      {/* Sword tip */}
      <path d="M48 62 L50 70 L52 62 Z" fill="#fbbf24"/>
      
      {/* Text "lingoRaid" */}
      <text x="50" y="105" textAnchor="middle" fill="#374151" fontSize="12" fontFamily="Arial, sans-serif" fontWeight="bold">
        lingo<tspan fontSize="14">R</tspan>aid
      </text>
    </svg>
  );
};

export default LingoRaidLogo;
