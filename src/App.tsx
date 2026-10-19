import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BackgroundGrid } from './components/BackgroundGrid';
import { WordNode } from './components/WordNode';
import { VelocityButton } from './components/VelocityButton';
import { VariableTitle } from './components/VariableTitle';
import { BentoHub, type GameMode } from './components/BentoHub';
import { SessionArchive } from './components/SessionArchive';
import { CinematicAtmosphere } from './components/CinematicAtmosphere';
import { MobileGuard } from './components/MobileGuard';
import { audioController } from './utils/audio';
import { Volume2, VolumeX, Moon, Sun, RotateCcw } from 'lucide-react';
import { useMouseMove } from './hooks/useMouseMove';
import { MultiplayerLobby, type PlayerPresence, type MultiplayerLaunchPayload } from './components/MultiplayerLobby';
import { MultiplayerCountdown } from './components/MultiplayerCountdown';
import { GhostCursors, type OpponentCursor } from './components/GhostCursors';
import { MultiplayerRaceRibbon, type PlayerScoreState } from './components/MultiplayerRaceRibbon';
import { PodiumArchive, type PodiumPlayer } from './components/PodiumArchive';
import { ErrorBoundary } from './components/ErrorBoundary';
import { mulberry32, seededShuffle } from './utils/prng';
import { supabase } from './lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import './App.css';
import { DESIGN_DICTIONARY, shuffleArray } from './constants/words';

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
// ── Synergy constants ──────────────────────────────────────────────────────────
// SynergyWindow = BASE_SYNERGY_MS + (distance / VELOCITY_CONSTANT)
// A word 600px away gives ~1100ms window; a word 60px away gives ~600ms.
const BASE_SYNERGY_MS   = 500;
const VELOCITY_CONSTANT = 1.1;  // px/ms — calibrated to a comfortable cursor speed

// ── Single Source of Truth View Router Enum ──────────────────────────────────
export type AppView = 'landing' | 'solo-game' | 'solo-archive' | 'mp-lobby' | 'mp-game' | 'mp-podium';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [muted, setMuted] = useState(false);

  // ── 1. URL Query Parameter Detection (?room=VELO-89) ────────────────────────
  const [initialInviteRoom] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const params = new URLSearchParams(window.location.search);
      const room = params.get('room');
      return room && room.trim() ? room.trim().toUpperCase() : null;
    } catch {
      return null;
    }
  });

  // ── Unified View State Machine (Default: 'landing', or 'mp-lobby' if invited) ─
  const [currentView, setCurrentView] = useState<AppView>(() => (initialInviteRoom ? 'mp-lobby' : 'landing'));

  // Diagnostic telemetry log on every view state change
  useEffect(() => {
    console.log('[VELOCITY_VIEW]', currentView);
  }, [currentView]);

  // Clean up URL query parameters after capturing invite room code so address bar stays clean
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('room')) {
        window.history.replaceState({}, '', window.location.pathname);
        console.log('[VELOCITY_INVITE_CAPTURED] Sanitized browser URL.');
      }
    } catch (err) {
      console.warn('[URL_CLEANUP_WARN]', err);
    }
  }, []);

  // Derived state flags for internal sub-system synchronization
  const isPlaying = currentView === 'solo-game' || currentView === 'mp-game';
  const isGameOver = currentView === 'solo-archive' || currentView === 'mp-podium';
  const isMultiplayer = currentView === 'mp-lobby' || currentView === 'mp-game' || currentView === 'mp-podium';
  const isPodiumOpen = currentView === 'mp-podium';

  // ── Multiplayer Arena Session State ─────────────────────────────────────────
  const [isMultiplayerHost, setIsMultiplayerHost] = useState<boolean>(false);
  const [multiplayerRoomCode, setMultiplayerRoomCode] = useState<string | null>(initialInviteRoom);
  const [multiplayerCallsign, setMultiplayerCallsign] = useState<string>('');
  const [multiplayerChannel, setMultiplayerChannel] = useState<RealtimeChannel | null>(null);
  const [multiplayerPlayers, setMultiplayerPlayers] = useState<PlayerPresence[]>([]);
  const [multiplayerCountdown, setMultiplayerCountdown] = useState<number | null>(null);
  const [opponentCursors, setOpponentCursors] = useState<Record<string, OpponentCursor>>({});
  const [opponentScores, setOpponentScores] = useState<Record<string, PlayerScoreState>>({});
  const [opponentFinishResults, setOpponentFinishResults] = useState<Record<string, any>>({});

  // ── Multiplayer Snatched Word Notification State ──────────────────────────
  const [snatchedAlert, setSnatchedAlert] = useState<{
    winnerCallsign: string;
    x: number;
    y: number;
    id: number;
  } | null>(null);
  const snatchedAlertTimeoutRef = useRef<any>(null);

  const prngRef = useRef<(() => number) | null>(null);
  const lastCursorBroadcastRef = useRef<number>(0);
  const localFinalStatsRef = useRef<any>(null);

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  const [, setWordsPool] = useState<string[]>([]);
  const wordsPoolRef = useRef<string[]>([]);
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

  const totalKeys = correctKeys + incorrectKeys;
  const accuracy = totalKeys > 0 ? Math.round((correctKeys / totalKeys) * 100) : 100;
  const rawScore = (correctKeys * 10) + (synergyPoints * 100);
  const accMultiplier = accuracy === 100 ? 1.0 : (accuracy < 95 ? 0.8 : 1.0);
  const score = Math.round(rawScore * accMultiplier);

  // Keep references to avoid re-binding keyboard listeners
  const stateRef = useRef({
    currentView,
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
    currentWpm,
    isMultiplayer,
    isMultiplayerHost,
    multiplayerCountdown,
    multiplayerCallsign,
    multiplayerChannel,
    multiplayerRoomCode,
    isPodiumOpen,
    accuracy,
    score,
  });

  useEffect(() => {
    stateRef.current = {
      currentView,
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
      currentWpm,
      isMultiplayer,
      isMultiplayerHost,
      multiplayerCountdown,
      multiplayerCallsign,
      multiplayerChannel,
      multiplayerRoomCode,
      isPodiumOpen,
      accuracy,
      score,
    };
  }, [currentView, words, focusedWordId, mousePos, correctKeys, incorrectKeys, completedWordsCount, startTime, muted, lastCompletionTime, flowStreak, synergyPoints, gameMode, isPlaying, isGameOver, timeLeft, currentWpm, isMultiplayer, isMultiplayerHost, multiplayerCountdown, multiplayerCallsign, multiplayerChannel, multiplayerRoomCode, isPodiumOpen, accuracy, score]);

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
      if (snatchedAlertTimeoutRef.current) clearTimeout(snatchedAlertTimeoutRef.current);
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
    if ((currentView !== 'solo-game' && currentView !== 'mp-game') || multiplayerCountdown !== null) return;
    
    const interval = setInterval(() => {
      if (gameMode === 'Chrono' || gameMode === 'Overdrive') {
        if (stateRef.current.timeLeft <= 1) {
          clearInterval(interval);
          setTimeLeft(0);
          triggerGameOver();
        } else {
          setTimeLeft(prev => Math.max(0, prev - 1));
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentView, gameMode, multiplayerCountdown]);

  const triggerGameOver = () => {
    setFocusedWordId(null);
    // Kill any running momentum decay (both the grace-period timeout and the drip interval)
    if (momentumDecayTimeoutRef.current) clearTimeout(momentumDecayTimeoutRef.current);
    if (momentumDecayRef.current) clearInterval(momentumDecayRef.current);
    if (momentumAnimRef.current) cancelAnimationFrame(momentumAnimRef.current);
    if (momentumBarRef.current) momentumBarRef.current.style.width = '0%';

    const current = stateRef.current;
    const currentTotalKeys = current.correctKeys + current.incorrectKeys;
    const currentAccuracy = currentTotalKeys > 0 ? Math.round((current.correctKeys / currentTotalKeys) * 100) : 100;
    const currentRawScore = (current.correctKeys * 10) + (current.synergyPoints * 100);
    const currentAccMult = currentAccuracy === 100 ? 1.0 : (currentAccuracy < 95 ? 0.8 : 1.0);
    const currentScore = Math.round(currentRawScore * currentAccMult);

    if (current.currentView === 'mp-game') {
      if (current.multiplayerChannel) {
        const channel = current.multiplayerChannel;
        // Calculate overall session WPM so players who paused in the last 2 seconds don't transmit 0 WPM
        const elapsedSeconds = current.startTime ? Math.max(1, (Date.now() - current.startTime) / 1000) : 60;
        const overallWpm = Math.round((current.correctKeys / 5) / (elapsedSeconds / 60));
        const calculatedFinalWpm = Math.max(current.currentWpm, overallWpm);

        const finalStats = {
          callsign: current.multiplayerCallsign,
          finalWpm: calculatedFinalWpm,
          finalAccuracy: currentAccuracy,
          wordsCompleted: current.completedWordsCount,
          finalScore: currentScore,
        };
        localFinalStatsRef.current = finalStats;

        const broadcastFinish = () => {
          try {
            channel.send({
              type: 'broadcast',
              event: 'MATCH_FINISH',
              payload: finalStats,
            });
          } catch (err) {
            console.warn('[MATCH_FINISH BROADCAST ERROR]', err);
          }
        };

        broadcastFinish();
        setTimeout(broadcastFinish, 350);
      }
      setCurrentView('mp-podium');
    } else {
      setCurrentView('solo-archive');
    }
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
    
    const rng1 = prngRef.current ? prngRef.current() : Math.random();
    const rng2 = prngRef.current ? prngRef.current() : Math.random();

    return {
      x: minX + rng1 * (maxX - minX),
      y: minY + rng2 * (maxY - minY),
    };
  }, []);

  const getNextWordFromPool = useCallback((): string => {
    if (wordsPoolRef.current.length === 0) {
      const freshPool = prngRef.current
        ? seededShuffle(DESIGN_DICTIONARY, prngRef.current)
        : shuffleArray([...DESIGN_DICTIONARY]);
      wordsPoolRef.current = freshPool;
      setWordsPool(freshPool);
    }
    const nextWord = wordsPoolRef.current.shift()!;
    setWordsPool([...wordsPoolRef.current]);
    return nextWord;
  }, []);

  const isTooClose = useCallback((newX: number, newY: number, existingWords: WordItem[]) => {
    return existingWords.some(w => {
      const dx = w.x - newX;
      const dy = w.y - newY;
      return dx * dx + dy * dy < 250 * 250;
    });
  }, []);

  const spawnWord = useCallback((existingWords: WordItem[], forceQuadrant?: number): WordItem => {
    let randomWord = getNextWordFromPool();
    let attempts = 0;
    
    while (existingWords.some(w => w.word.toLowerCase() === randomWord.toLowerCase()) && attempts < 15) {
      randomWord = getNextWordFromPool();
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
        const rng = prngRef.current ? prngRef.current() : Math.random();
        const randQuad = Math.floor(rng * 4) + 1;
        pos = getPositionInQuadrant(randQuad);
      }

      tooCloseCheck = isTooClose(pos.x, pos.y, existingWords) || isCornerOverlap(pos.x, pos.y);
      spawnAttempts++;
    }

    const rngSuffix = prngRef.current
      ? Math.floor(prngRef.current() * 100000).toString(36)
      : Math.random().toString(36).substring(2, 7);

    // Stable ID: epoch-ms prefix ensures uniqueness across solo sessions;
    // when deterministic seed is present, use PRNG-derived ID so host and peers start identical.
    const generatedId = prngRef.current
      ? `word-${randomWord.toLowerCase()}-${rngSuffix}`
      : `word-${Date.now()}-${rngSuffix}`;

    return {
      id: generatedId,
      word: randomWord,
      x: pos.x,
      y: pos.y,
      typedLength: 0,
      completed: false,
      scale: 0.95,
      spawnTime: Date.now()
    };
  }, [getPositionInQuadrant, isTooClose, getNextWordFromPool]);

  // Initialize game session
  const initializeGame = (seed?: number, multiplayerWordCount?: number): WordItem[] => {
    if (seed !== undefined) {
      prngRef.current = mulberry32(seed);
      const freshPool = seededShuffle(DESIGN_DICTIONARY, prngRef.current);
      wordsPoolRef.current = [...freshPool];
      setWordsPool([...freshPool]);
    } else {
      setCurrentView('solo-game');
      prngRef.current = null;
      const freshPool = shuffleArray([...DESIGN_DICTIONARY]);
      wordsPoolRef.current = freshPool;
      setWordsPool(freshPool);
    }
    let initialList: WordItem[] = [];
    stateRef.current.gameMode = gameMode;
    mousePathRef.current = []; // Clear recorded mouse trajectory for new signature

    const spawnCount = multiplayerWordCount !== undefined
      ? multiplayerWordCount
      : (gameMode === 'Zen' ? 3 : 5);

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

    return initialList;
  };

  // Keyboard controller
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const current = stateRef.current;
      if (current.currentView !== 'solo-game' && current.currentView !== 'mp-game') return;
      if (current.multiplayerCountdown !== null) return;
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
              const nextCompletedCount = current.completedWordsCount + 1;
              setCompletedWordsCount(nextCompletedCount);

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

              // ── Multiplayer WORD_SNATCHED & SCORE Broadcast ───────────────
              if (current.isMultiplayer && current.multiplayerChannel) {
                const totalKeysNow = current.correctKeys + 1 + current.incorrectKeys;
                const accNow = totalKeysNow > 0 ? Math.round(((current.correctKeys + 1) / totalKeysNow) * 100) : 100;
                const rawScoreNow = ((current.correctKeys + 1) * 10) + (current.synergyPoints * 100);
                const accMultNow = accNow === 100 ? 1.0 : (accNow < 95 ? 0.8 : 1.0);
                const scoreNow = Math.round(rawScoreNow * accMultNow);

                const newWordPayload = {
                  id: nextWord.id,
                  text: nextWord.word,
                  word: nextWord.word,
                  x: Math.round(nextWord.x),
                  y: Math.round(nextWord.y),
                  xPct: Number((nextWord.x / (window.innerWidth || 1920)).toFixed(4)),
                  yPct: Number((nextWord.y / (window.innerHeight || 1080)).toFixed(4)),
                };

                current.multiplayerChannel.send({
                  type: 'broadcast',
                  event: 'WORD_SNATCHED',
                  payload: {
                    wordId: targetWord.id,
                    wordText: targetWord.word,
                    winnerCallsign: current.multiplayerCallsign,
                    newWord: newWordPayload,
                  },
                });

                current.multiplayerChannel.send({
                  type: 'broadcast',
                  event: 'SCORE_UPDATE',
                  payload: {
                    callsign: current.multiplayerCallsign,
                    completedCount: nextCompletedCount,
                    wpm: current.currentWpm,
                    streak: current.flowStreak,
                    accuracy: accNow,
                    score: scoreNow,
                  },
                });
              }

              // Optimistic local removal + new word injection using functional state
              setWords(prevWords => {
                const filtered = prevWords.filter(
                  w => w.id !== targetWord.id && w.word.toLowerCase() !== targetWord.word.toLowerCase()
                );
                return [...filtered, nextWord];
              });
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

  // ── Throttled Ghost Cursor Broadcaster (~30 FPS / 33ms) ───────────────────
  useEffect(() => {
    if (!isPlaying || !isMultiplayer || !multiplayerChannel || multiplayerCountdown !== null || isPodiumOpen) return;

    const handlePointerMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastCursorBroadcastRef.current >= 33) {
        lastCursorBroadcastRef.current = now;
        const xPct = Math.max(0, Math.min(1, e.clientX / window.innerWidth));
        const yPct = Math.max(0, Math.min(1, e.clientY / window.innerHeight));
        multiplayerChannel.send({
          type: 'broadcast',
          event: 'CURSOR_MOVE',
          payload: {
            callsign: multiplayerCallsign,
            xPct,
            yPct,
          },
        });
      }
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('mousemove', handlePointerMove);
  }, [currentView, multiplayerChannel, multiplayerCountdown, multiplayerCallsign]);

  // ── Periodic Live Score Broadcast (every 1000ms during mp-game) ───────────────
  useEffect(() => {
    if (currentView !== 'mp-game' || !multiplayerChannel || multiplayerCountdown !== null) return;

    const interval = setInterval(() => {
      const current = stateRef.current;
      if (current.currentView !== 'mp-game' || !current.multiplayerChannel) return;

      const totalK = current.correctKeys + current.incorrectKeys;
      const acc = totalK > 0 ? Math.round((current.correctKeys / totalK) * 100) : 100;
      const raw = (current.correctKeys * 10) + (current.synergyPoints * 100);
      const mult = acc === 100 ? 1.0 : (acc < 95 ? 0.8 : 1.0);
      const computedScore = Math.round(raw * mult);

      try {
        current.multiplayerChannel.send({
          type: 'broadcast',
          event: 'SCORE_UPDATE',
          payload: {
            callsign: current.multiplayerCallsign,
            completedCount: current.completedWordsCount,
            wpm: current.currentWpm,
            streak: current.flowStreak,
            accuracy: acc,
            score: computedScore,
          },
        });
      } catch (err) {
        console.warn('[SCORE_UPDATE BROADCAST ERROR]', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentView, multiplayerChannel, multiplayerCountdown]);

  // ── Multiplayer Lobby Reset & Transition Protocol ─────────────────────────
  const transitionToLobby = useCallback(() => {
    setCurrentView('mp-lobby');
    setMultiplayerCountdown(null);

    // Reset game session metrics cleanly
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
    prngRef.current = null;
    keystrokesTimeline.current = [];
    mousePathRef.current = [];
    setOpponentCursors({});
    setOpponentScores({});
    setOpponentFinishResults({});
    localFinalStatsRef.current = null;
    setSnatchedAlert(null);
    if (snatchedAlertTimeoutRef.current) clearTimeout(snatchedAlertTimeoutRef.current);

    if (momentumDecayTimeoutRef.current) clearTimeout(momentumDecayTimeoutRef.current);
    if (momentumDecayRef.current) clearInterval(momentumDecayRef.current);
    if (momentumAnimRef.current) cancelAnimationFrame(momentumAnimRef.current);
    if (momentumBarRef.current) momentumBarRef.current.style.width = '0%';
  }, []);

  // ── Leave Arena Protocol (Full Multiplayer Teardown) ──────────────────────
  const handleLeaveArena = useCallback(() => {
    if (multiplayerChannel) {
      multiplayerChannel.unsubscribe();
      supabase.removeChannel(multiplayerChannel);
      setMultiplayerChannel(null);
    }
    setCurrentView('landing');
    setIsMultiplayerHost(false);
    setMultiplayerRoomCode(null);
    setMultiplayerPlayers([]);
    setMultiplayerCountdown(null);
    setOpponentCursors({});
    setOpponentScores({});
    setOpponentFinishResults({});
    localFinalStatsRef.current = null;
    setSnatchedAlert(null);
    if (snatchedAlertTimeoutRef.current) clearTimeout(snatchedAlertTimeoutRef.current);
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
    prngRef.current = null;
    keystrokesTimeline.current = [];
    mousePathRef.current = [];

    if (momentumDecayTimeoutRef.current) clearTimeout(momentumDecayTimeoutRef.current);
    if (momentumDecayRef.current) clearInterval(momentumDecayRef.current);
    if (momentumAnimRef.current) cancelAnimationFrame(momentumAnimRef.current);
    if (momentumBarRef.current) momentumBarRef.current.style.width = '0%';
  }, [multiplayerChannel]);

  const lastLaunchSeedRef = useRef<number | null>(null);

  // ── Multiplayer Launch Handler ─────────────────────────────────────────────
  const handleMultiplayerLaunch = useCallback((payload: MultiplayerLaunchPayload) => {
    if (lastLaunchSeedRef.current === payload.seed) return;
    lastLaunchSeedRef.current = payload.seed;

    const isHost = payload.hostCallsign === payload.callsign;
    setCurrentView('mp-game');
    setIsMultiplayerHost(isHost);
    setMultiplayerRoomCode(payload.roomCode);
    setMultiplayerCallsign(payload.callsign);
    setMultiplayerChannel(payload.channel);
    const activePlayers = payload.players && payload.players.length > 0 ? payload.players : multiplayerPlayers;
    setMultiplayerPlayers(activePlayers);
    setOpponentCursors({});
    setOpponentScores({});
    setOpponentFinishResults({});
    localFinalStatsRef.current = null;
    setSnatchedAlert(null);
    setGameMode('Chrono');

    // Dynamic Board Scaling based on room presence: Math.max(6, Math.min(16, participants.length * 2))
    const participantCount = Math.max(1, activePlayers.length);
    const activeWordCount = Math.max(6, Math.min(16, participantCount * 2));

    // Initialize game with deterministic seed & scaled word count
    const initialBoard = initializeGame(payload.seed, activeWordCount);

    // If Host, broadcast BOARD_SYNC to all clients (with redundant bursts during countdown to overcome mounting latency)
    if (isHost && payload.channel) {
      const serialized = initialBoard.map(w => ({
        id: w.id,
        word: w.word,
        text: w.word,
        x: w.x,
        y: w.y,
        xPct: Number((w.x / (window.innerWidth || 1920)).toFixed(4)),
        yPct: Number((w.y / (window.innerHeight || 1080)).toFixed(4)),
      }));

      const broadcastBoardSync = () => {
        try {
          payload.channel.send({
            type: 'broadcast',
            event: 'BOARD_SYNC',
            payload: { words: serialized },
          });
        } catch (err) {
          console.warn('[BOARD_SYNC BROADCAST WARN]', err);
        }
      };

      broadcastBoardSync();
      setTimeout(broadcastBoardSync, 200);
      setTimeout(broadcastBoardSync, 600);
    }

    // 3-Second Synchronized Countdown
    setMultiplayerCountdown(3);
    if (!muted) audioController.playClick();

    let count = 3;
    const timer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setMultiplayerCountdown(count);
        if (!muted) audioController.playClick();
      } else if (count === 0) {
        setMultiplayerCountdown(0); // "ENGAGE"
        if (!muted) audioController.playThud();
      } else {
        clearInterval(timer);
        setMultiplayerCountdown(null);
      }
    }, 1000);
  }, [muted, multiplayerPlayers]);

  // ── Multiplayer Realtime Channel Broadcast Listeners ───────────────────────
  useEffect(() => {
    if (!multiplayerChannel) return;

    // 0a. Synchronized Match Launch (Session 2+ peer sync)
    multiplayerChannel.on('broadcast', { event: 'GAME_START' }, ({ payload }) => {
      if (payload && payload.seed !== undefined) {
        handleMultiplayerLaunch({
          seed: payload.seed,
          hostCallsign: payload.hostCallsign,
          roomCode: payload.roomCode || multiplayerRoomCode || 'ARENA',
          channel: multiplayerChannel,
          callsign: multiplayerCallsign,
          players: payload.players && payload.players.length > 0 ? payload.players : multiplayerPlayers,
        });
      }
    });

    // 0b. Shared Dynamic Board Sync (Host ground truth)
    multiplayerChannel.on('broadcast', { event: 'BOARD_SYNC' }, ({ payload }) => {
      if (payload && Array.isArray(payload.words) && payload.words.length > 0) {
        console.log('[BOARD_SYNC_RECEIVED]', payload.words);
        const syncedWords: WordItem[] = payload.words.map((w: any) => ({
          id: w.id || `word-${w.word || w.text}-${Math.random().toString(36).substring(2, 7)}`,
          word: w.word || w.text,
          x: w.xPct ? Math.round(w.xPct * (window.innerWidth || 1920)) : w.x,
          y: w.yPct ? Math.round(w.yPct * (window.innerHeight || 1080)) : w.y,
          typedLength: 0,
          completed: false,
          scale: 0.95,
          spawnTime: Date.now(),
        }));
        setWords(syncedWords);
      }
    });

    // 0c. Realtime Stolen Word Snatch Protocol
    multiplayerChannel.on('broadcast', { event: 'WORD_SNATCHED' }, ({ payload }) => {
      if (!payload || (!payload.wordId && !payload.wordText && !payload.text)) return;
      console.log('[WORD_SNATCHED_RECEIVED]', payload);

      const current = stateRef.current;
      // If we are the winner, we already handled it locally
      if (payload.winnerCallsign && payload.winnerCallsign === current.multiplayerCallsign) return;

      const targetText = (payload.wordText || payload.text || '').toLowerCase();
      const targetId = payload.wordId;

      // 1. If actively typing this exact word (matching either ID or text), immediately interrupt and release focus
      const focusedWord = current.words.find(w => w.id === current.focusedWordId);
      const isTargetFocused = Boolean(
        (targetId && current.focusedWordId === targetId) ||
        (focusedWord && targetText && focusedWord.word.toLowerCase() === targetText)
      );

      if (isTargetFocused) {
        setFocusedWordId(null);
        if (!current.muted) audioController.playClick();
        setSnatchedAlert({
          winnerCallsign: payload.winnerCallsign || 'RIVAL',
          x: current.mousePos.x,
          y: current.mousePos.y,
          id: Date.now(),
        });
        if (snatchedAlertTimeoutRef.current) clearTimeout(snatchedAlertTimeoutRef.current);
        snatchedAlertTimeoutRef.current = setTimeout(() => {
          setSnatchedAlert(null);
        }, 1200);
      }

      // 2. Trigger particle burst / implosion at the snatched word's location
      const snatchedWord = current.words.find(
        w => (targetId && w.id === targetId) || (targetText && w.word.toLowerCase() === targetText)
      );
      if (snatchedWord) {
        setImplosion({ x: snatchedWord.x, y: snatchedWord.y, time: Date.now() });
      }

      // 3. Remove stolen word and insert replacement word using dual ID and text matching
      const normalizedNewWord: WordItem | null = payload.newWord ? {
        id: payload.newWord.id || `word-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        word: payload.newWord.word || payload.newWord.text,
        x: payload.newWord.xPct ? Math.round(payload.newWord.xPct * (window.innerWidth || 1920)) : (payload.newWord.x || 0),
        y: payload.newWord.yPct ? Math.round(payload.newWord.yPct * (window.innerHeight || 1080)) : (payload.newWord.y || 0),
        typedLength: 0,
        completed: false,
        scale: 0.95,
        spawnTime: Date.now(),
      } : null;

      setWords(prev => {
        const filtered = prev.filter(w => {
          const matchId = Boolean(targetId && w.id === targetId);
          const matchText = Boolean(targetText && w.word.toLowerCase() === targetText);
          return !matchId && !matchText;
        });

        if (normalizedNewWord) {
          if (filtered.some(w => w.id === normalizedNewWord.id || w.word.toLowerCase() === normalizedNewWord.word.toLowerCase())) {
            return filtered;
          }
          return [...filtered, normalizedNewWord];
        }
        return filtered;
      });

      // 4. Update the opponent's score live
      if (payload.winnerCallsign) {
        setOpponentScores(prev => {
          const existing = prev[payload.winnerCallsign] || {
            callsign: payload.winnerCallsign,
            completedCount: 0,
            wpm: 0,
            streak: 0,
            accuracy: 100,
          };
          return {
            ...prev,
            [payload.winnerCallsign]: {
              ...existing,
              completedCount: existing.completedCount + 1,
            },
          };
        });
      }
    });

    // 1. Ghost Cursor Moves
    multiplayerChannel.on('broadcast', { event: 'CURSOR_MOVE' }, ({ payload }) => {
      if (payload && payload.callsign && payload.callsign !== multiplayerCallsign) {
        setOpponentCursors((prev) => ({
          ...prev,
          [payload.callsign]: {
            callsign: payload.callsign,
            xPct: payload.xPct,
            yPct: payload.yPct,
            lastUpdate: Date.now(),
          },
        }));
      }
    });

    // 2. Realtime Score Updates
    multiplayerChannel.on('broadcast', { event: 'SCORE_UPDATE' }, ({ payload }) => {
      const myTag = (multiplayerCallsign || '').trim().toLowerCase();
      const senderTag = (payload?.callsign || '').trim();
      if (senderTag && senderTag.toLowerCase() !== myTag) {
        setOpponentScores((prev) => ({
          ...prev,
          [senderTag]: {
            callsign: senderTag,
            completedCount: payload.completedCount ?? 0,
            wpm: payload.wpm ?? 0,
            streak: payload.streak ?? 0,
            accuracy: payload.accuracy ?? 100,
            score: payload.score ?? (payload.completedCount ?? 0) * 100,
          },
        }));
      }
    });

    // 3. Match Completion Signals (strictly one-way — never echo MATCH_FINISH here to avoid broadcast storm)
    multiplayerChannel.on('broadcast', { event: 'MATCH_FINISH' }, ({ payload }) => {
      const myTag = (multiplayerCallsign || '').trim().toLowerCase();
      const senderTag = (payload?.callsign || '').trim();
      if (senderTag && senderTag.toLowerCase() !== myTag) {
        setOpponentFinishResults((prev) => ({
          ...prev,
          [senderTag]: payload,
        }));

        setOpponentScores((prev) => ({
          ...prev,
          [senderTag]: {
            callsign: senderTag,
            completedCount: payload.wordsCompleted ?? payload.completedCount ?? prev[senderTag]?.completedCount ?? 0,
            wpm: payload.finalWpm ?? payload.wpm ?? prev[senderTag]?.wpm ?? 0,
            streak: prev[senderTag]?.streak ?? 0,
            accuracy: payload.finalAccuracy ?? payload.accuracy ?? prev[senderTag]?.accuracy ?? 100,
            score: payload.finalScore ?? payload.score ?? prev[senderTag]?.score ?? 0,
          },
        }));
      }
    });

    // 4. Dedicated Sync Handshake: Peer requests podium stats
    multiplayerChannel.on('broadcast', { event: 'SYNC_PODIUM_REQUEST' }, ({ payload }) => {
      const myTag = (multiplayerCallsign || '').trim().toLowerCase();
      const requester = (payload?.from || '').trim().toLowerCase();
      if (requester && requester !== myTag && localFinalStatsRef.current) {
        try {
          multiplayerChannel.send({
            type: 'broadcast',
            event: 'MATCH_FINISH',
            payload: localFinalStatsRef.current,
          });
        } catch (e) {
          console.warn('[SYNC_PODIUM_RESPONSE ERROR]', e);
        }
      }
    });

    // 5. Return to Lobby Protocol (Host & Peer Sync)
    multiplayerChannel.on('broadcast', { event: 'RESET_LOBBY' }, () => {
      transitionToLobby();
    });
    multiplayerChannel.on('broadcast', { event: 'RETURN_LOBBY' }, () => {
      transitionToLobby();
    });
  }, [multiplayerChannel, multiplayerCallsign, multiplayerRoomCode, multiplayerPlayers, handleMultiplayerLaunch, transitionToLobby]);

  // ── Stale Ghost Cursors Cleanup ────────────────────────────────────────────
  useEffect(() => {
    if (!isMultiplayer || !isPlaying) return;
    const interval = setInterval(() => {
      const cutoff = Date.now() - 5000;
      setOpponentCursors((prev) => {
        let changed = false;
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if (next[key].lastUpdate < cutoff) {
            delete next[key];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [isMultiplayer, isPlaying]);

  // ── Podium Players Roster Memo ─────────────────────────────────────────────
  const podiumPlayersList: PodiumPlayer[] = useMemo(() => {
    const localFinish = localFinalStatsRef.current;
    const myTag = (multiplayerCallsign || 'YOU').trim();
    const myTagLower = myTag.toLowerCase();

    // 1. Local Player Entry
    const localPlayer: PodiumPlayer = {
      callsign: myTag,
      wpm: localFinish?.finalWpm ?? currentWpm,
      accuracy: localFinish?.finalAccuracy ?? accuracy,
      wordsCompleted: localFinish?.wordsCompleted ?? completedWordsCount,
      score: localFinish?.finalScore ?? score,
      isLocal: true,
    };

    // Helper for case-insensitive and whitespace-trimmed dictionary lookup
    const findInDict = <T,>(dict: Record<string, T>, tag: string): T | undefined => {
      const normalized = tag.trim().toLowerCase();
      for (const [k, v] of Object.entries(dict)) {
        if (k.trim().toLowerCase() === normalized) return v;
      }
      return undefined;
    };

    // 2. Collect unique opponent tags from all sources:
    // - multiplayerPlayers (presence roster)
    // - opponentFinishResults (final stats received)
    // - opponentScores (live score broadcasts)
    const opponentTagsMap = new Map<string, string>(); // lowerCase -> originalCase

    multiplayerPlayers.forEach((p) => {
      const tag = p.callsign?.trim();
      if (tag && tag.toLowerCase() !== myTagLower) {
        opponentTagsMap.set(tag.toLowerCase(), tag);
      }
    });

    Object.keys(opponentScores).forEach((k) => {
      const tag = k.trim();
      if (tag && tag.toLowerCase() !== myTagLower && !opponentTagsMap.has(tag.toLowerCase())) {
        opponentTagsMap.set(tag.toLowerCase(), tag);
      }
    });

    Object.keys(opponentFinishResults).forEach((k) => {
      const tag = k.trim();
      if (tag && tag.toLowerCase() !== myTagLower && !opponentTagsMap.has(tag.toLowerCase())) {
        opponentTagsMap.set(tag.toLowerCase(), tag);
      }
    });

    // 3. Build opponent podium entries with robust fallback hierarchy
    const opponentList: PodiumPlayer[] = Array.from(opponentTagsMap.values()).map((tag) => {
      const finish = findInDict(opponentFinishResults, tag);
      const scoreState = findInDict(opponentScores, tag);

      const wordsCompleted = finish?.wordsCompleted ?? scoreState?.completedCount ?? 0;
      const wpm = finish?.finalWpm ?? scoreState?.wpm ?? 0;
      const playerAccuracy = finish?.finalAccuracy ?? scoreState?.accuracy ?? (wordsCompleted > 0 ? 100 : 0);
      const calculatedScore = finish?.finalScore ?? scoreState?.score ?? (wordsCompleted * 100);

      return {
        callsign: tag,
        wpm,
        accuracy: playerAccuracy,
        wordsCompleted,
        score: calculatedScore,
        isLocal: false,
      };
    });

    return [localPlayer, ...opponentList];
  }, [
    multiplayerCallsign,
    currentWpm,
    accuracy,
    completedWordsCount,
    score,
    opponentScores,
    opponentFinishResults,
    multiplayerPlayers,
  ]);

  // ── Podium Match Finish Re-Announce & Peer Sync Request ─────────────────────
  useEffect(() => {
    if (currentView !== 'mp-podium' || !multiplayerChannel) return;

    // Send our match finish if ready
    if (localFinalStatsRef.current) {
      try {
        multiplayerChannel.send({
          type: 'broadcast',
          event: 'MATCH_FINISH',
          payload: localFinalStatsRef.current,
        });
      } catch (e) {
        console.warn('[PODIUM ANNOUNCE ERROR]', e);
      }
    }

    // Request finish stats from peers in case we joined podium slightly after them
    try {
      multiplayerChannel.send({
        type: 'broadcast',
        event: 'SYNC_PODIUM_REQUEST',
        payload: { from: multiplayerCallsign },
      });
    } catch (e) {
      console.warn('[PODIUM SYNC REQUEST ERROR]', e);
    }

    // Single 400ms retry to guarantee delivery across network latency
    const timer = setTimeout(() => {
      if (localFinalStatsRef.current && multiplayerChannel) {
        try {
          multiplayerChannel.send({
            type: 'broadcast',
            event: 'MATCH_FINISH',
            payload: localFinalStatsRef.current,
          });
        } catch (e) {
          // ignore
        }
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [currentView, multiplayerChannel, multiplayerCallsign]);

  // Parallax layers
  const windowCenterX = window.innerWidth / 2;
  const windowCenterY = window.innerHeight / 2;
  const mouseDeltaX = mousePos.x === -1000 ? 0 : mousePos.x - windowCenterX;
  const mouseDeltaY = mousePos.y === -1000 ? 0 : mousePos.y - windowCenterY;

  const fgParallaxX = mouseDeltaX * 0.05;
  const fgParallaxY = mouseDeltaY * 0.05;

  const bgParallaxX = mouseDeltaX * 0.01;
  const bgParallaxY = mouseDeltaY * 0.01;

  // Active In-Game Telemetry and Controls HUD overlay
  const renderActiveHud = (isMp: boolean) => (
    <div className="active-hud-overlay">
      {/* Top-Left: Proximity Variable Title */}
      <div className="hud-logo-container">
        <VariableTitle mousePos={mousePos} onClick={triggerGameOver} theme={theme} />
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
        {!isMp && (
          <VelocityButton
            onClick={() => initializeGame()}
            ariaLabel="Reset Game"
          >
            <RotateCcw size={14} />
          </VelocityButton>
        )}
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
            <span className="stat-label">COMBO:</span>
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

      {/* Momentum Bar Track */}
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
  );

  return (
    <>
      <CinematicAtmosphere theme={theme} />
      {isMobile ? (
        <>
          <BackgroundGrid
            theme={theme}
            words={[]}
            implosion={null}
            frictionActive={false}
            mousePos={mousePos}
          />
          <MobileGuard />
        </>
      ) : (
        <div className="game-container">
          {/* Neural Tether Canvas Background */}
          <BackgroundGrid
            theme={theme}
            words={(currentView === 'solo-game' || currentView === 'mp-game') ? words.map(w => ({
              x: w.x + fgParallaxX,
              y: w.y + fgParallaxY,
              isTypable: isWithinRadius(w.x, w.y, mousePos.x, mousePos.y),
              isFocused: w.id === focusedWordId,
            })) : []}
            implosion={implosion}
            frictionActive={frictionActive}
            mousePos={mousePos}
            synergyPing={synergyPing}
          />

          {/* Bulletproof Single Source of Truth Router wrapped in Error Boundary */}
          <ErrorBoundary theme={theme} onReset={() => setCurrentView('landing')}>
            {/* 1. ASYMMETRIC BENTO HUB (START / HUB SCREEN OVERLAY) */}
            {currentView === 'landing' && (
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
                onBeginSession={() => initializeGame()}
                onOpenMultiplayer={() => setCurrentView('mp-lobby')}
              />
            )}

            {/* 2. SOLO GAMEPLAY SESSION */}
            {currentView === 'solo-game' && (
              <>
                <div 
                  className="interactive-area"
                  style={{ pointerEvents: 'auto' }}
                >
                  {words.map(w => (
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
                {renderActiveHud(false)}
              </>
            )}

            {/* 3. SOLO SESSION ARCHIVE (SCORE SCREEN) */}
            {currentView === 'solo-archive' && (
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
                onRecalibrate={() => initializeGame()}
                onReturnToNucleus={() => {
                  setCurrentView('landing');
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

            {/* 4. REALTIME MULTIPLAYER ARENA LOBBY */}
            {currentView === 'mp-lobby' && (
              <MultiplayerLobby
                theme={theme}
                initialRoomCode={multiplayerRoomCode || undefined}
                initialCallsign={multiplayerCallsign || undefined}
                existingChannel={multiplayerChannel}
                existingPlayers={multiplayerPlayers}
                isHostUser={isMultiplayerHost}
                onClose={handleLeaveArena}
                onLaunchGame={handleMultiplayerLaunch}
              />
            )}

            {/* 5. REALTIME MULTIPLAYER GAMEPLAY SESSION */}
            {currentView === 'mp-game' && (
              <>
                <div 
                  className="interactive-area"
                  style={{
                    pointerEvents: multiplayerCountdown !== null ? 'none' : 'auto',
                  }}
                >
                  {words.map(w => (
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

                {/* Multiplayer HUD overlay */}
                {renderActiveHud(true)}

                {/* Realtime Multiplayer Race Ribbon */}
                <MultiplayerRaceRibbon
                  localCallsign={multiplayerCallsign || 'YOU'}
                  localWpm={currentWpm}
                  localCompletedCount={completedWordsCount}
                  localStreak={flowStreak}
                  localAccuracy={accuracy}
                  opponentScores={opponentScores}
                  theme={theme}
                  roomCode={multiplayerRoomCode || 'ARENA'}
                  timeLeft={timeLeft}
                />

                {/* Realtime Multiplayer Ghost Cursors */}
                <GhostCursors cursors={opponentCursors} theme={theme} />

                {/* Realtime Snatched Word Stolen Alert Floating Above Cursor */}
                <AnimatePresence>
                  {snatchedAlert && (
                    <motion.div
                      key={snatchedAlert.id}
                      initial={{ opacity: 0, y: 0, scale: 0.96 }}
                      animate={{ opacity: [0, 1, 1, 0], y: -28, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.2, times: [0, 0.15, 0.75, 1.0], ease: 'easeOut' }}
                      style={{
                        position: 'fixed',
                        left: snatchedAlert.x,
                        top: snatchedAlert.y - 34,
                        transform: 'translateX(-50%)',
                        zIndex: 120,
                        pointerEvents: 'none',
                        background: theme === 'light' ? 'rgba(250, 247, 242, 0.95)' : 'rgba(0, 0, 0, 0.92)',
                        border: `1px solid ${theme === 'light' ? 'rgba(30, 28, 25, 0.35)' : 'rgba(253, 253, 251, 0.35)'}`,
                        borderRadius: 0,
                        padding: '4px 10px',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '11px',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.45)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ color: theme === 'light' ? '#1E1C19' : '#FDFDFB', fontWeight: 700 }}>
                        Stolen by {snatchedAlert.winnerCallsign}!
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Synchronized 3-Second Countdown Overlay */}
                {multiplayerCountdown !== null && (
                  <MultiplayerCountdown countdown={multiplayerCountdown} theme={theme} />
                )}
              </>
            )}

            {/* 6. REALTIME MULTIPLAYER PODIUM ARCHIVE */}
            {currentView === 'mp-podium' && (
              <PodiumArchive
                players={podiumPlayersList}
                roomCode={multiplayerRoomCode || 'ARENA'}
                theme={theme}
                onReturnToLobby={() => {
                  // If Host clicks it: broadcast RESET_LOBBY so all connected peers return together
                  if (isMultiplayerHost && multiplayerChannel) {
                    multiplayerChannel.send({
                      type: 'broadcast',
                      event: 'RESET_LOBBY',
                      payload: { roomCode: multiplayerRoomCode },
                    });
                  }
                  transitionToLobby();
                }}
                onExitArena={handleLeaveArena}
              />
            )}

            {/* FAIL-SAFE FALLBACK: Guard against unexpected view state or desync */}
            {!['landing', 'solo-game', 'solo-archive', 'mp-lobby', 'mp-game', 'mp-podium'].includes(currentView) && (
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
                onBeginSession={() => initializeGame()}
                onOpenMultiplayer={() => setCurrentView('mp-lobby')}
              />
            )}
          </ErrorBoundary>
        </div>
      )}
    </>
  );
}

export default App;
