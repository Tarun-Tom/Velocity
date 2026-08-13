import React from 'react';
import { motion } from 'framer-motion';
import { VariableTitle } from './VariableTitle';
import { VelocityButton } from './VelocityButton';
import { Volume2, VolumeX, Moon } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
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

// ── Telemetry Corner Markers ───────────────────────────────────────────────────
// Tiny 1px monospace '+' signs at the four interior corners of each Bento module.
// Renders the blueprint/telemetry screen aesthetic without any visual noise.
export const TelemetryCorners = () => (
  <>
    <span aria-hidden="true" style={{ position: 'absolute', top: 5, left: 7,   fontSize: 10, lineHeight: 1, color: '#C5A059', opacity: 0.45, pointerEvents: 'none', fontFamily: 'monospace', userSelect: 'none' }}>+</span>
    <span aria-hidden="true" style={{ position: 'absolute', top: 5, right: 7,  fontSize: 10, lineHeight: 1, color: '#C5A059', opacity: 0.45, pointerEvents: 'none', fontFamily: 'monospace', userSelect: 'none' }}>+</span>
    <span aria-hidden="true" style={{ position: 'absolute', bottom: 5, left: 7,  fontSize: 10, lineHeight: 1, color: '#C5A059', opacity: 0.45, pointerEvents: 'none', fontFamily: 'monospace', userSelect: 'none' }}>+</span>
    <span aria-hidden="true" style={{ position: 'absolute', bottom: 5, right: 7, fontSize: 10, lineHeight: 1, color: '#C5A059', opacity: 0.45, pointerEvents: 'none', fontFamily: 'monospace', userSelect: 'none' }}>+</span>
  </>
);

// ── Module wrapper ─────────────────────────────────────────────────────────────
// Thin wrapper that enforces the common bento token set: 1px Gold border,
// 0px radius, correct background per theme, relative positioning for corners.
const Module: React.FC<{
  span?: number;
  rowSpan?: number;
  style?: React.CSSProperties;
  className?: string;
  children: React.ReactNode;
  theme: 'light' | 'dark';
  noHover?: boolean;
}> = ({ span, style, className = '', children, theme, noHover }) => (
  <div
    className={`bento-module ${className} ${noHover ? 'no-hover' : ''}`}
    style={{
      gridColumn: span ? `span ${span}` : undefined,
      position: 'relative',
      border: '1px solid #C5A059',
      borderRadius: 0,
      padding: '24px 28px',
      background: theme === 'dark' ? 'rgba(0,0,0,0.92)' : 'rgba(253,253,251,0.92)',
      boxSizing: 'border-box',
      ...style,
    }}
  >
    <TelemetryCorners />
    {children}
  </div>
);

// ── Module header label ───────────────────────────────────────────────────────
const ModuleTag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontSize: 10,
      letterSpacing: '0.22em',
      color: '#C5A059',
      textTransform: 'uppercase',
      fontFamily: "'JetBrains Mono', monospace",
      marginBottom: 14,
      opacity: 0.85,
    }}
  >
    {children}
  </div>
);

// ── Neutral text color ─────────────────────────────────────────────────────────
const neutral = (theme: 'light' | 'dark') =>
  theme === 'light' ? '#333333' : '#FDFDFB';

// ══════════════════════════════════════════════════════════════════════════════
// BentoHub
// ══════════════════════════════════════════════════════════════════════════════
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
  const [isBeginHovered, setIsBeginHovered] = React.useState(false);

  const txt = neutral(theme);
  const springConfig = { type: 'spring' as const, stiffness: 220, damping: 22 };

  // Mode description copy
  const modeDesc: Record<GameMode, string> = {
    Chrono:    '60s fixed. Maximize WPM & accuracy.',
    Overdrive: '15s initial. +3s per word, +5s per streak.',
    Zen:       'Endless flow. No timer. No penalties.',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={springConfig}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        boxSizing: 'border-box',
        pointerEvents: 'auto',
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {/*
        12-COLUMN SYMMETRICAL BENTO HUB GRID
        ─────────────────────────────────────────────
        Top Row (Height: 320px):
          [Module 1: Title]       -> col-span-8
          [Module 2: Records]     -> col-span-4
        Bottom Row (Height: 420px):
          [Module 3: Protocol]    -> col-span-4
          [Module 4: Begin Slab]  -> col-span-4
          [Module 5: Modes]       -> col-span-4
        ─────────────────────────────────────────────
        Gap: 16px (1rem). Max width: 1280px.
      */}
      <div
        className="bento-container"
        style={{
          width: '100%',
          maxWidth: 1280,
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '1rem',
          alignItems: 'stretch',
        }}
      >

        {/* ─── MODULE 1: TITLE ─── col-span-8, row 1 (320px) ──────────────────────── */}
        <Module
          theme={theme}
          style={{
            gridColumn: 'span 8',
            height: 320,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {/* Top meta row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 10, letterSpacing: '0.28em', color: '#C5A059' }}>
                [ SPATIAL_TYPING_ENGINE ]
              </span>
              <span style={{ fontSize: 10, letterSpacing: '0.15em', color: txt, opacity: 0.55 }}>
                VECTOR_01 // STABILIZED
              </span>
            </div>

            {/* Variable-weight title */}
            <VariableTitle mousePos={mousePos} />

            {/* Italic tagline */}
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: 'italic',
              fontSize: 15,
              color: '#C5A059',
              marginTop: 8,
              opacity: 0.85,
              letterSpacing: '0.02em',
            }}>
              Spatial precision. Kinetic intent.
            </div>
          </div>

          {/* Config toolbar */}
          <div style={{
            display: 'flex',
            gap: 10,
            marginTop: 'auto',
            paddingTop: 16,
            borderTop: '1px solid rgba(197,160,89,0.35)',
          }}>
            <VelocityButton
              onClick={() => setMuted(!muted)}
              ariaLabel={muted ? 'Unmute audio' : 'Mute audio'}
            >
              {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
              <span>{muted ? 'MUTED' : 'AUDIO_ON'}</span>
            </VelocityButton>

            <VelocityButton
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              ariaLabel="Toggle color theme"
            >
              <Moon size={12} />
              <span>{theme.toUpperCase()}_MODE</span>
            </VelocityButton>

            <VelocityButton
              className={showLeaderboard ? 'active' : ''}
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              ariaLabel="Toggle leaderboard"
              style={{ marginLeft: 'auto' }}
            >
              <span>[ ARCHIVE ]</span>
            </VelocityButton>
          </div>
        </Module>

        {/* ─── MODULE 2: RECORDS ─── col-span-4, row 1 (320px) ───────────────────── */}
        <Module
          theme={theme}
          style={{
            gridColumn: 'span 4',
            height: 320,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <ModuleTag>[ RECORD_ARCHIVE ]</ModuleTag>

          {showLeaderboard ? (
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', color: txt, flex: 1 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #C5A059' }}>
                  <th style={{ textAlign: 'left', padding: '5px 0', color: '#C5A059', fontWeight: 600 }}>MODE</th>
                  <th style={{ textAlign: 'left', padding: '5px 0', color: '#C5A059', fontWeight: 600 }}>SCORE</th>
                  <th style={{ textAlign: 'left', padding: '5px 0', color: '#C5A059', fontWeight: 600 }}>WPM</th>
                  <th style={{ textAlign: 'left', padding: '5px 0', color: '#C5A059', fontWeight: 600 }}>ACC</th>
                </tr>
              </thead>
              <tbody>
                {getLeaderboardData().length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '14px 0', opacity: 0.4, fontSize: 10 }}>
                      NO SESSION RECORDS
                    </td>
                  </tr>
                ) : (
                  getLeaderboardData().slice(0, 5).map((entry, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(197,160,89,0.2)' }}>
                      <td style={{ padding: '7px 0', color: '#C5A059' }}>{entry.mode.toUpperCase()}</td>
                      <td style={{ color: txt, fontWeight: 600 }}>{entry.score}</td>
                      <td style={{ color: txt }}>{entry.wpm}</td>
                      <td style={{ color: txt }}>{entry.accuracy}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              {(['Chrono', 'Overdrive', 'Zen'] as GameMode[]).map((mode) => (
                <div
                  key={mode}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '9px 14px',
                    border: '1px solid rgba(197,160,89,0.4)',
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: '#C5A059', opacity: 0.7 }}>PB {mode.toUpperCase()}:</span>
                  <span style={{ fontWeight: 700, color: '#C5A059' }}>
                    {scores[mode] || 0} PTS
                  </span>
                </div>
              ))}
              <div style={{ marginTop: 'auto', fontSize: 10, opacity: 0.4, color: txt, lineHeight: 1.6 }}>
                MOTOR_MEMORY: ACTIVE<br />
                PROXIMITY_LOCK: 240PX RADIUS
              </div>
            </div>
          )}
        </Module>

        {/* ─── MODULE 3: PROTOCOL ─── col-span-4, row 2 (420px) ───────────────────── */}
        <Module
          theme={theme}
          className="bottom-row-module protocol-module"
          style={{
            gridColumn: 'span 4',
            height: 420,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
          }}
          noHover
        >
          <ModuleTag>[ 00_PROTOCOL ]</ModuleTag>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              '01_LOCATE: ALIGN CURSOR TO NODE RADIUS',
              '02_CALIBRATE: GILD CHARACTERS VIA INPUT',
              '03_VELOCITY: MAINTAIN SYNERGY FOR KINETIC STREAK',
            ].map((line) => (
              <div
                key={line}
                className="protocol-item"
                style={{
                  fontSize: 10,
                  lineHeight: 1.6,
                  color: txt,
                  letterSpacing: '0.12em',
                  fontFamily: "'JetBrains Mono', monospace",
                  opacity: 0.85,
                  borderLeft: '1px solid rgba(197,160,89,0.5)',
                  paddingLeft: 12,
                }}
              >
                {line}
              </div>
            ))}
          </div>
          {/* Status strip top-aligned in lower flow space */}
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(197,160,89,0.25)', fontSize: 10, opacity: 0.45, color: txt, letterSpacing: '0.1em' }}>
            STATUS: CALIBRATED — PRESS ENTER TO COMMENCE
          </div>
        </Module>

        {/* ─── MODULE 4: BEGIN SESSION (GOLD SLAB) ── col-span-4, row 2 (420px) ───── */}
        <Module
          theme={theme}
          className="begin-session-slab bottom-row-module"
          style={{
            gridColumn: 'span 4',
            height: 420,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
          noHover
        >
          {/* Solid Gold Slab Button - Center Fix */}
          <button
            onClick={onBeginSession}
            onMouseEnter={() => setIsBeginHovered(true)}
            onMouseLeave={() => setIsBeginHovered(false)}
            className="begin-session-btn"
            style={{
              flex: 1,
              width: '100%',
              fontSize: 14,
              letterSpacing: '0.2em',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              flexDirection: 'column',
              gap: 12,
              cursor: 'pointer',
              border: '1px solid #C5A059',
              background: '#C5A059',
              color: '#000000',
              boxSizing: 'border-box',
              outline: 'none',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '0.15em', lineHeight: 1 }}>▶</span>
            <span style={{ display: 'inline-block', lineHeight: 1 }}>[ BEGIN_SESSION ]</span>
          </button>

          {/* Localized Footer directly underneath the Begin Session slab */}
          <div style={{
            marginTop: 16,
            paddingTop: 12,
            borderTop: '1px solid rgba(197,160,89,0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 10,
            letterSpacing: '0.2em',
            color: isBeginHovered ? '#C5A059' : txt,
            opacity: isBeginHovered ? 1 : 0.6,
            transition: 'color 0.25s ease, opacity 0.25s ease, text-shadow 0.25s ease',
            textShadow: isBeginHovered ? '0 0 10px rgba(197,160,89,0.65)' : 'none',
            userSelect: 'none',
          }}>
            <span>01_AIM</span>
            <span style={{ opacity: 0.4 }}>//</span>
            <span>02_TYPE</span>
            <span style={{ opacity: 0.4 }}>//</span>
            <span>03_FLOW</span>
          </div>
        </Module>

        {/* ─── MODULE 5: MODES ─── col-span-4, row 2 (420px) ──────────────────────── */}
        <Module
          theme={theme}
          className="bottom-row-module"
          style={{
            gridColumn: 'span 4',
            height: 420,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
          }}
        >
          <ModuleTag>[ MODE_CALIBRATION ]</ModuleTag>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(['Chrono', 'Overdrive', 'Zen'] as GameMode[]).map((mode) => (
              <motion.button
                key={mode}
                onClick={() => setGameMode(mode)}
                whileTap={{ scale: 0.98 }}
                style={{
                  border: `1px solid ${gameMode === mode ? '#C5A059' : 'rgba(197,160,89,0.35)'}`,
                  borderRadius: 0,
                  background: gameMode === mode ? 'rgba(197,160,89,0.12)' : 'transparent',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: gameMode === mode ? '#C5A059' : txt,
                  transition: 'all 0.18s ease',
                }}
              >
                <span style={{ fontWeight: gameMode === mode ? 700 : 400 }}>{mode}</span>
                <span style={{ opacity: 0.5, fontSize: 10 }}>
                  {mode === 'Chrono' ? '60S' : mode === 'Overdrive' ? '+TIME' : '∞'}
                </span>
              </motion.button>
            ))}
          </div>

          {/* Mode description top-aligned underneath modes */}
          <div style={{
            marginTop: 16,
            padding: '12px 14px',
            border: '1px solid rgba(197,160,89,0.3)',
            fontSize: 10,
            lineHeight: 1.6,
            color: txt,
            opacity: 0.7,
            letterSpacing: '0.08em',
          }}>
            {modeDesc[gameMode]}
          </div>
        </Module>

      </div>

      {/* Project Signature */}
      <div className="project-signature">
        TARUN_TOM // 2026
      </div>
    </motion.div>
  );
};

