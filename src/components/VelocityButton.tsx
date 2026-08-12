import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface VelocityButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
  disabled?: boolean;
}

/**
 * VelocityButton
 * ──────────────────────────────────────────────────────────────────────────────
 * Secondary variant: 1px Gold border, transparent background, kinetic-fill
 *   (10% Gold flood) on hover.
 *
 * Primary variant (.begin-session-btn): Flat solid Gold (#C5A059) slab,
 *   Pitch Black text, satin-sheen radial glow on hover.
 *   The outer bloom glow is applied by the parent (BentoHub.tsx) so this
 *   component only handles its own surface.
 */
export const VelocityButton: React.FC<VelocityButtonProps> = ({
  onClick,
  children,
  className = '',
  style,
  ariaLabel,
  disabled = false,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const isPrimary = className.includes('begin-session-btn');

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
    setIsHovered(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const handleMouseLeave = () => setIsHovered(false);

  return (
    <motion.button
      ref={buttonRef}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileTap={{ scale: isPrimary ? 0.98 : 0.98 }}
      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
      className={`velocity-btn ${className} ${isHovered ? 'hovered' : ''}`}
      style={{
        ...style,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 0,
        // Primary Radiant Slab overrides
        ...(isPrimary && {
          background: isHovered ? '#D4AF37' : '#C5A059',
          border: '1px solid #C5A059',
          color: '#000000',
          boxShadow: isHovered
            ? '0 0 15px rgba(197, 160, 89, 0.4), 0 0 40px rgba(197, 160, 89, 0.2)'
            : 'none',
          transition: 'background-color 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        }),
      }}
      aria-label={ariaLabel}
      disabled={disabled}
    >
      {isPrimary ? (
        <span
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'inline-flex',
            flexDirection: 'inherit',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'inherit',
            color: '#000000',
            fontWeight: 800,
          }}
        >
          {children}
        </span>
      ) : (
        <>
          {/*
            Secondary Kinetic Fill — 10% Gold flood ripple from cursor entry.
            Uses framer-motion scale spring to create the organic flood feel.
          */}
          <motion.span
            initial={false}
            animate={{
              opacity: isHovered ? 1 : 0,
              scale: isHovered ? 2.4 : 0.2,
            }}
            transition={{
              type: 'spring',
              stiffness: 280,
              damping: 22,
              mass: 0.4,
            }}
            style={{
              position: 'absolute',
              top: mousePos.y,
              left: mousePos.x,
              width: 180,
              height: 180,
              marginLeft: -90,
              marginTop: -90,
              borderRadius: '50%',
              background: 'rgba(197, 160, 89, 0.12)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />

          {/* Content */}
          <span
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {children}
          </span>
        </>
      )}
    </motion.button>
  );
};
