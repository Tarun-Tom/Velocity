import React from 'react';
import { motion } from 'framer-motion';
import { VariableTitle } from './VariableTitle';
import { VelocityButton } from './VelocityButton';
import { Volume2, VolumeX, Moon, Sun, BarChart2, Play } from 'lucide-react';

export type GameMode = 'Chrono' | 'Overdrive' | 'Zen';

interface LeaderboardEntry {
  mode: GameMode;
  score: number;
  wpm: number;
  accuracy: number;
  date: string;
}

interface BentoHubProps {
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  muted: boolean;
  setMuted: (m: boolean) => void;
  showLeaderboard: boolean;
  setShowLeaderboard: (s: boolean) => void;
  gameMode: GameMode;
  setGameMode: (m: GameMode) => void;
  scores: Record<string, number>;
  getLeaderboardData: () => LeaderboardEntry[];
  mousePos: { x: number; y: number };
  onBeginSession: () => void;
}

export const BentoHub: React.FC<BentoHubProps> = ({
  theme,
  setTheme,
  muted,
  setMuted,
  showLeaderboard,
  setShowLeaderboard,
  gameMode,
  setGameMode,
  scores,
  getLeaderboardData,
  mousePos,
  onBeginSession,
}) => {
  const springConfig = { type: 'spring' as const, stiffness: 220, damping: 22 };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={springConfig}
      className="bento-hub-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        boxSizing: 'border-box',
        pointerEvents: 'auto',
      }}
    >
      <div
        className="bento-hub-grid"
        style={{
          width: '100%',
          maxWidth: '1180px',
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '16px',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {/* MODULE 1: MAIN TITLE & BRAND IDENTITY (Top-Left Priority, Col-span 7) */}
        <div
          className="bento-module title-module"
          style={{
            gridColumn: 'span 7',
            border: '1px solid var(--border-idle)',
            borderRadius: '0px',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: theme === 'dark' ? 'rgba(0, 0, 0, 0.88)' : 'rgba(253, 253, 251, 0.88)',
            position: 'relative',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <span style={{ fontSize: '10px', letterSpacing: '0.25em', color: '#C5A059' }}>
                [ SPATIAL_TYPING_ENGINE ]
              </span>
              <span style={{ fontSize: '10px', letterSpacing: '0.15em', color: '#FDFDFB', opacity: 0.65 }}>
                VECTOR_01 // 60s_STABILIZED
              </span>
            </div>

            {/* Variable Title: Proximity responsive typography (Gold #C5A059) */}
            <VariableTitle mousePos={mousePos} />

            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: 'italic',
                fontSize: '16px',
                opacity: 0.9,
                color: '#C5A059',
                marginTop: '8px',
                letterSpacing: '0.02em',
              }}
            >
              Spatial precision. Kinetic intent.
            </div>
          </div>

          {/* Global Config Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid #C5A059',
            }}
          >
            <div style={{ display: 'flex', gap: '12px' }}>
              <VelocityButton
                onClick={() => setMuted(!muted)}
                ariaLabel={muted ? 'Unmute audio' : 'Mute audio'}
              >
                {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                <span>{muted ? 'MUTED' : 'AUDIO_ON'}</span>
              </VelocityButton>

              <VelocityButton
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                ariaLabel="Toggle color theme"
              >
                {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                <span>{theme.toUpperCase()}</span>
              </VelocityButton>
            </div>

            <VelocityButton
              className={showLeaderboard ? 'active' : ''}
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              ariaLabel="Toggle leaderboard"
            >
              <BarChart2 size={14} />
              <span>[ LEADERBOARD ]</span>
            </VelocityButton>
          </div>
        </div>

        {/* MODULE 2: SYSTEM ARCHIVE & TELEMETRY (Top-Right, Col-span 5) */}
        <div
          className="bento-module archive-module"
          style={{
            gridColumn: 'span 5',
            border: '1px solid #C5A059',
            borderRadius: '0px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: theme === 'dark' ? 'rgba(0, 0, 0, 0.88)' : 'rgba(253, 253, 251, 0.88)',
          }}
        >
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', marginBottom: '14px', color: '#C5A059' }}>
              [ ARCHIVE_TELEMETRY ]
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  border: '1px solid #C5A059',
                  fontSize: '11px',
                }}
              >
                <span style={{ opacity: 0.6, color: '#FDFDFB' }}>PB CHRONO:</span>
                <span style={{ fontWeight: 700, color: '#C5A059' }}>{scores.Chrono || 0} PTS</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  border: '1px solid #C5A059',
                  fontSize: '11px',
                }}
              >
                <span style={{ opacity: 0.6, color: '#FDFDFB' }}>PB OVERDRIVE:</span>
                <span style={{ fontWeight: 700, color: '#C5A059' }}>{scores.Overdrive || 0} PTS</span>
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: '10px',
              opacity: 0.45,
              color: '#FDFDFB',
              letterSpacing: '0.1em',
              lineHeight: 1.5,
              marginTop: '16px',
            }}
          >
            MOTOR_MEMORY: ACTIVE <br />
            PROXIMITY_LOCK: 180PX RADIUS <br />
            SPRING_PHYSICS: HIGH_TENSION
          </div>
        </div>

        {/* MODULE 3: PRIMARY ACTIONHUB (Bottom-Left Priority, Col-span 7) */}
        <div
          className="bento-module action-module"
          style={{
            gridColumn: 'span 7',
            border: '1px solid #C5A059',
            borderRadius: '0px',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: theme === 'dark' ? 'rgba(0, 0, 0, 0.88)' : 'rgba(253, 253, 251, 0.88)',
          }}
        >
          {showLeaderboard ? (
            <div>
              <div style={{ fontSize: '11px', letterSpacing: '0.2em', marginBottom: '12px', color: '#C5A059' }}>
                [ GLOBAL_LEADERBOARD ]
              </div>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', color: '#FDFDFB' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #C5A059', opacity: 0.55 }}>
                    <th style={{ textAlign: 'left', padding: '6px 0', color: '#C5A059' }}>MODE</th>
                    <th style={{ textAlign: 'left', padding: '6px 0', color: '#C5A059' }}>SCORE</th>
                    <th style={{ textAlign: 'left', padding: '6px 0', color: '#C5A059' }}>WPM</th>
                    <th style={{ textAlign: 'left', padding: '6px 0', color: '#C5A059' }}>ACC</th>
                  </tr>
                </thead>
                <tbody>
                  {getLeaderboardData().length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '12px 0', opacity: 0.4 }}>
                        No session records captured
                      </td>
                    </tr>
                  ) : (
                    getLeaderboardData().slice(0, 4).map((entry, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px dashed #C5A059' }}>
                        <td style={{ padding: '8px 0', color: '#C5A059' }}>{entry.mode}</td>
                        <td style={{ color: '#C5A059', fontWeight: 600 }}>{entry.score}</td>
                        <td style={{ color: '#C5A059' }}>{entry.wpm}</td>
                        <td style={{ color: '#C5A059' }}>{entry.accuracy}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', marginBottom: '12px', color: '#C5A059' }}>
                [ SESSION_INITIALIZATION ]
              </div>
              <div style={{ fontSize: '12px', opacity: 0.85, color: '#C5A059', lineHeight: 1.6, marginBottom: '20px' }}>
                Hover cursor within word focus zones to target. Type keystrokes with kinetic flow.
              </div>

              {/* Primary Action Button — Strictly Gold (#C5A059) */}
              <VelocityButton
                onClick={onBeginSession}
                className="begin-session-btn"
                style={{
                  width: '100%',
                  padding: '1.25rem',
                  fontSize: '15px',
                  letterSpacing: '0.2em',
                  fontWeight: 700,
                  justifyContent: 'center',
                }}
              >
                <Play size={16} fill="currentColor" />
                [ BEGIN_SESSION ]
              </VelocityButton>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '10px',
              opacity: 0.45,
              color: '#FDFDFB',
              letterSpacing: '0.1em',
              marginTop: '16px',
            }}
          >
            <span>STATUS: CALIBRATED</span>
            <span>PRESS ENTER OR CLICK TO COMMENCE</span>
          </div>
        </div>

        {/* MODULE 4: MODE CALIBRATION (Center-Right Priority, Col-span 5) — Gold (#C5A059) */}
        <div
          className="bento-module mode-module"
          style={{
            gridColumn: 'span 5',
            border: '1px solid #C5A059',
            borderRadius: '0px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: theme === 'dark' ? 'rgba(0, 0, 0, 0.88)' : 'rgba(253, 253, 251, 0.88)',
          }}
        >
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', marginBottom: '14px', color: '#C5A059' }}>
              [ MODE_CALIBRATION ]
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Mode Selectors — Bone White (#FDFDFB) */}
              <VelocityButton
                className={gameMode === 'Chrono' ? 'active' : ''}
                onClick={() => setGameMode('Chrono')}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                CHRONO (60S)
              </VelocityButton>

              <VelocityButton
                className={gameMode === 'Overdrive' ? 'active' : ''}
                onClick={() => setGameMode('Overdrive')}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                OVERDRIVE (+TIME)
              </VelocityButton>

              <VelocityButton
                className={gameMode === 'Zen' ? 'active' : ''}
                onClick={() => setGameMode('Zen')}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                ZEN (ENDLESS)
              </VelocityButton>
            </div>
          </div>

          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              border: '1px solid #C5A059',
              fontSize: '11px',
              lineHeight: 1.5,
              opacity: 0.75,
              color: '#FDFDFB',
            }}
          >
            {gameMode === 'Chrono' && 'Fixed 60-second speed run. Maximize WPM & score accuracy.'}
            {gameMode === 'Overdrive' && '15s initial clock. +3s per word, +5s per synergy streak.'}
            {gameMode === 'Zen' && 'Pure motor-memory flow. No timer, no penalties, endless flow.'}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
