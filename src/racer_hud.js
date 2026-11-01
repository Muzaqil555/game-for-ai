/**
 * ============================================================================
 * NEON VELOCITY — CYBERPUNK COCKPIT & HUD CONTROLLER (src/racer_hud.js)
 * Author: Agent 3 — Frontend Specialist (UI/UX)
 * Supervision: Agent 4 (CEO) & Agent 26 (Architect)
 * Target: 60-120 FPS High-Performance Canvas & DOM Hybrid Rendering
 * ============================================================================
 */

(function (window, document) {
  'use strict';

  // --------------------------------------------------------------------------
  // CONSTANTS & PALETTE
  // --------------------------------------------------------------------------
  const PALETTE = {
    cyan: '#00f5ff',
    magenta: '#ff007f',
    yellow: '#ffe600',
    purple: '#9d00ff',
    red: '#ff1e27',
    blue: '#0084ff',
    darkBg: '#080318',
    gridLine: 'rgba(0, 245, 255, 0.25)'
  };

  const REDLINE_RPM = 7500;
  const MAX_RPM = 9000;

  // --------------------------------------------------------------------------
  // HUD MASTER ENGINE OBJECT
  // --------------------------------------------------------------------------
  const NeonHUD = {
    initialized: false,
    isExternalControl: false, // Set to true when core game engine takes over
    elements: {},
    gaugeCtx: null,
    mirrorCtx: null,
    radarCtx: null,

    // Internal State
    state: {
      speed: 0,
      rpm: 900,
      gear: 'N',
      nitro: 1.0,
      heatLevel: 1,
      heatPercent: 20,
      isDrifting: false,
      driftAngle: 0,
      driftScore: 0,
      driftMult: 1.0,
      credits: 14500,
      statusMessage: 'PATROL FREQUENCY MONITOR ACTIVE',
      rearviewData: {
        cops: [
          { dist: 130, lane: -0.35, flashing: true },
          { dist: 210, lane: 0.40, flashing: true }
        ]
      },
      radarData: {
        curvesAhead: [{ dist: 80, curve: 1.8, label: 'S-CURVE' }],
        roadblocks: [{ dist: 130, lane: 0 }],
        copsAhead: [{ dist: 160, lane: 0.6 }]
      }
    },

    // Mobile Virtual Inputs
    mobileInputs: {
      throttle: 0,
      brake: 0,
      handbrake: false,
      steer: 0, // -1 (left) to 1 (right)
      nitro: false
    },

    // Radar & Mirror state
    radarSweepAngle: 0,
    mirrorSirenPhase: 0,
    lastFrameTime: performance.now(),
    lastGear: 'N',
    demoInterval: null,

    /**
     * DOM Strukturlarını Keşləyir və Canvas Kontekstlərini başladır
     */
    init: function (options) {
      if (this.initialized) return;

      this.options = options || {};
      if (this.options.externalControl) {
        this.isExternalControl = true;
      }

      this._cacheDOMElements();
      this._initCanvases();
      this._bindTouchControls();
      this._bindKeyboardForDemo();

      this.initialized = true;

      // Start internal 60-120 FPS render loop for gauges & mirrors
      requestAnimationFrame(this._renderTick.bind(this));
      console.log('⚡ [NeonHUD] Cyberpunk Cockpit & HUD initialized successfully.');
    },

    /**
     * Xarici Mühərrik Nəzarətini Tənzimləyir
     */
    setExternalControl: function (enabled) {
      this.isExternalControl = !!enabled;
    },

    /**
     * DOM Keşlənməsi
     */
    _cacheDOMElements: function () {
      this.elements = {
        hudRoot: document.getElementById('neon-velocity-hud'),
        
        // Heat Panel
        heatPanel: document.getElementById('hud-heat-panel'),
        heatValTag: document.getElementById('heat-val-tag'),
        heatMeterFill: document.getElementById('heat-meter-fill'),
        policeDispatch: document.getElementById('police-dispatch-feed'),
        heatStars: document.querySelectorAll('.heat-star'),

        // Rearview Mirror
        rearviewMirror: document.getElementById('rearview-mirror-rig'),
        rearviewCanvas: document.getElementById('rearview-canvas'),
        mirrorHousing: document.getElementById('rearview-frame'),
        mirrorStatus: document.getElementById('mirror-hud-status'),

        // Telemetry & Gauges
        gaugeCanvas: document.getElementById('gauge-canvas'),
        digitalSpeed: document.getElementById('digital-speed-val'),
        digitalSpeedUnit: document.getElementById('digital-speed-unit'),
        digitalRpm: document.getElementById('digital-rpm-val'),
        redlineFlasher: document.getElementById('redline-flasher'),
        gearNumber: document.getElementById('gear-number'),
        gearPod: document.getElementById('gear-display-pod'),
        nitroPillFill: document.getElementById('nitro-pill-fill'),
        nitroPercentVal: document.getElementById('nitro-percent-val'),

        // Drift Panel
        driftCluster: document.getElementById('drift-gauge-cluster'),
        driftScoreCounter: document.getElementById('drift-score-counter'),
        driftMultiplierTag: document.getElementById('drift-multiplier-tag'),
        driftAngleBarFill: document.getElementById('drift-angle-bar-fill'),
        driftAngleText: document.getElementById('drift-angle-text'),

        // Radar
        radarCanvas: document.getElementById('radar-canvas'),
        radarWarningTicker: document.getElementById('radar-warning-ticker'),

        // Credits & Stats
        creditsVal: document.getElementById('stat-credits-val'),
        multiplierBadge: document.getElementById('stat-multiplier-badge'),

        // Takedown Banner
        takedownBanner: document.getElementById('hud-takedown-banner'),
        takedownTitle: document.getElementById('takedown-text'),
        takedownSubtitle: document.getElementById('takedown-subtext'),

        // Mobile Touch Overlay
        mobileLayer: document.getElementById('mobile-touch-layer'),
        steerLeftBtn: document.getElementById('btn-steer-left'),
        steerRightBtn: document.getElementById('btn-steer-right'),
        btnHandbrake: document.getElementById('btn-handbrake'),
        btnNitro: document.getElementById('btn-nitro'),
        pedalGas: document.getElementById('pedal-gas'),
        pedalBrake: document.getElementById('pedal-brake')
      };
    },

    /**
     * Canvas ölçülərini Retina / HiDPI ekranlara uyğunlaşdırır
     */
    _initCanvases: function () {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      // 1. Dual Dial Gauge Canvas (Tachometer & Speedometer)
      if (this.elements.gaugeCanvas) {
        const rect = this.elements.gaugeCanvas.getBoundingClientRect();
        const size = rect.width > 0 ? rect.width : 250;
        this.elements.gaugeCanvas.width = size * dpr;
        this.elements.gaugeCanvas.height = size * dpr;
        this.gaugeCtx = this.elements.gaugeCanvas.getContext('2d');
        this.gaugeCtx.scale(dpr, dpr);
        this.gaugeSize = size;
      }

      // 2. Rearview Mirror Canvas
      if (this.elements.rearviewCanvas) {
        const rect = this.elements.rearviewCanvas.getBoundingClientRect();
        const w = rect.width > 0 ? rect.width : 280;
        const h = rect.height > 0 ? rect.height : 72;
        this.elements.rearviewCanvas.width = w * dpr;
        this.elements.rearviewCanvas.height = h * dpr;
        this.mirrorCtx = this.elements.rearviewCanvas.getContext('2d');
        this.mirrorCtx.scale(dpr, dpr);
        this.mirrorWidth = w;
        this.mirrorHeight = h;
      }

      // 3. Mini-Map Radar Canvas
      if (this.elements.radarCanvas) {
        const rect = this.elements.radarCanvas.getBoundingClientRect();
        const size = rect.width > 0 ? rect.width : 170;
        this.elements.radarCanvas.width = size * dpr;
        this.elements.radarCanvas.height = size * dpr;
        this.radarCtx = this.elements.radarCanvas.getContext('2d');
        this.radarCtx.scale(dpr, dpr);
        this.radarSize = size;
      }

      // Resize listener
      window.addEventListener('resize', () => {
        this._initCanvases();
      });
    },

    // ------------------------------------------------------------------------
    // API UPDATE METHOD (Called by external game engine at 60-120 FPS)
    // ------------------------------------------------------------------------
    update: function (data) {
      if (!data) return;

      // Update state numbers
      if (data.speed !== undefined) this.state.speed = data.speed;
      if (data.rpm !== undefined) this.state.rpm = data.rpm;
      if (data.gear !== undefined) this.state.gear = data.gear;
      if (data.nitro !== undefined) this.state.nitro = Math.max(0, Math.min(1, data.nitro));
      if (data.heatLevel !== undefined) this.state.heatLevel = data.heatLevel;
      if (data.heatPercent !== undefined) this.state.heatPercent = data.heatPercent;
      if (data.isDrifting !== undefined) this.state.isDrifting = data.isDrifting;
      if (data.driftAngle !== undefined) this.state.driftAngle = data.driftAngle;
      if (data.driftScore !== undefined) this.state.driftScore = data.driftScore;
      if (data.driftMult !== undefined) this.state.driftMult = data.driftMult;
      if (data.credits !== undefined) this.state.credits = data.credits;
      if (data.statusMessage !== undefined) this.state.statusMessage = data.statusMessage;

      // Object data caches
      if (data.rearview) this.state.rearviewData = data.rearview;
      if (data.radar) this.state.radarData = data.radar;

      // Synchronize DOM elements
      this._updateDOM();
    },

    /**
     * DOM Mətnlərini və Bar Göstəricilərini Yeniləyir
     */
    _updateDOM: function () {
      const s = this.state;
      const el = this.elements;

      // Digital Speed
      if (el.digitalSpeed) {
        el.digitalSpeed.textContent = Math.round(s.speed);
      }
      if (el.digitalRpm) {
        el.digitalRpm.textContent = `${Math.round(s.rpm)} RPM`;
      }

      // Redline Alert
      if (el.redlineFlasher) {
        if (s.rpm >= REDLINE_RPM) {
          el.redlineFlasher.classList.add('flashing');
        } else {
          el.redlineFlasher.classList.remove('flashing');
        }
      }

      // Gear Indicator with Shift Kinetic Pop
      if (el.gearNumber && this.lastGear !== s.gear) {
        this.lastGear = s.gear;
        el.gearNumber.textContent = s.gear;
        el.gearNumber.classList.remove('gear-shift-pop');
        void el.gearNumber.offsetWidth; // Trigger reflow
        el.gearNumber.classList.add('gear-shift-pop');
      }

      // Nitro Bar
      if (el.nitroPillFill) {
        const pct = Math.round(s.nitro * 100);
        el.nitroPillFill.style.width = `${pct}%`;
        if (el.nitroPercentVal) el.nitroPercentVal.textContent = `${pct}%`;

        if (pct > 90) {
          el.nitroPillFill.classList.add('nitro-pulsing');
        } else {
          el.nitroPillFill.classList.remove('nitro-pulsing');
        }
      }

      // Heat Level & Stars
      if (el.heatStars) {
        const activeLevel = Math.max(0, Math.min(5, s.heatLevel));
        if (el.heatValTag) el.heatValTag.textContent = `LEVEL ${activeLevel}`;
        if (el.heatMeterFill) el.heatMeterFill.style.width = `${s.heatPercent}%`;

        el.heatStars.forEach((star, index) => {
          const starNum = index + 1;
          if (starNum <= activeLevel) {
            star.classList.add('active');
            if (activeLevel >= 4) {
              star.classList.add('danger');
            } else {
              star.classList.remove('danger');
            }
          } else {
            star.classList.remove('active', 'danger');
          }
        });
      }

      // Dispatch feed text
      if (el.policeDispatch && s.statusMessage) {
        el.policeDispatch.textContent = s.statusMessage;
      }

      // Drift HUD Panel
      if (el.driftCluster) {
        if (s.isDrifting || Math.abs(s.driftAngle) > 5) {
          el.driftCluster.classList.add('active');
          if (el.driftScoreCounter) {
            el.driftScoreCounter.textContent = `+${Math.round(s.driftScore).toLocaleString()}`;
          }
          if (el.driftMultiplierTag) {
            el.driftMultiplierTag.textContent = `x${s.driftMult.toFixed(1)} DRIFT`;
          }
          if (el.driftAngleBarFill) {
            const angleClamped = Math.min(80, Math.abs(s.driftAngle));
            const fillWidth = (angleClamped / 80) * 100;
            el.driftAngleBarFill.style.width = `${fillWidth}%`;
          }
          if (el.driftAngleText) {
            el.driftAngleText.textContent = `${Math.round(Math.abs(s.driftAngle))}° SLIP ANGLE`;
          }
        } else {
          el.driftCluster.classList.remove('active');
        }
      }

      // Credits & Multiplier
      if (el.creditsVal) {
        el.creditsVal.textContent = `$${Math.round(s.credits).toLocaleString()}`;
      }
      if (el.multiplierBadge) {
        el.multiplierBadge.textContent = s.isDrifting ? `DRIFT x${s.driftMult.toFixed(1)}` : 'CRUISE 1.0x';
      }
    },

    // ------------------------------------------------------------------------
    // HIGH-PERFORMANCE RENDER LOOP (Canvas Gauges, Mirror, Radar)
    // ------------------------------------------------------------------------
    _renderTick: function (now) {
      const dt = Math.min(0.1, (now - this.lastFrameTime) / 1000);
      this.lastFrameTime = now;

      this.radarSweepAngle = (this.radarSweepAngle + dt * 2.8) % (Math.PI * 2);
      this.mirrorSirenPhase = (this.mirrorSirenPhase + dt * 6.0) % (Math.PI * 2);

      // Render Gauges
      if (this.gaugeCtx) this._drawTachometerAndSpeedGauge();
      if (this.mirrorCtx) this._drawRearviewMirror(dt);
      if (this.radarCtx) this._drawRadar(dt);

      requestAnimationFrame(this._renderTick.bind(this));
    },

    // ------------------------------------------------------------------------
    // 1. TACHOMETER & SPEEDOMETER CANVAS DRAWING (0-9000 RPM, 7500 Redline)
    // ------------------------------------------------------------------------
    _drawTachometerAndSpeedGauge: function () {
      const ctx = this.gaugeCtx;
      const size = this.gaugeSize || 250;
      const cx = size / 2;
      const cy = size / 2;
      const radius = size * 0.44;

      ctx.clearRect(0, 0, size, size);

      // Angular ranges: from 135 deg to 405 deg (270 degree sweep)
      const startAngle = 0.75 * Math.PI; // 135 deg
      const endAngle = 2.25 * Math.PI;   // 405 deg
      const totalSweep = endAngle - startAngle;

      // 1. Outer Background Arc
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.stroke();

      // 2. Redline Zone Arc (from 7500 to 9000 RPM)
      const redlineStartRatio = REDLINE_RPM / MAX_RPM;
      const redlineAngle = startAngle + totalSweep * redlineStartRatio;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, redlineAngle, endAngle);
      ctx.strokeStyle = 'rgba(255, 30, 39, 0.45)';
      ctx.lineWidth = 14;
      ctx.stroke();

      // 3. Dynamic RPM Level Glow Arc
      const currentRpmRatio = Math.max(0, Math.min(1, this.state.rpm / MAX_RPM));
      const currentRpmAngle = startAngle + totalSweep * currentRpmRatio;

      if (currentRpmRatio > 0.02) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, currentRpmAngle);
        
        // Gradient for RPM bar (Cyan -> Magenta -> Neon Red)
        const grad = ctx.createLinearGradient(0, cy, size, cy);
        grad.addColorStop(0, PALETTE.cyan);
        grad.addColorStop(0.65, PALETTE.magenta);
        grad.addColorStop(0.85, PALETTE.red);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.shadowColor = this.state.rpm >= REDLINE_RPM ? PALETTE.red : PALETTE.magenta;
        ctx.shadowBlur = this.state.rpm >= REDLINE_RPM ? 22 : 12;
        ctx.stroke();
        ctx.restore();
      }

      // 4. Tick Marks & Numbers (0 to 9 x1000 RPM)
      const numTicks = 9;
      for (let i = 0; i <= numTicks; i++) {
        const tickRatio = i / numTicks;
        const tickAngle = startAngle + totalSweep * tickRatio;
        const isRedZone = (i * 1000) >= REDLINE_RPM;

        const innerR = radius - 16;
        const outerR = radius - 8;
        const x1 = cx + Math.cos(tickAngle) * innerR;
        const y1 = cy + Math.sin(tickAngle) * innerR;
        const x2 = cx + Math.cos(tickAngle) * outerR;
        const y2 = cy + Math.sin(tickAngle) * outerR;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = isRedZone ? PALETTE.red : 'rgba(0, 245, 255, 0.6)';
        ctx.lineWidth = (i % 2 === 0) ? 3 : 1.5;
        ctx.stroke();

        // Major tick label (1, 2, 3...)
        if (i % 2 === 0 || i === numTicks) {
          const textR = radius - 26;
          const tx = cx + Math.cos(tickAngle) * textR;
          const ty = cy + Math.sin(tickAngle) * textR + 4;
          ctx.font = 'bold 11px Rajdhani, monospace';
          ctx.fillStyle = isRedZone ? PALETTE.red : '#99eeff';
          ctx.textAlign = 'center';
          ctx.fillText(i.toString(), tx, ty);
        }
      }

      // 5. Animated Neon Needle (Əqrəb)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(currentRpmAngle);

      // Needle Shadow Glow
      ctx.shadowColor = this.state.rpm >= REDLINE_RPM ? '#ff0033' : PALETTE.cyan;
      ctx.shadowBlur = 18;

      // Needle Body
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(0, -3);
      ctx.lineTo(radius - 8, 0);
      ctx.lineTo(0, 3);
      ctx.closePath();
      ctx.fillStyle = this.state.rpm >= REDLINE_RPM ? '#ffffff' : PALETTE.cyan;
      ctx.fill();

      // Needle core laser line
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(radius - 5, 0);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();

      // 6. Central Hub Cap
      ctx.beginPath();
      ctx.arc(cx, cy, 24, 0, Math.PI * 2);
      ctx.fillStyle = '#060214';
      ctx.fill();
      ctx.strokeStyle = this.state.rpm >= REDLINE_RPM ? PALETTE.red : PALETTE.magenta;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = PALETTE.magenta;
      ctx.shadowBlur = 10;
      ctx.stroke();
    },

    // ------------------------------------------------------------------------
    // 2. REARVIEW MIRROR DRAWING (Dikbaxış Güzgüsü: OutRun road + Police Cruisers)
    // ------------------------------------------------------------------------
    _drawRearviewMirror: function (dt) {
      const ctx = this.mirrorCtx;
      const w = this.mirrorWidth || 280;
      const h = this.mirrorHeight || 72;
      const cx = w / 2;
      const horizonY = h * 0.42;

      ctx.clearRect(0, 0, w, h);

      // Dark Synthwave Night Sky & Grid Ground
      ctx.fillStyle = '#0a021c';
      ctx.fillRect(0, 0, w, horizonY);

      ctx.fillStyle = '#050110';
      ctx.fillRect(0, horizonY, w, h - horizonY);

      // Horizon Neon Dividing Line
      ctx.strokeStyle = 'rgba(157, 0, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(w, horizonY);
      ctx.stroke();

      // Vanishing Road Lines (Perspective retreating into distance)
      const roadW_top = 22;
      const roadW_bottom = w * 0.92;

      ctx.beginPath();
      ctx.moveTo(cx - roadW_top / 2, horizonY);
      ctx.lineTo(cx - roadW_bottom / 2, h);
      ctx.lineTo(cx + roadW_bottom / 2, h);
      ctx.lineTo(cx + roadW_top / 2, horizonY);
      ctx.closePath();
      ctx.fillStyle = '#10032b';
      ctx.fill();

      // Lane dividers (moving backward based on speed)
      const animOffset = (performance.now() * (this.state.speed * 0.003)) % 1;
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 12]);
      ctx.lineDashOffset = -animOffset * 18;

      ctx.beginPath();
      ctx.moveTo(cx, horizonY);
      ctx.lineTo(cx, h);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // Cop Cruiser Siren Strobe Calculations
      const isRedCycle = Math.sin(this.mirrorSirenPhase) > 0;
      const isBlueCycle = !isRedCycle;

      // Update mirror housing strobe glows
      if (this.elements.mirrorHousing) {
        if (this.state.heatLevel >= 1) {
          if (isRedCycle) {
            this.elements.mirrorHousing.classList.add('siren-strobe-active-red');
            this.elements.mirrorHousing.classList.remove('siren-strobe-active-blue');
          } else {
            this.elements.mirrorHousing.classList.add('siren-strobe-active-blue');
            this.elements.mirrorHousing.classList.remove('siren-strobe-active-red');
          }
        } else {
          this.elements.mirrorHousing.classList.remove('siren-strobe-active-red', 'siren-strobe-active-blue');
        }
      }

      // Draw Rear Police Cruisers
      const cops = (this.state.rearviewData && this.state.rearviewData.cops) || [];

      // Draw each cop car sorted by distance
      cops.forEach((cop) => {
        // Distance mapping: dist 40 (closest) to 300 (far)
        const normDist = Math.max(0.1, Math.min(1.0, cop.dist / 300));
        const carY = horizonY + (h - horizonY) * (1 - normDist);
        const carScale = (1 - normDist); // 0 (far) to 1 (near)
        const carW = 16 + carScale * 42;
        const carH = 8 + carScale * 22;

        const laneOffset = cop.lane * ((roadW_bottom - roadW_top) * 0.45 * carScale);
        const carX = cx + laneOffset;

        // Cop Car Silhouette
        ctx.fillStyle = '#0e0e18';
        ctx.beginPath();
        ctx.roundRect(carX - carW / 2, carY - carH, carW, carH, 3);
        ctx.fill();
        ctx.strokeStyle = '#2d2d48';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Headlights (High-beam yellow glow)
        const lightSpread = carW * 0.35;
        ctx.fillStyle = '#fff9cc';
        ctx.fillRect(carX - lightSpread - 2, carY - carH * 0.4, 4, 3);
        ctx.fillRect(carX + lightSpread - 2, carY - carH * 0.4, 4, 3);

        // Flashing Emergency Lightbar on Roof
        const lightbarW = carW * 0.45;
        const lightbarY = carY - carH - 2;

        if (cop.flashing && this.state.heatLevel >= 1) {
          // Left LED (Red)
          ctx.fillStyle = isRedCycle ? '#ff0033' : '#440011';
          ctx.shadowColor = '#ff0033';
          ctx.shadowBlur = isRedCycle ? 15 : 0;
          ctx.fillRect(carX - lightbarW / 2, lightbarY, lightbarW / 2 - 1, 3);

          // Right LED (Blue)
          ctx.fillStyle = isBlueCycle ? '#0099ff' : '#001144';
          ctx.shadowColor = '#0099ff';
          ctx.shadowBlur = isBlueCycle ? 15 : 0;
          ctx.fillRect(carX + 1, lightbarY, lightbarW / 2 - 1, 3);

          ctx.shadowBlur = 0; // Reset blur
        }
      });

      // Update Mirror Status Tag
      if (this.elements.mirrorStatus) {
        if (this.state.heatLevel > 0 && cops.length > 0) {
          this.elements.mirrorStatus.textContent = `REAR PURSUIT: ${cops.length} CRUISERS LOCKED`;
          this.elements.mirrorStatus.style.color = isRedCycle ? PALETTE.red : PALETTE.cyan;
        } else {
          this.elements.mirrorStatus.textContent = 'REAR TRAFFIC CLEAR';
          this.elements.mirrorStatus.style.color = PALETTE.cyan;
        }
      }
    },

    // ------------------------------------------------------------------------
    // 3. MINI-MAP / NAV RADAR CANVAS (Ahead Curves, Roadblocks & Spikes)
    // ------------------------------------------------------------------------
    _drawRadar: function (dt) {
      const ctx = this.radarCtx;
      const size = this.radarSize || 170;
      const cx = size / 2;
      const cy = size / 2;
      const radius = size * 0.46;

      ctx.clearRect(0, 0, size, size);

      // Radar Grid Rings
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.2)';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.33, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.66, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Axis Crosshairs
      ctx.beginPath();
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx, cy + radius);
      ctx.moveTo(cx - radius, cy);
      ctx.lineTo(cx + radius, cy);
      ctx.stroke();

      // Rotating Scanner Radar Beam Sweep
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, this.radarSweepAngle, this.radarSweepAngle + 0.55);
      ctx.closePath();

      const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      sweepGrad.addColorStop(0, 'rgba(0, 245, 255, 0.35)');
      sweepGrad.addColorStop(1, 'rgba(0, 245, 255, 0.0)');
      ctx.fillStyle = sweepGrad;
      ctx.fill();
      ctx.restore();

      // Draw Upcoming Road Path (Curve prediction line)
      const radarData = this.state.radarData || {};

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);

      let curX = cx;
      let curY = cy;
      const pathSegments = 12;
      const curveWeight = radarData.curvesAhead && radarData.curvesAhead[0] ? radarData.curvesAhead[0].curve : 0;

      for (let s = 1; s <= pathSegments; s++) {
        const segDist = (s / pathSegments) * (radius * 0.85);
        const curveOffset = Math.sin((s / pathSegments) * Math.PI * 0.7) * (curveWeight * 14);
        curX = cx + curveOffset;
        curY = cy - segDist;
        ctx.lineTo(curX, curY);
      }
      ctx.strokeStyle = PALETTE.cyan;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = PALETTE.cyan;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();

      // Draw Ahead Obstacles / Roadblocks / Spikes
      if (radarData.roadblocks) {
        radarData.roadblocks.forEach(rb => {
          const normDist = Math.min(1, rb.dist / 200);
          const rY = cy - normDist * (radius * 0.8);
          const rX = cx + rb.lane * 25;

          // Hazard Icon / Diamond Warning
          ctx.fillStyle = PALETTE.yellow;
          ctx.beginPath();
          ctx.arc(rX, rY, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }

      // Draw Ahead Cops
      if (radarData.copsAhead) {
        radarData.copsAhead.forEach(cop => {
          const normDist = Math.min(1, cop.dist / 200);
          const cY = cy - normDist * (radius * 0.85);
          const cX = cx + cop.lane * 30;

          // Pulsing Red Cop Blip
          ctx.fillStyle = PALETTE.red;
          ctx.shadowColor = PALETTE.red;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(cX, cY, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      }

      // Center Player Vehicle Blip (Cyan Triangle pointing Up)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 6);
      ctx.lineTo(0, 3);
      ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = PALETTE.cyan;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.restore();

      // Radar Warning Ticker
      if (this.elements.radarWarningTicker) {
        if (radarData.roadblocks && radarData.roadblocks.length > 0 && radarData.roadblocks[0].dist < 100) {
          this.elements.radarWarningTicker.textContent = '⚠️ ROADBLOCK AHEAD';
          this.elements.radarWarningTicker.style.color = PALETTE.red;
        } else if (radarData.curvesAhead && Math.abs(curveWeight) > 2.0) {
          this.elements.radarWarningTicker.textContent = curveWeight > 0 ? '▶ HAIRPIN RIGHT' : '◀ HAIRPIN LEFT';
          this.elements.radarWarningTicker.style.color = PALETTE.yellow;
        } else {
          this.elements.radarWarningTicker.textContent = 'SCANNING SECTOR...';
          this.elements.radarWarningTicker.style.color = PALETTE.cyan;
        }
      }
    },

    // ------------------------------------------------------------------------
    // NOTIFICATION BANNERS & TAKEDOWNS
    // ------------------------------------------------------------------------
    triggerTakedownBanner: function (title, subtitle) {
      const banner = this.elements.takedownBanner;
      if (!banner) return;

      if (this.elements.takedownTitle) this.elements.takedownTitle.textContent = title || 'CRUISER TAKEDOWN!';
      if (this.elements.takedownSubtitle) this.elements.takedownSubtitle.textContent = subtitle || '+$1,500 CREDITS';

      banner.classList.add('show');
      if (this.bannerTimeout) clearTimeout(this.bannerTimeout);
      this.bannerTimeout = setTimeout(() => {
        banner.classList.remove('show');
      }, 2400);
    },

    // ------------------------------------------------------------------------
    // 7. MOBILE TOUCH EVENT BINDINGS (Gas, Brake, E-Brake, Steer, Nitro)
    // ------------------------------------------------------------------------
    _bindTouchControls: function () {
      const el = this.elements;
      const inputs = this.mobileInputs;

      // Auto-detect touch capability or mobile screen
      const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.innerWidth <= 900;
      if (hasTouch && el.mobileLayer) {
        el.mobileLayer.classList.add('active');
      }

      // Helper for touch press/release
      const attachPedalEvents = (domElement, onDown, onUp) => {
        if (!domElement) return;

        const handleStart = (e) => {
          if (e.cancelable) e.preventDefault();
          domElement.classList.add('pressed');
          onDown();
        };

        const handleEnd = (e) => {
          if (e.cancelable) e.preventDefault();
          domElement.classList.remove('pressed');
          onUp();
        };

        domElement.addEventListener('touchstart', handleStart, { passive: false });
        domElement.addEventListener('touchend', handleEnd, { passive: false });
        domElement.addEventListener('touchcancel', handleEnd, { passive: false });
        domElement.addEventListener('mousedown', handleStart);
        domElement.addEventListener('mouseup', handleEnd);
        domElement.addEventListener('mouseleave', handleEnd);
      };

      // 1. Gas Pedal (Throttle)
      attachPedalEvents(el.pedalGas, 
        () => { inputs.throttle = 1.0; }, 
        () => { inputs.throttle = 0; }
      );

      // 2. Brake Pedal
      attachPedalEvents(el.pedalBrake, 
        () => { inputs.brake = 1.0; }, 
        () => { inputs.brake = 0; }
      );

      // 3. Handbrake (Drift Trigger)
      attachPedalEvents(el.btnHandbrake, 
        () => { inputs.handbrake = true; }, 
        () => { inputs.handbrake = false; }
      );

      // 4. Nitro Boost
      attachPedalEvents(el.btnNitro, 
        () => { inputs.nitro = true; }, 
        () => { inputs.nitro = false; }
      );

      // 5. Steering Left & Right
      attachPedalEvents(el.steerLeftBtn, 
        () => { inputs.steer = -1.0; }, 
        () => { if (inputs.steer === -1.0) inputs.steer = 0; }
      );

      attachPedalEvents(el.steerRightBtn, 
        () => { inputs.steer = 1.0; }, 
        () => { if (inputs.steer === 1.0) inputs.steer = 0; }
      );
    },

    /**
     * Mühərrik üçün Mobil Girişləri Təqdim edən Getter
     */
    getMobileInputs: function () {
      return { ...this.mobileInputs };
    },

    // ------------------------------------------------------------------------
    // STANDALONE KEYBOARD & DEMO DRIVER
    // ------------------------------------------------------------------------
    _bindKeyboardForDemo: function () {
      const keys = {};
      window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if (['w', 's', 'a', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
          e.preventDefault();
        }
      });
      window.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
      });

      // Internal Simulator Loop (Suspends automatic driver if external game engine is active)
      this.demoInterval = setInterval(() => {
        if (this.isExternalControl) return;

        const w = keys['w'] || keys['arrowup'] || this.mobileInputs.throttle > 0;
        const s = keys['s'] || keys['arrowdown'] || this.mobileInputs.brake > 0;
        const a = keys['a'] || keys['arrowleft'] || this.mobileInputs.steer < 0;
        const d = keys['d'] || keys['arrowright'] || this.mobileInputs.steer > 0;
        const space = keys[' '] || this.mobileInputs.handbrake;
        const shift = keys['shift'] || this.mobileInputs.nitro;

        // Simple realistic speed & RPM integration
        let currentSpeed = this.state.speed;
        let nitro = this.state.nitro;

        if (w) {
          const accel = (shift && nitro > 0.05) ? 2.4 : 1.2;
          currentSpeed = Math.min(248, currentSpeed + accel);
          if (shift && nitro > 0.05) nitro -= 0.006;
        } else if (s) {
          currentSpeed = Math.max(0, currentSpeed - 2.5);
        } else {
          currentSpeed = Math.max(0, currentSpeed - 0.35);
        }

        // Automatic Gear Mapping based on speed
        let gear = 'N';
        let gearRatio = 1;
        if (currentSpeed < 4) { gear = '1'; gearRatio = 0.15; }
        else if (currentSpeed < 45) { gear = '1'; gearRatio = currentSpeed / 45; }
        else if (currentSpeed < 85) { gear = '2'; gearRatio = (currentSpeed - 40) / 45; }
        else if (currentSpeed < 130) { gear = '3'; gearRatio = (currentSpeed - 80) / 50; }
        else if (currentSpeed < 175) { gear = '4'; gearRatio = (currentSpeed - 125) / 50; }
        else if (currentSpeed < 215) { gear = '5'; gearRatio = (currentSpeed - 170) / 45; }
        else { gear = '6'; gearRatio = Math.min(1, (currentSpeed - 210) / 38); }

        const currentRpm = 1000 + gearRatio * 7600;

        // Drift state simulation
        const isDrift = (space || (s && (a || d))) && currentSpeed > 40;
        let driftAngle = isDrift ? (a ? -44 : (d ? 46 : 34)) : 0;
        let driftScore = this.state.driftScore;
        let driftMult = this.state.driftMult;

        if (isDrift) {
          driftScore += 24 * driftMult;
          driftMult = Math.min(4.0, driftMult + 0.02);
        } else {
          driftMult = 1.0;
        }

        // Heat Level dynamic demo
        let heat = 1;
        if (currentSpeed > 210) heat = 5;
        else if (currentSpeed > 170) heat = 4;
        else if (currentSpeed > 120) heat = 3;
        else if (currentSpeed > 70) heat = 2;

        let statusMsg = 'PATROL FREQUENCY ACTIVE';
        if (heat === 5) statusMsg = 'AIR SUPPORT & EMP STRIKE AUTHORIZED';
        else if (heat === 4) statusMsg = 'SWAT RHINO RAMMING UNITS INBOUND';
        else if (heat === 3) statusMsg = 'SPIKE STRIPS DEPLOYED ON HIGHWAY';
        else if (heat === 2) statusMsg = 'TACTICAL INTERCEPTORS FLANKING';

        // Update HUD
        this.update({
          speed: currentSpeed,
          rpm: currentRpm,
          gear: gear,
          nitro: Math.max(0, nitro),
          isDrifting: isDrift,
          driftAngle: driftAngle,
          driftScore: driftScore,
          driftMult: driftMult,
          heatLevel: heat,
          heatPercent: Math.min(100, (currentSpeed / 240) * 100),
          statusMessage: statusMsg,
          credits: 14500 + Math.floor(driftScore * 0.1)
        });
      }, 30);
    }
  };

  // Expose to window namespace
  window.NeonHUD = NeonHUD;

})(window, document);
