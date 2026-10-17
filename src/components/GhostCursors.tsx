import React from 'react';
import { motion } from 'framer-motion';

export interface OpponentCursor {
  callsign: string;
  xPct: number;
  yPct: number;
  lastUpdate: number;
}

interface GhostCursorsProps {
  cursors: Record<string, OpponentCursor>;
  theme: 'light' | 'dark';
}

export const GhostCursors: React.FC<GhostCursorsProps> = ({ cursors, theme }) => {
  const isLight = theme === 'light';
  const circleColor = isLight ? 'rgba(30, 28, 25, 0.22)' : 'rgba(253, 253, 251, 0.20)';
  const circleBorder = isLight ? 'rgba(30, 28, 25, 0.35)' : 'rgba(253, 253, 251, 0.35)';
  const goldColor = isLight ? '#9A762E' : '#C5A059';
  const tagBg = isLight ? 'rgba(250, 247, 242, 0.85)' : 'rgba(0, 0, 0, 0.80)';
  const textColor = isLight ? '#1E1C19' : '#FDFDFB';

  const opponentList = Object.values(cursors);

  if (opponentList.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 42,
        overflow: 'hidden',
      }}
    >
      {opponentList.map((opp) => {
        // Calculate coordinate in pixels
        const targetX = opp.xPct * (typeof window !== 'undefined' ? window.innerWidth : 1920);
        const targetY = opp.yPct * (typeof window !== 'undefined' ? window.innerHeight : 1080);

        return (
          <motion.div
            key={opp.callsign}
            animate={{ x: targetX, y: targetY }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
              mass: 0.5,
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 0,
              height: 0,
              pointerEvents: 'none',
            }}
          >
            {/* Reticle Circle */}
            <div
              style={{
                position: 'absolute',
                top: -12,
                left: -12,
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: circleColor,
                border: `1px solid ${circleBorder}`,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Center Dot */}
              <div
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
                  background: goldColor,
                  opacity: 0.8,
                }}
              />
            </div>

            {/* Crosshair micro-hairlines */}
            <div
              style={{
                position: 'absolute',
                top: -18,
                left: 0,
                width: 1,
                height: 6,
                background: circleBorder,
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: 0,
                width: 1,
                height: 6,
                background: circleBorder,
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: -18,
                width: 6,
                height: 1,
                background: circleBorder,
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 12,
                width: 6,
                height: 1,
                background: circleBorder,
              }}
            />

            {/* Callsign Tag Badge */}
            <div
              style={{
                position: 'absolute',
                left: 16,
                top: -12,
                padding: '2px 6px',
                background: tagBg,
                border: `1px solid ${goldColor}`,
                borderRadius: 0,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: textColor,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              {opp.callsign}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
