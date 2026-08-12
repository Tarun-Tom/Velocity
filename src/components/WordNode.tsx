import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WordNodeProps {
  word: string;
  x: number;
  y: number;
  typedLength: number;
  isTypable: boolean;  // cursor within 180px of RAW home — visual state + stasis trigger
  isFocused: boolean;  // keyboard is locked to this word — PRIMARY stasis trigger
  theme: 'light' | 'dark';
  gameModeScale?: number;
  mousePos: { x: number; y: number };
  /** Parallax offset applied only outside the stasis lock. Visual drift, NOT physics. */
  parallaxX?: number;
  parallaxY?: number;
}

// ── Design tokens ──────────────────────────────────────────────────────────────
const GOLD     = '#C5A059'; // TYPED — archival success state
const BONE     = '#FDFDFB'; // CURRENT + REMAINING in dark mode — neutral / queue
const GRAPHITE = '#333333'; // CURRENT + REMAINING in light mode — contrast-safe negative

// Spring for scale/opacity changes — position is RAF-only, never Framer-driven
const springConfig = { type: 'spring' as const, stiffness: 120, damping: 20 };

// ── CurrentCharacter ──────────────────────────────────────────────────────────
// Isolated component so the pulse animation is scoped to this single glyph
// and does not re-trigger on parent re-renders.
const CurrentCharacter: React.FC<{ char: string; neutralColor: string }> = ({ char, neutralColor }) => (
  <span
    style={{
      position:   'relative',
      display:    'inline-block',
      color:      neutralColor, // Bone White (dark) or Graphite (light) — stands out from Gold typed chars
      fontWeight: 600,
      opacity:    1,
      paddingBottom: '3px',   // clearance for the 2px underline strip
    }}
  >
    {char}

    {/*
     * 2px Gold underline — absolutely positioned so its thickness, colour, and
     * pulse are authored precisely. textDecoration cannot be animated independently.
     * The pulse: opacity breathes 1 → 0.35 → 1 on a 900ms infinite loop, drawing
     * the eye without distraction. Ease is sinusoidal — no mechanical snap.
     */}
    <motion.span
      aria-hidden
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 0.35, 1] }}
      transition={{
        duration: 0.9,
        repeat: Infinity,
        ease: 'easeInOut',
        repeatType: 'loop',
      }}
      style={{
        position:        'absolute',
        bottom:          0,
        left:            0,
        right:           0,
        height:          '2px',
        backgroundColor: GOLD,
        borderRadius:    '0px',
        pointerEvents:   'none',
      }}
    />
  </span>
);

export const WordNode: React.FC<WordNodeProps> = ({
  word,
  x,
  y,
  typedLength,
  isTypable,
  isFocused,
  theme,
  gameModeScale = 1.0,
  mousePos,
  parallaxX = 0,
  parallaxY = 0,
}) => {
  // Derive the neutral text colour from theme — Bone White in dark, Graphite in light.
  // This is the single source of truth for all non-Gold, non-typed characters.
  const neutralColor = theme === 'light' ? GRAPHITE : BONE;
  const nodeRef = useRef<HTMLDivElement>(null);

  // Current rendered position — exclusively written by the RAF loop
  const posRef = useRef<{ currentX: number; currentY: number }>({ currentX: x, currentY: y });

  // Live refs — written every render, read inside RAF with zero dependency restarts
  const mousePosRef = useRef(mousePos);
  mousePosRef.current = mousePos;

  const isTypableRef = useRef(isTypable);
  isTypableRef.current = isTypable;

  // isFocused is the PRIMARY stasis trigger — true = keyboard is locked to this word.
  // When true the word must not move at all, regardless of cursor position.
  const isFocusedRef = useRef(isFocused);
  isFocusedRef.current = isFocused;

  // Home position — raw spawn coordinates (no parallax). Updated every render.
  const homePosRef = useRef({ homeX: x, homeY: y });
  homePosRef.current = { homeX: x, homeY: y };

  // Parallax live ref — read in RAF, written every render
  const parallaxRef = useRef({ x: parallaxX, y: parallaxY });
  parallaxRef.current = { x: parallaxX, y: parallaxY };

  // ── STASIS LOCK ────────────────────────────────────────────────────────────
  // frozenPos: the exact pixel coordinates captured the millisecond isLocked
  // first becomes true. The RAF loop writes this to the DOM and does nothing
  // else until the lock releases. No lerp. No repulsion. No parallax. Absolute stasis.
  const frozenPosRef = useRef<{ x: number; y: number } | null>(null);

  // Edge detectors — track the previous frame's state to detect transitions
  const prevIsTypableRef = useRef(false);
  const prevIsFocusedRef = useRef(false);

  // ── RAF Physics Loop — mounted once on first render, never restarted ──────
  useEffect(() => {
    let animId: number;

    // Nudge parameters — only active OUTSIDE the 180px zone
    const lockRadius  = 180; // crossing inward KILLS all physics
    const nudgeRadius = 260; // nudge band starts here
    const maxNudge    = 12;  // absolute max displacement — soft presence, not evasion

    // Seed the position to home on first frame
    posRef.current.currentX = x;
    posRef.current.currentY = y;

    const tick = () => {
      const isActive  = isTypableRef.current;  // cursor within 180px of raw home
      const isLocked  = isFocusedRef.current;  // keyboard locked to this word
      const { homeX, homeY } = homePosRef.current;
      const px = parallaxRef.current.x;
      const py = parallaxRef.current.y;

      // ── STASIS: capture snapshot on the frame the lock engages ────────────
      // Trigger: either isFocused flips true OR isTypable flips true (word
      // enters the 180px zone). The snapshot captures the VISUAL position
      // (home + parallax at the moment of entry) so there is zero jump.
      const justLocked  = isLocked && !prevIsFocusedRef.current;
      const justEntered = isActive && !prevIsTypableRef.current;

      if (justLocked || justEntered) {
        // Snapshot the rendered position at freeze moment — includes parallax
        // that was in effect that frame so there is no positional discontinuity.
        frozenPosRef.current = {
          x: posRef.current.currentX + px,
          y: posRef.current.currentY + py,
        };
      }

      // Release: both locks gone
      if (!isActive && !isLocked && (prevIsTypableRef.current || prevIsFocusedRef.current)) {
        frozenPosRef.current = null;
      }

      prevIsTypableRef.current  = isActive;
      prevIsFocusedRef.current  = isLocked;

      // ── if (isActive || isLocked) — absolute physics kill-switch ──────────
      // When either lock is active: write frozen position and return.
      // NO lerp. NO repulsion. NO parallax. The word does not move one pixel.
      if (isActive || isLocked) {
        if (frozenPosRef.current && nodeRef.current) {
          nodeRef.current.style.left = `${frozenPosRef.current.x}px`;
          nodeRef.current.style.top  = `${frozenPosRef.current.y}px`;
        }
        animId = requestAnimationFrame(tick);
        return; // ← THE kill-switch — no lerp, no repulsion, no drift
      }

      // ── INACTIVE: soft outer nudge + lazy lerp home + parallax ───────────
      const m = mousePosRef.current;
      let targetX = homeX;
      let targetY = homeY;

      if (m.x !== -1000) {
        const dx   = homeX - m.x;
        const dy   = homeY - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > lockRadius && dist < nudgeRadius) {
          // Linear taper from maxNudge at nudgeRadius → 0 at lockRadius.
          // Zero discontinuity: force reaches exactly 0 at the lock boundary.
          const band = nudgeRadius - lockRadius;
          const t    = (dist - lockRadius) / band; // 1 = far, 0 = at boundary
          const push = (1 - t) * maxNudge;
          if (dist > 0) {
            targetX = homeX + (dx / dist) * push;
            targetY = homeY + (dy / dist) * push;
          }
        }
      }

      // Lazy lerp — 0.1 coefficient → soft, inertial glide. Never snaps.
      posRef.current.currentX += (targetX - posRef.current.currentX) * 0.1;
      posRef.current.currentY += (targetY - posRef.current.currentY) * 0.1;

      // Apply parallax only when free (not locked). This is the only path
      // where visual position diverges from the home coordinate.
      if (nodeRef.current) {
        nodeRef.current.style.left = `${posRef.current.currentX + px}px`;
        nodeRef.current.style.top  = `${posRef.current.currentY + py}px`;
      }

      animId = requestAnimationFrame(tick);
    };

    tick();

    return () => cancelAnimationFrame(animId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Per-character split ────────────────────────────────────────────────────
  const typedChars     = word.slice(0, typedLength).split('');
  const currentChar    = typedLength < word.length ? word[typedLength] : null;
  const remainingChars = word.slice(typedLength + 1).split('');

  return (
    /*
     * Layout Identity — Flicker Prevention:
     *   • initial={false}  — no entrance animation when isFocused flips
     *   • layout           — Framer handles intrinsic size change (mono→serif)
     *   • Position = RAF only. Framer never drives left/top.
     */
    <motion.div
      ref={nodeRef}
      layout
      initial={false}
      animate={{
        scale:   (isFocused ? 1.15 : isTypable ? 1.05 : 0.95) * gameModeScale,
        opacity: isTypable || isFocused ? 1 : 0.6,
      }}
      exit={{ scale: 0, opacity: 0, transition: { duration: 0.15 } }}
      transition={springConfig}
      style={{
        position: 'absolute',
        left: `${x}px`,  // seeded here; RAF overwrites every frame
        top:  `${y}px`,
        transform: 'translate(-50%, -50%)',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: isFocused ? 20 : 10,
      }}
    >
      {/* Proximity indicator box — 1px solid Gold border on active/typable */}
      <motion.div
        layout
        initial={false}
        animate={{
          scale:       isFocused ? 1.2 : isTypable ? 1.0 : 0.8,
          borderColor: GOLD,
          borderWidth: isTypable || isFocused ? '1px' : '0px',
        }}
        transition={springConfig}
        style={{
          position:    'absolute',
          width:       '100%',
          height:      '100%',
          padding:     '8px 18px',
          borderRadius:'0px',
          borderStyle: isFocused ? 'solid' : 'dashed',
          zIndex: -1,
        }}
      />

      {/* Font morph container — fixed 40px height gives current-char underline clearance */}
      <div
        style={{
          position:  'relative',
          height:    '40px',
          minWidth:  '60px',
          display:   'flex',
          alignItems:'center',
          justifyContent: 'center',
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {!isFocused ? (

            /* ── MONO: Inactive state — JetBrains Mono, Bone White ─────── */
            <motion.div
              key="mono-state"
              initial={false}
              animate={{ opacity: isTypable ? 1 : 0.6, y: 0 }}
              exit={{ opacity: 0, y: 4, transition: { duration: 0.1 } }}
              transition={springConfig}
              style={{
                fontFamily:    "'JetBrains Mono', monospace",
                fontSize:      '14px',
                fontWeight:    400,
                letterSpacing: '3px',
                textTransform: 'lowercase',
                color:         neutralColor,
              }}
            >
              {word}
            </motion.div>

          ) : (

            /* ── SERIF: Locked/typing state — Cormorant Garamond Italic ── */
            <motion.div
              key="serif-state"
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
              transition={springConfig}
              style={{
                fontFamily:    "'Cormorant Garamond', serif",
                fontSize:      '24px',
                fontStyle:     'italic',
                fontWeight:    500,
                letterSpacing: '1px',
                display:       'inline-flex',
                alignItems:    'baseline',
              }}
            >
              {/*
               * ── THREE-STATE CHARACTER HIERARCHY ──────────────────────────
               *
               * STATE 1 — TYPED (The Past)
               *   Gold (#C5A059) · 100% opacity · wt 700
               *   Instantly archival — no transition cost, plain <span>.
               *
               * STATE 2 — CURRENT (The Present / Target)
               *   Bone White (#FDFDFB) · 100% opacity · wt 600
               *   2px Gold (#C5A059) underline strip beneath the glyph.
               *   Breathing pulse (opacity 1→0.35→1, 900ms ∞) on the
               *   underline draws the eye without distracting from the
               *   overall word. White colour provides maximum contrast
               *   against the Gold archive chars on both sides.
               *
               * STATE 3 — REMAINING (The Future / Queue)
               *   Bone White (#FDFDFB) · 15% opacity · wt 400
               *   Present but silent — the minimum footprint for
               *   peripheral awareness without stealing focus.
               */}

              {/* STATE 1 — TYPED ─────────────────────────────────────── */}
              {typedChars.map((char, i) => (
                <span
                  key={`t-${i}`}
                  style={{
                    color:      GOLD,
                    fontWeight: 700,
                    opacity:    1,
                    display:    'inline-block',
                  }}
                >
                  {char}
                </span>
              ))}

              {/* STATE 2 — CURRENT ───────────────────────────────────── */}
              {currentChar !== null && (
                /*
                 * Key includes typedLength so React replaces — not updates —
                 * the CurrentCharacter when the target letter advances.
                 * This restarts the pulse animation from the top, giving a
                 * crisp 'jump' sensation as the underline moves to the next char.
                 */
                <CurrentCharacter key={`c-${typedLength}`} char={currentChar} neutralColor={neutralColor} />
              )}

              {/* STATE 3 — REMAINING ─────────────────────────────────── */}
              {remainingChars.map((char, i) => (
                <span
                  key={`r-${i}`}
                  style={{
                    color:      neutralColor,
                    fontWeight: 400,
                    opacity:    0.17, /* ~17% — within 15-20% ghost range per brief */
                    display:    'inline-block',
                  }}
                >
                  {char}
                </span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 'READY' proximity tag — visible when in range but not yet locked */}
      <AnimatePresence initial={false}>
        {isTypable && !isFocused && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            style={{
              fontFamily:    "'JetBrains Mono', monospace",
              fontSize:      '9px',
              textTransform: 'uppercase',
              color:         neutralColor,
              letterSpacing: '1px',
              marginTop:     '4px',
            }}
          >
            ready
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
