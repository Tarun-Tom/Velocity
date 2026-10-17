import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { VariableTitle } from './VariableTitle';
import { VelocityButton } from './VelocityButton';
import { Volume2, VolumeX, Moon, Sun } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
export type GameMode = 'Chrono' | 'Overdrive' | 'Zen';

export interface LeaderboardEntry {
  mode: GameMode;
  score: number;
  wpm: number;
  accuracy: number;
  date: string;
}

export interface BentoHubProps {
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  muted: boolean;
  setMuted: (m: boolean) => void;
  showLeaderboard?: boolean;
  setShowLeaderboard?: (s: boolean) => void;
  gameMode: GameMode;
  setGameMode: (m: GameMode) => void;
  scores?: Record<string, number>;
  getLeaderboardData?: () => LeaderboardEntry[];
  mousePos: { x: number; y: number };
  onBeginSession: () => void;
  onOpenMultiplayer?: () => void;
}

// ══════════════════════════════════════════════════════════════════════════════
// Upgraded Minimalist Landing Page (Velocity)
// ══════════════════════════════════════════════════════════════════════════════
export const BentoHub: React.FC<BentoHubProps> = ({
  theme,
  setTheme,
  muted,
  setMuted,
  gameMode,
  setGameMode,
  mousePos,
  onBeginSession,
  onOpenMultiplayer,
}) => {
  const [isSoloHovered, setIsSoloHovered] = useState(false);
  const [isArenaHovered, setIsArenaHovered] = useState(false);

  // Keyboard shortcut: Press ENTER to begin session immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        onBeginSession();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBeginSession]);

  const isLight = theme === 'light';

  // Calibrated Design Tokens:
  // Light Mode (Warm Archival Vellum):
  //   - Background: #FAF7F2 (Warm Antique Cream)
  //   - Primary Text: #1E1C19 (Roasted Charcoal)
  //   - Secondary Metadata: #5C5750
  //   - Gold Accent: #9A762E (Burnished Antique Brass)
  // Dark Mode:
  //   - Background: #000000
  //   - Primary Text: #FDFDFB (Bone White)
  //   - Secondary Metadata: rgba(253, 253, 251, 0.60)
  //   - Gold Accent: #C5A059
  const goldColor = isLight ? '#9A762E' : '#C5A059';
  const primaryTextColor = isLight ? '#1E1C19' : '#FDFDFB';
  const secondaryTextColor = isLight ? '#5C5750' : 'rgba(253, 253, 251, 0.60)';
  const cardBgColor = isLight ? '#FAF7F2' : '#000000';
  const cardBorderIdle = isLight ? 'rgba(154, 118, 46, 0.20)' : 'rgba(197, 160, 89, 0.15)';

  const modes: GameMode[] = ['Chrono', 'Overdrive', 'Zen'];

  const modeLabels: Record<GameMode, string> = {
    Chrono: 'Timed (60s)',
    Overdrive: 'Survival',
    Zen: 'Relax',
  };

  const modeCaptions: Record<GameMode, string> = {
    Chrono: 'Type as many words as you can in 60 seconds.',
    Overdrive: "Start with 15 seconds. Each word adds +3s. Don't let the clock hit zero!",
    Zen: 'No timer, no pressure. Just type at your own pace.',
  };

  const steps = [
    {
      title: '01 · Aim',
      description: 'Hover your mouse over floating words to lock onto them.',
    },
    {
      title: '02 · Type',
      description: 'Words freeze in place. Type the letters to clear them.',
    },
    {
      title: '03 · Combo',
      description: 'Quickly jump to the next word to multiply your streak!',
    },
  ];

  // Micro-animations: Staggered entrance for guide cards on page load
  const cardsContainerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.12,
      },
    },
  };

  const cardItemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 24,
      },
    },
  };

  return (
    <>
      {/* Top-Right Minimal Utility Controls (Audio & Theme) */}
      <div
        style={{
          position: 'fixed',
          top: 32,
          right: 32,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          pointerEvents: 'auto',
          zIndex: 70,
        }}
      >
        <VelocityButton
          onClick={() => setMuted(!muted)}
          ariaLabel={muted ? 'Unmute audio' : 'Mute audio'}
        >
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </VelocityButton>
        <VelocityButton
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          ariaLabel="Toggle theme"
        >
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
        </VelocityButton>
      </div>

      {/* Main Centered Hero Viewport */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ type: 'spring', stiffness: 240, damping: 24 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 60,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          boxSizing: 'border-box',
          pointerEvents: 'none', // Background grid receives pointer tracking cleanly
          background: 'transparent',
        }}
      >
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            width: '100%',
            maxWidth: '896px', // max-w-4xl
          }}
        >
          {/* 1. Title: 'V E L O C I T Y' in Cormorant Garamond italic with proximity variable weight */}
          <VariableTitle mousePos={mousePos} size="hero" theme={theme} />

          {/* 2. Caption: Calibrated Monospace Subhead */}
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '14px',
              color: secondaryTextColor,
              letterSpacing: '0.04em',
              marginTop: '16px',
              marginBottom: '28px',
              maxWidth: '580px',
              lineHeight: 1.6,
              userSelect: 'none',
            }}
          >
            Aim with your mouse. Type the words. Keep your streak alive.
          </p>

          {/* 3. Mode Selector & Solo Launch Coupling */}
          <div
            className="landing-mode-selector"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 14px',
              border: `1px solid ${isLight ? 'rgba(154, 118, 46, 0.25)' : 'rgba(197, 160, 89, 0.25)'}`,
              background: isLight ? 'rgba(250, 247, 242, 0.90)' : 'rgba(0, 0, 0, 0.75)',
              borderRadius: 0,
              position: 'relative',
            }}
          >
            {modes.map((mode, index) => {
              const isActive = gameMode === mode;
              return (
                <React.Fragment key={mode}>
                  {index > 0 && (
                    <span
                      aria-hidden="true"
                      style={{
                        color: secondaryTextColor,
                        opacity: 0.35,
                        fontSize: '11px',
                        userSelect: 'none',
                        margin: '0 2px',
                      }}
                    >
                      ·
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setGameMode(mode)}
                    style={{
                      position: 'relative',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: isActive ? goldColor : secondaryTextColor,
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 0,
                      padding: '6px 10px',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'color 0.2s ease',
                    }}
                  >
                    {/* Smooth sliding active indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          border: `1px solid ${goldColor}`,
                          background: isLight ? 'rgba(154, 118, 46, 0.12)' : 'rgba(197, 160, 89, 0.14)',
                          boxShadow: isLight
                            ? '0 0 12px rgba(154, 118, 46, 0.25)'
                            : '0 0 14px rgba(197, 160, 89, 0.35)',
                          borderRadius: 0,
                          zIndex: 0,
                        }}
                      />
                    )}
                    <span style={{ position: 'relative', zIndex: 1 }}>
                      {isActive ? `[ ${modeLabels[mode].toUpperCase()} ]` : modeLabels[mode].toUpperCase()}
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {/* 4. Animated Single-Line Dynamic Subtitle directly beneath mode buttons */}
          <div
            style={{
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '12px',
              marginBottom: '26px',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.p
                key={gameMode}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '13px',
                  color: secondaryTextColor,
                  letterSpacing: '0.02em',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  userSelect: 'none',
                }}
              >
                {modeCaptions[gameMode]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* 5. Concept 3: Single Hero Slab + Discrete Multiplayer Sub-Link */}
          <div className="landing-cta-container">
            {/* Primary Action Button: Centered Solid Gold Slab */}
            <motion.button
              type="button"
              onClick={onBeginSession}
              onMouseEnter={() => setIsSoloHovered(true)}
              onMouseLeave={() => setIsSoloHovered(false)}
              whileHover={{
                scale: 1.01,
                boxShadow: isLight
                  ? '0 0 24px rgba(154, 118, 46, 0.45), 0 0 60px rgba(154, 118, 46, 0.20)'
                  : '0 0 24px rgba(197, 160, 89, 0.45), 0 0 60px rgba(197, 160, 89, 0.20)',
              }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="landing-hero-slab"
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '448px', // max-w-md
                height: '70px',
                borderRadius: 0,
                background: isLight ? '#9A762E' : '#C5A059',
                color: isLight ? '#FAF7F2' : '#000000',
                border: `1px solid ${isLight ? '#9A762E' : '#C5A059'}`,
                padding: '0 24px',
                cursor: 'pointer',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
                boxShadow: isSoloHovered
                  ? isLight
                    ? '0 0 24px rgba(154, 118, 46, 0.45), 0 0 60px rgba(154, 118, 46, 0.20)'
                    : '0 0 24px rgba(197, 160, 89, 0.45), 0 0 60px rgba(197, 160, 89, 0.20)'
                  : 'none',
                transition: 'background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '15px',
                  fontWeight: 800,
                  letterSpacing: '0.26em',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                }}
              >
                PLAY SOLO
              </span>
            </motion.button>

            {/* Discrete Multiplayer Sub-Button */}
            <motion.button
              type="button"
              onClick={() => {
                if (onOpenMultiplayer) {
                  onOpenMultiplayer();
                } else {
                  console.log('[MULTIPLAYER_LOBBY: INITIALIZED]');
                }
              }}
              onMouseEnter={() => setIsArenaHovered(true)}
              onMouseLeave={() => setIsArenaHovered(false)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="landing-sub-link"
              style={{
                marginTop: '16px',
                position: 'relative',
                borderRadius: 0,
                background: isArenaHovered
                  ? isLight
                    ? 'rgba(154, 118, 46, 0.10)'
                    : 'rgba(197, 160, 89, 0.12)'
                  : isLight
                  ? 'rgba(30, 28, 25, 0.03)'
                  : 'rgba(253, 253, 251, 0.04)',
                border: `1px solid ${
                  isArenaHovered
                    ? goldColor
                    : isLight
                    ? 'rgba(154, 118, 46, 0.30)'
                    : 'rgba(197, 160, 89, 0.25)'
                }`,
                padding: '10px 22px',
                cursor: 'pointer',
                outline: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxSizing: 'border-box',
                boxShadow: isArenaHovered
                  ? isLight
                    ? '0 0 16px rgba(154, 118, 46, 0.20)'
                    : '0 0 18px rgba(197, 160, 89, 0.25)'
                  : 'none',
                transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  color: isArenaHovered
                    ? goldColor
                    : isLight
                    ? 'rgba(30, 28, 25, 0.70)'
                    : 'rgba(253, 253, 251, 0.60)',
                  transition: 'color 0.2s ease',
                  textTransform: 'none',
                }}
              >
                [ ◈ Play with Friends · 2–8 Players ]
              </span>
            </motion.button>
          </div>

          {/* 6. Guide Cards: Staggered entrance, hover spring lift (y: -4px) & 100% Gold border brightening */}
          <motion.div
            variants={cardsContainerVariants}
            initial="hidden"
            animate="show"
            className="landing-step-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
              width: '100%',
              maxWidth: '896px',
              boxSizing: 'border-box',
            }}
          >
            {steps.map((step) => (
              <motion.div
                key={step.title}
                variants={cardItemVariants}
                whileHover={{
                  y: -4,
                  borderColor: goldColor, // Brightens to 100% Gold
                  boxShadow: isLight
                    ? '0 8px 24px rgba(154, 118, 46, 0.18)'
                    : '0 8px 24px rgba(197, 160, 89, 0.20)',
                  transition: { type: 'spring', stiffness: 400, damping: 20 },
                }}
                className="landing-step-card"
                style={{
                  border: `1px solid ${cardBorderIdle}`,
                  borderRadius: 0,
                  background: cardBgColor,
                  padding: '24px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  textAlign: 'left',
                  boxSizing: 'border-box',
                  position: 'relative',
                  cursor: 'default',
                  transition: 'border-color 0.25s ease, background-color 0.3s ease',
                }}
              >
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.18em',
                    color: goldColor,
                    textTransform: 'uppercase',
                  }}
                >
                  {step.title}
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '13px',
                    lineHeight: 1.6,
                    color: isLight ? primaryTextColor : '#FDFDFB',
                    opacity: isLight ? 0.92 : 0.85,
                    fontWeight: 400,
                  }}
                >
                  {step.description}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* 7. Footer: Anchored to fixed bottom-4 at 25% opacity */}
      <div
        className="fixed-footer-signature"
        style={{
          position: 'fixed',
          bottom: '16px', // fixed bottom-4
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '10px',
          letterSpacing: '0.2em',
          color: isLight ? '#1E1C19' : '#FDFDFB',
          opacity: 0.25,
          userSelect: 'none',
          pointerEvents: 'auto',
          zIndex: 70,
          transition: 'opacity 0.3s ease, color 0.3s ease',
        }}
      >
        TARUN_TOM // 2026
      </div>
    </>
  );
};
