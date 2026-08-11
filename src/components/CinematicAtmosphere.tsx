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
          zIndex: 99,
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

      {/* Digital Fog Noise Texture Depth Overlay */}
      <div
        className="digital-fog-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background:
            theme === 'dark'
              ? 'radial-gradient(circle at 50% 50%, rgba(197, 160, 89, 0.03) 0%, rgba(0, 0, 0, 0) 70%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.015) 0%, rgba(0, 0, 0, 0) 50%)'
              : 'radial-gradient(circle at 50% 50%, rgba(197, 160, 89, 0.04) 0%, rgba(253, 253, 251, 0) 70%), radial-gradient(circle at 20% 80%, rgba(0, 0, 0, 0.02) 0%, rgba(253, 253, 251, 0) 50%)',
        }}
      />
    </>
  );
};
