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
  const springConfig = { type: 'spring' as const, stiffness: 280, damping: 24, mass: 0.7 };

  const typedPart = word.slice(0, typedLength);
  const remainingPart = word.slice(typedLength);

  const baseTextColor = theme === 'light' ? 'rgba(0, 0, 0, 0.45)' : 'rgba(253, 253, 251, 0.55)';
  const activeTextColor = theme === 'light' ? '#000000' : '#FDFDFB'; // Bone White standard
  const goldAccentColor = '#C5A059'; // Gold strictly for active focused node

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
      exit={{ scale: 0, opacity: 0, transition: { duration: 0.15 } }}
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
      {/* Visual background indicator box — Gold if focused, Bone White if idle */}
      <motion.div
        animate={{
          scale: isFocused ? 1.2 : isTypable ? 1.0 : 0.8,
          borderColor: isFocused
            ? '#C5A059' // Gold strictly for active focus node
            : isTypable
            ? theme === 'light'
              ? 'rgba(0, 0, 0, 0.25)'
              : 'rgba(253, 253, 251, 0.35)'
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
        {/* MONO Layer (Base state — Bone White) */}
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

        {/* SERIF Layer (Focus state — Gold #C5A059) */}
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
            color: goldAccentColor, // Gold strictly for active target focus node
            position: isFocused ? 'relative' : 'absolute',
          }}
        >
          <span style={{ color: goldAccentColor, fontWeight: 700 }}>{typedPart}</span>
          <span style={{ color: goldAccentColor, opacity: 0.8 }}>{remainingPart}</span>
        </motion.div>
      </div>

      {/* Proximity tag when typable */}
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
              color: '#FDFDFB',
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
