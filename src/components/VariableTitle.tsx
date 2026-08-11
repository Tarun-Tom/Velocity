import React, { useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface VariableTitleProps {
  mousePos: { x: number; y: number };
  onClick?: () => void;
  className?: string;
}

export const VariableTitle: React.FC<VariableTitleProps> = ({
  mousePos,
  onClick,
  className = '',
}) => {
  const titleRef = useRef<HTMLDivElement>(null);

  const rawProximity = useMotionValue(0);

  const smoothProximity = useSpring(rawProximity, {
    stiffness: 180,
    damping: 22,
    mass: 0.5,
  });

  const fontWeight = useTransform(smoothProximity, [0, 1], [100, 900]);

  const fontVariationSettings = useTransform(
    smoothProximity,
    (v) => `'wght' ${Math.round(100 + v * 800)}`
  );

  const letterSpacing = useTransform(smoothProximity, [0, 1], ['0.35em', '0.14em']);

  const textShadow = useTransform(smoothProximity, (v) =>
    v > 0.2
      ? `0 0 ${Math.round(v * 16)}px rgba(197, 160, 89, ${v * 0.65})`
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

    const maxDist = 380;
    const proximity = Math.max(0, Math.min(1, 1 - dist / maxDist));

    const smoothFactor = Math.pow(proximity, 1.6);
    rawProximity.set(smoothFactor);
  }, [mousePos, rawProximity]);

  return (
    <motion.div
      ref={titleRef}
      onClick={onClick}
      className={`variable-title ${className}`}
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '28px',
        fontWeight,
        fontVariationSettings,
        letterSpacing,
        textShadow,
        color: '#C5A059', // Strictly Gold for Main Title
        textTransform: 'uppercase',
        lineHeight: 1,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      VELOCITY
    </motion.div>
  );
};
