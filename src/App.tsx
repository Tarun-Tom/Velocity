import { useState, useEffect, useCallback, useRef } from 'react';
import { BackgroundGrid } from './components/BackgroundGrid';
import { WordNode } from './components/WordNode';
import { VelocityButton } from './components/VelocityButton';
import { VariableTitle } from './components/VariableTitle';
import { BentoHub, type GameMode } from './components/BentoHub';
import { SessionArchive } from './components/SessionArchive';
import { CinematicAtmosphere } from './components/CinematicAtmosphere';
import { audioController } from './utils/audio';
import { Volume2, VolumeX, Moon, Sun, RotateCcw } from 'lucide-react';
import { useMouseMove } from './hooks/useMouseMove';
import './App.css';

interface WordItem {
  id: string;
  word: string;
  x: number;
  y: number;
  typedLength: number;
  completed: boolean;
  scale: number;
  spawnTime: number;
}

interface LeaderboardEntry {
  mode: GameMode;
  score: number;
  wpm: number;
  accuracy: number;
  date: string;
}

const WORD_POOL = [
  'Minimalism', 'Brutalism', 'Kerning', 'Kinetic', 'Velocity', 'Interface', 'Bauhaus', 
  'Bezier', 'Opacity', 'Saturation', 'Monochrome', 'Grid', 'Layout', 'Prototype', 
  'Wireframe', 'Gradient', 'Skeuomorphism', 'Neumorphism', 'Contrast', 'Hierarchy', 
  'Alignment', 'Padding', 'Margin', 'Flexbox', 'Raster', 'Vector', 'Resolution', 
  'Typography', 'Ascender', 'Descender', 'Ligature', 'Sans-serif', 'Slab-serif', 
  'Geometric', 'Humanist', 'Navigation', 'Experience', 'Interaction', 'Responsive', 
  'Framework', 'Component', 'Variable', 'Animation', 'Transition', 'Easing', 
  'Parallax', 'Depth', 'Spatial', 'Haptic', 'Feedback',
  'Anti-aliasing', 'Baseline', 'Cap-height', 'X-height', 'Aperture', 'Apex', 'Bowl', 
  'Counter', 'Stem', 'Terminal', 'Crossbar', 'Cross-stroke', 'Arm', 'Leg', 'Shoulder', 
  'Ear', 'Link', 'Crotch', 'Swash', 'Italic', 'Roman', 'Bold', 'Small-caps', 'Diacritic', 
  'Widow', 'Orphan', 'Typographic', 'Condensed', 'Monospaced', 'Bracket', 'Copyfitting', 
  'Leading', 'Tracking', 'Glyph', 'Serif', 'Asymmetry', 'Modernism', 'Aesthetic',
  'Wireframing', 'Interactivity', 'Usability', 'Accessibility', 'Mockup', 
  'Moodboard', 'Brandmark', 'Logotype', 'Concept', 'Visual', 'Symmetry', 'Proximity',
  'Scale', 'Emphasis', 'Unity', 'Movement', 'Pattern', 'Rhythm', 'Balance', 'Harmony',
  'Bleed', 'Colorway', 'Palette', 'Dithering', 'Halftone', 'Pica', 'Folio', 'Gutter',
  'Auto-layout', 'Subgrid', 'Custom-properties', 'Keyframes', 'SVG', 'WebGL', 'Rasterization'
];

// ── Synergy constants ──────────────────────────────────────────────────────────
// SynergyWindow = BASE_SYNERGY_MS + (distance / VELOCITY_CONSTANT)
// A word 600px away gives ~1100ms window; a word 60px away gives ~600ms.
const BASE_SYNERGY_MS   = 500;
const VELOCITY_CONSTANT = 1.1;  // px/ms — calibrated to a comfortable cursor speed

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [muted, setMuted] = useState(false);

  // Consolidated mouse listener hook (origin: Viewport Center, Stiffness: 100, Damping: 20)
  const mouseState = useMouseMove();
  const mousePos = { x: mouseState.x, y: mouseState.y };
  
  // Game Mode State
  const [gameMode, setGameMode] = useState<GameMode>('Chrono');
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [scores, setScores] = useState<Record<string, number>>({
    Chrono: 0,
    Overdrive: 0
  });

  // Gameplay State
  const [words, setWords] = useState<WordItem[]>([]);
  const [focusedWordId, setFocusedWordId] = useState<string | null>(null);
  
  // Grid Implosion State
  const [implosion, setImplosion] = useState<{ x: number; y: number; time: number } | null>(null);

  // Synergy & Flow Scoring State
  const [lastCompletionTime, setLastCompletionTime] = useState<number | null>(null);
  const [flowStreak, setFlowStreak] = useState(0);
  const [synergyPoints, setSynergyPoints] = useState(0);
  const [showSynergyFlash, setShowSynergyFlash] = useState(false);

  // ── Distance-Aware Synergy Window ─────────────────────────────────────────
  // Holds the computed window duration for the current inter-word transit.
  // Updated on every word completion — read in the key handler without re-binding.
  const synergyWindowRef = useRef<number>(BASE_SYNERGY_MS);

  // Position of the last completed word — used to compute distance to the next
  // word the user begins typing, which sets the synergy window size.
  const lastWordPosRef = useRef<{ x: number; y: number } | null>(null);

  // Spatial buffer flag: mouse already inside next word's radius when current
  // word is completed → automatic Perfect Synergy on the next word acquired.
  const spatialBufferRef = useRef<boolean>(false);

  // ── Momentum Bar ──────────────────────────────────────────────────────────
  // Filled (100%) when a synergy streak is active, drains to 0 when window expires.
  // Written to a DOM element via direct style mutation to avoid React re-renders.
  const momentumBarRef = useRef<HTMLDivElement>(null);
  const momentumAnimRef = useRef<number | null>(null);

  // ── Synergy Ping (Neural Tether guide pulse) ──────────────────────────────
  // When a word is completed, we briefly broadcast the completed word's position
  // + the nearest next candidate to BackgroundGrid for a 200ms Gold guide line.
  const [synergyPing, setSynergyPing] = useState<{
    fromX: number; fromY: number;
    toX: number;   toY: number;
    time: number;
  } | null>(null);

  // Perfect Synergy flag — true when spatial buffer bonus was granted this acquisition
  const [isPerfectSynergy, setIsPerfectSynergy] = useState(false);

  // Friction State
  const [frictionActive, setFrictionActive] = useState(false);

  // Stats State
  const [correctKeys, setCorrectKeys] = useState(0);
  const [incorrectKeys, setIncorrectKeys] = useState(0);
  const [completedWordsCount, setCompletedWordsCount] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentWpm, setCurrentWpm] = useState(0);
  const [peakWpm, setPeakWpm] = useState(0);

  // Mouse trail history tracking for [ SESSION_ARCHIVE ] visual signature
  const mousePathRef = useRef<{ x: number; y: number }[]>([]);

  // Moving Average tracking for Ghost WPM (2-second window)
  const keystrokesTimeline = useRef<{ timestamp: number; keys: number }[]>([]);

  // Timeouts Refs
  const frictionTimeoutRef = useRef<any>(null);
  const synergyFlashTimeoutRef = useRef<any>(null);
  // Momentum decay — separated into timeout (grace period) and interval (drip decrement)
  // so we can cancel each independently without the clearInterval-on-setTimeout bug.
  const momentumDecayTimeoutRef = useRef<any>(null);
  const momentumDecayRef = useRef<any>(null);

  // Keep references to avoid re-binding keyboard listeners
  const stateRef = useRef({
    words,
    focusedWordId,
    mousePos,
    correctKeys,
    incorrectKeys,
    completedWordsCount,
    startTime,
    muted,
    lastCompletionTime,
    flowStreak,
    synergyPoints,
    gameMode,
    isPlaying,
    isGameOver,
    timeLeft,
    currentWpm
  });

  useEffect(() => {
    stateRef.current = {
      words,
      focusedWordId,
      mousePos,
      correctKeys,
      incorrectKeys,
      completedWordsCount,
      startTime,
      muted,
      lastCompletionTime,
      flowStreak,
      synergyPoints,
      gameMode,
      isPlaying,
      isGameOver,
      timeLeft,
      currentWpm
    };
  }, [words, focusedWordId, mousePos, correctKeys, incorrectKeys, completedWordsCount, startTime, muted, lastCompletionTime, flowStreak, synergyPoints, gameMode, isPlaying, isGameOver, timeLeft, currentWpm]);

  // Load High Scores from LocalStorage on mount
  useEffect(() => {
    const savedScores = localStorage.getItem('velocity_high_scores');
    if (savedScores) {
      try {
        const parsed = JSON.parse(savedScores);
        setScores({
          Chrono: parsed.Chrono || 0,
          Overdrive: parsed.Overdrive || 0
        });
      } catch (e) {
        console.error('Error loading scores:', e);
      }
    }
  }, []);

  // Set theme class on body
  useEffect(() => {
    document.body.className = `${theme}-theme`;
  }, [theme]);

  // Record mouse trajectory signature when game is active
  useEffect(() => {
    if (isPlaying) {
      mousePathRef.current.push({ x: mouseState.x, y: mouseState.y });
    }
  }, [mouseState.x, mouseState.y, isPlaying]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (frictionTimeoutRef.current) clearTimeout(frictionTimeoutRef.current);
      if (synergyFlashTimeoutRef.current) clearTimeout(synergyFlashTimeoutRef.current);
      if (momentumDecayTimeoutRef.current) clearTimeout(momentumDecayTimeoutRef.current);
      if (momentumDecayRef.current) clearInterval(momentumDecayRef.current);
      if (momentumAnimRef.current) cancelAnimationFrame(momentumAnimRef.current);
    };
  }, []);

  // ── Momentum Bar RAF animator ──────────────────────────────────────────────
  // Runs once after each synergy event, draining the bar over the window duration.
  // Written directly to the DOM node — zero React overhead per frame.
  const animateMomentumBar = useCallback((windowMs: number) => {
    if (momentumAnimRef.current) cancelAnimationFrame(momentumAnimRef.current);
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 1 - elapsed / windowMs);
      if (momentumBarRef.current) {
        momentumBarRef.current.style.width = `${pct * 100}%`;
        momentumBarRef.current.style.opacity = pct > 0.05 ? '1' : '0';
      }
      if (pct > 0) {
        momentumAnimRef.current = requestAnimationFrame(tick);
      } else {
        momentumAnimRef.current = null;
      }
    };
    momentumAnimRef.current = requestAnimationFrame(tick);
  }, []);

  // Game Loop for Timer
  useEffect(() => {
    if (!isPlaying || isGameOver) return;
    
    const interval = setInterval(() => {
      if (gameMode === 'Chrono' || gameMode === 'Overdrive') {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            triggerGameOver();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, isGameOver, gameMode]);

  const triggerGameOver = () => {
    setIsGameOver(true);
    setIsPlaying(false);
    setFocusedWordId(null);
    // Kill any running momentum decay (both the grace-period timeout and the drip interval)
    if (momentumDecayTimeoutRef.current) clearTimeout(momentumDecayTimeoutRef.current);
    if (momentumDecayRef.current) clearInterval(momentumDecayRef.current);
    if (momentumAnimRef.current) cancelAnimationFrame(momentumAnimRef.current);
    if (momentumBarRef.current) momentumBarRef.current.style.width = '0%';
  };

  // Proximity checker helper (synchronized 180px radius)
  const isWithinRadius = useCallback((x1: number, y1: number, x2: number, y2: number, r = 180) => {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return dx * dx + dy * dy <= r * r;
  }, []);

  // Get quadrant other than cursor
  const getQuadrant = useCallback((x: number, y: number) => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    if (x >= centerX) {
      return y < centerY ? 1 : 4;
    } else {
      return y < centerY ? 2 : 3;
    }
  }, []);

  // Safe Spawning location helper
  const getPositionInQuadrant = useCallback((quad: number) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const paddingX = w * 0.14;
    const paddingY = h * 0.18;
    const centerX = w / 2;
    const centerY = h / 2;
    
    let minX = paddingX;
    let maxX = centerX - paddingX;
    let minY = paddingY;
    let maxY = centerY - paddingY;
    
    if (quad === 1) { // Top Right
      minX = centerX + paddingX;
      maxX = w - paddingX;
    } else if (quad === 2) { // Top Left
      // defaults
    } else if (quad === 3) { // Bottom Left
      minY = centerY + paddingY;
      maxY = h - paddingY;
    } else if (quad === 4) { // Bottom Right
      minX = centerX + paddingX;
      maxX = w - paddingX;
      minY = centerY + paddingY;
      maxY = h - paddingY;
    }
    
    return {
      x: minX + Math.random() * (maxX - minX),
      y: minY + Math.random() * (maxY - minY),
    };
  }, []);

  const isTooClose = useCallback((newX: number, newY: number, existingWords: WordItem[]) => {
    return existingWords.some(w => {
      const dx = w.x - newX;
      const dy = w.y - newY;
      return dx * dx + dy * dy < 250 * 250;
    });
  }, []);

  const spawnWord = useCallback((existingWords: WordItem[], forceQuadrant?: number): WordItem => {
    let randomWord = WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)];
    let attempts = 0;
    
    while (existingWords.some(w => w.word.toLowerCase() === randomWord.toLowerCase()) && attempts < 15) {
      randomWord = WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)];
      attempts++;
    }

    let pos = { x: 0, y: 0 };
    let tooCloseCheck = true;
    let spawnAttempts = 0;

    const isCornerOverlap = (x: number, y: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (x < 420 && y < 200) return true;
      if (x > w - 300 && y < 200) return true;
      if (x < 400 && y > h - 220) return true;
      if (x > w - 360 && y > h - 240) return true;
      return false;
    };

    while (tooCloseCheck && spawnAttempts < 40) {
      if (forceQuadrant !== undefined) {
        pos = getPositionInQuadrant(forceQuadrant);
      } else {
        const randQuad = Math.floor(Math.random() * 4) + 1;
        pos = getPositionInQuadrant(randQuad);
      }

      tooCloseCheck = isTooClose(pos.x, pos.y, existingWords) || isCornerOverlap(pos.x, pos.y);
      spawnAttempts++;
    }

    // Stable ID: epoch-ms prefix ensures uniqueness across sessions;
    // the word text is embedded so the key never changes for the same word
    // during a mono→serif transition (the WordNode key is the word's id from App state).
    return {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      word: randomWord,
      x: pos.x,
      y: pos.y,
      typedLength: 0,
      completed: false,
      scale: 0.95,
      spawnTime: Date.now()
    };
  }, [getPositionInQuadrant, isTooClose]);

  // Initialize game session
  const initializeGame = () => {
    let initialList: WordItem[] = [];
    stateRef.current.gameMode = gameMode;
    mousePathRef.current = []; // Clear recorded mouse trajectory for new signature

    const spawnCount = gameMode === 'Zen' ? 3 : 5;

    for (let i = 0; i < spawnCount; i++) {
      const quad = (i % 4) + 1;
      initialList.push(spawnWord(initialList, quad));
    }

    setWords(initialList);
    setFocusedWordId(null);
    setCorrectKeys(0);
    setIncorrectKeys(0);
    setCompletedWordsCount(0);
    setStartTime(Date.now());
    setCurrentWpm(0);
    setPeakWpm(0);
    setLastCompletionTime(null);
    setFlowStreak(0);
    setSynergyPoints(0);
    setShowSynergyFlash(false);
    setIsPerfectSynergy(false);
    setFrictionActive(false);
    setImplosion(null);
    setSynergyPing(null);
    setShowLeaderboard(false);
    keystrokesTimeline.current = [];
    synergyWindowRef.current = BASE_SYNERGY_MS;
    lastWordPosRef.current = null;
    spatialBufferRef.current = false;

    if (momentumDecayTimeoutRef.current) clearTimeout(momentumDecayTimeoutRef.current);
    if (momentumDecayRef.current) clearInterval(momentumDecayRef.current);
    if (momentumAnimRef.current) cancelAnimationFrame(momentumAnimRef.current);
    if (momentumBarRef.current) momentumBarRef.current.style.width = '0%';

    if (gameMode === 'Chrono') {
      setTimeLeft(60);
    } else if (gameMode === 'Overdrive') {
      setTimeLeft(15);
    } else {
      setTimeLeft(9999);
    }

    setIsGameOver(false);
    setIsPlaying(true);
  };

  // Keyboard controller
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const current = stateRef.current;
      if (!current.isPlaying || current.isGameOver) return;
      if (e.key === 'Escape') {
        setFocusedWordId(null);
        return;
      }

      if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) return;
      
      const char = e.key.toLowerCase();
      keystrokesTimeline.current.push({ timestamp: Date.now(), keys: 1 });

      if (current.focusedWordId) {
        const targetWord = current.words.find(w => w.id === current.focusedWordId);
        if (targetWord) {
          const expectedChar = targetWord.word[targetWord.typedLength].toLowerCase();
          
          if (char === expectedChar) {
            const nextLength = targetWord.typedLength + 1;
            if (!current.muted) audioController.playClick();
            setCorrectKeys(prev => prev + 1);

            if (nextLength === targetWord.word.length) {
              // ── Word completed ───────────────────────────────────────────
              if (!current.muted) audioController.playThud();
              setCompletedWordsCount(prev => prev + 1);

              const completedAt = Date.now();
              setLastCompletionTime(completedAt);
              setImplosion({ x: targetWord.x, y: targetWord.y, time: completedAt });
              
              if (current.gameMode === 'Overdrive') {
                setTimeLeft(prev => prev + 3);
              }

              const updatedWords = current.words.filter(w => w.id !== current.focusedWordId);

              // ── Spatial buffer check ──────────────────────────────────────
              // If the cursor is already inside the radius of another word at
              // completion time, flag for automatic Perfect Synergy on acquisition.
              const preBufferedWord = updatedWords.find(w =>
                isWithinRadius(w.x, w.y, current.mousePos.x, current.mousePos.y)
              );
              spatialBufferRef.current = !!preBufferedWord;

              // ── Distance-Aware Synergy Window ─────────────────────────────
              // Compute the distance between the just-completed word and the
              // nearest remaining word. The window scales with that distance so
              // long transits get proportionally more time.
              const nearestWord = updatedWords.reduce<WordItem | null>((best, w) => {
                const dx = w.x - targetWord.x;
                const dy = w.y - targetWord.y;
                const d  = Math.sqrt(dx * dx + dy * dy);
                if (!best) return w;
                const bx = best.x - targetWord.x;
                const by = best.y - targetWord.y;
                return d < Math.sqrt(bx * bx + by * by) ? w : best;
              }, null);

              const transitDist = nearestWord
                ? Math.sqrt(
                    (nearestWord.x - targetWord.x) ** 2 +
                    (nearestWord.y - targetWord.y) ** 2
                  )
                : 0;

              // SynergyWindow = BaseTime + (distance / VelocityConstant)
              const newWindow = BASE_SYNERGY_MS + transitDist / VELOCITY_CONSTANT;
              synergyWindowRef.current = newWindow;

              // Store completed word position for next acquisition distance check
              lastWordPosRef.current = { x: targetWord.x, y: targetWord.y };

              // ── Neural Tether ping (200ms Gold guide line) ──────────────
              if (nearestWord) {
                setSynergyPing({
                  fromX: targetWord.x,
                  fromY: targetWord.y,
                  toX: nearestWord.x,
                  toY: nearestWord.y,
                  time: completedAt,
                });
              }

              // ── Momentum decay: grace period ─────────────────────────────
              // After the window expires, reduce streak by 1 every 500ms
              // instead of zeroing it instantly.
              if (momentumDecayRef.current) clearInterval(momentumDecayRef.current);
              momentumDecayRef.current = setTimeout(() => {
                momentumDecayRef.current = setInterval(() => {
                  setFlowStreak(prev => {
                    if (prev <= 0) {
                      clearInterval(momentumDecayRef.current);
                      return 0;
                    }
                    return prev - 1;
                  });
                }, 500);
              }, newWindow);

              // Start the Momentum Bar animation draining over the window
              animateMomentumBar(newWindow);

              const mouseQuad = getQuadrant(current.mousePos.x, current.mousePos.y);
              const availableQuads = [1, 2, 3, 4].filter(q => q !== mouseQuad);
              const targetQuad = availableQuads[Math.floor(Math.random() * availableQuads.length)];
              const nextWord = spawnWord(updatedWords, targetQuad);

              setWords([...updatedWords, nextWord]);
              setFocusedWordId(null);
            } else {
              setWords(prev =>
                prev.map(w => (w.id === current.focusedWordId ? { ...w, typedLength: nextLength } : w))
              );
            }
            return;
          } else {
            // Incorrect char while focused: friction flash only — streak decays naturally
            setIncorrectKeys(prev => prev + 1);
            setFrictionActive(true);
            if (frictionTimeoutRef.current) clearTimeout(frictionTimeoutRef.current);
            frictionTimeoutRef.current = setTimeout(() => {
              setFrictionActive(false);
            }, 200);
            return;
          }
        }
      }

      const typableWords = current.words.filter(w =>
        isWithinRadius(w.x, w.y, current.mousePos.x, current.mousePos.y)
      );

      const matchingWord = typableWords.find(w => w.word[0].toLowerCase() === char);
      
      if (matchingWord) {
        if (!current.muted) audioController.playClick();
        setFocusedWordId(matchingWord.id);
        setCorrectKeys(prev => prev + 1);

        // ── Synergy acquisition check ─────────────────────────────────────
        // Window is now distance-aware (computed at previous completion).
        // Spatial buffer: if flagged, grant Perfect Synergy regardless of elapsed time.
        // Capture wasPerfect BEFORE consuming the flag so it reads the real value.
        const wasPerfect = spatialBufferRef.current;
        const elapsedSinceLastCompletion = current.lastCompletionTime
          ? Date.now() - current.lastCompletionTime
          : Infinity;
        const withinWindow = elapsedSinceLastCompletion < synergyWindowRef.current;
        const isSynergy = withinWindow || wasPerfect;
        spatialBufferRef.current = false; // consume the buffer flag

        if (isSynergy) {
          // Kill momentum decay since the streak is continuing
          if (momentumDecayTimeoutRef.current) clearTimeout(momentumDecayTimeoutRef.current);
          if (momentumDecayRef.current) clearInterval(momentumDecayRef.current);

          setFlowStreak(prev => prev + 1);
          setSynergyPoints(prev => prev + 1);
          setIsPerfectSynergy(wasPerfect);
          setShowSynergyFlash(true);
          
          if (current.gameMode === 'Overdrive') {
            setTimeLeft(prev => prev + 5);
          }

          if (synergyFlashTimeoutRef.current) clearTimeout(synergyFlashTimeoutRef.current);
          synergyFlashTimeoutRef.current = setTimeout(() => {
            setShowSynergyFlash(false);
            setIsPerfectSynergy(false);
          }, 900);
        }
        // No else-branch: decay handles gradual streak reduction; only a miss (below) zeros it.

        setWords(prev =>
          prev.map(w => (w.id === matchingWord.id ? { ...w, typedLength: 1 } : w))
        );
      } else {
        // Miss while unfocused: zero streak immediately and cancel all decay timers
        setIncorrectKeys(prev => prev + 1);
        setFlowStreak(0);
        if (momentumDecayTimeoutRef.current) clearTimeout(momentumDecayTimeoutRef.current);
        if (momentumDecayRef.current) clearInterval(momentumDecayRef.current);
        if (momentumBarRef.current) momentumBarRef.current.style.width = '0%';
        setFrictionActive(true);
        if (frictionTimeoutRef.current) clearTimeout(frictionTimeoutRef.current);
        frictionTimeoutRef.current = setTimeout(() => {
          setFrictionActive(false);
        }, 200);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, spawnWord, isWithinRadius, getQuadrant, animateMomentumBar]);

  useEffect(() => {
    if (!focusedWordId || !isPlaying) return;
    const active = words.find(w => w.id === focusedWordId);
    // Release focus only if cursor leaves the 180px radius around the RAW home position.
    // The parallax offset is visual-only and must NOT affect the lock radius.
    if (active) {
      const stillTypable = isWithinRadius(active.x, active.y, mousePos.x, mousePos.y, 180);
      if (!stillTypable) {
        setFocusedWordId(null);
      }
    }
  }, [mousePos, focusedWordId, words, isWithinRadius, isPlaying]);

  // Moving Average WPM Calculator
  useEffect(() => {
    if (!startTime || !isPlaying) return;

    const updateWpm = () => {
      const now = Date.now();
      const twoSecondsAgo = now - 2000;

      keystrokesTimeline.current = keystrokesTimeline.current.filter(item => item.timestamp >= twoSecondsAgo);
      const strokeCount = keystrokesTimeline.current.reduce((acc, item) => acc + item.keys, 0);

      const wpmAverage = Math.round((strokeCount / 5) * 30);
      setCurrentWpm(wpmAverage);

      if (wpmAverage > peakWpm) {
        setPeakWpm(wpmAverage);
      }
    };

    const interval = setInterval(updateWpm, 100);
    return () => clearInterval(interval);
  }, [startTime, isPlaying, peakWpm]);

  const totalKeys = correctKeys + incorrectKeys;
  const accuracy = totalKeys > 0 ? Math.round((correctKeys / totalKeys) * 100) : 100;

  const rawScore = (correctKeys * 10) + (synergyPoints * 100);
  const accMultiplier = accuracy === 100 ? 1.0 : (accuracy < 95 ? 0.8 : 1.0);
  const score = Math.round(rawScore * accMultiplier);

  // High Scores & Leaderboard tracking
  useEffect(() => {
    if (isGameOver && gameMode !== 'Zen') {
      const currentHigh = scores[gameMode] || 0;
      
      let newScores = { ...scores };
      if (score > currentHigh) {
        newScores = { ...scores, [gameMode]: score };
        setScores(newScores);
        localStorage.setItem('velocity_high_scores', JSON.stringify(newScores));
      }

      const savedLeaderboards = localStorage.getItem('velocity_leaderboards');
      let leaderboardList: LeaderboardEntry[] = [];
      if (savedLeaderboards) {
        try {
          leaderboardList = JSON.parse(savedLeaderboards);
        } catch (e) {
          console.error(e);
        }
      }

      const entry: LeaderboardEntry = {
        mode: gameMode,
        score: score,
        wpm: currentWpm,
        accuracy: accuracy,
        date: new Date().toLocaleDateString()
      };

      leaderboardList.push(entry);
      leaderboardList.sort((a, b) => b.score - a.score);
      leaderboardList = leaderboardList.slice(0, 10);
      localStorage.setItem('velocity_leaderboards', JSON.stringify(leaderboardList));
    }
  }, [isGameOver, score, gameMode, scores, currentWpm, accuracy]);

  const getLeaderboardData = (): LeaderboardEntry[] => {
    const savedLeaderboards = localStorage.getItem('velocity_leaderboards');
    if (savedLeaderboards) {
      try {
        return JSON.parse(savedLeaderboards);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  };

  // Parallax layers
  const windowCenterX = window.innerWidth / 2;
  const windowCenterY = window.innerHeight / 2;
  const mouseDeltaX = mousePos.x === -1000 ? 0 : mousePos.x - windowCenterX;
  const mouseDeltaY = mousePos.y === -1000 ? 0 : mousePos.y - windowCenterY;

  const fgParallaxX = mouseDeltaX * 0.05;
  const fgParallaxY = mouseDeltaY * 0.05;

  const bgParallaxX = mouseDeltaX * 0.01;
  const bgParallaxY = mouseDeltaY * 0.01;

  return (
    <>
      <div className="game-container">
        {/* Architectural Viewfinder Corner Brackets */}
        <div className="corner-bracket top-left"></div>
        <div className="corner-bracket top-right"></div>
        <div className="corner-bracket bottom-left"></div>
        <div className="corner-bracket bottom-right"></div>

        {/* Cinematic Atmosphere (3% film grain overlay & digital fog noise texture) */}
        <CinematicAtmosphere theme={theme} />

        {/* Neural Tether Canvas Background */}
        <BackgroundGrid
          theme={theme}
          words={words.map(w => ({
            x: w.x + fgParallaxX,
            y: w.y + fgParallaxY,
            isTypable: isWithinRadius(w.x, w.y, mousePos.x, mousePos.y),
            isFocused: w.id === focusedWordId,
          }))}
          implosion={implosion}
          frictionActive={frictionActive}
          mousePos={mousePos}
          synergyPing={synergyPing}
        />

        {/* Interactive Word Nodes Space */}
        <div className="interactive-area">
          {isPlaying &&
            words.map(w => (
              <WordNode
                key={w.id}
                word={w.word}
                x={w.x}
                y={w.y}
                typedLength={w.typedLength}
                isTypable={isWithinRadius(w.x, w.y, mousePos.x, mousePos.y)}
                isFocused={w.id === focusedWordId}
                theme={theme}
                mousePos={mousePos}
                parallaxX={fgParallaxX}
                parallaxY={fgParallaxY}
              />
            ))}
        </div>

        {/* ACTIVE GAME PLAY HUD */}
        {isPlaying && (
          <div className="active-hud-overlay">
            {/* Top-Left: Proximity Variable Title */}
            <div className="hud-logo-container">
              <VariableTitle mousePos={mousePos} onClick={triggerGameOver} />
            </div>

            {/* Top-Right: Game controls */}
            <div className="hud-controls">
              <VelocityButton
                onClick={() => setMuted(!muted)}
                ariaLabel={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </VelocityButton>
              <VelocityButton
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                ariaLabel="Toggle theme"
              >
                {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              </VelocityButton>
              <VelocityButton
                onClick={initializeGame}
                ariaLabel="Reset Game"
              >
                <RotateCcw size={14} />
              </VelocityButton>
              <VelocityButton
                onClick={triggerGameOver}
                ariaLabel="Quit Game"
              >
                [ QUIT ]
              </VelocityButton>
            </div>

            {/* Bottom-Left: Telemetry HUD stats */}
            <div className="accuracy-stats-panel">
              <div className="stat-row">
                <span className="stat-label">MODE:</span>
                <span className="stat-value">{gameMode.toUpperCase()}</span>
              </div>
              {(gameMode === 'Chrono' || gameMode === 'Overdrive') && (
                <div className="stat-row">
                  <span className="stat-label">TIME:</span>
                  <span className="stat-value">{timeLeft}S</span>
                </div>
              )}
              {gameMode !== 'Zen' && (
                <div className="stat-row">
                  <span className="stat-label">SCORE:</span>
                  <span className="stat-value">{score}</span>
                </div>
              )}
              <div className="stat-row">
                <span className="stat-label">WPM:</span>
                <span className="stat-value">{currentWpm}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">ACC:</span>
                <span className="stat-value">{accuracy}%</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">WORDS:</span>
                <span className="stat-value">{completedWordsCount}</span>
              </div>
              {flowStreak > 0 && gameMode !== 'Zen' && (
                <div className="stat-row">
                  <span className="stat-label">FLOW:</span>
                  <span className="stat-value">x{flowStreak + 1}</span>
                </div>
              )}
            </div>

            {/* Bottom-Right / Background: Ghost WPM + Momentum Bar */}
            <div 
              className="massive-wpm-container" 
              style={{ 
                transform: `translate(${bgParallaxX}px, ${bgParallaxY}px)`
              }}
            >
              {currentWpm > 0 ? currentWpm : '00'}
            </div>

            {/*
             * Momentum Bar — 1px Gold horizontal strip that drains over the
             * synergy window duration. Positioned directly beneath the Ghost WPM.
             * Width is mutated directly via ref to avoid re-renders.
             */}
            <div
              className="momentum-bar-track"
              style={{ transform: `translate(${bgParallaxX}px, ${bgParallaxY}px)` }}
            >
              <div ref={momentumBarRef} className="momentum-bar-fill" />
            </div>

            <div 
              className={`ghost-synergy-flash ${showSynergyFlash ? 'active' : ''} ${isPerfectSynergy ? 'perfect' : ''}`} 
              style={{ 
                transform: `translate(${bgParallaxX}px, ${bgParallaxY}px)`
              }}
            >
              {isPerfectSynergy ? 'PERFECT' : `${synergyPoints} SYNERGY`}
            </div>
          </div>
        )}

        {/* 1. ASYMMETRIC BENTO HUB (START / HUB SCREEN OVERLAY) */}
        {!isPlaying && !isGameOver && (
          <BentoHub
            theme={theme}
            setTheme={setTheme}
            muted={muted}
            setMuted={setMuted}
            showLeaderboard={showLeaderboard}
            setShowLeaderboard={setShowLeaderboard}
            gameMode={gameMode}
            setGameMode={setGameMode}
            scores={scores}
            getLeaderboardData={getLeaderboardData}
            mousePos={mousePos}
            onBeginSession={initializeGame}
          />
        )}

        {/* 4. THE SESSION ARCHIVE (SCORE SCREEN UPON GAME COMPLETION) */}
        {isGameOver && (
          <SessionArchive
            score={score}
            wpm={currentWpm}
            peakWpm={peakWpm}
            accuracy={accuracy}
            correctKeys={correctKeys}
            incorrectKeys={incorrectKeys}
            flowStreak={flowStreak}
            synergyPoints={synergyPoints}
            gameMode={gameMode}
            mousePath={mousePathRef.current}
            onRecalibrate={initializeGame}
            onReturnToNucleus={() => {
              // Full state reset — return to clean hub screen
              setIsGameOver(false);
              setIsPlaying(false);
              setWords([]);
              setFocusedWordId(null);
              setCorrectKeys(0);
              setIncorrectKeys(0);
              setCompletedWordsCount(0);
              setStartTime(null);
              setCurrentWpm(0);
              setPeakWpm(0);
              setLastCompletionTime(null);
              setFlowStreak(0);
              setSynergyPoints(0);
              setShowSynergyFlash(false);
              setIsPerfectSynergy(false);
              setFrictionActive(false);
              setImplosion(null);
              setSynergyPing(null);
              setShowLeaderboard(false);
              if (momentumDecayTimeoutRef.current) clearTimeout(momentumDecayTimeoutRef.current);
              if (momentumDecayRef.current) clearInterval(momentumDecayRef.current);
              if (momentumAnimRef.current) cancelAnimationFrame(momentumAnimRef.current);
              if (momentumBarRef.current) momentumBarRef.current.style.width = '0%';
              keystrokesTimeline.current = [];
              mousePathRef.current = [];
            }}
            theme={theme}
          />
        )}
      </div>
    </>
  );
}

export default App;
