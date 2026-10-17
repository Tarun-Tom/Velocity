import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MultiplayerCountdownProps {
  countdown: number | null; // 3, 2, 1, 0
  theme: 'light' | 'dark';
}

export const MultiplayerCountdown: React.FC<MultiplayerCountdownProps> = ({
  countdown,
  theme,
}) => {
  if (countdown === null) return null;

  const isLight = theme === 'light';
  const goldColor = isLight ? '#9A762E' : '#C5A059';
  const textColor = isLight ? '#1E1C19' : '#FDFDFB';
  const bgColor = isLight ? 'rgba(250, 247, 242, 0.90)' : 'rgba(0, 0, 0, 0.88)';
  const isEngage = countdown === 0;

  const displayText = isEngage
    ? 'ENGAGE'
    : `CALIBRATING_FIELD: 0${countdown}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(3px)',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 260 }}
        style={{
          position: 'relative',
          padding: '28px 48px',
          background: bgColor,
          border: `1px solid ${goldColor}`,
          borderRadius: 0,
          boxShadow: isEngage
            ? `0 0 30px ${isLight ? 'rgba(154, 118, 46, 0.45)' : 'rgba(197, 160, 89, 0.55)'}`
            : '0 8px 32px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          minWidth: 320,
        }}
      >
        {/* Technical Corner Markers */}
        <span aria-hidden="true" style={{ position: 'absolute', top: 6, left: 8, fontSize: 11, lineHeight: 1, color: goldColor, opacity: 0.6 }}>+</span>
        <span aria-hidden="true" style={{ position: 'absolute', top: 6, right: 8, fontSize: 11, lineHeight: 1, color: goldColor, opacity: 0.6 }}>+</span>
        <span aria-hidden="true" style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 11, lineHeight: 1, color: goldColor, opacity: 0.6 }}>+</span>
        <span aria-hidden="true" style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 11, lineHeight: 1, color: goldColor, opacity: 0.6 }}>+</span>

        {/* Telemetry Header */}
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: isLight ? '#5C5750' : 'rgba(253, 253, 251, 0.6)',
          }}
        >
          [ ARENA VECTOR SYNCHRONIZATION ]
        </div>

        {/* Main Countdown Display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={countdown}
            initial={{ y: 8, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -8, opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: isEngage ? 26 : 20,
              fontWeight: 700,
              letterSpacing: isEngage ? '0.25em' : '0.15em',
              color: isEngage ? goldColor : textColor,
              textShadow: isEngage
                ? `0 0 16px ${isLight ? 'rgba(154, 118, 46, 0.6)' : 'rgba(197, 160, 89, 0.8)'}`
                : 'none',
              textAlign: 'center',
            }}
          >
            [ {displayText} ]
          </motion.div>
        </AnimatePresence>

        {/* 3-Step Hairline Progress Ticks */}
        <div style={{ display: 'flex', gap: 6, width: '100%', maxWidth: 220, marginTop: 4 }}>
          {[3, 2, 1].map((step) => {
            const isFilled = countdown !== null && countdown <= step;
            return (
              <div
                key={step}
                style={{
                  flex: 1,
                  height: 2,
                  background: isFilled ? goldColor : isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)',
                  transition: 'background 0.2s ease',
                  boxShadow: isFilled && isEngage ? `0 0 6px ${goldColor}` : 'none',
                }}
              />
            );
          })}
        </div>

        {/* Sub-telemetry note */}
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            letterSpacing: '0.1em',
            color: isLight ? 'rgba(30, 28, 25, 0.45)' : 'rgba(253, 253, 251, 0.35)',
          }}
        >
          INPUT LOCKED // AWAITING TIMESTEP_0
        </div>
      </motion.div>
    </motion.div>
  );
};
