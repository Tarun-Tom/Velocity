import { useState, useEffect, useCallback, useRef } from 'react';
import { BackgroundGrid } from './components/BackgroundGrid';
import { WordNode } from './components/WordNode';
import { VelocityButton } from './components/VelocityButton';
import { audioController } from './utils/audio';
import { Volume2, VolumeX, Moon, Sun, RotateCcw, BarChart2 } from 'lucide-react';
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

type GameMode = 'Chrono' | 'Overdrive' | 'Zen';

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
  'Mockup', 'Logomark', 'Styleguide', 'Moodboard', 'Ideation', 'Persona', 'Storyboard',
  'Wireframe', 'High-fidelity', 'Low-fidelity', 'Onboarding', 'Affordance', 'Usability',
  'Accessibility', 'Friction', 'Signifier', 'Feedback-loop', 'Cognitive-load', 'Fitts-law',
  'Gestalt', 'Golden-ratio', 'Rule-of-thirds', 'Grid-system', 'Modular-scale', 'Baseline-grid',
  'Column-width', 'Auto-layout', 'Responsive-grid', 'Fluid-layout', 'Media-queries', 'Breakpoint',
  'Flex-direction', 'Justify-content', 'Align-items', 'Grid-template', 'Grid-gap', 'Subgrid',
  'Nesting', 'Inheritance', 'Specificity', 'Cascading', 'Custom-properties', 'CSS-variables',
  'Transitions', 'Keyframes', 'SVG', 'Canvas', 'WebGL', 'Lottie', 'Rasterization',
  'Bilinear-filtering', 'Trilinear-filtering', 'Mipmapping', 'Vector-graphics', 'Bezier-curve',
  'Control-points', 'Anchor-point', 'Pathfinder', 'Boolean-operations', 'Masking', 'Clipping-path'
];

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [muted, setMuted] = useState(false);
  
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
  
  // Friction State
  const [frictionActive, setFrictionActive] = useState(false);

  // Stats State
  const [correctKeys, setCorrectKeys] = useState(0);
  const [incorrectKeys, setIncorrectKeys] = useState(0);
  const [completedWordsCount, setCompletedWordsCount] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentWpm, setCurrentWpm] = useState(0);

  // Moving Average tracking for Ghost WPM (2-second window)
  const keystrokesTimeline = useRef<{ timestamp: number; keys: number }[]>([]);

  // Mouse coordinate state
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  // Timeouts Refs
  const frictionTimeoutRef = useRef<any>(null);
  const synergyFlashTimeoutRef = useRef<any>(null);

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

  // Load High Scores and Leaderboard from LocalStorage on mount
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

  // Handle Mouse Move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (frictionTimeoutRef.current) clearTimeout(frictionTimeoutRef.current);
      if (synergyFlashTimeoutRef.current) clearTimeout(synergyFlashTimeoutRef.current);
    };
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
  };

  // Proximity checker helper
  const isWithinRadius = useCallback((x1: number, y1: number, x2: number, y2: number, r = 150) => {
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
    const paddingX = w * 0.12;
    const paddingY = h * 0.15;
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

  // Spatial buffer check (250px radius check)
  const isTooClose = useCallback((newX: number, newY: number, existingWords: WordItem[]) => {
    return existingWords.some(w => {
      const dx = w.x - newX;
      const dy = w.y - newY;
      return dx * dx + dy * dy < 250 * 250; // 250px radius limit
    });
  }, []);

  // Spawn word
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
      if (x < 450 && y < 180) return true; // Top-Left
      if (x > w - 300 && y < 180) return true; // Top-Right
      if (x < 400 && y > h - 250) return true; // Bottom-Left
      if (x > w - 360 && y > h - 280) return true; // Bottom-Right
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

    return {
      id: Math.random().toString(36).substring(2, 9),
      word: randomWord,
      x: pos.x,
      y: pos.y,
      typedLength: 0,
      completed: false,
      scale: 0.95,
      spawnTime: Date.now()
    };
  }, [getPositionInQuadrant, isTooClose]);

  // Initialize game
  const initializeGame = () => {
    let initialList: WordItem[] = [];
    stateRef.current.gameMode = gameMode;

    // Zen Mode keeps only 2-3 words on screen at once. Chrono/Overdrive keep 5.
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
    setLastCompletionTime(null);
    setFlowStreak(0);
    setSynergyPoints(0);
    setShowSynergyFlash(false);
    setFrictionActive(false);
    setImplosion(null);
    setShowLeaderboard(false);
    keystrokesTimeline.current = [];

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

  // Keyboard and typing controller
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
      
      // Log keystroke with timestamp for 2-second moving average calculation
      keystrokesTimeline.current.push({ timestamp: Date.now(), keys: 1 });

      // 1. If currently focused on a word
      if (current.focusedWordId) {
        const targetWord = current.words.find(w => w.id === current.focusedWordId);
        if (targetWord) {
          const expectedChar = targetWord.word[targetWord.typedLength].toLowerCase();
          
          if (char === expectedChar) {
            const nextLength = targetWord.typedLength + 1;
            if (!current.muted) audioController.playClick();
            setCorrectKeys(prev => prev + 1);

            if (nextLength === targetWord.word.length) {
              if (!current.muted) audioController.playThud();
              setCompletedWordsCount(prev => prev + 1);
              setLastCompletionTime(Date.now());
              setImplosion({ x: targetWord.x, y: targetWord.y, time: Date.now() });
              
              if (current.gameMode === 'Overdrive') {
                setTimeLeft(prev => prev + 3);
              }

              const updatedWords = current.words.filter(w => w.id !== current.focusedWordId);
              
              // Spawns in a quadrant other than the mouse
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

      // 2. If no word is currently focused
      const typableWords = current.words.filter(w =>
        isWithinRadius(w.x, w.y, current.mousePos.x, current.mousePos.y)
      );

      const matchingWord = typableWords.find(w => w.word[0].toLowerCase() === char);
      
      if (matchingWord) {
        if (!current.muted) audioController.playClick();
        setFocusedWordId(matchingWord.id);
        setCorrectKeys(prev => prev + 1);

        const elapsedSinceLastCompletion = current.lastCompletionTime ? (Date.now() - current.lastCompletionTime) : Infinity;
        if (elapsedSinceLastCompletion < 500) {
          setFlowStreak(prev => prev + 1);
          setSynergyPoints(prev => prev + 1);
          setShowSynergyFlash(true);
          
          if (current.gameMode === 'Overdrive') {
            setTimeLeft(prev => prev + 5);
          }

          if (synergyFlashTimeoutRef.current) clearTimeout(synergyFlashTimeoutRef.current);
          synergyFlashTimeoutRef.current = setTimeout(() => {
            setShowSynergyFlash(false);
          }, 1000);
        } else {
          setFlowStreak(0);
        }

        setWords(prev =>
          prev.map(w => (w.id === matchingWord.id ? { ...w, typedLength: 1 } : w))
        );
      } else {
        setIncorrectKeys(prev => prev + 1);
        setFlowStreak(0);
        setFrictionActive(true);
        if (frictionTimeoutRef.current) clearTimeout(frictionTimeoutRef.current);
        frictionTimeoutRef.current = setTimeout(() => {
          setFrictionActive(false);
        }, 200);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, spawnWord, isWithinRadius, getQuadrant]);

  // Break focus helper
  useEffect(() => {
    if (!focusedWordId || !isPlaying) return;
    const active = words.find(w => w.id === focusedWordId);
    if (active) {
      const stillTypable = isWithinRadius(active.x, active.y, mousePos.x, mousePos.y, 200); 
      if (!stillTypable) {
        setFocusedWordId(null);
      }
    }
  }, [mousePos, focusedWordId, words, isWithinRadius, isPlaying]);

  // Moving Average WPM Calculator (2-second moving average window)
  useEffect(() => {
    if (!startTime || !isPlaying) return;

    const updateWpm = () => {
      const now = Date.now();
      const twoSecondsAgo = now - 2000;

      // Filter keystrokes in last 2 seconds
      keystrokesTimeline.current = keystrokesTimeline.current.filter(item => item.timestamp >= twoSecondsAgo);
      const strokeCount = keystrokesTimeline.current.reduce((acc, item) => acc + item.keys, 0);

      // Convert 2s rate to 1min (WPM = (keys / 5) * 30)
      const wpmAverage = Math.round((strokeCount / 5) * 30);
      setCurrentWpm(wpmAverage);
    };

    const interval = setInterval(updateWpm, 100);
    return () => clearInterval(interval);
  }, [startTime, isPlaying]);

  const totalKeys = correctKeys + incorrectKeys;
  const accuracy = totalKeys > 0 ? Math.round((correctKeys / totalKeys) * 100) : 100;

  // Score
  const rawScore = (correctKeys * 10) + (synergyPoints * 100);
  const accMultiplier = accuracy === 100 ? 1.0 : (accuracy < 95 ? 0.8 : 1.0);
  const score = Math.round(rawScore * accMultiplier);

  // High Scores & Leaderboard tracking
  useEffect(() => {
    if ((isGameOver || (!isPlaying && startTime !== null)) && gameMode !== 'Zen') {
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
  }, [isGameOver, isPlaying, score, gameMode, scores, startTime, currentWpm, accuracy]);

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

  // Foreground: Word Nodes (Speed 0.05)
  const fgParallaxX = mouseDeltaX * 0.05;
  const fgParallaxY = mouseDeltaY * 0.05;

  // Background: Ghost WPM (Speed 0.01)
  const bgParallaxX = mouseDeltaX * 0.01;
  const bgParallaxY = mouseDeltaY * 0.01;

  return (
    <>
      <div className="game-container">
        <div className="corner-bracket top-left"></div>
        <div className="corner-bracket top-right"></div>
        <div className="corner-bracket bottom-left"></div>
        <div className="corner-bracket bottom-right"></div>
        <BackgroundGrid
          theme={theme}
          words={words.map(w => ({
            x: w.x + fgParallaxX,
            y: w.y + fgParallaxY,
            isTypable: isWithinRadius(w.x + fgParallaxX, w.y + fgParallaxY, mousePos.x, mousePos.y),
            isFocused: w.id === focusedWordId,
          }))}
          implosion={implosion}
          frictionActive={frictionActive}
          mousePos={mousePos}
        />

        {/* Word Nodes Space */}
        <div className="interactive-area">
          {isPlaying &&
            words.map(w => (
              <WordNode
                key={w.id}
                word={w.word}
                x={w.x + fgParallaxX}
                y={w.y + fgParallaxY}
                typedLength={w.typedLength}
                isTypable={isWithinRadius(w.x + fgParallaxX, w.y + fgParallaxY, mousePos.x, mousePos.y)}
                isFocused={w.id === focusedWordId}
                theme={theme}
              />
            ))}
        </div>

        {/* ACTIVE GAME HUD */}
        {isPlaying && (
          <div className="active-hud-overlay">
            {/* Top-Left: Static, sharp Logo */}
            <div className="hud-logo" onClick={() => triggerGameOver()} style={{ cursor: 'pointer' }}>
              VELOCITY
            </div>

            {/* Top-Right: Game settings/controls */}
            <div className="hud-controls">
              <VelocityButton
                onClick={() => setMuted(!muted)}
                ariaLabel={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </VelocityButton>
              <VelocityButton
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                ariaLabel="Toggle theme"
              >
                {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              </VelocityButton>
              <VelocityButton
                onClick={initializeGame}
                ariaLabel="Reset Game"
              >
                <RotateCcw size={16} />
              </VelocityButton>
              <VelocityButton
                onClick={triggerGameOver}
                ariaLabel="Quit Game"
              >
                Quit
              </VelocityButton>
            </div>

            {/* Bottom-Left: Fine HUD stats */}
            <div className="accuracy-stats-panel">
              <div className="stat-row">
                <span className="stat-label">MODE</span>
                <span className="stat-value">{gameMode}</span>
              </div>
              {(gameMode === 'Chrono' || gameMode === 'Overdrive') && (
                <div className="stat-row">
                  <span className="stat-label">TIME</span>
                  <span className="stat-value">{timeLeft}s</span>
                </div>
              )}
              {gameMode !== 'Zen' && (
                <div className="stat-row">
                  <span className="stat-label">SCORE</span>
                  <span className="stat-value">{score}</span>
                </div>
              )}
              <div className="stat-row">
                <span className="stat-label">WPM</span>
                <span className="stat-value">{currentWpm}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">ACC</span>
                <span className="stat-value">{accuracy}%</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">COM</span>
                <span className="stat-value">{completedWordsCount}</span>
              </div>
              {flowStreak > 0 && gameMode !== 'Zen' && (
                <div className="stat-row flow-highlight">
                  <span className="stat-label">FLOW</span>
                  <span className="stat-value">x{flowStreak + 1}</span>
                </div>
              )}
            </div>

            {/* Bottom-Right / Background: Ghost WPM & Synergy */}
            <div 
              className="massive-wpm-container" 
              style={{ 
                transform: `translate(${bgParallaxX}px, ${bgParallaxY}px)`
              }}
            >
              {currentWpm > 0 ? currentWpm : '00'}
            </div>
            <div 
              className={`ghost-synergy-flash ${showSynergyFlash ? 'active' : ''}`} 
              style={{ 
                transform: `translate(${bgParallaxX}px, ${bgParallaxY}px)`
              }}
            >
              {synergyPoints} Synergy
            </div>
          </div>
        )}

        {/* LANDING / START SCREEN OVERLAY */}
        {!isPlaying && (
          <div className="instruction-overlay">
            {/* Top-Left Corner: Static Logo + Global configuration icons */}
            <div className="menu-top-left">
              <div className="instruction-title">VELOCITY</div>
              <div className="instruction-tagline">Spatial precision. Kinetic intent.</div>
              <div className="menu-config-row">
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
                  className={showLeaderboard ? 'active' : ''}
                  onClick={() => setShowLeaderboard(!showLeaderboard)}
                  ariaLabel="View Leaderboard"
                >
                  <BarChart2 size={14} />
                </VelocityButton>
              </div>
            </div>

            {/* Top-Right Corner: Archive Data */}
            <div className="pb-tracker-container">
              <div className="archive-title">[ ARCHIVE_DATA ]</div>
              <div className="pb-item">PB CHRONO: {scores.Chrono} PTS</div>
              <div className="pb-item">PB OVERDRIVE: {scores.Overdrive} PTS</div>
            </div>

            {/* Bottom-Left Corner: Initialise button or Leaderboard panel */}
            <div className="init-action-container">
              {showLeaderboard ? (
                <div className="leaderboard-overlay">
                  <div className="leaderboard-title">Global Leaderboard</div>
                  <table className="leaderboard-table">
                    <thead>
                      <tr>
                        <th>Mode</th>
                        <th>Score</th>
                        <th>WPM</th>
                        <th>Acc</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getLeaderboardData().length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', opacity: 0.5 }}>No sessions recorded</td>
                        </tr>
                      ) : (
                        getLeaderboardData().map((entry, idx) => (
                          <tr key={idx}>
                            <td>{entry.mode}</td>
                            <td className="leaderboard-score">{entry.score}</td>
                            <td>{entry.wpm}</td>
                            <td>{entry.accuracy}%</td>
                            <td style={{ opacity: 0.6, fontSize: '10px' }}>{entry.date}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  <div className="leaderboard-actions">
                    <VelocityButton onClick={() => setShowLeaderboard(false)} style={{ width: '100%' }}>
                      Return
                    </VelocityButton>
                  </div>
                </div>
              ) : (
                <>
                  {isGameOver ? (
                    <div className="instruction-sub">
                      Session Completed in {gameMode} Mode.<br />
                      Score: <span className="score-highlight">{score}</span> | Avg WPM: {currentWpm}
                    </div>
                  ) : (
                    <div className="instruction-sub">
                      Select calibration path to start.
                    </div>
                  )}

                  <VelocityButton
                    onClick={initializeGame}
                    style={{ zIndex: 100 }}
                    className="begin-session-btn"
                  >
                    [ BEGIN_SESSION ]
                  </VelocityButton>
                </>
              )}
            </div>

            {/* Bottom-Right Corner: Mode selector vertically stacked */}
            {!showLeaderboard && (
              <div className="mode-selector-container">
                <div className="mode-selector-vertical">
                  <VelocityButton
                    className={gameMode === 'Chrono' ? 'active' : ''}
                    onClick={() => setGameMode('Chrono')}
                  >
                    Chrono
                  </VelocityButton>
                  <VelocityButton
                    className={gameMode === 'Overdrive' ? 'active' : ''}
                    onClick={() => setGameMode('Overdrive')}
                  >
                    Overdrive
                  </VelocityButton>
                  <VelocityButton
                    className={gameMode === 'Zen' ? 'active' : ''}
                    onClick={() => setGameMode('Zen')}
                  >
                    Zen
                  </VelocityButton>
                </div>

                <div className="mode-desc">
                  {gameMode === 'Chrono' && 'Fixed 60-second test. Calibrate WPM and score density.'}
                  {gameMode === 'Overdrive' && 'Start with 15s. Completing words adds +3s, flow synergy adds +5s. Surge ahead.'}
                  {gameMode === 'Zen' && 'Minimalist mode. No timers, no scores, no failure. Pure training flow.'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default App;
