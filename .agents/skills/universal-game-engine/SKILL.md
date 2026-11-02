---
name: universal-game-engine
description: Genre templates and engine rules for building any browser game from scratch with no external assets (2D platformer, top-down shooter, tower defense, puzzle, retro racer, roguelike RPG, 3D WebGL). Use when picking a genre, physics rules, procedural graphics or Web Audio, or when splitting work across agents.
---

# Universal Game Engine and Genre Pipeline

This skill gives the studio the architecture and math rules to build browser games in **any genre and style** from scratch, with no external file dependencies (zero-asset) and a stable 60-120 FPS.

---

## 1. Core Principles

1. **Zero dependencies:** no `.png`, `.jpg`, `.mp3` or heavy library is loaded from the internet. All visuals are drawn in code with HTML5 Canvas/SVG, and all sounds are synthesized with the Web Audio API.
2. **60-120 FPS:** object pooling, minimal garbage collection, and `requestAnimationFrame` with delta-time (`dt`) integration.
3. **Game feel (juice):** every genre gets screen shake, a micro-freeze on impact (hit-stop), particle bursts and dynamic colors.
4. **Works on every device:** keyboard/mouse and touch (mobile virtual joystick).
5. **Zero clipping, solid rigid bodies:** no physical object, enemy or barrier may pass through another. Every collision must use MTV (Minimum Translation Vector) separation, a Newtonian impulse, a bounce off barriers, and a spark/debris burst at the contact point.

---

## 2. The 7 Genre Templates (Genre Matrix)

When the user asks for a game, **`game-architect`** and the **CEO (main session)** pick the best-fitting template from the seven below.

### A. 2D Platformer (Mario, Celeste, Hollow Knight style)
* **Controls:** `A/D` or arrow keys (move), `Space / W` (jump), `Shift` (dash / sprint).
* **Physics:**
  * Gravity: `vy += GRAVITY * dt` (`GRAVITY ≈ 1800-2400 px/s²`).
  * Jump impulse: `vy = -JUMP_FORCE` (`JUMP_FORCE ≈ 650-800 px/s`).
  * **Coyote time (0.1s):** after walking off a platform edge, the jump stays available for 100ms.
  * **Jump buffering (0.1s):** if jump is pressed within 100ms before landing, the jump fires on the frame the player touches the ground.
  * Wall slide and wall jump.
* **Goal:** get past obstacles, collect gold/stars, reach the flag/door.

### B. Top-Down / Space Shooter (Vampire Survivors, Galaga, Asteroids)
* **Controls:** `WASD` (move), mouse cursor (360° aiming), left click or auto-fire.
* **Physics:**
  * Angle: `const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x)`.
  * Projectile velocity: `vx = Math.cos(angle) * SPEED; vy = Math.sin(angle) * SPEED`.
  * Enemy swarm / wave spawner and circle collisions (`dist < r1 + r2`).
* **Goal:** destroy enemy waves, upgrade weapons, survive until the timer ends.

### C. Tower Defense and Strategy (Tower Defense / RTS)
* **Controls:** mouse click (build towers, upgrade, pick abilities).
* **Physics and logic:**
  * Grid system (grid matrix, e.g. 20x12 cells).
  * **A* (A-Star) or waypoint paths:** enemy movement toward the base.
  * Tower targeting and fire: target the first enemy inside a circular radius and shoot.
  * Economy: earn gold, upgrade tower levels.
* **Goal:** keep the base health above 0 and survive 20-50 waves.

### D. Puzzle / Logic / Grid (Tetris, Match-3, 2048)
* **Controls:** arrow keys / WASD (rotate or slide pieces).
* **Logic:**
  * Two-dimensional matrix checks (`grid[row][col]`).
  * Line-completion or 3-in-a-row color matching algorithm.
  * Combo counter and cascading clears.
* **Goal:** keep the board from filling up and reach the highest score.

### E. Retro Racing (Outrun, Micro Machines)
* **Controls:** `A/D` (steer), `W` (throttle / accelerate), `S` (brake).
* **Physics:**
  * Speed and friction: `speed = clamp(speed + accel * dt - friction * dt, 0, maxSpeed)`.
  * Pseudo-3D road perspective, or top-down 2D car drift (`driftFactor`).
  * Road obstacles, fuel/turbo pickups and rival cars.
* **Goal:** cross the finish line before time runs out, or complete 3 laps.

### F. Dungeon Crawler and Roguelike RPG (Hades, Binding of Isaac)
* **Controls:** `WASD` + attack + special power + dash.
* **Logic:**
  * Room-to-room transitions, random loot, relics, skill tree.
  * Boss fights and phase changes.
* **Goal:** reach the last floor of the dungeon and defeat the dark lord.

### G. 3D WebGL (Three.js, minimalist)
* **Library:** a single Three.js script from a CDN (`https://unpkg.com/three@0.160.0/build/three.min.js`).
* **Logic:**
  * 3D scene (`Scene`), perspective camera (`PerspectiveCamera`), lighting (`DirectionalLight` + `AmbientLight`).
  * Bright, stylized 3D models built from simple geometric shapes (`BoxGeometry`, `SphereGeometry`, `CylinderGeometry`).
* **Goal:** running, jumping or space flight in a 3D world.

---

## 3. Procedural Graphics Standard (Procedural Asset Forge)

Draw everything with the Canvas 2D API, with no external images:

```javascript
// Universal character drawing example (eyes, body and glow)
function drawCharacter(ctx, x, y, radius, color, glowColor, facingAngle) {
  ctx.save();
  ctx.translate(x, y);
  
  // 1. Golden / neon glow aura
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 15;
  ctx.fillStyle = color;
  
  // 2. Main body
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // 3. Facing-angle indicator and eyes
  ctx.rotate(facingAngle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(radius * 0.45, -radius * 0.3, radius * 0.22, 0, Math.PI * 2);
  ctx.arc(radius * 0.45, radius * 0.3, radius * 0.22, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}
```

---

## 4. Procedural Universal Sound Synthesizer (Web Audio API)

Sound effects for every genre with zero files:

```javascript
const AudioForge = {
  ctx: null,
  init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  },
  
  // Platformer jump sound (pitch-up sweep)
  jump() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.start(); osc.stop(this.ctx.currentTime + 0.16);
  },

  // Space laser sound (pitch-down laser)
  laser() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    osc.start(); osc.stop(this.ctx.currentTime + 0.13);
  },

  // Explosion rumble (noise buffer + lowpass filter)
  explosion() {
    this.init();
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.4);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    noise.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
    noise.start(); noise.stop(this.ctx.currentTime + 0.4);
  }
};
```

---

## 5. Autonomous Production Pipeline (Division of Work)

When the user asks for a game, the CEO runs the following flow:

1. **Phase 1 (plan and architecture):**
   * **`game-architect`**: picks the genre and writes the mechanics and win condition.
2. **Phase 2 (parallel coding):**
   * **`game-engine-developer`**: builds the core game loop and player controls.
   * **`physics-game-feel-engineer`**: writes genre-appropriate gravity, collision and screen shake.
   * **`art-director`**: draws the procedural Canvas graphics and sets the color palette.
   * **`audio-designer`**: builds genre-appropriate Web Audio SFX and background rhythm.
   * **`ui-hud-engineer`**: builds the score counter, health bar and menu screens.
3. **Phase 3 (security and 120 FPS):**
   * **`security-auditor`** and **`performance-optimizer`**: analyze the code and remove problems.
4. **Phase 4 (9-persona playtest):**
   * `playtest-council` (9 personas) tests the game and gives feedback, and **`bug-fixer`** applies the fixes.
5. **Phase 5 (handoff):**
   * The CEO delivers a finished game that opens in the browser immediately.
