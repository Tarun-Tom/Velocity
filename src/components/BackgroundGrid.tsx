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

    const spacing = 24; // Baseline 24px architectural grid
    // Spatial Impact: Doubled Repulsion Radius to 290px for a massive visible clearing
    const repulsionRadius = 290;
    const maxRepulsion = 32; // Increased force for sharp edge compression
    // Tether Scaling: Captured distance increased to 180px
    const tetherRadius = 180;

    let smoothMouseX = mousePos.x;
    let smoothMouseY = mousePos.y;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const now = Date.now();
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (!frictionActive) {
        if (scrollVertical) {
          const pxPerSec = scrollSpeedY * 2.5;
          driftRef.current.y += (pxPerSec * delta) / 1000;
        } else {
          driftRef.current.x += (15 * delta) / 1000;
          driftRef.current.y += (10 * delta) / 1000;
        }
      }

      const activeImplosions = implosionsRef.current.filter((imp) => now - imp.time < 300);
      implosionsRef.current = activeImplosions;

      const dotColor = theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(253, 253, 251, 0.08)';
      const activeDotColor = theme === 'light' ? 'rgba(0, 0, 0, 0.28)' : 'rgba(253, 253, 251, 0.28)';
      const tetherColor = '#C5A059'; // Gold status accent

      const mx = mousePos.x;
      const my = mousePos.y;

      if (smoothMouseX === -1000 || isNaN(smoothMouseX)) {
        smoothMouseX = mx;
        smoothMouseY = my;
      } else {
        smoothMouseX += (mx - smoothMouseX) * 0.18;
        smoothMouseY += (my - smoothMouseY) * 0.18;
      }

      const cols = Math.ceil(width / spacing) + 4;
      const rows = Math.ceil(height / spacing) + 4;

      const offsetX = (width % spacing) / 2;
      const offsetY = (height % spacing) / 2;

      const centerX = width / 2;
      const centerY = height / 2;
      const mouseOffsetFromCenterX = mx === -1000 ? 0 : mx - centerX;
      const mouseOffsetFromCenterY = my === -1000 ? 0 : my - centerY;
      const parallaxX = mouseOffsetFromCenterX * 0.03;
      const parallaxY = mouseOffsetFromCenterY * 0.03;

      // STEP 1: Scan grid dots & identify nearest 7 dots within expanded tether radius
      const gridDots: {
        col: number;
        row: number;
        origX: number;
        origY: number;
        dist: number;
      }[] = [];

      for (let c = -2; c < cols; c++) {
        for (let r = -2; r < rows; r++) {
          const origX = c * spacing + offsetX + (driftRef.current.x % spacing) + parallaxX;
          const origY = r * spacing + offsetY + (driftRef.current.y % spacing) + parallaxY;
          const dx = origX - smoothMouseX;
          const dy = origY - smoothMouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < tetherRadius) {
            gridDots.push({ col: c, row: r, origX, origY, dist });
          }
        }
      }

      gridDots.sort((a, b) => a.dist - b.dist);
      const tetheredList = gridDots.slice(0, 7);
      const tetheredKeySet = new Set(tetheredList.map((d) => `${d.col},${d.row}`));

      // STEP 2: Render dot grid with expanded repulsion void and edge compression
      for (let c = -2; c < cols; c++) {
        for (let r = -2; r < rows; r++) {
          const key = `${c},${r}`;
          const isTethered = tetheredKeySet.has(key);

          const origX = c * spacing + offsetX + (driftRef.current.x % spacing) + parallaxX;
          const origY = r * spacing + offsetY + (driftRef.current.y % spacing) + parallaxY;

          const dx = origX - smoothMouseX;
          const dy = origY - smoothMouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let drawX = origX;
          let drawY = origY;
          let isClose = false;

          if (isTethered && smoothMouseX !== -1000) {
            // TETHERED DOT MECHANIC: Pulled inward from the perimeter of the 290px void
            const pullFactor = ((tetherRadius - dist) / tetherRadius) * 14;
            if (dist > 0) {
              drawX -= (dx / dist) * pullFactor;
              drawY -= (dy / dist) * pullFactor;
            }

            // Draw 0.5px Gold hairline connection vector
            ctx.beginPath();
            ctx.moveTo(smoothMouseX, smoothMouseY);
            ctx.lineTo(drawX, drawY);
            ctx.lineWidth = 0.5;
            ctx.strokeStyle =
              theme === 'dark' ? 'rgba(197, 160, 89, 0.6)' : 'rgba(197, 160, 89, 0.8)';
            ctx.stroke();

            // Render captured tether dot highlighted in Gold
            ctx.beginPath();
            ctx.arc(drawX, drawY, 2.0, 0, Math.PI * 2);
            ctx.fillStyle = tetherColor;
            ctx.fill();
          } else {
            // MAGNETIC REPULSION VOID: 290px clearing with sharp perimeter compression
            if (dist < repulsionRadius) {
              isClose = true;
              const factor = (repulsionRadius - dist) / repulsionRadius;
              // High-order polynomial curve for tight edge compression
              const easeFactor = Math.pow(factor, 1.8);
              const push = easeFactor * maxRepulsion;

              if (dist > 0) {
                drawX += (dx / dist) * push;
                drawY += (dy / dist) * push;
              }
            }

            // Active Implosion Pulls
            activeImplosions.forEach((imp) => {
              const idx = imp.x - origX;
              const idy = imp.y - origY;
              const idist = Math.sqrt(idx * idx + idy * idy);
              const impRadius = 180;

              if (idist > 0 && idist < impRadius) {
                const elapsed = now - imp.time;
                const progress = elapsed / 300;
                const intensity = Math.sin(progress * Math.PI) * 22;
                const factor = (impRadius - idist) / impRadius;
                const pull = factor * factor * intensity;

                drawX += (idx / idist) * pull;
                drawY += (idy / idist) * pull;
              }
            });

            ctx.beginPath();
            ctx.arc(drawX, drawY, isClose ? 1.5 : 1, 0, Math.PI * 2);
            ctx.fillStyle = isClose ? activeDotColor : dotColor;
            ctx.fill();
          }
        }
      }

      // STEP 3: Draw word proximity connections
      wordsRef.current.forEach((word) => {
        if (!word.isTypable) return;
        ctx.beginPath();
        ctx.moveTo(smoothMouseX, smoothMouseY);
        ctx.lineTo(word.x, word.y);
        ctx.lineWidth = word.isFocused ? 1.5 : 0.8;
        if (word.isFocused) {
          ctx.strokeStyle = tetherColor; // Gold for focused active word
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = theme === 'light' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(253, 253, 251, 0.2)';
          ctx.setLineDash([3, 3]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
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
