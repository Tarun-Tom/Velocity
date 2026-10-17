import React, { useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface VariableTitleProps {
  mousePos: { x: number; y: number };
  onClick?: () => void;
  className?: string;
  size?: 'hero' | 'hud';
  theme?: 'light' | 'dark';
}

export const VariableTitle: React.FC<VariableTitleProps> = ({
  mousePos,
  onClick,
  className = '',
  size = 'hud',
  theme = 'dark',
}) => {
  const titleRef = useRef<HTMLDivElement>(null);

  const rawProximity = useMotionValue(0);

  // ── Liquid Glass Spring ────────────────────────────────────────────────────
  // stiffness: 40, damping: 20 → the title weight moves like heavy glass —
  // slow to start, slow to settle. A continuous breathing between Light and Bold
  // that tracks the cursor without snapping.
  const smoothProximity = useSpring(rawProximity, {
    stiffness: 40,
    damping: 20,
    mass: 1.4,
  });

  const isHero = size === 'hero';
  const isLight = theme === 'light';

  // Light mode: Burnished Antique Brass (#9A762E) with high contrast on cream
  // Dark mode:  Gold (#C5A059)
  const goldColor = isLight ? '#9A762E' : '#C5A059';

  // Cormorant Garamond weights 300 (Light) to 700 (Bold)
  const fontWeight = useTransform(smoothProximity, [0, 1], [300, 700]);

  const fontVariationSettings = useTransform(
    smoothProximity,
    (v) => `'wght' ${Math.round(300 + v * 400)}`
  );

  // Tracking compresses slightly as weight grows
  const letterSpacing = useTransform(
    smoothProximity,
    [0, 1],
    isHero ? ['0.28em', '0.18em'] : ['0.20em', '0.12em']
  );

  // Gold glow breathes in with the weight — subtle at low proximity, radiant at peak
  const textShadow = useTransform(smoothProximity, (v) =>
    v > 0.08
      ? `0 0 ${Math.round(v * (isHero ? 32 : 18))}px ${
          isLight
            ? `rgba(154, 118, 46, ${(v * 0.70).toFixed(2)})`
            : `rgba(197, 160, 89, ${(v * 0.75).toFixed(2)})`
        }`
      : 'none'
  );

  useEffect(() => {
    if (!titleRef.current) return;
    if (mousePos.x === -1000 || mousePos.y === -1000) {
      rawProximity.set(0);
      return;
    }

    const rect = titleRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = mousePos.x - centerX;
    const dy = mousePos.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const maxDist = isHero ? 480 : 360;
    const proximity = Math.max(0, Math.min(1, 1 - dist / maxDist));

    // Exponent 1.4 — gradual onset, stronger as you get close
    const smoothFactor = Math.pow(proximity, 1.4);
    rawProximity.set(smoothFactor);
  }, [mousePos, rawProximity, isHero]);

  return (
    <motion.div
      ref={titleRef}
      onClick={onClick}
      className={`variable-title ${className}`}
      style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontStyle: 'italic',
        fontSize: isHero ? 'clamp(44px, 6vw, 76px)' : '24px',
        fontWeight,
        fontVariationSettings,
        letterSpacing,
        textShadow,
        color: goldColor, // #9A762E in light mode, #C5A059 in dark mode
        textTransform: 'uppercase',
        lineHeight: 1.1,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        textAlign: 'center',
        display: 'inline-block',
      }}
    >
      V E L O C I T Y
    </motion.div>
  );
};
