import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WordNodeProps {
  word: string;
  x: number;
  y: number;
  typedLength: number;
  isTypable: boolean; // within 150px radius
  isFocused: boolean; // currently targeted/locked for typing
  theme: 'light' | 'dark';
  gameModeScale?: number;
}

export const WordNode: React.FC<WordNodeProps> = ({
  word,
  x,
  y,
  typedLength,
  isTypable,
  isFocused,
  theme,
  gameModeScale = 1.0,
}) => {
  // Spring transition setup
  const springConfig = { type: 'spring' as const, stiffness: 80, damping: 15, mass: 0.8 };

  const typedPart = word.slice(0, typedLength);
  const remainingPart = word.slice(typedLength);

  // Define colors based on state
  const baseTextColor = theme === 'light' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.4)';
  const activeTextColor = theme === 'light' ? '#000000' : '#ffffff';
  const accentColor = '#C5A059'; // Elegant gold accent

  return (
    <motion.div
      layout
      initial={{ scale: 0, opacity: 0, x: x - 50, y: y - 20 }}
      animate={{
        x: x,
        y: y,
        scale: (isFocused ? 1.15 : isTypable ? 1.05 : 0.95) * gameModeScale,
        opacity: isTypable || isFocused ? 1 : 0.6,
      }}
      exit={{ scale: 0, opacity: 0, transition: { duration: 0.2 } }}
      transition={springConfig}
      style={{
        position: 'absolute',
        transform: 'translate(-50%, -50%)',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Visual background indicator ring */}
      <motion.div
        animate={{
          scale: isFocused ? 1.2 : isTypable ? 1.0 : 0.8,
          borderColor: isFocused
            ? 'rgba(197, 160, 89, 0.4)'
            : isTypable
            ? 'rgba(255, 255, 255, 0.15)'
            : 'rgba(0, 0, 0, 0.0)',
          borderWidth: isTypable || isFocused ? '1px' : '0px',
        }}
        transition={springConfig}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          padding: '8px 18px',
          borderRadius: '0px',
          borderStyle: isFocused ? 'solid' : 'dashed',
          zIndex: -1,
        }}
      />

      {/* Font morph container */}
      <div style={{ position: 'relative', height: '36px', display: 'flex', alignItems: 'center' }}>
        {/* MONO Layer (Not active / base state) */}
        <motion.div
          animate={{
            opacity: isFocused ? 0 : 1,
            y: isFocused ? -8 : 0,
            scale: isFocused ? 0.8 : 1,
          }}
          transition={springConfig}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '14px',
            fontWeight: 400,
            letterSpacing: '3px',
            textTransform: 'lowercase',
            color: isTypable ? activeTextColor : baseTextColor,
            position: isFocused ? 'absolute' : 'relative',
          }}
        >
          {word}
        </motion.div>

        {/* SERIF Layer (Morphs in when focused) */}
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{
            opacity: isFocused ? 1 : 0,
            y: isFocused ? 0 : 8,
            scale: isFocused ? 1 : 0.9,
          }}
          transition={springConfig}
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '24px',
            fontStyle: 'italic',
            fontWeight: 500,
            letterSpacing: '1px',
            color: activeTextColor,
            position: isFocused ? 'relative' : 'absolute',
          }}
        >
          <span style={{ color: accentColor, fontWeight: 700 }}>{typedPart}</span>
          <span>{remainingPart}</span>
        </motion.div>
      </div>

      {/* Proximity dot tag when typable but not focused */}
      <AnimatePresence>
        {isTypable && !isFocused && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '9px',
              textTransform: 'uppercase',
              color: accentColor,
              letterSpacing: '1px',
              marginTop: '4px',
            }}
          >
            ready
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
