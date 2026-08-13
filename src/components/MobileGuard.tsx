import React, { useState, useEffect } from 'react';

export const MobileGuard: React.FC = () => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      const timer = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(timer);
    } else {
      setVisible(false);
    }
  }, [isMobile]);

  if (!isMobile) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999, // Render above all UI elements, below 3% film grain overlay (zIndex 99999 / grain 100000)
        backgroundColor: '#000000', // Solid Void background between dots & warning text
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'auto',
      }}
    >
      {/* Central Terminal Warning Box with corner '+' marks */}
      <div
        style={{
          position: 'relative',
          border: '1px solid #C5A059',
          borderRadius: '0px',
          backgroundColor: '#000000',
          color: '#FDFDFB',
          fontFamily: 'monospace, "Courier New", Courier, sans-serif',
          padding: '36px 32px',
          maxWidth: '480px',
          width: '100%',
          boxSizing: 'border-box',
          textAlign: 'center',
          letterSpacing: '0.05em',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.9)',
        }}
      >
        {/* Architectural '+' Corner Marks */}
        <span
          style={{
            position: 'absolute',
            top: '-7px',
            left: '-6px',
            color: '#C5A059',
            fontSize: '12px',
            lineHeight: 1,
            fontWeight: 700,
            userSelect: 'none',
          }}
        >
          +
        </span>
        <span
          style={{
            position: 'absolute',
            top: '-7px',
            right: '-6px',
            color: '#C5A059',
            fontSize: '12px',
            lineHeight: 1,
            fontWeight: 700,
            userSelect: 'none',
          }}
        >
          +
        </span>
        <span
          style={{
            position: 'absolute',
            bottom: '-7px',
            left: '-6px',
            color: '#C5A059',
            fontSize: '12px',
            lineHeight: 1,
            fontWeight: 700,
            userSelect: 'none',
          }}
        >
          +
        </span>
        <span
          style={{
            position: 'absolute',
            bottom: '-7px',
            right: '-6px',
            color: '#C5A059',
            fontSize: '12px',
            lineHeight: 1,
            fontWeight: 700,
            userSelect: 'none',
          }}
        >
          +
        </span>

        {/* Title */}
        <div
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color: '#C5A059',
            marginBottom: '24px',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}
        >
          [ ACCESS_RESTRICTED ]
        </div>

        {/* Content */}
        <div
          style={{
            fontSize: '13px',
            lineHeight: '1.7',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            textAlign: 'center',
          }}
        >
          <div>
            <span style={{ color: '#C5A059', fontWeight: 600 }}>SYSTEM_LOG: </span>
            <span style={{ color: '#FDFDFB', opacity: 1 }}>VELOCITY is calibrated for desktop environments only.</span>
          </div>
          <div>
            <span style={{ color: '#C5A059', fontWeight: 600 }}>INPUT_REQUIRED: </span>
            <span style={{ color: '#FDFDFB', opacity: 1 }}>PHYSICAL_KEYBOARD + MOUSE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
