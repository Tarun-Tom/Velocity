import React from 'react';

interface CinematicAtmosphereProps {
  theme: 'light' | 'dark';
}

export const CinematicAtmosphere: React.FC<CinematicAtmosphereProps> = ({ theme }) => {
  return (
    <>
      {/* Film Grain Layer (3% Opacity) */}
      <div
        className="cinematic-film-grain"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 100000,
          opacity: 0.03, // Strictly 3% opacity film grain
          mixBlendMode: theme === 'dark' ? 'screen' : 'multiply',
        }}
      >
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <filter id="filmGrainFilter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="4"
              stitchTiles="stitch"
              result="noise"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#filmGrainFilter)" />
        </svg>
      </div>

      {/* Liquid-Motion Background Blur & Ambient Fluid Glow Overlay */}
      <div
        className="liquid-motion-atmosphere"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          background:
            theme === 'dark'
              ? 'radial-gradient(ellipse at 30% 20%, rgba(197, 160, 89, 0.05) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(197, 160, 89, 0.03) 0%, transparent 65%)'
              : 'radial-gradient(ellipse at 30% 20%, rgba(197, 160, 89, 0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(51, 51, 51, 0.03) 0%, transparent 65%)',
        }}
      />
    </>
  );
};
