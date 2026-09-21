import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Home, 
  Share2, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Trophy, 
  Target, 
  Info,
  Sun,
  Moon
} from 'lucide-react';
import { sounds } from './audio';

// Custom Hexagonal Skull SVG component for Game Over screen
const SkullIcon = () => (
  <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
    {/* Hexagon Border */}
    <svg className="absolute w-full h-full text-red-500 animate-pulse" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="50,3 93,28 93,78 50,97 7,78 7,28" stroke="currentColor" strokeWidth="4" fill="rgba(239, 68, 68, 0.1)"/>
    </svg>
    {/* Stylized Skull SVG */}
    <svg className="w-10 h-10 text-red-500 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 10H9.01M15 10H15.01" />
      <path d="M12 2C8.13 2 5 5.13 5 9c0 2.26 1.07 4.27 2.72 5.56l.78 3.12c.1.38.44.62.83.62h5.34c.39 0 .73-.24.83-.62l.78-3.12C17.93 13.27 19 11.26 19 9c0-3.87-3.13-7-7-7z" fill="currentColor" fillOpacity="0.2" />
      <path d="M10 22h4" />
      <path d="M9 18h6" />
    </svg>
  </div>
);

export default function App() {
  // Navigation & Game State
  const [screen, setScreen] = useState('home'); // 'home', 'countdown', 'playing', 'gameover'
  const [difficulty, setDifficulty] = useState('medium'); // 'easy', 'medium', 'hard', 'impossible'
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(12850);
  const [lastScore, setLastScore] = useState(8230);
  const [bestTime, setBestTime] = useState('00:00');
  const [timeSurvived, setTimeSurvived] = useState(0);
  const [nearMissCount, setNearMissCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // Game Settings / Controls
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [canvasElement, setCanvasElement] = useState(null);
  
  // Speed multiplier for UI feedback
  const [displaySpeed, setDisplaySpeed] = useState(1.0);

  // References
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const gameLoopRef = useRef(null);
  const stateRef = useRef({
    player: { x: 0, y: 0, vx: 0, vy: 0, radius: 12, speed: 6.5, targetX: 0, targetY: 0, trail: [] },
    obstacles: [],
    particles: [],
    keys: { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false },
    mouse: { x: 0, y: 0, isActive: false },
    touch: { startX: 0, startY: 0, playerStartX: 0, playerStartY: 0, isActive: false },
    logicalWidth: 1000,
    logicalHeight: 620,
    timeElapsed: 0,
    lastTime: 0,
    speedMultiplier: 1.0,
    spawnTimer: 0,
    scoreTimer: 0,
    nearMissCooldowns: new Map(), // obstacle.id -> timestamp
    difficultySettings: {
      easy: { baseSpeed: 0.9, spawnInterval: 1800, maxObstacles: 6, scoreMultiplier: 1 },
      medium: { baseSpeed: 1.4, spawnInterval: 1200, maxObstacles: 11, scoreMultiplier: 2 },
      hard: { baseSpeed: 2.1, spawnInterval: 800, maxObstacles: 16, scoreMultiplier: 4 },
      impossible: { baseSpeed: 3.2, spawnInterval: 500, maxObstacles: 22, scoreMultiplier: 8 }
    },
    gameTime: 0, // In seconds
    isGameOver: false,
    score: 0,
    nearMisses: 0,
    bgGridOffset: 0,
    screenShake: 0,
    slowMotionTimer: 0,
    soundMuted: false
  });

  // Load High Scores from Local Storage
  useEffect(() => {
    const localBest = localStorage.getItem('dtr_highScore');
    const localLast = localStorage.getItem('dtr_lastScore');
    const localBestTime = localStorage.getItem('dtr_bestTime');
    
    if (localBest) setHighScore(parseInt(localBest, 10));
    if (localLast) setLastScore(parseInt(localLast, 10));
    if (localBestTime) setBestTime(localBestTime);
  }, []);

  // Sync mute state with sound manager
  useEffect(() => {
    stateRef.current.soundMuted = isMuted;
  }, [isMuted]);

  // Handle countdown before game starts
  useEffect(() => {
    if (screen === 'countdown') {
      sounds.resume();
      let timer = 3;
      setCountdown(3);
      sounds.playCountdown(false);
      
      const interval = setInterval(() => {
        timer -= 1;
        if (timer > 0) {
          setCountdown(timer);
          sounds.playCountdown(false);
        } else if (timer === 0) {
          setCountdown('GO!');
          sounds.playCountdown(true);
        } else {
          clearInterval(interval);
          setScreen('playing');
          setIsPaused(false);
        }
      }, 800);
      return () => clearInterval(interval);
    }
  }, [screen]);

  // Fullscreen helper
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Keyboard Event Listeners for Game controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      const k = e.key.toLowerCase();
      const state = stateRef.current;
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k) || ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key)) {
        state.keys[e.key] = true;
        if (k !== e.key) state.keys[k] = true;
        // deactivate mouse if keyboard is pressed
        state.mouse.isActive = false;
      }
      if (e.key === 'Escape' && screen === 'playing') {
        togglePause();
      }
    };

    const handleKeyUp = (e) => {
      const k = e.key.toLowerCase();
      const state = stateRef.current;
      state.keys[e.key] = false;
      if (k !== e.key) state.keys[k] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [screen, isPaused]);

  // Share score helper
  const handleShare = () => {
    sounds.playClick();
    if (navigator.share) {
      navigator.share({
        title: "DON'T TOUCH RED",
        text: `I survived for ${timeSurvived}s and scored ${score} points on ${difficulty.toUpperCase()} difficulty in DON'T TOUCH RED! Can you beat my score?`,
        url: window.location.href
      }).catch(() => {});
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(`I scored ${score} on DON'T TOUCH RED (${difficulty.toUpperCase()} mode)! Try to beat me!`).then(() => {
        alert("Score copied to clipboard! Share it with your friends.");
      });
    }
  };

  // Pause / Resume Logic
  const togglePause = () => {
    sounds.playClick();
    setIsPaused(prev => {
      const next = !prev;
      if (next) {
        sounds.stopMusic();
        sounds.stopHeartbeat();
        sounds.stopLaserWarning();
      } else {
        const state = stateRef.current;
        sounds.playMusic(state.speedMultiplier);
        if (state.speedMultiplier >= 2.0) {
          sounds.startHeartbeat(state.speedMultiplier);
        }
      }
      return next;
    });
  };

  const quitToHome = () => {
    sounds.playClick();
    sounds.stopMusic();
    sounds.stopHeartbeat();
    sounds.stopLaserWarning();
    setScreen('home');
  };

  const handleStartGame = () => {
    sounds.playClick();
    setScreen('countdown');
  };

  // Canvas Game Loops & Mechanics
  useEffect(() => {
    if (screen !== 'playing') return;

    const canvas = canvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const state = stateRef.current;
    const currentDiff = state.difficultySettings[difficulty];

    // Reset game variables
    state.isGameOver = false;
    state.score = 0;
    state.nearMisses = 0;
    state.gameTime = 0;
    state.timeElapsed = 0;
    state.speedMultiplier = currentDiff.baseSpeed;
    state.spawnTimer = 0;
    state.scoreTimer = 0;
    state.obstacles = [];
    state.particles = [];
    state.screenShake = 0;
    state.slowMotionTimer = 0;
    state.nearMissCooldowns.clear();
    state.player.x = state.logicalWidth / 2;
    state.player.y = state.logicalHeight / 2;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.trail = [];
    state.mouse.isActive = false;

    setScore(0);
    setTimeSurvived(0);
    setNearMissCount(0);
    setDisplaySpeed(parseFloat(currentDiff.baseSpeed.toFixed(1)));

    // Play Background music
    sounds.playMusic(state.speedMultiplier);

    // Dynamic Canvas resizing based on viewport aspect ratio
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      canvas.width = width;
      canvas.height = height;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Input handlers inside canvas
    const getCanvasMousePos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = state.logicalWidth / rect.width;
      const scaleY = state.logicalHeight / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    const handleMouseMove = (e) => {
      if (isPaused) return;
      const pos = getCanvasMousePos(e);
      state.mouse.x = pos.x;
      state.mouse.y = pos.y;
      state.mouse.isActive = true;
    };

    const handleTouchStart = (e) => {
      if (isPaused || e.touches.length === 0) return;
      state.mouse.isActive = false;
      state.touch.isActive = true;
      const touch = e.touches[0];
      state.touch.startX = touch.clientX;
      state.touch.startY = touch.clientY;
      state.touch.playerStartX = state.player.x;
      state.touch.playerStartY = state.player.y;
    };

    const handleTouchMove = (e) => {
      if (isPaused || !state.touch.isActive || e.touches.length === 0) return;
      const touch = e.touches[0];
      const dx = touch.clientX - state.touch.startX;
      const dy = touch.clientY - state.touch.startY;
      
      // Scale relative motion
      const scale = 1.3;
      state.player.x = Math.max(state.player.radius, Math.min(state.logicalWidth - state.player.radius, state.touch.playerStartX + dx * scale));
      state.player.y = Math.max(state.player.radius, Math.min(state.logicalHeight - state.player.radius, state.touch.playerStartY + dy * scale));
    };

    const handleTouchEnd = () => {
      state.touch.isActive = false;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd);

    // Obstacle Generator Helper
    const spawnObstacle = () => {
      if (state.obstacles.length >= currentDiff.maxObstacles) return;

      const types = ['circle', 'bouncing', 'rotating_bar', 'laser', 'expanding_ring', 'zigzag', 'polygon', 'mine'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      const id = Math.random().toString(36).substr(2, 9);
      
      const newObs = { id, type: randomType };
      
      // Keep obstacles away from player spawn initially
      let x = 0, y = 0;
      let safeSpawn = false;
      let attempts = 0;
      
      while (!safeSpawn && attempts < 20) {
        attempts++;
        const spawnEdge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
        
        if (spawnEdge === 0) {
          x = Math.random() * state.logicalWidth;
          y = -50;
        } else if (spawnEdge === 1) {
          x = state.logicalWidth + 50;
          y = Math.random() * state.logicalHeight;
        } else if (spawnEdge === 2) {
          x = Math.random() * state.logicalWidth;
          y = state.logicalHeight + 50;
        } else {
          x = -50;
          y = Math.random() * state.logicalHeight;
        }

        // Distance check from player
        const dx = x - state.player.x;
        const dy = y - state.player.y;
        if (Math.sqrt(dx * dx + dy * dy) > 180) {
          safeSpawn = true;
        }
      }

      // Configure individual obstacle types
      const baseSpeedScale = state.speedMultiplier;
      
      if (randomType === 'circle') {
        const targetX = Math.random() * state.logicalWidth;
        const targetY = Math.random() * state.logicalHeight;
        const angle = Math.atan2(targetY - y, targetX - x);
        
        newObs.x = x;
        newObs.y = y;
        newObs.vx = Math.cos(angle) * (2 + Math.random() * 3) * baseSpeedScale;
        newObs.vy = Math.sin(angle) * (2 + Math.random() * 3) * baseSpeedScale;
        newObs.radius = 15 + Math.random() * 20;
      } 
      else if (randomType === 'bouncing') {
        newObs.x = Math.max(40, Math.min(state.logicalWidth - 40, x === -50 || x === state.logicalWidth + 50 ? state.logicalWidth / 2 : x));
        newObs.y = Math.max(40, Math.min(state.logicalHeight - 40, y === -50 || y === state.logicalHeight + 50 ? state.logicalHeight / 2 : y));
        const angle = Math.random() * Math.PI * 2;
        newObs.vx = Math.cos(angle) * (2.5 + Math.random() * 2.5) * baseSpeedScale;
        newObs.vy = Math.sin(angle) * (2.5 + Math.random() * 2.5) * baseSpeedScale;
        newObs.radius = 15 + Math.random() * 12;
      }
      else if (randomType === 'rotating_bar') {
        newObs.x = 100 + Math.random() * (state.logicalWidth - 200);
        newObs.y = 100 + Math.random() * (state.logicalHeight - 200);
        newObs.vx = (Math.random() - 0.5) * 1.5 * baseSpeedScale;
        newObs.vy = (Math.random() - 0.5) * 1.5 * baseSpeedScale;
        newObs.length = 120 + Math.random() * 60;
        newObs.angle = Math.random() * Math.PI * 2;
        newObs.angleSpeed = (0.015 + Math.random() * 0.02) * (Math.random() > 0.5 ? 1 : -1) * Math.sqrt(baseSpeedScale);
      }
      else if (randomType === 'laser') {
        const isVertical = Math.random() > 0.5;
        newObs.isVertical = isVertical;
        newObs.pos = isVertical 
          ? 100 + Math.random() * (state.logicalWidth - 200)
          : 100 + Math.random() * (state.logicalHeight - 200);
        newObs.timer = 1000; // 1s warning
        newObs.duration = 1000; // 1s active
        newObs.warning = true;
        newObs.active = false;
        newObs.thickness = 12;
        sounds.playLaserWarning();
      }
      else if (randomType === 'expanding_ring') {
        newObs.x = 100 + Math.random() * (state.logicalWidth - 200);
        newObs.y = 100 + Math.random() * (state.logicalHeight - 200);
        newObs.currentRadius = 5;
        newObs.maxRadius = 130 + Math.random() * 50;
        newObs.thickness = 10;
        newObs.growSpeed = (1.5 + Math.random() * 1.5) * baseSpeedScale;
      }
      else if (randomType === 'zigzag') {
        newObs.x = x;
        newObs.y = y;
        const targetX = state.logicalWidth / 2;
        const targetY = state.logicalHeight / 2;
        newObs.baseAngle = Math.atan2(targetY - y, targetX - x);
        newObs.speed = (3 + Math.random() * 2) * baseSpeedScale;
        newObs.zigTime = 0;
        newObs.radius = 16;
      }
      else if (randomType === 'polygon') {
        newObs.x = x;
        newObs.y = y;
        const targetX = Math.random() * state.logicalWidth;
        const targetY = Math.random() * state.logicalHeight;
        const angle = Math.atan2(targetY - y, targetX - x);
        newObs.vx = Math.cos(angle) * (2 + Math.random() * 2) * baseSpeedScale;
        newObs.vy = Math.sin(angle) * (2 + Math.random() * 2) * baseSpeedScale;
        newObs.radius = 20 + Math.random() * 15;
        newObs.sides = Math.random() > 0.5 ? 6 : 3; // hexagon or triangle
        newObs.angle = 0;
        newObs.rotSpeed = (0.02 + Math.random() * 0.03) * Math.sqrt(baseSpeedScale);
      }
      else if (randomType === 'mine') {
        // Mine spawns inside, static, then charges
        newObs.x = 100 + Math.random() * (state.logicalWidth - 200);
        newObs.y = 100 + Math.random() * (state.logicalHeight - 200);
        newObs.radius = 15;
        newObs.activeDelay = 1200; // 1.2s delay
        newObs.active = false;
        newObs.vx = 0;
        newObs.vy = 0;
        newObs.blinkTimer = 0;
      }

      state.obstacles.push(newObs);
    };

    // Trigger GameOver Sequence
    const triggerGameOver = () => {
      state.isGameOver = true;
      sounds.stopLaserWarning();
      sounds.stopMusic();
      sounds.stopHeartbeat();
      sounds.playCollision();

      // Screen Shake
      state.screenShake = 35;
      
      // Spawn explosion particles
      const pCount = 70;
      for (let i = 0; i < pCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 8;
        state.particles.push({
          x: state.player.x,
          y: state.player.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 3 + Math.random() * 5,
          color: '#06b6d4',
          alpha: 1.0,
          decay: 0.01 + Math.random() * 0.02,
          glow: true
        });
      }

      // High Score update
      const currentScore = state.score;
      const localHighScore = localStorage.getItem('dtr_highScore') ? parseInt(localStorage.getItem('dtr_highScore'), 10) : 0;
      let newBest = false;
      if (currentScore > localHighScore) {
        localStorage.setItem('dtr_highScore', currentScore.toString());
        setHighScore(currentScore);
        newBest = true;
      }
      
      localStorage.setItem('dtr_lastScore', currentScore.toString());
      setLastScore(currentScore);

      // Best Time update
      const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = Math.floor(secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
      };
      
      const currentTimeStr = formatTime(state.gameTime);
      const localBestTimeStr = localStorage.getItem('dtr_bestTime') || '00:00';
      const timeToSecs = (str) => {
        const parts = str.split(':');
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      };

      if (state.gameTime > timeToSecs(localBestTimeStr)) {
        localStorage.setItem('dtr_bestTime', currentTimeStr);
        setBestTime(currentTimeStr);
      }

      // Enter slow motion for death animation
      state.slowMotionTimer = 45; // 45 frames of slowmo (approx 0.75s)
      sounds.playGameOver();
    };

    // Core Game Update Loop (60 FPS)
    const updateGame = (dt) => {
      if (state.isGameOver) {
        // Run physics on particles and trigger game over screen after slowmo ends
        state.particles.forEach(p => {
          p.x += p.vx * 0.3;
          p.y += p.vy * 0.3;
          p.alpha -= p.decay;
        });
        state.particles = state.particles.filter(p => p.alpha > 0);

        if (state.slowMotionTimer > 0) {
          state.slowMotionTimer--;
        } else {
          setScore(state.score);
          setTimeSurvived(Math.floor(state.gameTime));
          setNearMissCount(state.nearMisses);
          setScreen('gameover');
        }
        return;
      }

      if (isPaused) return;

      // 1. Difficulty & Speed Progression (Every 10 Seconds)
      state.timeElapsed += dt;
      const prevGameTime = state.gameTime;
      state.gameTime = state.timeElapsed / 1000;
      
      // Update timer in react every integer second change
      if (Math.floor(state.gameTime) !== Math.floor(prevGameTime)) {
        setTimeSurvived(Math.floor(state.gameTime));
        
        // Add survival points per second
        state.score += 10 * currentDiff.scoreMultiplier;
        setScore(state.score);
        
        // Speed scaling trigger every 10 seconds
        if (Math.floor(state.gameTime) % 10 === 0 && Math.floor(state.gameTime) > 0) {
          state.speedMultiplier += 0.15;
          setDisplaySpeed(parseFloat(state.speedMultiplier.toFixed(1)));
          sounds.setMusicSpeed(state.speedMultiplier);

          // Heartbeat sound triggers at 2.0x speed
          if (state.speedMultiplier >= 2.0) {
            sounds.startHeartbeat(state.speedMultiplier);
          }
        }
      }

      // 2. Score Increment (Continuous / time-based)
      state.scoreTimer += dt;
      if (state.scoreTimer >= 100) { // Add fractional score points
        state.score += 1 * currentDiff.scoreMultiplier;
        setScore(state.score);
        state.scoreTimer = 0;
      }

      // 3. Spawning Obstacles
      state.spawnTimer += dt;
      const currentSpawnInterval = Math.max(300, currentDiff.spawnInterval - (state.gameTime * 15));
      if (state.spawnTimer >= currentSpawnInterval) {
        spawnObstacle();
        state.spawnTimer = 0;
      }

      // 4. Update Player Physics
      const player = state.player;
      
      if (state.mouse.isActive) {
        // Move towards target smoothly (lerp)
        player.x += (state.mouse.x - player.x) * 0.16;
        player.y += (state.mouse.y - player.y) * 0.16;
      } else if (!state.touch.isActive) {
        // Move by keyboard inputs
        let ax = 0;
        let ay = 0;
        if (state.keys.w || state.keys.ArrowUp) ay -= 1;
        if (state.keys.s || state.keys.ArrowDown) ay += 1;
        if (state.keys.a || state.keys.ArrowLeft) ax -= 1;
        if (state.keys.d || state.keys.ArrowRight) ax += 1;

        if (ax !== 0 && ay !== 0) {
          // Normalize diagonal movement speed
          const len = Math.sqrt(ax * ax + ay * ay);
          ax /= len;
          ay /= len;
        }

        // Apply acceleration & speed multiplier
        const accel = 1.1 * Math.sqrt(state.speedMultiplier);
        player.vx += ax * accel;
        player.vy += ay * accel;
        
        // Friction
        player.vx *= 0.82;
        player.vy *= 0.82;

        player.x += player.vx;
        player.y += player.vy;
      }

      // Bound player to Arena limits
      player.x = Math.max(player.radius, Math.min(state.logicalWidth - player.radius, player.x));
      player.y = Math.max(player.radius, Math.min(state.logicalHeight - player.radius, player.y));

      // Append trail particles
      if (Math.abs(player.vx) > 0.1 || Math.abs(player.vy) > 0.1 || state.mouse.isActive || state.touch.isActive) {
        if (Math.random() > 0.3) {
          state.particles.push({
            x: player.x - (player.vx * 1.5) + (Math.random() - 0.5) * 6,
            y: player.y - (player.vy * 1.5) + (Math.random() - 0.5) * 6,
            vx: -player.vx * 0.2 + (Math.random() - 0.5) * 1,
            vy: -player.vy * 0.2 + (Math.random() - 0.5) * 1,
            radius: 2 + Math.random() * 3,
            color: 'rgba(6, 182, 212, 0.7)',
            alpha: 0.7,
            decay: 0.04,
            glow: true
          });
        }
      }

      // 5. Update Background scrolling
      state.bgGridOffset = (state.bgGridOffset + 0.8 * state.speedMultiplier) % 40;

      // 6. Update Obstacles & Collision & Near Misses
      const now = state.timeElapsed;
      
      state.obstacles.forEach((obs) => {
        // Movement & Logic per obstacle type
        if (obs.type === 'circle' || obs.type === 'bouncing' || obs.type === 'polygon') {
          obs.x += obs.vx;
          obs.y += obs.vy;

          if (obs.type === 'bouncing') {
            // Wall bounce mechanics
            if (obs.x - obs.radius <= 0) {
              obs.x = obs.radius;
              obs.vx = -obs.vx;
            } else if (obs.x + obs.radius >= state.logicalWidth) {
              obs.x = state.logicalWidth - obs.radius;
              obs.vx = -obs.vx;
            }

            if (obs.y - obs.radius <= 0) {
              obs.y = obs.radius;
              obs.vy = -obs.vy;
            } else if (obs.y + obs.radius >= state.logicalHeight) {
              obs.y = state.logicalHeight - obs.radius;
              obs.vy = -obs.vy;
            }
          }

          if (obs.type === 'polygon') {
            obs.angle += obs.rotSpeed;
          }
        } 
        else if (obs.type === 'rotating_bar') {
          obs.x += obs.vx;
          obs.y += obs.vy;
          obs.angle += obs.angleSpeed;

          // Gentle bounce off screen limits to keep bars in arena
          if (obs.x < 50 || obs.x > state.logicalWidth - 50) obs.vx = -obs.vx;
          if (obs.y < 50 || obs.y > state.logicalHeight - 50) obs.vy = -obs.vy;
        }
        else if (obs.type === 'laser') {
          obs.timer -= 16.67; // Assuming 60fps
          if (obs.warning && obs.timer <= 0) {
            obs.warning = false;
            obs.active = true;
            obs.timer = obs.duration;
            sounds.stopLaserWarning();
          } else if (obs.active && obs.timer <= 0) {
            obs.active = false;
            obs.dead = true;
          }
        }
        else if (obs.type === 'expanding_ring') {
          obs.currentRadius += obs.growSpeed;
          if (obs.currentRadius >= obs.maxRadius) {
            obs.dead = true;
          }
        }
        else if (obs.type === 'zigzag') {
          obs.zigTime += dt * 0.005;
          const oscAngle = Math.sin(obs.zigTime) * 0.9;
          const currentAngle = obs.baseAngle + oscAngle;
          obs.x += Math.cos(currentAngle) * obs.speed;
          obs.y += Math.sin(currentAngle) * obs.speed;
        }
        else if (obs.type === 'mine') {
          if (!obs.active) {
            obs.activeDelay -= 16.67;
            obs.blinkTimer = (obs.blinkTimer + 1) % 15;
            if (obs.activeDelay <= 0) {
              obs.active = true;
              // Launch directly at player position
              const angle = Math.atan2(player.y - obs.y, player.x - obs.x);
              const speed = (5.5 + Math.random() * 2) * state.speedMultiplier;
              obs.vx = Math.cos(angle) * speed;
              obs.vy = Math.sin(angle) * speed;
            }
          } else {
            obs.x += obs.vx;
            obs.y += obs.vy;
          }
        }

        // --- Collision Check (Pixel Accurate) ---
        let isColliding = false;
        let isNearMiss = false;
        const nearMissThreshold = player.radius + 20; // 20px close

        if (obs.type === 'circle' || obs.type === 'bouncing' || obs.type === 'zigzag' || obs.type === 'mine') {
          const dx = player.x - obs.x;
          const dy = player.y - obs.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < player.radius + obs.radius) {
            isColliding = true;
          } else if (dist < player.radius + obs.radius + nearMissThreshold) {
            isNearMiss = true;
          }
        }
        else if (obs.type === 'polygon') {
          const dx = player.x - obs.x;
          const dy = player.y - obs.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          // Polygons approximated by bounding circle for collision, vertices for visual
          if (dist < player.radius + obs.radius) {
            isColliding = true;
          } else if (dist < player.radius + obs.radius + nearMissThreshold) {
            isNearMiss = true;
          }
        }
        else if (obs.type === 'expanding_ring') {
          const dx = player.x - obs.x;
          const dy = player.y - obs.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const ringRadius = obs.currentRadius;
          const halfThickness = obs.thickness / 2;
          
          // Collision occurs if player circle overlaps the ring line segment
          const overlap = Math.abs(dist - ringRadius);
          if (overlap < player.radius + halfThickness) {
            isColliding = true;
          } else if (overlap < player.radius + halfThickness + nearMissThreshold) {
            isNearMiss = true;
          }
        }
        else if (obs.type === 'rotating_bar') {
          // Line segment collision: bar center is (obs.x, obs.y), length is obs.length, angle is obs.angle
          const cos = Math.cos(obs.angle);
          const sin = Math.sin(obs.angle);
          const hLength = obs.length / 2;

          const p1 = { x: obs.x - cos * hLength, y: obs.y - sin * hLength };
          const p2 = { x: obs.x + cos * hLength, y: obs.y + sin * hLength };

          // Clamp player center onto segment
          const l2 = obs.length * obs.length;
          let t = ((player.x - p1.x) * (p2.x - p1.x) + (player.y - p1.y) * (p2.y - p1.y)) / l2;
          t = Math.max(0, Math.min(1, t));
          
          const closestX = p1.x + t * (p2.x - p1.x);
          const closestY = p1.y + t * (p2.y - p1.y);

          const dx = player.x - closestX;
          const dy = player.y - closestY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < player.radius + 6) { // Bar has visual width of ~12px (radius 6)
            isColliding = true;
          } else if (dist < player.radius + 6 + nearMissThreshold) {
            isNearMiss = true;
          }
        }
        else if (obs.type === 'laser') {
          if (obs.active) {
            let dist = 9999;
            if (obs.isVertical) {
              dist = Math.abs(player.x - obs.pos);
            } else {
              dist = Math.abs(player.y - obs.pos);
            }

            if (dist < player.radius + (obs.thickness / 2)) {
              isColliding = true;
            } else if (dist < player.radius + (obs.thickness / 2) + nearMissThreshold) {
              isNearMiss = true;
            }
          }
        }

        if (isColliding) {
          triggerGameOver();
        } 
        else if (isNearMiss && !isColliding) {
          // Trigger Near Miss Bonus with local cooldown to prevent repeating score award
          const cooldownDuration = 1000; // 1s cooldown per obstacle
          const lastMiss = state.nearMissCooldowns.get(obs.id);
          
          if (!lastMiss || now - lastMiss > cooldownDuration) {
            state.nearMissCooldowns.set(obs.id, now);
            state.nearMisses++;
            state.score += 10;
            setScore(state.score);
            setNearMissCount(state.nearMisses);
            sounds.playNearMiss();

            // Spawn floating text particle
            state.particles.push({
              x: player.x,
              y: player.y - 20,
              vx: (Math.random() - 0.5) * 1.5,
              vy: -2.5,
              radius: 0, // Not a circle
              color: '#fbbf24',
              alpha: 1.0,
              decay: 0.02,
              text: '+10 NEAR MISS'
            });
          }
        }
      });

      // Clear off-screen or dead obstacles
      state.obstacles = state.obstacles.filter((obs) => {
        if (obs.dead) return false;
        
        // Out of bounds check for moving obstacles
        const margin = 100;
        if (obs.type === 'circle' || obs.type === 'zigzag' || obs.type === 'mine') {
          if (obs.x < -margin || obs.x > state.logicalWidth + margin ||
              obs.y < -margin || obs.y > state.logicalHeight + margin) {
            return false;
          }
        }
        return true;
      });

      // 7. Update Particles
      state.particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
      });
      state.particles = state.particles.filter((p) => p.alpha > 0);

      // Handle screen shake decay
      if (state.screenShake > 0) state.screenShake -= 1.5;
    };

    // Core Game Render Loop
    const drawGame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Camera Shake
      if (state.screenShake > 0) {
        const dx = (Math.random() - 0.5) * state.screenShake;
        const dy = (Math.random() - 0.5) * state.screenShake;
        ctx.translate(dx, dy);
      }

      // Establish logical scaling (1000x620)
      const scaleX = canvas.width / state.logicalWidth;
      const scaleY = canvas.height / state.logicalHeight;
      ctx.scale(scaleX, scaleY);

      // 1. Draw Cyberpunk Neon grid background
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.035)';
      ctx.lineWidth = 1;
      const gridSpacing = 40;
      
      // Moving vertical lines
      for (let x = 0; x < state.logicalWidth + gridSpacing; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, state.logicalHeight);
        ctx.stroke();
      }
      // Moving horizontal lines
      const yOffset = state.bgGridOffset;
      for (let y = yOffset; y < state.logicalHeight + gridSpacing; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(state.logicalWidth, y);
        ctx.stroke();
      }

      // Ambient floating dust particles
      if (Math.random() > 0.8 && state.particles.filter(p => !p.glow && !p.text).length < 25) {
        state.particles.push({
          x: Math.random() * state.logicalWidth,
          y: state.logicalHeight + 10,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -(0.3 + Math.random() * 0.5),
          radius: 0.8 + Math.random() * 1.5,
          color: 'rgba(6, 182, 212, 0.15)',
          alpha: 0.3 + Math.random() * 0.4,
          decay: 0.001
        });
      }

      // 2. Draw Obstacles
      state.obstacles.forEach((obs) => {
        ctx.save();
        ctx.shadowColor = '#ef4444';
        
        if (obs.type === 'circle' || obs.type === 'bouncing' || obs.type === 'zigzag') {
          ctx.shadowBlur = 15;
          ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } 
        else if (obs.type === 'polygon') {
          ctx.shadowBlur = 15;
          ctx.strokeStyle = '#ef4444';
          ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let i = 0; i < obs.sides; i++) {
            const angle = obs.angle + (i * Math.PI * 2 / obs.sides);
            const vx = obs.x + Math.cos(angle) * obs.radius;
            const vy = obs.y + Math.sin(angle) * obs.radius;
            if (i === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        else if (obs.type === 'rotating_bar') {
          ctx.shadowBlur = 18;
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          
          ctx.beginPath();
          const cos = Math.cos(obs.angle);
          const sin = Math.sin(obs.angle);
          const hLength = obs.length / 2;
          ctx.moveTo(obs.x - cos * hLength, obs.y - sin * hLength);
          ctx.lineTo(obs.x + cos * hLength, obs.y + sin * hLength);
          ctx.stroke();

          // Center hinge
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 5;
          ctx.shadowColor = '#ffffff';
          ctx.beginPath();
          ctx.arc(obs.x, obs.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        else if (obs.type === 'expanding_ring') {
          ctx.shadowBlur = 15;
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = obs.thickness;
          ctx.beginPath();
          ctx.arc(obs.x, obs.y, obs.currentRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
        else if (obs.type === 'laser') {
          if (obs.warning) {
            // Drawn dotted orange/red warning lane
            ctx.shadowBlur = 4;
            ctx.shadowColor = '#f97316';
            ctx.strokeStyle = 'rgba(249, 115, 22, 0.55)';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 6]);
            
            ctx.beginPath();
            if (obs.isVertical) {
              ctx.moveTo(obs.pos, 0);
              ctx.lineTo(obs.pos, state.logicalHeight);
            } else {
              ctx.moveTo(0, obs.pos);
              ctx.lineTo(state.logicalWidth, obs.pos);
            }
            ctx.stroke();
            ctx.setLineDash([]); // Reset

            // Warning icon/text
            ctx.fillStyle = 'rgba(249, 115, 22, 0.7)';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            if (obs.isVertical) {
              ctx.fillText('! LASER WALL ALERT !', obs.pos, 30);
            } else {
              ctx.fillText('! LASER WALL ALERT !', state.logicalWidth / 2, obs.pos - 10);
            }
          } 
          else if (obs.active) {
            // Highly glowing active laser
            ctx.shadowBlur = 22;
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = obs.thickness;
            
            ctx.beginPath();
            if (obs.isVertical) {
              ctx.moveTo(obs.pos, 0);
              ctx.lineTo(obs.pos, state.logicalHeight);
            } else {
              ctx.moveTo(0, obs.pos);
              ctx.lineTo(state.logicalWidth, obs.pos);
            }
            ctx.stroke();

            // Core laser beam (white light)
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#ffffff';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            if (obs.isVertical) {
              ctx.moveTo(obs.pos, 0);
              ctx.lineTo(obs.pos, state.logicalHeight);
            } else {
              ctx.moveTo(0, obs.pos);
              ctx.lineTo(state.logicalWidth, obs.pos);
            }
            ctx.stroke();
          }
        }
        else if (obs.type === 'mine') {
          ctx.shadowBlur = obs.active ? 15 : 6;
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.fillStyle = obs.active ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.1)';
          
          if (!obs.active && obs.blinkTimer > 7) {
            // Blink warning effect
            ctx.shadowColor = '#ffffff';
            ctx.strokeStyle = '#ffffff';
          }

          // Mine star/cross shape
          ctx.beginPath();
          ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Spikes
          ctx.beginPath();
          ctx.moveTo(obs.x - 22, obs.y); ctx.lineTo(obs.x + 22, obs.y);
          ctx.moveTo(obs.x, obs.y - 22); ctx.lineTo(obs.x, obs.y + 22);
          ctx.stroke();
        }
        ctx.restore();
      });

      // 3. Draw Particles (Trails & explosions)
      state.particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        
        if (p.text) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
          ctx.fillStyle = p.color;
          ctx.font = 'bold 15px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(p.text, p.x, p.y);
        } else {
          if (p.glow) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color;
          }
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // 4. Draw Player (Glowing Cyan Energy Orb)
      if (!state.isGameOver) {
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#06b6d4';
        
        // Inner glowing core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(state.player.x, state.player.y, state.player.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
        
        // Outer glowing rim
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(state.player.x, state.player.y, state.player.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }

      ctx.restore();
    };

    // Frame Animator Loop wrapper
    let accumulatedTime = 0;
    let lastStamp = performance.now();

    const loop = (timestamp) => {
      if (isPaused) {
        lastStamp = timestamp;
        gameLoopRef.current = requestAnimationFrame(loop);
        return;
      }

      const frameTime = timestamp - lastStamp;
      lastStamp = timestamp;

      // Handle dt safety clamping
      const dt = Math.min(frameTime, 100);

      updateGame(dt);
      drawGame();

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(gameLoopRef.current);
      window.removeEventListener('resize', resizeCanvas);
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [screen, difficulty, isPaused, canvasElement]);

  // Convert gameTime to MM:SS format
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full min-h-screen flex flex-col items-center justify-center overflow-hidden grid-bg transition-colors duration-500 select-none ${
        isDarkTheme ? 'bg-slate-950 text-slate-100' : 'bg-slate-900 text-slate-100'
      }`}
    >
      {/* Dynamic Moving Ambient Neon Grid Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.06) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          animation: 'grid-move 8s linear infinite',
          animationPlayState: screen === 'playing' && !isPaused ? 'running' : 'paused'
        }}
      />

      {/* Screen Views */}
      <AnimatePresence mode="wait">
        
        {/* 1. HOME SCREEN */}
        {screen === 'home' && (
          <motion.div 
            key="home"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
            className="z-10 w-full max-w-2xl px-6 py-8 glass rounded-2xl shadow-2xl flex flex-col text-center"
          >
            {/* Header Settings Bar */}
            <div className="flex items-center justify-between w-full mb-8">
              <button 
                onClick={() => { sounds.playClick(); setShowHowToPlay(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-cyan-400 cursor-pointer transition"
              >
                <Info size={14} />
                How to Play
              </button>
              
              <div className="flex items-center gap-3">
                {/* Audio Toggle */}
                <button 
                  onClick={() => {
                    const muted = sounds.toggleMute();
                    setIsMuted(muted);
                  }}
                  className="p-2 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-800 hover:text-cyan-400 text-slate-300 transition cursor-pointer"
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                {/* Fullscreen Toggle */}
                <button 
                  onClick={() => { sounds.playClick(); toggleFullscreen(); }}
                  className="p-2 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-800 hover:text-cyan-400 text-slate-300 transition cursor-pointer"
                >
                  <Maximize2 size={16} />
                </button>
                {/* Theme Toggle (Purely Aesthetic) */}
                <button 
                  onClick={() => { sounds.playClick(); setIsDarkTheme(!isDarkTheme); }}
                  className="p-2 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-800 hover:text-cyan-400 text-slate-300 transition cursor-pointer"
                >
                  {isDarkTheme ? <Sun size={16} /> : <Moon size={16} />}
                </button>
              </div>
            </div>

            {/* Cyberpunk Title Logo */}
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-black tracking-widest text-cyan-400 glow-cyan mb-1">
                DON'T TOUCH
              </h1>
              <h1 className="text-7xl md:text-8xl font-extrabold tracking-widest text-red-500 glow-red transform -skew-x-6">
                RED
              </h1>
              <p className="mt-4 text-slate-400 text-xs md:text-sm font-medium tracking-wide">
                One mistake. One touch. Game Over.
              </p>
            </div>

            {/* Play Button */}
            <div className="mb-10 flex justify-center">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartGame}
                className="relative group px-14 py-4 rounded-full bg-gradient-to-r from-cyan-600 to-cyan-500 border-2 border-cyan-400 shadow-glow-cyan text-slate-950 font-black tracking-widest text-lg flex items-center gap-3 transition cursor-pointer"
              >
                <Play size={20} fill="currentColor" />
                PLAY
              </motion.button>
            </div>

            {/* Select Difficulty Segmented Bar */}
            <div className="mb-10">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-3">Select Difficulty</p>
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
                {['easy', 'medium', 'hard', 'impossible'].map((d) => {
                  const isActive = difficulty === d;
                  const dColor = 
                    d === 'easy' ? 'text-green-400 border-green-500 bg-green-500/10' :
                    d === 'medium' ? 'text-cyan-400 border-cyan-500 bg-cyan-500/10' :
                    d === 'hard' ? 'text-purple-400 border-purple-500 bg-purple-500/10' :
                    'text-red-500 border-red-500 bg-red-500/10';
                  
                  return (
                    <button
                      key={d}
                      onClick={() => { sounds.playClick(); setDifficulty(d); }}
                      className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer border ${
                        isActive 
                          ? `${dColor} border-opacity-70 shadow-sm` 
                          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-800 bg-slate-950/50">
                <div className="p-3 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Trophy size={20} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Best Score</p>
                  <p className="text-xl font-extrabold text-cyan-400 glow-cyan">{highScore.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-800 bg-slate-950/50">
                <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
                  <Target size={20} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Last Score</p>
                  <p className="text-xl font-extrabold text-purple-400" style={{ textShadow: '0 0 10px rgba(168, 85, 247, 0.4)' }}>
                    {lastScore.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 2. COUNTDOWN OVERLAY */}
        {screen === 'countdown' && (
          <motion.div 
            key="countdown"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.8 }}
            transition={{ duration: 0.2 }}
            className="z-20 font-black tracking-widest text-8xl md:text-9xl text-cyan-400 glow-cyan flex items-center justify-center"
          >
            {countdown}
          </motion.div>
        )}

        {/* 3. PLAYING SCREEN (HUD + CANVAS + BOTTOM PROGRESS) */}
        {screen === 'playing' && (
          <div key="playing" className="relative z-10 w-full h-full flex flex-col px-4 py-4 md:px-8 md:py-6">
            
            {/* Top Bar HUD */}
            <div className="flex flex-wrap items-center justify-between gap-4 w-full mb-3 select-none">
              
              {/* Score & HighScore Card */}
              <div className="flex items-center gap-6">
                <div className="text-left">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Score</span>
                  <span className="text-2xl font-black text-cyan-400 glow-cyan">{score.toLocaleString()}</span>
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">HighScore</span>
                  <span className="text-2xl font-black text-purple-400" style={{ textShadow: '0 0 8px rgba(168, 85, 247, 0.4)' }}>
                    {highScore.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Glowing Timer Circle */}
              <div className="relative w-16 h-16 flex flex-col items-center justify-center">
                <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
                  <circle 
                    cx="18" 
                    cy="18" 
                    r="16" 
                    fill="none" 
                    stroke="#06b6d4" 
                    strokeWidth="2.5" 
                    strokeDasharray="100" 
                    strokeDashoffset={100 - (Math.floor(timeSurvived) % 60) * 1.67}
                    strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0 0 4px #06b6d4)' }}
                  />
                </svg>
                <span className="text-[8px] font-bold uppercase text-slate-400 tracking-wider relative -bottom-1">Time</span>
                <span className="text-sm font-black text-slate-100 relative -top-0.5">{formatTime(timeSurvived)}</span>
              </div>

              {/* Speed & Difficulty Card */}
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Speed</span>
                  <span className="text-2xl font-black text-red-500 glow-red">{displaySpeed}x</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Difficulty</span>
                  <span className={`text-2xl font-black uppercase ${
                    difficulty === 'easy' ? 'text-green-400' :
                    difficulty === 'medium' ? 'text-cyan-400' :
                    difficulty === 'hard' ? 'text-purple-400' :
                    'text-red-500 glow-red'
                  }`}>
                    {difficulty}
                  </span>
                </div>

                {/* Pause & Restart Buttons */}
                <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
                  <button 
                    onClick={togglePause}
                    className="p-2.5 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 cursor-pointer transition"
                  >
                    <Pause size={16} fill="currentColor" />
                  </button>
                  <button 
                    onClick={() => { sounds.playClick(); setScreen('countdown'); }}
                    className="p-2.5 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 cursor-pointer transition"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
              </div>

            </div>

            {/* Main Interactive Canvas Arena */}
            <div className="flex-grow w-full relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/70 shadow-2xl">
              <canvas 
                ref={setCanvasElement}
                className="absolute inset-0 w-full h-full block cursor-none"
              />
              
              {/* Tap to start guide overlay for mobile */}
              {!stateRef.current.mouse.isActive && !stateRef.current.touch.isActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-500 text-xs tracking-widest font-semibold animate-pulse select-none">
                  DRAG FINGER OR USE WASD TO MOVE
                </div>
              )}
            </div>

            {/* Bottom Status Intensity Bar */}
            <div className="mt-3 flex items-center justify-between w-full px-2 select-none">
              <div className="flex items-center gap-3 flex-grow max-w-xl">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider whitespace-nowrap">Speed Increase</span>
                
                {/* Segmented Intensity Bar */}
                <div className="flex gap-0.5 flex-grow bg-slate-950 p-1 rounded-md border border-slate-800">
                  {Array.from({ length: 15 }).map((_, i) => {
                    const step = i * 0.2 + 1.0;
                    const isActive = displaySpeed >= step;
                    return (
                      <div 
                        key={i} 
                        className={`h-2 flex-grow rounded-sm transition ${
                          isActive 
                            ? 'bg-gradient-to-r from-cyan-500 to-purple-500 shadow-glow-cyan' 
                            : 'bg-slate-900'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
              <span className="text-xs font-bold text-slate-400 pl-4">{displaySpeed}x</span>
            </div>

            {/* Pause Menu Overlay */}
            {isPaused && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/85 backdrop-blur-md">
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-xs p-6 glass rounded-2xl text-center border border-slate-800 shadow-2xl"
                >
                  <h2 className="text-2xl font-black text-cyan-400 glow-cyan mb-6">GAME PAUSED</h2>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={togglePause}
                      className="py-3 px-6 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-extrabold text-sm tracking-wider flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <Play size={16} fill="currentColor" />
                      RESUME
                    </button>
                    <button 
                      onClick={() => { sounds.playClick(); setScreen('countdown'); }}
                      className="py-3 px-6 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-800 text-slate-300 font-extrabold text-sm tracking-wider flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <RotateCcw size={16} />
                      RESTART
                    </button>
                    <button 
                      onClick={quitToHome}
                      className="py-3 px-6 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-800 text-slate-300 font-extrabold text-sm tracking-wider flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <Home size={16} />
                      HOME
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

          </div>
        )}

        {/* 4. GAME OVER SCREEN */}
        {screen === 'gameover' && (
          <motion.div 
            key="gameover"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
            className="z-10 w-full max-w-2xl px-6 py-8 glass rounded-2xl shadow-2xl flex flex-col text-center border border-red-500/20 shadow-red-500/5"
          >
            {/* Hexagonal Skull Warning Banner */}
            <div className="mb-6">
              <SkullIcon />
            </div>

            {/* Red Glowing Game Over Title */}
            <div className="mb-8">
              <h1 className="text-5xl md:text-6xl font-black tracking-widest text-red-500 glow-red">
                GAME OVER
              </h1>
              <p className="mt-2 text-slate-400 text-xs md:text-sm font-medium tracking-wide">
                One mistake. One touch. Game Over.
              </p>
            </div>

            {/* Stats Cards Grid (Final, Best, Time, Near Misses) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Final Score</p>
                <p className="text-xl font-extrabold text-cyan-400 glow-cyan">{score.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Best Score</p>
                <p className="text-xl font-extrabold text-amber-400" style={{ textShadow: '0 0 8px rgba(251, 191, 36, 0.4)' }}>
                  {highScore.toLocaleString()}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Time Survived</p>
                <p className="text-xl font-extrabold text-purple-400" style={{ textShadow: '0 0 8px rgba(168, 85, 247, 0.4)' }}>
                  {formatTime(timeSurvived)}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Near Misses</p>
                <p className="text-xl font-extrabold text-orange-400" style={{ textShadow: '0 0 8px rgba(249, 115, 34, 0.4)' }}>
                  {nearMissCount}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
              <button 
                onClick={() => { sounds.playClick(); setScreen('countdown'); }}
                className="w-full sm:w-auto px-10 py-3.5 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 border border-cyan-400 shadow-glow-cyan text-slate-950 font-black tracking-widest text-sm flex items-center justify-center gap-2 cursor-pointer transition hover:scale-102"
              >
                <RotateCcw size={16} />
                PLAY AGAIN
              </button>
              <button 
                onClick={quitToHome}
                className="w-full sm:w-auto px-10 py-3.5 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-800 text-slate-300 font-black tracking-widest text-sm flex items-center justify-center gap-2 cursor-pointer transition hover:scale-102"
              >
                <Home size={16} />
                HOME
              </button>
              <button 
                onClick={handleShare}
                className="w-full sm:w-auto px-10 py-3.5 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-800 text-slate-300 font-black tracking-widest text-sm flex items-center justify-center gap-2 cursor-pointer transition hover:scale-102"
              >
                <Share2 size={16} />
                SHARE SCORE
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* 5. HOW TO PLAY DIALOG */}
      {showHowToPlay && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md p-6 glass rounded-2xl text-left border border-slate-800 shadow-2xl"
          >
            <h2 className="text-xl font-extrabold text-cyan-400 glow-cyan mb-4">HOW TO PLAY</h2>
            <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed mb-6 font-medium">
              <p>
                🎯 <strong className="text-white">Objective:</strong> Control the glowing cyan energy orb. Survive as long as possible without touching anything <span className="text-red-400 font-bold">RED</span>.
              </p>
              <p>
                🎮 <strong className="text-white">Controls:</strong> Drag your finger (mobile), move your cursor (desktop), or use the <strong className="text-cyan-400">WASD / Arrow Keys</strong> to steer.
              </p>
              <p>
                ⚡ <strong className="text-white">Progression:</strong> Obstacle speeds and spawn rates increase every <strong className="text-white">10 seconds</strong>.
              </p>
              <p>
                🔥 <strong className="text-white">Near Miss Bonus:</strong> Glide extremely close to obstacles without hitting them to score a <strong className="text-amber-400">+10 points near miss bonus</strong>!
              </p>
            </div>
            <button 
              onClick={() => { sounds.playClick(); setShowHowToPlay(false); }}
              className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs tracking-wider cursor-pointer transition"
            >
              CLOSE
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
