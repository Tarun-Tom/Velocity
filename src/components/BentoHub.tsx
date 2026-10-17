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
}) => {
  const [, setIsCtaHovered] = useState(false);

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

  const modeCaptions: Record<GameMode, string> = {
    Chrono: '60-second standardized sprint. Maximize speed and accuracy before time runs out.',
    Overdrive: 'Survival protocol. Start with 15s. Every completed word adds +3s to the clock.',
    Zen: 'Endless flow state. Zero timer, zero failure. 2–3 word density for rhythmic typing.',
  };

  const steps = [
    {
      title: '01 · TARGET',
      description: 'Move your cursor over floating words to lock your focus.',
    },
    {
      title: '02 · STRIKE',
      description: 'Words freeze in place while you type. Letters turn gold as you hit them.',
    },
    {
      title: '03 · FLOW',
      description: 'Jump to the next word smoothly to build your Synergy streak.',
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
            A 2D spatial typing engine. Aim with your mouse, strike with your keys.
          </p>

          {/* 3. Mode Selector with Framer Motion layoutId="activeIndicator" */}
          <div
            className="landing-mode-selector"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px',
              border: `1px solid ${isLight ? 'rgba(154, 118, 46, 0.25)' : 'rgba(197, 160, 89, 0.25)'}`,
              background: isLight ? 'rgba(250, 247, 242, 0.90)' : 'rgba(0, 0, 0, 0.75)',
              borderRadius: 0,
              position: 'relative',
            }}
          >
            {modes.map((mode) => {
              const isActive = gameMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setGameMode(mode)}
                  style={{
                    position: 'relative',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '12px',
                    fontWeight: isActive ? 700 : 500,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: isActive ? goldColor : secondaryTextColor,
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 0,
                    padding: '8px 18px',
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
                    [ {mode.toUpperCase()} ]
                  </span>
                </button>
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
              marginBottom: '32px',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.p
                key={gameMode}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
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

          {/* 5. Primary CTA: Solid Gold slab, black text, radiant bloom hover & spring press */}
          <motion.button
            type="button"
            onClick={onBeginSession}
            onMouseEnter={() => setIsCtaHovered(true)}
            onMouseLeave={() => setIsCtaHovered(false)}
            whileHover={{
              scale: 1.02,
              boxShadow: isLight
                ? '0 0 20px rgba(154, 118, 46, 0.60), 0 0 45px rgba(154, 118, 46, 0.40), 0 0 80px rgba(154, 118, 46, 0.25), 0 0 120px rgba(154, 118, 46, 0.15)'
                : '0 0 20px rgba(197, 160, 89, 0.65), 0 0 45px rgba(197, 160, 89, 0.45), 0 0 80px rgba(197, 160, 89, 0.30), 0 0 120px rgba(197, 160, 89, 0.18)',
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 480, damping: 24 }}
            className="landing-primary-cta"
            style={{
              position: 'relative',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '13.5px',
              fontWeight: 800,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              background: goldColor, // Solid Gold slab (#C5A059 dark / #9A762E light)
              color: '#000000', // Black text
              border: `1px solid ${goldColor}`,
              borderRadius: 0,
              padding: '16px 46px',
              cursor: 'pointer',
              outline: 'none',
              marginBottom: '46px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isLight
                ? '0 0 12px rgba(154, 118, 46, 0.25)'
                : '0 0 12px rgba(197, 160, 89, 0.25)',
              transition: 'background-color 0.3s ease, border-color 0.3s ease',
            }}
          >
            [ BEGIN SESSION ]
          </motion.button>

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
