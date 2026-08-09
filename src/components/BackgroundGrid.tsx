import React, { useEffect, useRef } from 'react';

interface WordPosition {
  x: number;
  y: number;
  isTypable: boolean;
  isFocused: boolean;
}

interface Implosion {
  x: number;
  y: number;
  time: number;
}

interface BackgroundGridProps {
  theme: 'light' | 'dark';
  words: WordPosition[];
  implosion: Implosion | null;
  frictionActive?: boolean;
  mousePos: { x: number; y: number };
  scrollVertical?: boolean;
  scrollSpeedY?: number;
}

export const BackgroundGrid: React.FC<BackgroundGridProps> = ({
  theme,
  words,
  implosion,
  frictionActive = false,
  mousePos,
  scrollVertical = false,
  scrollSpeedY = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wordsRef = useRef<WordPosition[]>(words);
  const implosionsRef = useRef<Implosion[]>([]);
  const lastImplosionTimeRef = useRef<number>(0);
  const driftRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTimeRef = useRef<number>(Date.now());

  // Keep words reference updated without restarting the canvas loop
  wordsRef.current = words;

  if (implosion && implosion.time > lastImplosionTimeRef.current) {
    lastImplosionTimeRef.current = implosion.time;
    implosionsRef.current.push(implosion);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Grid spacing: 20px
    const spacing = 20;
    const repulsionRadius = 150;
    const maxRepulsion = 14; // pixels pushed away

    // Smoothly interpolated mouse for a springier lag effect
    let smoothMouseX = mousePos.x;
    let smoothMouseY = mousePos.y;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const now = Date.now();
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Friction: if active, speed drops to 0, otherwise constant drift speed
      if (!frictionActive) {
        if (scrollVertical) {
          // scrollSpeedY is in WPM, let's map WPM to px/sec. 
          // E.g., WPM * 2.5 pixels per second makes it scroll smoothly.
          const pxPerSec = scrollSpeedY * 2.5;
          driftRef.current.y += (pxPerSec * delta) / 1000;
        } else {
          driftRef.current.x += (15 * delta) / 1000;
          driftRef.current.y += (10 * delta) / 1000;
        }
      }

      const activeImplosions = implosionsRef.current.filter((imp) => now - imp.time < 300);
      implosionsRef.current = activeImplosions;

      // Determine colors based on theme
      const dotColor = theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
      const activeDotColor = theme === 'light' ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.25)';

      const mx = mousePos.x;
      const my = mousePos.y;

      if (smoothMouseX === -1000 || isNaN(smoothMouseX)) {
        smoothMouseX = mx;
        smoothMouseY = my;
      } else {
        // Interpolate mouse coordinates (simple spring / ease)
        smoothMouseX += (mx - smoothMouseX) * 0.15;
        smoothMouseY += (my - smoothMouseY) * 0.15;
      }

      // Draw dot grid
      const cols = Math.ceil(width / spacing) + 4;
      const rows = Math.ceil(height / spacing) + 4;

      // Start offsets to align grid to center
      const offsetX = (width % spacing) / 2;
      const offsetY = (height % spacing) / 2;

      // Parallax offset for Midground (Speed 0.03) based on mouse displacement from window center
      const centerX = width / 2;
      const centerY = height / 2;
      const mouseOffsetFromCenterX = mx === -1000 ? 0 : mx - centerX;
      const mouseOffsetFromCenterY = my === -1000 ? 0 : my - centerY;
      const parallaxX = mouseOffsetFromCenterX * 0.03;
      const parallaxY = mouseOffsetFromCenterY * 0.03;

      for (let c = -2; c < cols; c++) {
        for (let r = -2; r < rows; r++) {
          // Add parallax drift layer
          const originalX = c * spacing + offsetX + (driftRef.current.x % spacing) + parallaxX;
          const originalY = r * spacing + offsetY + (driftRef.current.y % spacing) + parallaxY;

          // Calculate displacement from cursor (using cursor's visual position, which is static relative to screen, so smoothMouseX/Y)
          const dx = originalX - smoothMouseX;
          const dy = originalY - smoothMouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let drawX = originalX;
          let drawY = originalY;
          let isClose = false;

          if (dist < repulsionRadius) {
            isClose = true;
            // Repulsion strength profile (strongest at center, drops to 0 at repulsionRadius)
            const factor = (repulsionRadius - dist) / repulsionRadius;
            // Quadratic easing for prettier curvature
            const easeFactor = factor * factor; 
            const push = easeFactor * maxRepulsion;

            if (dist > 0) {
              drawX += (dx / dist) * push;
              drawY += (dy / dist) * push;
            }
          }

          // Apply active implosion pulls
          activeImplosions.forEach((imp) => {
            const idx = imp.x - originalX;
            const idy = imp.y - originalY;
            const idist = Math.sqrt(idx * idx + idy * idy);
            const impRadius = 180;

            if (idist > 0 && idist < impRadius) {
              const elapsed = now - imp.time;
              const progress = elapsed / 300;
              const intensity = Math.sin(progress * Math.PI) * 22; // max 22px pull
              const factor = (impRadius - idist) / impRadius;
              const pull = factor * factor * intensity;

              drawX += (idx / idist) * pull;
              drawY += (idy / idist) * pull;
            }
          });

          // Render dot
          ctx.beginPath();
          ctx.arc(drawX, drawY, isClose ? 1.5 : 1, 0, Math.PI * 2);
          ctx.fillStyle = isClose ? activeDotColor : dotColor;
          ctx.fill();
        }
      }
      // Draw proximity connection lines from cursor to words
      wordsRef.current.forEach((word) => {
        if (!word.isTypable) return;
        ctx.beginPath();
        ctx.moveTo(smoothMouseX, smoothMouseY);
        // Note: word.x / word.y already has its own foreground parallax shift applied dynamically in App.tsx render, so we connect directly to it.
        ctx.lineTo(word.x, word.y);
        ctx.lineWidth = word.isFocused ? 1.5 : 0.8;
        if (word.isFocused) {
          ctx.strokeStyle = '#C5A059'; // Gold
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = theme === 'light' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)';
          ctx.setLineDash([3, 3]);
        }
        ctx.stroke();
        ctx.setLineDash([]); // Reset
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme, frictionActive, mousePos]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
};
