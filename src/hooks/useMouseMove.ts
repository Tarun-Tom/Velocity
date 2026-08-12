import { useState, useEffect, useRef } from 'react';

export interface MouseState {
  x: number;
  y: number;
  offsetX: number; // Mouse distance from Viewport Center X
  offsetY: number; // Mouse distance from Viewport Center Y
  smoothX: number;
  smoothY: number;
  smoothOffsetX: number;
  smoothOffsetY: number;
}

export function useMouseMove(): MouseState {
  const [mousePos, setMousePos] = useState<MouseState>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
    offsetX: 0,
    offsetY: 0,
    smoothX: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
    smoothY: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
    smoothOffsetX: 0,
    smoothOffsetY: 0,
  });

  const stateRef = useRef({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
    smoothX: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
    smoothY: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
    vx: 0,
    vy: 0,
    initialized: false,
  });

  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const handleMouseMove = (e: MouseEvent) => {
      stateRef.current.x = e.clientX;
      stateRef.current.y = e.clientY;
      if (!stateRef.current.initialized) {
        stateRef.current.smoothX = e.clientX;
        stateRef.current.smoothY = e.clientY;
        stateRef.current.initialized = true;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Spring animation loop (Stiffness: 120, Damping: 20) for smooth parallax delay
    const updateSpring = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.032);
      lastTime = now;

      const k = 120; // Stiffness: 120
      const c = 20;  // Damping: 20

      const targetX = stateRef.current.x;
      const targetY = stateRef.current.y;

      const disX = stateRef.current.smoothX - targetX;
      const disY = stateRef.current.smoothY - targetY;

      const fx = -k * disX - c * stateRef.current.vx;
      const fy = -k * disY - c * stateRef.current.vy;

      stateRef.current.vx += fx * dt;
      stateRef.current.vy += fy * dt;

      stateRef.current.smoothX += stateRef.current.vx * dt;
      stateRef.current.smoothY += stateRef.current.vy * dt;

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      const currentX = stateRef.current.x;
      const currentY = stateRef.current.y;
      const smoothX = stateRef.current.smoothX;
      const smoothY = stateRef.current.smoothY;

      setMousePos({
        x: currentX,
        y: currentY,
        offsetX: currentX - centerX,
        offsetY: currentY - centerY,
        smoothX,
        smoothY,
        smoothOffsetX: smoothX - centerX,
        smoothOffsetY: smoothY - centerY,
      });

      animId = requestAnimationFrame(updateSpring);
    };

    animId = requestAnimationFrame(updateSpring);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return mousePos;
}
