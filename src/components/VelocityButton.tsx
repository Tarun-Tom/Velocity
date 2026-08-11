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
  const [entryPos, setEntryPos] = useState({ x: 50, y: 50 });

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setEntryPos({ x, y });
    setIsHovered(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current || !isHovered) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setEntryPos({ x, y });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`velocity-btn ${className} ${isHovered ? 'hovered' : ''}`}
      style={{
        ...style,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '0px',
      }}
      aria-label={ariaLabel}
      disabled={disabled}
    >
      {/* Kinetic Fill: 10% Gold (#C5A059) flood easing in from mouse entry coordinates */}
      <motion.span
        className="kinetic-fill-overlay"
        initial={false}
        animate={{
          opacity: isHovered ? 1 : 0,
          scale: isHovered ? 2.5 : 0.2,
        }}
        transition={{
          type: 'spring',
          stiffness: 250,
          damping: 22,
          mass: 0.5,
        }}
        style={{
          position: 'absolute',
          top: entryPos.y,
          left: entryPos.x,
          width: '200px',
          height: '200px',
          marginLeft: '-100px',
          marginTop: '-100px',
          borderRadius: '50%',
          backgroundColor: 'rgba(197, 160, 89, 0.12)', // 10-12% Gold fill
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      
      {/* Button content */}
      <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        {children}
      </span>
    </button>
  );
};
