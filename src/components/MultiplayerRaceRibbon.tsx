import React from 'react';
import { motion } from 'framer-motion';

export interface PlayerScoreState {
  callsign: string;
  completedCount: number;
  wpm: number;
  streak: number;
  accuracy: number;
}

interface MultiplayerRaceRibbonProps {
  localCallsign: string;
  localWpm: number;
  localCompletedCount: number;
  localStreak: number;
  localAccuracy: number;
  opponentScores: Record<string, PlayerScoreState>;
  theme: 'light' | 'dark';
  roomCode: string;
  timeLeft: number;
}

export const MultiplayerRaceRibbon: React.FC<MultiplayerRaceRibbonProps> = ({
  localCallsign,
  localWpm,
  localCompletedCount,
  localStreak,
  localAccuracy,
  opponentScores,
  theme,
  roomCode,
  timeLeft,
}) => {
  const isLight = theme === 'light';
  const goldColor = isLight ? '#9A762E' : '#C5A059';
  const textColor = isLight ? '#1E1C19' : '#FDFDFB';
  const subtextColor = isLight ? '#5C5750' : 'rgba(253, 253, 251, 0.60)';
  const bgColor = isLight ? 'rgba(250, 247, 242, 0.92)' : 'rgba(0, 0, 0, 0.88)';
  const borderIdle = isLight ? 'rgba(154, 118, 46, 0.35)' : 'rgba(197, 160, 89, 0.35)';

  // Build sorted leaderboard list
  const allPlayers: PlayerScoreState[] = [
    {
      callsign: localCallsign,
      completedCount: localCompletedCount,
      wpm: localWpm,
      streak: localStreak,
      accuracy: localAccuracy,
    },
    ...Object.values(opponentScores).filter((p) => p.callsign !== localCallsign),
  ];

  allPlayers.sort((a, b) => {
    if (b.completedCount !== a.completedCount) {
      return b.completedCount - a.completedCount;
    }
    if (b.wpm !== a.wpm) {
      return b.wpm - a.wpm;
    }
    return b.accuracy - a.accuracy;
  });

  const maxWords = Math.max(...allPlayers.map((p) => p.completedCount), 15);

  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 60,
        width: 'calc(100% - 64px)',
        maxWidth: 880,
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          position: 'relative',
          background: bgColor,
          border: `1px solid ${borderIdle}`,
          backdropFilter: 'blur(10px)',
          padding: '10px 18px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
        }}
      >
        {/* Technical Corner Markers */}
        <span aria-hidden="true" style={{ position: 'absolute', top: 4, left: 6, fontSize: 10, lineHeight: 1, color: goldColor, opacity: 0.6 }}>+</span>
        <span aria-hidden="true" style={{ position: 'absolute', top: 4, right: 6, fontSize: 10, lineHeight: 1, color: goldColor, opacity: 0.6 }}>+</span>
        <span aria-hidden="true" style={{ position: 'absolute', bottom: 4, left: 6, fontSize: 10, lineHeight: 1, color: goldColor, opacity: 0.6 }}>+</span>
        <span aria-hidden="true" style={{ position: 'absolute', bottom: 4, right: 6, fontSize: 10, lineHeight: 1, color: goldColor, opacity: 0.6 }}>+</span>

        {/* Top Header Track */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${borderIdle}`,
            paddingBottom: 6,
            marginBottom: 8,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: '0.12em',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: goldColor, fontWeight: 700 }}>● ARENA VECTOR</span>
            <span style={{ color: subtextColor }}>ROOM: [{roomCode}]</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ color: subtextColor }}>
              INTERVAL REMAINING:
            </span>
            <span
              style={{
                color: timeLeft <= 10 ? '#E05D52' : goldColor,
                fontWeight: 700,
                fontSize: 11,
              }}
            >
              {timeLeft}S
            </span>
          </div>
        </div>

        {/* Dynamic Race Roster Ribbon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          {allPlayers.map((player, idx) => {
            const isLocal = player.callsign === localCallsign;
            const isLeader = idx === 0;

            return (
              <motion.div
                key={player.callsign}
                layout
                transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  background: isLocal
                    ? isLight
                      ? 'rgba(154, 118, 46, 0.12)'
                      : 'rgba(197, 160, 89, 0.12)'
                    : 'transparent',
                  border: isLocal
                    ? `1px solid ${goldColor}`
                    : `1px solid ${borderIdle}`,
                  borderRadius: 0,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                  boxShadow: isLocal && isLeader
                    ? `0 0 12px ${isLight ? 'rgba(154, 118, 46, 0.25)' : 'rgba(197, 160, 89, 0.35)'}`
                    : 'none',
                }}
              >
                <span
                  style={{
                    color: isLeader ? goldColor : subtextColor,
                    fontWeight: isLeader ? 700 : 500,
                    fontSize: 10,
                  }}
                >
                  0{idx + 1}
                </span>

                <span
                  style={{
                    color: isLocal ? goldColor : textColor,
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                  }}
                >
                  {player.callsign}
                  {isLocal && (
                    <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 3 }}>
                      (YOU)
                    </span>
                  )}
                </span>

                <span style={{ color: subtextColor, opacity: 0.5 }}>:</span>

                <span style={{ color: textColor, fontWeight: 700 }}>
                  {player.wpm}
                  <span style={{ fontSize: 9, fontWeight: 400, opacity: 0.6, marginLeft: 2 }}>
                    WPM
                  </span>
                </span>

                <span style={{ color: subtextColor, opacity: 0.5 }}>|</span>

                <span style={{ color: subtextColor, fontSize: 10 }}>
                  {player.completedCount}w
                </span>

                {player.streak > 1 && (
                  <span
                    style={{
                      color: goldColor,
                      fontSize: 9,
                      fontWeight: 700,
                      background: isLight ? 'rgba(154, 118, 46, 0.1)' : 'rgba(197, 160, 89, 0.15)',
                      padding: '1px 4px',
                    }}
                  >
                    x{player.streak}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Spatial Race Track: Visual Pinpoints */}
        <div
          style={{
            position: 'relative',
            height: 3,
            width: '100%',
            background: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)',
            marginTop: 6,
          }}
        >
          {allPlayers.map((player, idx) => {
            const isLocal = player.callsign === localCallsign;
            const progressPct = Math.min(100, Math.max(0, (player.completedCount / maxWords) * 100));

            return (
              <motion.div
                key={`track-${player.callsign}`}
                animate={{ left: `${progressPct}%` }}
                transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                style={{
                  position: 'absolute',
                  top: -3,
                  width: 9,
                  height: 9,
                  borderRadius: 0,
                  transform: 'translateX(-50%)',
                  background: isLocal ? goldColor : idx === 0 ? goldColor : subtextColor,
                  border: `1px solid ${isLight ? '#FAF7F2' : '#000000'}`,
                  boxShadow: isLocal ? `0 0 6px ${goldColor}` : 'none',
                  zIndex: isLocal ? 2 : 1,
                }}
                title={`${player.callsign}: ${player.completedCount} words`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
