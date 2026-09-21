# Walkthrough - DON'T TOUCH RED Game Development

We have built a premium, fast-paced reflex and survival game, **DON'T TOUCH RED**, featuring a futuristic cyberpunk aesthetic, high-fidelity neon effects, programmatic Web Audio SFX/music synthesis, and full responsiveness across desktop, tablet, and mobile.

---

## 🛠️ Files Created & Modified

1. **[App.jsx](file:///c:/Users/HP/Desktop/Don't_Touch/src/App.jsx)**: Main game orchestrator. Contains:
   - React state hooks for UI screens (`home`, `countdown`, `playing`, `gameover`), stats tracking, and settings.
   - High-performance HTML5 Canvas rendering engine (60 FPS).
   - Collision detection system for 8 types of obstacles (Circles, Rotating Bars, Laser Walls, Bouncing Balls, Expanding Rings, Zigzag Enemies, Polygons, and Random Mines).
   - Cyberpunk HUD, Pause Overlay, and Game Over layout.
2. **[audio.js](file:///c:/Users/HP/Desktop/Don't_Touch/src/audio.js)**: Programmatic audio synthesizer using the native browser **Web Audio API**. Generates interactive sounds:
   - Cyberpunk synth background music loop (tempo/intensity scales up with speed).
   - SFX: Button hover, Click, Countdown beep/go, Laser warning, Collision, Game Over, and Heartbeat.
3. **[index.css](file:///c:/Users/HP/Desktop/Don't_Touch/src/index.css)**: Tailwind v4 stylesheet with custom neon glow utilities (`glow-cyan`, `glow-red`), glassmorphism, and neon grid animation.
4. **[index.html](file:///c:/Users/HP/Desktop/Don't_Touch/index.html)**: Custom SEO meta tags, title, and imported Google Fonts (Outfit & Inter).
5. **[vite.config.js](file:///c:/Users/HP/Desktop/Don't_Touch/vite.config.js)**: Configured `@tailwindcss/vite` plugin.

---

## 🎮 Core Game Mechanics

- **Difficulty Modes**: Easy, Medium, Hard, and Impossible. Each mode sets the initial speed, spawn rates, and maximum obstacles.
- **Progression**: Every 10 seconds, the obstacle speed and background animation speed increase. The music speeds up and opens its filter, and a heartbeat sound triggers when it gets chaotic (>= 2.0x).
- **Controls**:
  - **Mouse**: Smoothly lerps player towards the cursor.
  - **Keyboard**: Full WASD/Arrow Key support with acceleration and friction.
  - **Mobile Touch**: Relative movement offset so fingers do not block the cyan orb.
- **Visuals**: Neon glow effects, trail particles, dust particles, expanding ring shockwaves, blinking red mine indicators, pulsing laser alerts, screen shake on death, and slow-motion zoom.
- **Near Miss Bonus**: Rewards skilled play with `+10` points and floating text particles when navigating close to obstacles without hitting them.

---

## 🧪 Verification Results

We verified the build and ran a browser subagent simulation:
- **Build Status**: Successful production compile in `3.02s` without any linting or configuration errors.
- **Gameplay Simulation**:
  - **Survival Time**: `16 seconds` of active gameplay.
  - **Near Misses**: `2` near misses achieved.
  - **Final Score**: `684` (saved locally in LocalStorage).
  - **Video Demo**: Automatically saved to browser artifacts.
