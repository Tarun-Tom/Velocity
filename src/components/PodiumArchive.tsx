import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, RotateCcw, Home } from 'lucide-react';

export interface PodiumPlayer {
  callsign: string;
  wpm: number;
  accuracy: number;
  wordsCompleted: number;
  score: number;
  isLocal: boolean;
}

interface PodiumArchiveProps {
  players: PodiumPlayer[];
  roomCode: string;
  theme: 'light' | 'dark';
  onReturnToLobby: () => void;
  onExitArena: () => void;
}

export const PodiumArchive: React.FC<PodiumArchiveProps> = ({
  players,
  roomCode,
  theme,
  onReturnToLobby,
  onExitArena,
}) => {
  const isLight = theme === 'light';
  const goldColor = isLight ? '#9A762E' : '#C5A059';
  const textColor = isLight ? '#1E1C19' : '#FDFDFB';
  const subtextColor = isLight ? '#5C5750' : 'rgba(253, 253, 251, 0.60)';
  const bgColor = isLight ? '#FAF7F2' : '#000000';
  const cardBg = isLight ? 'rgba(30, 28, 25, 0.03)' : 'rgba(253, 253, 251, 0.03)';
  const borderIdle = isLight ? 'rgba(154, 118, 46, 0.25)' : 'rgba(197, 160, 89, 0.25)';

  // ── Keyboard Shortcut Fallback: Enter = RETURN TO LOBBY, Escape = LEAVE ARENA ─
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onReturnToLobby();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onExitArena();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onReturnToLobby, onExitArena]);

  // Sort players by wordsCompleted descending, then WPM descending
  const sorted = [...players].sort((a, b) => {
    if (b.wordsCompleted !== a.wordsCompleted) {
      return b.wordsCompleted - a.wordsCompleted;
    }
    if (b.wpm !== a.wpm) {
      return b.wpm - a.wpm;
    }
    return b.accuracy - a.accuracy;
  });

  const first = sorted[0];
  const second = sorted[1];
  const third = sorted[2];
  const rest = sorted.slice(3);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative z-[100] pointer-events-auto"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        pointerEvents: 'auto',
        backgroundColor: bgColor,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '48px 24px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 920, width: '100%', margin: 'auto' }}>
        {/* Header Block */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: goldColor,
              marginBottom: 8,
            }}
          >
            [ MATCH_ARCHIVE // SYNCHRONIZED VECTOR RESOLUTION ]
          </div>

          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
              letterSpacing: '0.15em',
              color: textColor,
              margin: '0 0 8px 0',
            }}
          >
            V E C T O R · P O D I U M
          </h1>

          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: '0.1em',
              color: subtextColor,
            }}
          >
            ARENA ROOM: <span style={{ color: goldColor, fontWeight: 700 }}>{roomCode}</span> ── 60S STANDARDIZED SPRINT
          </div>
        </div>

        {/* Podium Bento Cards (1st, 2nd, 3rd) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
            marginBottom: 32,
            alignItems: 'end',
          }}
        >
          {/* SECOND PLACE */}
          {second && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', damping: 20 }}
              style={{
                background: cardBg,
                border: '1px solid rgba(192, 196, 204, 0.4)',
                borderRadius: 0,
                padding: '24px 20px',
                position: 'relative',
              }}
            >
              <span aria-hidden="true" style={{ position: 'absolute', top: 6, left: 8, fontSize: 10, color: '#A0A5AD', opacity: 0.5 }}>+</span>
              <span aria-hidden="true" style={{ position: 'absolute', top: 6, right: 8, fontSize: 10, color: '#A0A5AD', opacity: 0.5 }}>+</span>
              <span aria-hidden="true" style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 10, color: '#A0A5AD', opacity: 0.5 }}>+</span>
              <span aria-hidden="true" style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 10, color: '#A0A5AD', opacity: 0.5 }}>+</span>

              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  color: '#A0A5AD',
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                [ 02 · SILVER_VECTOR ]
              </div>

              <div
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 28,
                  fontWeight: 600,
                  color: textColor,
                  marginBottom: 16,
                }}
              >
                {second.callsign}
                {second.isLocal && (
                  <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: goldColor, marginLeft: 8 }}>
                    (YOU)
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                <div>
                  <div style={{ color: subtextColor, fontSize: 9 }}>SPEED</div>
                  <div style={{ color: textColor, fontWeight: 700, fontSize: 16 }}>{second.wpm} <span style={{ fontSize: 10 }}>WPM</span></div>
                </div>
                <div>
                  <div style={{ color: subtextColor, fontSize: 9 }}>WORDS</div>
                  <div style={{ color: textColor, fontWeight: 700, fontSize: 16 }}>{second.wordsCompleted}</div>
                </div>
                <div>
                  <div style={{ color: subtextColor, fontSize: 9 }}>ACCURACY</div>
                  <div style={{ color: textColor, fontWeight: 700 }}>{second.accuracy}%</div>
                </div>
                <div>
                  <div style={{ color: subtextColor, fontSize: 9 }}>SCORE</div>
                  <div style={{ color: textColor, fontWeight: 700 }}>{second.score}</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* FIRST PLACE — GOLD APEX */}
          {first && (
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.0, type: 'spring', damping: 20 }}
              style={{
                background: isLight ? 'rgba(154, 118, 46, 0.08)' : 'rgba(197, 160, 89, 0.08)',
                border: `1px solid ${goldColor}`,
                borderRadius: 0,
                padding: '32px 24px',
                position: 'relative',
                boxShadow: `0 0 35px ${isLight ? 'rgba(154, 118, 46, 0.25)' : 'rgba(197, 160, 89, 0.35)'}`,
                order: -1, // Render in middle if flex, or first in grid
              }}
            >
              <span aria-hidden="true" style={{ position: 'absolute', top: 6, left: 8, fontSize: 10, color: goldColor, opacity: 0.7 }}>+</span>
              <span aria-hidden="true" style={{ position: 'absolute', top: 6, right: 8, fontSize: 10, color: goldColor, opacity: 0.7 }}>+</span>
              <span aria-hidden="true" style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 10, color: goldColor, opacity: 0.7 }}>+</span>
              <span aria-hidden="true" style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 10, color: goldColor, opacity: 0.7 }}>+</span>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    letterSpacing: '0.2em',
                    color: goldColor,
                    fontWeight: 700,
                  }}
                >
                  [ 01 · APEX_CHAMPION ]
                </div>
                <Trophy size={16} color={goldColor} />
              </div>

              <div
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 34,
                  fontWeight: 600,
                  fontStyle: 'italic',
                  color: goldColor,
                  marginBottom: 20,
                }}
              >
                {first.callsign}
                {first.isLocal && (
                  <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: textColor, marginLeft: 8, fontStyle: 'normal' }}>
                    (YOU)
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                <div>
                  <div style={{ color: subtextColor, fontSize: 9 }}>SPEED (WPM)</div>
                  <div style={{ color: goldColor, fontWeight: 800, fontSize: 22 }}>{first.wpm}</div>
                </div>
                <div>
                  <div style={{ color: subtextColor, fontSize: 9 }}>WORDS COMPLETED</div>
                  <div style={{ color: goldColor, fontWeight: 800, fontSize: 22 }}>{first.wordsCompleted}</div>
                </div>
                <div>
                  <div style={{ color: subtextColor, fontSize: 9 }}>ACCURACY</div>
                  <div style={{ color: textColor, fontWeight: 700, fontSize: 14 }}>{first.accuracy}%</div>
                </div>
                <div>
                  <div style={{ color: subtextColor, fontSize: 9 }}>CALIBRATED SCORE</div>
                  <div style={{ color: textColor, fontWeight: 700, fontSize: 14 }}>{first.score}</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* THIRD PLACE */}
          {third && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', damping: 20 }}
              style={{
                background: cardBg,
                border: '1px solid rgba(205, 127, 50, 0.4)',
                borderRadius: 0,
                padding: '24px 20px',
                position: 'relative',
              }}
            >
              <span aria-hidden="true" style={{ position: 'absolute', top: 6, left: 8, fontSize: 10, color: '#CD7F32', opacity: 0.5 }}>+</span>
              <span aria-hidden="true" style={{ position: 'absolute', top: 6, right: 8, fontSize: 10, color: '#CD7F32', opacity: 0.5 }}>+</span>
              <span aria-hidden="true" style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 10, color: '#CD7F32', opacity: 0.5 }}>+</span>
              <span aria-hidden="true" style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 10, color: '#CD7F32', opacity: 0.5 }}>+</span>

              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  color: '#CD7F32',
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                [ 03 · BRONZE_STRIKER ]
              </div>

              <div
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 28,
                  fontWeight: 600,
                  color: textColor,
                  marginBottom: 16,
                }}
              >
                {third.callsign}
                {third.isLocal && (
                  <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: goldColor, marginLeft: 8 }}>
                    (YOU)
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                <div>
                  <div style={{ color: subtextColor, fontSize: 9 }}>SPEED</div>
                  <div style={{ color: textColor, fontWeight: 700, fontSize: 16 }}>{third.wpm} <span style={{ fontSize: 10 }}>WPM</span></div>
                </div>
                <div>
                  <div style={{ color: subtextColor, fontSize: 9 }}>WORDS</div>
                  <div style={{ color: textColor, fontWeight: 700, fontSize: 16 }}>{third.wordsCompleted}</div>
                </div>
                <div>
                  <div style={{ color: subtextColor, fontSize: 9 }}>ACCURACY</div>
                  <div style={{ color: textColor, fontWeight: 700 }}>{third.accuracy}%</div>
                </div>
                <div>
                  <div style={{ color: subtextColor, fontSize: 9 }}>SCORE</div>
                  <div style={{ color: textColor, fontWeight: 700 }}>{third.score}</div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Supplementary Roster Table (If 4 or more players) */}
        {rest.length > 0 && (
          <div
            style={{
              background: cardBg,
              border: `1px solid ${borderIdle}`,
              padding: '16px 20px',
              marginBottom: 32,
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                letterSpacing: '0.15em',
                color: subtextColor,
                marginBottom: 12,
              }}
            >
              [ ADDITIONAL CONTENDERS ]
            </div>
            {rest.map((p, idx) => (
              <div
                key={p.callsign}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: idx < rest.length - 1 ? `1px solid ${borderIdle}` : 'none',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: subtextColor }}>0{idx + 4}</span>
                  <span style={{ color: p.isLocal ? goldColor : textColor, fontWeight: 600 }}>
                    {p.callsign} {p.isLocal && '(YOU)'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <span style={{ color: textColor }}>{p.wpm} WPM</span>
                  <span style={{ color: subtextColor }}>{p.wordsCompleted} words</span>
                  <span style={{ color: subtextColor }}>{p.accuracy}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Controls Container */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 14,
            maxWidth: 540,
            margin: '0 auto',
            position: 'relative',
            zIndex: 110,
            pointerEvents: 'auto',
          }}
        >
          {/* RETURN TO LOBBY */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={onReturnToLobby}
            className="relative z-[110] cursor-pointer pointer-events-auto"
            style={{
              position: 'relative',
              zIndex: 110,
              cursor: 'pointer',
              pointerEvents: 'auto',
              background: goldColor,
              color: isLight ? '#FAF7F2' : '#000000',
              border: `1px solid ${goldColor}`,
              borderRadius: 0,
              padding: '14px 20px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: `0 0 20px ${isLight ? 'rgba(154, 118, 46, 0.3)' : 'rgba(197, 160, 89, 0.4)'}`,
            }}
          >
            <RotateCcw size={14} />
            [ RETURN_TO_LOBBY ]
          </motion.button>

          {/* LEAVE ARENA */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={onExitArena}
            className="relative z-[110] cursor-pointer pointer-events-auto"
            style={{
              position: 'relative',
              zIndex: 110,
              cursor: 'pointer',
              pointerEvents: 'auto',
              background: 'transparent',
              color: textColor,
              border: `1px solid ${borderIdle}`,
              borderRadius: 0,
              padding: '14px 20px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Home size={14} />
            [ LEAVE_ARENA ]
          </motion.button>
        </div>

        {/* Technical Keyboard Shortcut Hint */}
        <div
          style={{
            textAlign: 'center',
            marginTop: 16,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: '0.15em',
            color: subtextColor,
            opacity: 0.7,
            pointerEvents: 'none',
          }}
        >
          [ ENTER ── RETURN TO LOBBY ] · [ ESC ── LEAVE ARENA ]
        </div>
      </div>
    </motion.div>
  );
};
