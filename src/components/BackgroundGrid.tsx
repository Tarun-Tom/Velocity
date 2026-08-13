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

interface SynergyPing {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
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
  /** 200ms subliminal Gold guide line from completed word → nearest next word. */
  synergyPing?: SynergyPing | null;
}

export const BackgroundGrid: React.FC<BackgroundGridProps> = ({
  theme,
  words,
  implosion,
  frictionActive = false,
  mousePos,
  scrollVertical = false,
  scrollSpeedY = 0,
  synergyPing = null,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wordsRef = useRef<WordPosition[]>(words);
  const implosionsRef = useRef<Implosion[]>([]);
  const lastImplosionTimeRef = useRef<number>(0);
  const driftRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTimeRef = useRef<number>(Date.now());
  // Live mouse ref — read inside RAF loop so the loop never needs to restart
  const mousePosRef = useRef(mousePos);

  wordsRef.current = words;
  mousePosRef.current = mousePos;

  const dotStateMapRef = useRef<Map<string, { currentX: number; currentY: number }>>(new Map());
  const smoothParallaxRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const velRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const frictionRef = useRef(frictionActive);
  frictionRef.current = frictionActive;
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const scrollVerticalRef = useRef(scrollVertical);
  scrollVerticalRef.current = scrollVertical;
  const scrollSpeedYRef = useRef(scrollSpeedY);
  scrollSpeedYRef.current = scrollSpeedY;
  // Synergy ping live ref — updated every render, read in RAF loop
  const synergyPingRef = useRef(synergyPing);
  synergyPingRef.current = synergyPing;

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
    const repulsionRadius = 240; // Expanded physical void clearing
    const maxRepulsion = 64;     // Increased magnetic push for physical void float
    const tetherRadius = 200;

    let smoothMouseX = mousePos.x;
    let smoothMouseY = mousePos.y;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const now = Date.now();
      const delta = now - lastTimeRef.current;
      const dt = Math.min(delta / 1000, 0.032);
      lastTimeRef.current = now;

      // Read live refs — no dependency restarts needed
      const friction = frictionRef.current;
      const currentTheme = themeRef.current;
      const currentScrollVertical = scrollVerticalRef.current;
      const currentScrollSpeedY = scrollSpeedYRef.current;

      if (!friction) {
        if (currentScrollVertical) {
          const pxPerSec = currentScrollSpeedY * 2.5;
          driftRef.current.y += (pxPerSec * delta) / 1000;
        } else {
          driftRef.current.x += (15 * delta) / 1000;
          driftRef.current.y += (10 * delta) / 1000;
        }
      }

      const activeImplosions = implosionsRef.current.filter((imp) => now - imp.time < 300);
      implosionsRef.current = activeImplosions;

      // Light mode: Graphite (#333333) at 10% idle / 28% active — clearly visible, non-distracting
      // Dark mode:  Bone White (#FDFDFB) at 8% idle / 28% active
      const dotColor      = currentTheme === 'light' ? 'rgba(51, 51, 51, 0.10)' : 'rgba(253, 253, 251, 0.08)';
      const activeDotColor = currentTheme === 'light' ? 'rgba(51, 51, 51, 0.28)' : 'rgba(253, 253, 251, 0.28)';
      const tetherColor = '#C5A059'; // Gold status accent

      // Read live mouse position from ref (never causes loop restart)
      const mx = mousePosRef.current.x;
      const my = mousePosRef.current.y;

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

      // ── Parallax Normalization: Viewport Center Anchoring ─────────────────
      // normalizedX = mouseX - window.innerWidth  / 2
      // normalizedY = mouseY - window.innerHeight / 2
      // Both approach 0 when the cursor is at screen center, giving a stable
      // rest position regardless of browser window size.
      const centerX = width / 2;
      const centerY = height / 2;

      // Lazy Drift on mobile/no-mouse: smooth sine oscillation to keep grid alive
      let targetParallaxX = 0;
      let targetParallaxY = 0;

      if (mx === -1000 || (typeof window !== 'undefined' && window.innerWidth < 1024)) {
        // Continuous steady low-speed terminal drift: x += 0.2, y += 0.1 equivalent rate
        const lazyTime = now * 0.0008;
        targetParallaxX = Math.sin(lazyTime) * 12;
        targetParallaxY = Math.cos(lazyTime * 0.8) * 12;
        // Constant, very low speed drift per second (12px/s X, 6px/s Y ≈ 0.2/0.1 per frame at 60fps)
        driftRef.current.x += (12 * delta) / 1000;
        driftRef.current.y += (6 * delta) / 1000;
      } else {
        const normalizedX = mx - centerX;
        const normalizedY = my - centerY;
        targetParallaxX = normalizedX * 0.03;
        targetParallaxY = normalizedY * 0.03;
      }

      // ── Spring-Damped Parallax: Grid has 'mass' and 'inertia' ─────────────
      // Uses a critically-damped spring so the grid trails the cursor
      // smoothly and settles without oscillation.
      const k = 100; // Stiffness — how strongly it pulls toward target
      const c = 20;  // Damping  — how quickly oscillation decays

      const disX = smoothParallaxRef.current.x - targetParallaxX;
      const disY = smoothParallaxRef.current.y - targetParallaxY;

      const fx = -k * disX - c * velRef.current.vx;
      const fy = -k * disY - c * velRef.current.vy;

      velRef.current.vx += fx * dt;
      velRef.current.vy += fy * dt;

      smoothParallaxRef.current.x += velRef.current.vx * dt;
      smoothParallaxRef.current.y += velRef.current.vy * dt;

      const parallaxX = smoothParallaxRef.current.x;
      const parallaxY = smoothParallaxRef.current.y;

      // STEP 1: Scan grid dots & identify top 5 nearest dots within 180px tether radius
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
      // Top 5 nearest dots break away to orbit cursor with spring delay
      const tetheredList = gridDots.slice(0, 5);
      const tetherIndexMap = new Map<string, number>();
      tetheredList.forEach((d, idx) => tetherIndexMap.set(`${d.col},${d.row}`, idx));

      // STEP 2: Render dot grid with Unified Lerp physics & Orbiting Neural Tether
      for (let c = -2; c < cols; c++) {
        for (let r = -2; r < rows; r++) {
          const key = `${c},${r}`;
          const tetherIdx = tetherIndexMap.get(key);
          const isTethered = tetherIdx !== undefined;

          const origX = c * spacing + offsetX + (driftRef.current.x % spacing) + parallaxX;
          const origY = r * spacing + offsetY + (driftRef.current.y % spacing) + parallaxY;

          const dx = origX - smoothMouseX;
          const dy = origY - smoothMouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let targetX = origX;
          let targetY = origY;
          let isClose = false;

          if (isTethered && smoothMouseX !== -1000) {
            // ORBITING NEURAL TETHER MECHANIC: 5 nearest dots break away & orbit cursor with spring delay
            const orbitAngle = (tetherIdx / 5) * Math.PI * 2 + now * 0.0022;
            const orbitRadius = 36 + tetherIdx * 7; // staggered orbital radiuses
            targetX = smoothMouseX + Math.cos(orbitAngle) * orbitRadius;
            targetY = smoothMouseY + Math.sin(orbitAngle) * orbitRadius;
          } else {
            // MAGNETIC REPULSION VOID: Synchronized 180px clearing with sharp perimeter compression
            if (dist < repulsionRadius) {
              isClose = true;
              const factor = (repulsionRadius - dist) / repulsionRadius;
              const easeFactor = Math.pow(factor, 1.8);
              const push = easeFactor * maxRepulsion;

              if (dist > 0) {
                targetX += (dx / dist) * push;
                targetY += (dy / dist) * push;
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

                targetX += (idx / idist) * pull;
                targetY += (idy / idist) * pull;
              }
            });
          }

          // Anti-Snap Physics: Spring delay Lerp for tether dots, standard lerp for grid dots
          let dotState = dotStateMapRef.current.get(key);
          const lerpRate = isTethered ? 0.08 : 0.12; // spring delay on breakaway dots
          if (!dotState) {
            dotState = { currentX: targetX, currentY: targetY };
            dotStateMapRef.current.set(key, dotState);
          } else {
            dotState.currentX += (targetX - dotState.currentX) * lerpRate;
            dotState.currentY += (targetY - dotState.currentY) * lerpRate;
          }

          const drawX = dotState.currentX;
          const drawY = dotState.currentY;

          if (isTethered && smoothMouseX !== -1000) {
            // Draw 0.5px Gold hairline connection vector from cursor to tether dot
            ctx.beginPath();
            ctx.moveTo(smoothMouseX, smoothMouseY);
            ctx.lineTo(drawX, drawY);
            ctx.lineWidth = 0.5;
            ctx.strokeStyle = 'rgba(197, 160, 89, 0.45)'; // 0.5px Gold hairline vector
            ctx.stroke();

            // Render captured orbiting tether dot highlighted in Gold
            ctx.beginPath();
            ctx.arc(drawX, drawY, 2.2, 0, Math.PI * 2);
            ctx.fillStyle = tetherColor;
            ctx.fill();

          } else {
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
        if (word.isFocused) {
          // ── ACTIVE TETHER: 30% opacity gold line pulls toward locked word ──
          // Draws from cursor straight to word center — reinforces spatial lock.
          // No glow-pass: the clean line at 30% reads as precise, not diffuse.
          ctx.beginPath();
          ctx.moveTo(smoothMouseX, smoothMouseY);
          ctx.lineTo(word.x, word.y);
          ctx.lineWidth = 1.0;
          ctx.strokeStyle = 'rgba(197, 160, 89, 0.30)';
          ctx.setLineDash([]);
          ctx.stroke();

          // Small gold anchor dot at the word's exact center
          ctx.beginPath();
          ctx.arc(word.x, word.y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(197, 160, 89, 0.55)';
          ctx.fill();
        } else {
          // ── APPROACH TETHER: faint dashed guide ──────────────────────────
          ctx.beginPath();
          ctx.moveTo(smoothMouseX, smoothMouseY);
          ctx.lineTo(word.x, word.y);
          ctx.lineWidth = 0.6;
          ctx.strokeStyle = currentTheme === 'light' ? 'rgba(0, 0, 0, 0.10)' : 'rgba(253, 253, 251, 0.12)';
          ctx.setLineDash([3, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      // ── SYNERGY PING: 200ms subliminal Gold guide line ─────────────────
      // Fades from 55% → 0% opacity over 200ms. Acts as a peripheral eye
      // guide — not an instruction. The line disappears before the user
      // consciously registers it as an arrow.
      const ping = synergyPingRef.current;
      if (ping) {
        const pingElapsed = now - ping.time;
        const PING_DURATION = 200;
        if (pingElapsed < PING_DURATION) {
          const t = pingElapsed / PING_DURATION; // 0 → 1 over 200ms
          // Linear fade: 0.55 → 0
          const pingOpacity = 0.55 * (1 - t);

          // Guide line: origin → destination
          ctx.beginPath();
          ctx.moveTo(ping.fromX, ping.fromY);
          ctx.lineTo(ping.toX, ping.toY);
          ctx.lineWidth = 1.0;
          ctx.strokeStyle = `rgba(197, 160, 89, ${pingOpacity.toFixed(3)})`;
          ctx.setLineDash([]);
          ctx.stroke();

          // Origin dot — ghost of the completed word position
          ctx.beginPath();
          ctx.arc(ping.fromX, ping.fromY, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(197, 160, 89, ${(pingOpacity * 0.7).toFixed(3)})`;
          ctx.fill();

          // Destination pulse ring — expands 0→6px, fades in then out
          // Early half (t < 0.5): ring grows in; late half: it fades away
          const ringOpacity = t < 0.5
            ? pingOpacity * (t * 2)         // fade-in as ring expands
            : pingOpacity;                   // hold and fade with line
          const ringRadius = 2 + t * 6;     // 2px → 8px over 200ms
          ctx.beginPath();
          ctx.arc(ping.toX, ping.toY, ringRadius, 0, Math.PI * 2);
          ctx.lineWidth = 0.8;
          ctx.strokeStyle = `rgba(197, 160, 89, ${ringOpacity.toFixed(3)})`;
          ctx.stroke();

          // Solid center dot at destination — gives a crisp 'arrival' anchor
          ctx.beginPath();
          ctx.arc(ping.toX, ping.toY, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(197, 160, 89, ${(pingOpacity * 0.9).toFixed(3)})`;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  // Intentionally empty deps: all live data is read via refs inside the loop.
  // Removing mousePos/theme/frictionActive from deps was the parallax fix —
  // they were restarting the loop every frame and resetting spring state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
