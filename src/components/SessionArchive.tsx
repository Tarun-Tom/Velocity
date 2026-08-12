import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { VelocityButton } from './VelocityButton';
import { Download, RefreshCw, Check, Home } from 'lucide-react';

interface SessionArchiveProps {
  score: number;
  wpm: number;
  peakWpm: number;
  accuracy: number;
  correctKeys: number;
  incorrectKeys: number;
  flowStreak: number;
  synergyPoints: number;
  gameMode: string;
  mousePath: { x: number; y: number }[];
  onRecalibrate: () => void;
  onReturnToNucleus: () => void;
  theme: 'light' | 'dark';
}

export const SessionArchive: React.FC<SessionArchiveProps> = ({
  score,
  wpm,
  peakWpm,
  accuracy,
  correctKeys,
  incorrectKeys,
  flowStreak,
  synergyPoints,
  gameMode,
  mousePath,
  onRecalibrate,
  onReturnToNucleus,
  theme,
}) => {
  const [exported, setExported] = useState(false);

  // Generate normalized SVG path string from recorded mouse coordinates
  const pathD = useMemo(() => {
    if (!mousePath || mousePath.length < 2) {
      return 'M 50 175 C 150 50, 250 300, 400 175 S 650 50, 750 175';
    }

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    mousePath.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const svgWidth = 800;
    const svgHeight = 300;
    const padding = 40;

    const step = Math.max(1, Math.floor(mousePath.length / 150));
    const sampled = mousePath.filter((_, idx) => idx % step === 0);

    const points = sampled.map((p) => {
      const normX = padding + ((p.x - minX) / rangeX) * (svgWidth - padding * 2);
      const normY = padding + ((p.y - minY) / rangeY) * (svgHeight - padding * 2);
      return `${normX.toFixed(1)},${normY.toFixed(1)}`;
    });

    return `M ${points.join(' L ')}`;
  }, [mousePath]);

  const handleExportSignature = () => {
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="300" viewBox="0 0 800 300" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#000000" />
  <path d="${pathD}" stroke="#C5A059" stroke-width="0.5" fill="none" />
  <text x="20" y="290" fill="#FDFDFB" font-family="monospace" font-size="10">VELOCITY SESSION SIGNATURE | MODE: ${gameMode.toUpperCase()} | WPM: ${wpm} | ACC: ${accuracy}%</text>
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `velocity_signature_${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  const springConfig = { type: 'spring' as const, stiffness: 220, damping: 22 };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springConfig}
      className="session-archive-container"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        boxSizing: 'border-box',
        pointerEvents: 'auto',
      }}
    >
      <div
        className="archive-bento-wrapper"
        style={{
          width: '100%',
          maxWidth: '1080px',
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '16px',
          fontFamily: "'JetBrains Mono', monospace",
          color: '#FDFDFB',
        }}
      >
        {/* Header Module (Col-span 12) — Gold (#C5A059) */}
        <div
          className="bento-box archive-header-box"
          style={{
            gridColumn: 'span 12',
            border: '1px solid #C5A059',
            borderRadius: '0px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: theme === 'dark' ? 'rgba(0, 0, 0, 0.88)' : 'rgba(253, 253, 251, 0.88)',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', letterSpacing: '0.2em', opacity: 0.55, marginBottom: '4px', color: '#FDFDFB' }}>
              [ TELEMETRY_PROTOCOL ]
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '0.15em', color: '#C5A059' }}>
              [ SESSION_ARCHIVE ]
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.15em', opacity: 0.55, color: '#FDFDFB' }}>
              MODE: {gameMode.toUpperCase()}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#C5A059', marginTop: '2px' }}>
              TOTAL SCORE: {score} PTS
            </div>
          </div>
        </div>

        {/* Centerpiece Hero Visual Signature Module (Col-span 12) */}
        <div
          className="bento-box visual-signature-box"
          style={{
            gridColumn: 'span 12',
            border: '1px solid #C5A059',
            borderRadius: '0px',
            padding: '24px',
            position: 'relative',
            background: theme === 'dark' ? 'rgba(0, 0, 0, 0.92)' : 'rgba(253, 253, 251, 0.92)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '20px',
              fontSize: '10px',
              letterSpacing: '0.2em',
              color: '#C5A059',
              textTransform: 'uppercase',
            }}
          >
            [ KINETIC_TRAJECTORY_SIGNATURE ]
          </div>

          <div style={{ width: '100%', height: '240px', marginTop: '16px' }}>
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 800 300"
              preserveAspectRatio="xMidYMid meet"
              style={{ overflow: 'visible' }}
            >
              {/* Reference Grid lines — Bone White opacity */}
              <line x1="0" y1="150" x2="800" y2="150" stroke="rgba(253, 253, 251, 0.12)" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="400" y1="0" x2="400" y2="300" stroke="rgba(253, 253, 251, 0.12)" strokeWidth="0.5" strokeDasharray="4 4" />

              {/* The Hero Visual Signature: STRICTLY GOLD (#C5A059) */}
              <motion.path
                d={pathD}
                stroke="#C5A059" // Hero centerpiece in Gold
                strokeWidth="0.5"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '20px',
              fontSize: '9px',
              letterSpacing: '0.15em',
              opacity: 0.55,
              color: '#FDFDFB',
            }}
          >
            PATH_NODES: {mousePath ? mousePath.length : 0} | VECTOR_RESOLUTION: 0.5PX
          </div>
        </div>

        {/* Bento Data Module 1: [ PEAK_VELOCITY ] (Col-span 4) — Gold (#C5A059) */}
        <div
          className="bento-box metric-box"
          style={{
            gridColumn: 'span 4',
            border: '1px solid #C5A059',
            borderRadius: '0px',
            padding: '20px',
            background: theme === 'dark' ? 'rgba(0, 0, 0, 0.85)' : 'rgba(253, 253, 251, 0.85)',
          }}
        >
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', marginBottom: '12px', color: '#C5A059' }}>
            [ PEAK_VELOCITY ]
          </div>
          <div style={{ fontSize: '36px', fontWeight: 700, color: '#C5A059', lineHeight: 1 }}>
            {peakWpm || wpm} <span style={{ fontSize: '12px', opacity: 0.65 }}>WPM</span>
          </div>
          <div style={{ fontSize: '11px', marginTop: '12px', opacity: 0.75, color: '#FDFDFB', display: 'flex', justifyContent: 'space-between' }}>
            <span>AVG WPM:</span>
            <span style={{ fontWeight: 600 }}>{wpm}</span>
          </div>
        </div>

        {/* Bento Data Module 2: [ PRECISION_INDEX ] (Col-span 4) — Gold (#C5A059) */}
        <div
          className="bento-box metric-box"
          style={{
            gridColumn: 'span 4',
            border: '1px solid #C5A059',
            borderRadius: '0px',
            padding: '20px',
            background: theme === 'dark' ? 'rgba(0, 0, 0, 0.85)' : 'rgba(253, 253, 251, 0.85)',
          }}
        >
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', marginBottom: '12px', color: '#C5A059' }}>
            [ PRECISION_INDEX ]
          </div>
          <div style={{ fontSize: '36px', fontWeight: 700, color: '#C5A059', lineHeight: 1 }}>
            {accuracy}%
          </div>
          <div style={{ fontSize: '11px', marginTop: '12px', opacity: 0.75, color: '#FDFDFB', display: 'flex', justifyContent: 'space-between' }}>
            <span>KEYS:</span>
            <span style={{ fontWeight: 600 }}>{correctKeys} / {correctKeys + incorrectKeys}</span>
          </div>
        </div>

        {/* Bento Data Module 3: [ SYNERGY_FLOW ] (Col-span 4) — Gold (#C5A059) */}
        <div
          className="bento-box metric-box"
          style={{
            gridColumn: 'span 4',
            border: '1px solid #C5A059',
            borderRadius: '0px',
            padding: '20px',
            background: theme === 'dark' ? 'rgba(0, 0, 0, 0.85)' : 'rgba(253, 253, 251, 0.85)',
          }}
        >
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', marginBottom: '12px', color: '#C5A059' }}>
            [ SYNERGY_FLOW ]
          </div>
          <div style={{ fontSize: '36px', fontWeight: 700, color: '#C5A059', lineHeight: 1 }}>
            x{flowStreak} <span style={{ fontSize: '12px', opacity: 0.65 }}>STREAK</span>
          </div>
          <div style={{ fontSize: '11px', marginTop: '12px', opacity: 0.75, color: '#FDFDFB', display: 'flex', justifyContent: 'space-between' }}>
            <span>SYNERGY BONUS:</span>
            <span style={{ fontWeight: 600 }}>+{synergyPoints * 100} PTS</span>
          </div>
        </div>

        {/* Action Footer CTAs (Col-span 12) */}
        <div
          className="bento-box archive-cta-box"
          style={{
            gridColumn: 'span 12',
            border: '1px solid #C5A059',
            borderRadius: '0px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: theme === 'dark' ? 'rgba(0, 0, 0, 0.85)' : 'rgba(253, 253, 251, 0.85)',
          }}
        >
          {/* Asymmetric Bottom-Left Navigation CTA — Bone White (#FDFDFB) */}
          <VelocityButton onClick={onReturnToNucleus}>
            <Home size={14} />
            [ RETURN_TO_NUCLEUS ]
          </VelocityButton>

          {/* Bottom-Right Actions: Export (Bone White) & Primary Recalibrate (Gold) */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <VelocityButton onClick={handleExportSignature}>
              {exported ? <Check size={14} /> : <Download size={14} />}
              {exported ? '[ SIGNATURE_SAVED ]' : '[ EXPORT_SIGNATURE ]'}
            </VelocityButton>

            <VelocityButton onClick={onRecalibrate} className="begin-session-btn">
              <RefreshCw size={14} />
              [ RE-CALIBRATE ]
            </VelocityButton>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
