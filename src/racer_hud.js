/**
 * ============================================================================
 * NEON VELOCITY — MODERN PERFORMANCE COCKPIT & DIGITAL CLUSTER (src/racer_hud.js)
 * Author: Agent 3 — Frontend Specialist (UI/UX)
 * Supervision: Agent 4 (CEO) & Agent 26 (Architect)
 * Target: 60-120 FPS High-Performance Canvas & DOM Hybrid Rendering
 * Aesthetic: Clean Porsche / BMW M Sport Virtual Cockpit
 * ============================================================================
 */

(function (window, document) {
  'use strict';

  // --------------------------------------------------------------------------
  // CONSTANTS & PERFORMANCE PALETTE (No Cliché Neons)
  // --------------------------------------------------------------------------
  const PALETTE = {
    white: '#f8fafc',
    slate: '#94a3b8',
    slateDark: '#475569',
    amber: '#f59e0b',
    red: '#ef4444',
    blue: '#38bdf8',
    emerald: '#10b981',
    darkBg: '#0b0f15',
    glassBorder: 'rgba(255, 255, 255, 0.12)',
    gridLine: 'rgba(148, 163, 184, 0.16)'
  };

  const HEAT_NAMES = {
    1: 'LOCAL PATROL',
    2: 'STATE PURSUIT',
    3: 'ROADBLOCK TACTICS',
    4: 'AIR MOBILIZATION',
    5: 'MAXIMUM ESCALATION'
  };

  const ALERT_MIN_SHOW_MS = 600;
  const ALERT_QUEUE_MAX = 3;

  const REDLINE_RPM = 7500;
  const MAX_RPM = 9000;

  // --------------------------------------------------------------------------
  // HUD MASTER ENGINE OBJECT
  // --------------------------------------------------------------------------
  const NeonHUD = {
    initialized: false,
    isExternalControl: true, // Default to true so game engine controls telemetry
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
      statusMessage: 'HIGHWAY PATROL FREQUENCY MONITOR ACTIVE',
      rearviewData: {
        cops: []
      },
      radarData: {
        curvesAhead: [],
        roadblocks: [],
        copsAhead: []
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

    /**
     * DOM Strukturlarını Keşləyir və Canvas Kontekstlərini başladır
     */
    init: function (options) {
      if (this.initialized) return;

      this.options = options || {};
      this.isExternalControl = true;

      this._cacheDOMElements();
      this._initCanvases();
      this._bindTouchControls();
      this._buildOverlays();

      this.initialized = true;

      // Start internal 60-120 FPS render loop for gauges & mirrors.
      // The tick is bound exactly once (not per frame).
      this._tick = this._renderTick.bind(this);
      requestAnimationFrame(this._tick);
      console.log('⚡ [NeonHUD] Performance Digital Cockpit initialized.');
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
        digitalSpeedVal: document.getElementById('digital-speed-val'),
        digitalRpmVal: document.getElementById('digital-rpm-val'),
        gearIndicator: document.getElementById('gear-indicator'),
        redlineFlasher: document.getElementById('redline-flasher'),
        nitroBarFill: document.getElementById('nitro-bar-fill'),

        // Radar / Navigation Pod
        radarCanvas: document.getElementById('radar-canvas'),
        radarWarningTicker: document.getElementById('radar-warning-ticker'),

        // Drift Dynamics & Scoring & Live Physics Telemetry
        driftContainer: document.getElementById('hud-drift-dynamics'),
        driftMultTag: document.getElementById('drift-mult-tag'),
        driftScoreVal: document.getElementById('drift-score-val'),
        driftAngleTag: document.getElementById('drift-angle-tag'),
        gForceTag: document.getElementById('g-force-tag'),
        chassisAttitudeTag: document.getElementById('chassis-attitude-tag'),

        // Top Right Stats
        statCreditsVal: document.getElementById('stat-credits-val'),
        btnAudioToggle: document.getElementById('btn-audio-toggle'),
        btnCamToggle: document.getElementById('btn-cam-toggle'),

        // Takedown Banner
        takedownBanner: document.getElementById('hud-takedown-banner'),
        takedownTitle: document.getElementById('takedown-title'),
        takedownSubtitle: document.getElementById('takedown-subtitle'),

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
     * Canvas Kontekstlərinin HiDPI Ölçüləndirilməsi
     */
    _initCanvases: function () {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      // 1. Tachometer Gauge Canvas
      const gCanvas = this.elements.gaugeCanvas;
      if (gCanvas) {
        const rect = gCanvas.getBoundingClientRect();
        const size = Math.max(rect.width, 220);
        gCanvas.width = size * dpr;
        gCanvas.height = size * dpr;
        this.gaugeCtx = gCanvas.getContext('2d');
        this.gaugeCtx.scale(dpr, dpr);
        this.gaugeSize = size;
      }

      // 2. Rearview Mirror Canvas
      const mCanvas = this.elements.rearviewCanvas;
      if (mCanvas) {
        const rect = mCanvas.getBoundingClientRect();
        const w = Math.max(rect.width, 280);
        const h = Math.max(rect.height, 74);
        mCanvas.width = w * dpr;
        mCanvas.height = h * dpr;
        this.mirrorCtx = mCanvas.getContext('2d');
        this.mirrorCtx.scale(dpr, dpr);
        this.mirrorWidth = w;
        this.mirrorHeight = h;
      }

      // 3. Tactical Radar Canvas
      const rCanvas = this.elements.radarCanvas;
      if (rCanvas) {
        const rect = rCanvas.getBoundingClientRect();
        const size = Math.max(rect.width, 160);
        rCanvas.width = size * dpr;
        rCanvas.height = size * dpr;
        this.radarCtx = rCanvas.getContext('2d');
        this.radarCtx.scale(dpr, dpr);
        this.radarSize = size;
      }
    },

    /**
     * Xarici Mühərrikdən Telemetriya Məlumatlarını Qəbul Edir
     */
    update: function (data) {
      if (!data) return;

      const s = this.state;
      if (data.speed !== undefined) s.speed = data.speed;
      if (data.rpm !== undefined) s.rpm = data.rpm;
      if (data.gear !== undefined) s.gear = data.gear;
      if (data.nitro !== undefined) s.nitro = Math.max(0, Math.min(1, data.nitro));
      if (data.heatLevel !== undefined) {
        if (this._lastHeatSeen !== undefined && data.heatLevel !== this._lastHeatSeen) {
          this._announceHeat(data.heatLevel, this._lastHeatSeen, data.heatName);
        }
        this._lastHeatSeen = data.heatLevel;
        s.heatLevel = data.heatLevel;
      }
      if (data.heatName !== undefined) s.heatName = data.heatName;
      if (data.heatPercent !== undefined) s.heatPercent = data.heatPercent;
      if (data.isDrifting !== undefined) s.isDrifting = data.isDrifting;
      if (data.driftAngle !== undefined) s.driftAngle = data.driftAngle;
      if (data.driftScore !== undefined) s.driftScore = data.driftScore;
      if (data.driftMult !== undefined) s.driftMult = data.driftMult;
      if (data.credits !== undefined) s.credits = data.credits;
      if (data.lateralG !== undefined) s.lateralG = data.lateralG;
      if (data.longitudinalG !== undefined) s.longitudinalG = data.longitudinalG;
      if (data.rollDeg !== undefined) s.rollDeg = data.rollDeg;
      if (data.pitchDeg !== undefined) s.pitchDeg = data.pitchDeg;
      if (data.statusMessage !== undefined) s.statusMessage = data.statusMessage;
      if (data.rearview !== undefined) s.rearviewData = data.rearview;
      if (data.radar !== undefined) s.radarData = data.radar;
    },

    /**
     * Əsas 60-120 FPS Render Dövrü
     */
    _setText: function (key, node, value, color) {
      const c = this._c || (this._c = {});
      if (c[key] !== value) { c[key] = value; node.textContent = value; }
      if (color && c[key + 'C'] !== color) { c[key + 'C'] = color; node.style.color = color; }
    },

    _renderTick: function (now) {
      const dt = Math.min((now - this.lastFrameTime) / 1000, 0.05);
      this.lastFrameTime = now;

      this.radarSweepAngle += dt * 3.2;
      if (this.radarSweepAngle > Math.PI * 2) this.radarSweepAngle -= Math.PI * 2;

      this.mirrorSirenPhase += dt * (this.state.heatLevel >= 3 ? 16.0 : 8.0);

      this._updateDOMTelemetry();
      if (this.gaugeCtx) this._drawTachometer();
      if (this.mirrorCtx) this._drawRearviewMirror(dt);
      if (this.radarCtx) this._drawRadar(dt);

      requestAnimationFrame(this._tick);
    },

    /**
     * DOM Telemetriya Mətnlərinin və Barlarının Yenilənməsi
     */
    _updateDOMTelemetry: function () {
      const el = this.elements;
      const s = this.state;
      const c = this._c || (this._c = {});
      // Write to the DOM only when a value actually changed.
      const text = (key, node, value) => {
        if (node && c[key] !== value) { c[key] = value; node.textContent = value; }
      };
      const fmt = (n) => Math.round(n || 0).toLocaleString('en-US');

      text('speed', el.digitalSpeedVal, Math.round(s.speed).toString());
      text('rpm', el.digitalRpmVal, fmt(s.rpm) + ' RPM');
      if (el.gearIndicator && s.gear !== this.lastGear) {
        el.gearIndicator.textContent = s.gear;
        this.lastGear = s.gear;
      }

      if (el.redlineFlasher) {
        const on = s.rpm >= REDLINE_RPM;
        if (c.redline !== on) { c.redline = on; el.redlineFlasher.classList.toggle('active', on); }
      }

      if (el.nitroBarFill) {
        const w = (s.nitro * 100).toFixed(0) + '%';
        if (c.nitro !== w) { c.nitro = w; el.nitroBarFill.style.width = w; }
      }

      // Heat: tier tag + continuous meter (heatPercent = progress inside the level)
      const pct = Math.max(0, Math.min(100, Number(s.heatPercent) || 0));
      const tier = s.heatName || HEAT_NAMES[s.heatLevel] || '';
      text('heatTag', el.heatValTag, 'HEAT ' + s.heatLevel + ' \u00b7 ' + Math.round(pct) + '%');
      if (el.heatPanel && c.heatTier !== tier) {
        c.heatTier = tier;
        el.heatPanel.title = tier;
      }
      if (el.heatMeterFill) {
        const w = pct.toFixed(0) + '%';
        if (c.heatW !== w) { c.heatW = w; el.heatMeterFill.style.width = w; }
      }
      if (el.heatPanel && c.heatLvl !== s.heatLevel) {
        c.heatLvl = s.heatLevel;
        el.heatPanel.dataset.heat = String(s.heatLevel);
        if (el.heatStars && el.heatStars.length > 0) {
          el.heatStars.forEach((star, idx) => {
            star.classList.toggle('active', idx < s.heatLevel);
            star.classList.toggle('danger', idx < s.heatLevel && s.heatLevel >= 4);
          });
        }
      } else if (!el.heatPanel && el.heatStars && c.heatLvl !== s.heatLevel) {
        c.heatLvl = s.heatLevel;
        el.heatStars.forEach((star, idx) => {
          star.classList.toggle('active', idx < s.heatLevel);
          star.classList.toggle('danger', idx < s.heatLevel && s.heatLevel >= 4);
        });
      }

      if (el.policeDispatch) {
        const textNode = el.policeDispatch.querySelector('.dispatch-text') || el.policeDispatch.children[1];
        text('dispatch', textNode, s.statusMessage);
      }

      if (el.driftContainer) {
        const lit = s.isDrifting || s.driftScore > 0 || Math.abs(parseFloat(s.lateralG || 0)) > 0.1;
        if (c.driftLit !== lit) { c.driftLit = lit; el.driftContainer.style.opacity = lit ? '1' : '0.75'; }
        if (c.driftActive !== !!s.isDrifting) {
          c.driftActive = !!s.isDrifting;
          el.driftContainer.classList.toggle('drifting', c.driftActive);
        }
        text('driftMult', el.driftMultTag, s.driftMult.toFixed(1) + 'x');
        text('driftScore', el.driftScoreVal, fmt(s.driftScore));
        text('driftAngle', el.driftAngleTag, Math.abs(Math.round(s.driftAngle)) + '\u00b0 SLIP');

        if (el.gForceTag) {
          const lat = parseFloat(s.lateralG || 0);
          const lon = parseFloat(s.longitudinalG || 0);
          text('g', el.gForceTag, `${lat >= 0 ? '+' : ''}${lat.toFixed(2)}G LAT \u2022 ${lon >= 0 ? '+' : ''}${lon.toFixed(2)}G LONG`);
        }
        if (el.chassisAttitudeTag) {
          const roll = parseFloat(s.rollDeg || 0);
          const pitch = parseFloat(s.pitchDeg || 0);
          text('att', el.chassisAttitudeTag, `ROLL: ${roll >= 0 ? '+' : ''}${roll.toFixed(1)}\u00b0 \u2022 PITCH: ${pitch >= 0 ? '+' : ''}${pitch.toFixed(1)}\u00b0`);
        }
      }

      text('credits', el.statCreditsVal, '$' + fmt(s.credits));
    },

    /**
     * 1. MODERN PERFORMANCE TACHOMETER CANVAS (Porsche / BMW Virtual Cockpit)
     */
    _drawTachometer: function () {
      const ctx = this.gaugeCtx;
      const size = this.gaugeSize || 220;
      const cx = size / 2;
      const cy = size / 2;
      const radius = size * 0.44;

      ctx.clearRect(0, 0, size, size);

      const startAngle = 0.75 * Math.PI; // 135 deg
      const endAngle = 2.25 * Math.PI;   // 405 deg
      const totalSweep = endAngle - startAngle;

      // 1. Subtle Outer Track Ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.stroke();

      // 2. Redline Zone Arc (7500 to 9000 RPM)
      const redlineStartRatio = REDLINE_RPM / MAX_RPM;
      const redlineAngle = startAngle + totalSweep * redlineStartRatio;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, redlineAngle, endAngle);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.lineWidth = 10;
      ctx.stroke();

      // 3. Dynamic Active RPM Arc
      const currentRpmRatio = Math.max(0, Math.min(1, this.state.rpm / MAX_RPM));
      const currentRpmAngle = startAngle + totalSweep * currentRpmRatio;

      if (currentRpmRatio > 0.02) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, currentRpmAngle);

        const isRed = this.state.rpm >= REDLINE_RPM;
        const isAmber = this.state.rpm >= 6200 && !isRed;

        if (isRed) {
          ctx.strokeStyle = PALETTE.red;
          ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
          ctx.shadowBlur = 12;
        } else if (isAmber) {
          ctx.strokeStyle = PALETTE.amber;
          ctx.shadowColor = 'rgba(245, 158, 11, 0.4)';
          ctx.shadowBlur = 8;
        } else {
          ctx.strokeStyle = PALETTE.white;
          ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
          ctx.shadowBlur = 6;
        }

        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
      }

      // 4. Tick Marks & Digits (0-9 x1000 RPM)
      const numTicks = 9;
      for (let i = 0; i <= numTicks; i++) {
        const tickRatio = i / numTicks;
        const tickAngle = startAngle + totalSweep * tickRatio;
        const isRedZone = (i * 1000) >= REDLINE_RPM;

        const innerR = radius - 14;
        const outerR = radius - 6;
        const x1 = cx + Math.cos(tickAngle) * innerR;
        const y1 = cy + Math.sin(tickAngle) * innerR;
        const x2 = cx + Math.cos(tickAngle) * outerR;
        const y2 = cy + Math.sin(tickAngle) * outerR;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = isRedZone ? PALETTE.red : 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = (i % 2 === 0) ? 2.5 : 1.2;
        ctx.stroke();

        // Major tick label (0, 2, 4, 6, 8)
        if (i % 2 === 0 || i === numTicks) {
          const textR = radius - 24;
          const tx = cx + Math.cos(tickAngle) * textR;
          const ty = cy + Math.sin(tickAngle) * textR + 4;
          ctx.font = 'bold 10px Inter, sans-serif';
          ctx.fillStyle = isRedZone ? PALETTE.red : PALETTE.slate;
          ctx.textAlign = 'center';
          ctx.fillText(i.toString(), tx, ty);
        }
      }

      // 5. Precision Razor Needle
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(currentRpmAngle);

      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(0, -2.5);
      ctx.lineTo(radius - 6, 0);
      ctx.lineTo(0, 2.5);
      ctx.closePath();

      const needleColor = this.state.rpm >= REDLINE_RPM ? PALETTE.red : PALETTE.white;
      ctx.fillStyle = needleColor;
      ctx.shadowColor = needleColor;
      ctx.shadowBlur = 8;
      ctx.fill();

      ctx.restore();

      // 6. Center Metal Hub Cap
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#64748b';
      ctx.fill();
    },

    /**
     * 2. AUTO-DIMMING REARVIEW MIRROR CANVAS
     */
    _drawRearviewMirror: function () {
      const ctx = this.mirrorCtx;
      const w = this.mirrorWidth || 280;
      const h = this.mirrorHeight || 74;
      const cx = w / 2;
      const horizonY = h * 0.42;

      ctx.clearRect(0, 0, w, h);

      // Night Highway Sky
      ctx.fillStyle = '#080c12';
      ctx.fillRect(0, 0, w, horizonY);

      // Distant Horizon Line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(w, horizonY);
      ctx.stroke();

      // Road Surface
      const roadW_top = 26;
      const roadW_bottom = w * 0.94;

      ctx.beginPath();
      ctx.moveTo(cx - roadW_top / 2, horizonY);
      ctx.lineTo(cx - roadW_bottom / 2, h);
      ctx.lineTo(cx + roadW_bottom / 2, h);
      ctx.lineTo(cx + roadW_top / 2, horizonY);
      ctx.closePath();
      ctx.fillStyle = '#14171d';
      ctx.fill();

      // Dashed White Lane Divider
      const animOffset = (performance.now() * (Math.max(15, this.state.speed) * 0.003)) % 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 10]);
      ctx.lineDashOffset = -animOffset * 15;

      ctx.beginPath();
      ctx.moveTo(cx, horizonY);
      ctx.lineTo(cx, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Siren Strobe Calculations
      const isRedCycle = Math.sin(this.mirrorSirenPhase) > 0;

      if (this.elements.mirrorHousing) {
        if (this.state.heatLevel >= 1 && (this.state.rearviewData.cops || []).length > 0) {
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

      cops.forEach((cop) => {
        const normDist = Math.max(0.12, Math.min(1.0, cop.dist / 220));
        const carY = horizonY + (h - horizonY) * (1 - normDist);
        const carScale = (1 - normDist);
        const carW = 14 + carScale * 38;
        const carH = 7 + carScale * 18;

        const laneOffset = cop.lane * ((roadW_bottom - roadW_top) * 0.42 * carScale);
        const carX = cx + laneOffset;

        // Cop Car Silhouette
        ctx.fillStyle = '#11141a';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(carX - carW / 2, carY - carH, carW, carH, 2);
        } else {
          ctx.rect(carX - carW / 2, carY - carH, carW, carH);
        }
        ctx.fill();

        // Crisp White Doors
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(carX - carW * 0.45, carY - carH * 0.75, carW * 0.9, carH * 0.5);

        // Headlights
        const lightSpread = carW * 0.35;
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(carX - lightSpread - 2, carY - carH * 0.4, 4, 3);
        ctx.fillRect(carX + lightSpread - 2, carY - carH * 0.4, 4, 3);

        // Emergency Lightbar on Roof (Split Red/Blue)
        const lightbarW = carW * 0.45;
        const lightbarY = carY - carH - 2;

        ctx.fillStyle = isRedCycle ? PALETTE.red : '#1e293b';
        ctx.fillRect(carX - lightbarW / 2, lightbarY, lightbarW / 2 - 1, 3);

        ctx.fillStyle = !isRedCycle ? PALETTE.blue : '#1e293b';
        ctx.fillRect(carX + 1, lightbarY, lightbarW / 2 - 1, 3);
      });

      // Update Mirror Status Text
      if (this.elements.mirrorStatus) {
        if (cops.length > 0) {
          const nearest = Math.round(cops[0].dist);
          this._setText('mirror', this.elements.mirrorStatus, `PATROL CLOSING \u00b7 ${nearest} m`, isRedCycle ? PALETTE.red : PALETTE.blue);
        } else {
          this._setText('mirror', this.elements.mirrorStatus, 'REAR CLEAR', PALETTE.slate);
        }
      }
    },

    /**
     * 3. TACTICAL GPS / RADAR CANVAS
     */
    _drawRadar: function () {
      const ctx = this.radarCtx;
      const size = this.radarSize || 160;
      const cx = size / 2;
      const cy = size / 2;
      const radius = size * 0.46;

      ctx.clearRect(0, 0, size, size);

      // Radar Range Concentric Rings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.35, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.70, 0, Math.PI * 2);
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

      // Rotating Scanner Beam
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, this.radarSweepAngle, this.radarSweepAngle + 0.4);
      ctx.closePath();

      const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      sweepGrad.addColorStop(0, 'rgba(148, 163, 184, 0.25)');
      sweepGrad.addColorStop(1, 'rgba(148, 163, 184, 0.0)');
      ctx.fillStyle = sweepGrad;
      ctx.fill();
      ctx.restore();

      // Center Player Arrow (White triangle)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(5, 5);
      ctx.lineTo(0, 3);
      ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.fillStyle = PALETTE.white;
      ctx.fill();
      ctx.restore();

      // Draw Ahead Cops / Hazards
      const radarData = this.state.radarData || {};
      if (radarData.copsAhead) {
        radarData.copsAhead.forEach(cop => {
          const normDist = Math.min(1, (cop.dist || 80) / 180);
          const cY = cy - normDist * (radius * 0.85);
          const cX = cx + (cop.lane || 0) * 26;

          ctx.fillStyle = PALETTE.red;
          ctx.beginPath();
          ctx.arc(cX, cY, 4, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      if (radarData.roadblocks) {
        radarData.roadblocks.forEach(rb => {
          const normDist = Math.min(1, (rb.dist || 100) / 200);
          const rY = cy - normDist * (radius * 0.85);
          const rX = cx + (rb.lane || 0) * 26;

          ctx.fillStyle = PALETTE.amber;
          ctx.beginPath();
          ctx.arc(rX, rY, 3.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Radar Warning Ticker
      if (this.elements.radarWarningTicker) {
        if (radarData.roadblocks && radarData.roadblocks.length > 0 && radarData.roadblocks[0].dist < 100) {
          this._setText('radar', this.elements.radarWarningTicker, 'ROADBLOCK AHEAD', PALETTE.red);
        } else {
          this._setText('radar', this.elements.radarWarningTicker, 'GPS SCANNING', PALETTE.slate);
        }
      }
    },

    /**
     * 4. NOTIFICATIONS: one banner lane (major) + one toast lane (minor).
     *    Each lane shows one alert at a time, never overlaps, newest wins
     *    (subject to priority) and keeps a queue of at most 3.
     */
    _buildOverlays: function () {
      const el = this.elements;
      const root = el.hudRoot || document.body;
      const mk = (tag, cls, parent, txt) => {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (txt !== undefined) n.textContent = txt;
        if (parent) parent.appendChild(n);
        return n;
      };

      // Alert stack: banner on top, toast underneath (flow layout = no overlap)
      const stack = mk('div', 'hud-alert-stack', root);
      stack.id = 'hud-alert-stack';
      let banner = el.takedownBanner;
      if (!banner) {
        banner = mk('div', '', null);
        banner.id = 'hud-takedown-banner';
        el.takedownTitle = mk('div', 'takedown-title', banner, '');
        el.takedownSubtitle = mk('div', 'takedown-subtitle', banner, '');
        el.takedownBanner = banner;
      }
      stack.appendChild(banner);
      banner.setAttribute('role', 'status');
      banner.setAttribute('aria-live', 'polite');
      banner.setAttribute('aria-atomic', 'true');
      const toast = mk('div', 'hud-toast', stack);
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      this.toastEl = toast;
      this.toastTextEl = mk('span', 'hud-toast-text', toast);
      this.toastAmtEl = mk('span', 'hud-toast-amt', toast);

      this.lanes = {
        major: { cur: null, queue: [], shownAt: 0, timer: 0, minTimer: 0 },
        minor: { cur: null, queue: [], shownAt: 0, timer: 0, minTimer: 0 }
      };

      // Pause button (touch layer only; the layer is display:none on desktop)
      const host = el.mobileLayer || document.body;
      const pauseBtn = mk('button', 'hud-pause-btn', host, 'Ⅱ');
      pauseBtn.type = 'button';
      pauseBtn.setAttribute('aria-label', 'Pause');
      pauseBtn.setAttribute('aria-pressed', 'false');
      pauseBtn.addEventListener('click', () => {
        this._callback('onPause', !this.paused);
      });
      this.pauseBtn = pauseBtn;

      // Paused overlay
      const pov = mk('div', 'hud-overlay hud-paused', document.body);
      pov.id = 'hud-paused';
      pov.hidden = true;
      const pcard = mk('div', 'hud-card', pov);
      pcard.setAttribute('role', 'dialog');
      pcard.setAttribute('aria-modal', 'true');
      pcard.setAttribute('aria-labelledby', 'hud-paused-title');
      const pt = mk('h2', 'hud-card-title', pcard, 'PAUSED');
      pt.id = 'hud-paused-title';
      mk('p', 'hud-card-sub', pcard, 'Esc or P also resumes');
      const pbtns = mk('div', 'hud-card-actions', pcard);
      const bResume = mk('button', 'hud-btn hud-btn-primary', pbtns, 'Resume');
      const bRestart = mk('button', 'hud-btn', pbtns, 'Restart');
      const bGarage = mk('button', 'hud-btn', pbtns, 'Garage');
      [bResume, bRestart, bGarage].forEach((b) => { b.type = 'button'; });
      bResume.addEventListener('click', () => this._callback('onPause', false));
      bRestart.addEventListener('click', () => { this.setPaused(false); this._callback('onRunAgain'); });
      bGarage.addEventListener('click', () => { this.setPaused(false); this._callback('onGarage'); });
      this.pausedEl = pov;
      this.pausedResumeBtn = bResume;

      // Run summary
      const sov = mk('div', 'hud-overlay hud-summary', document.body);
      sov.id = 'hud-summary';
      sov.hidden = true;
      const scard = mk('div', 'hud-card hud-summary-card', sov);
      scard.setAttribute('role', 'dialog');
      scard.setAttribute('aria-modal', 'true');
      scard.setAttribute('aria-labelledby', 'hud-summary-title');
      this.summaryTitle = mk('h2', 'hud-card-title', scard, 'RUN OVER');
      this.summaryTitle.id = 'hud-summary-title';
      this.summarySub = mk('p', 'hud-card-sub', scard, '');
      const grid = mk('dl', 'hud-summary-grid', scard);
      this.summaryVals = {};
      [['duration', 'TIME'], ['takedowns', 'TAKEDOWNS'], ['peakHeat', 'PEAK HEAT'],
        ['driftScore', 'SCORE'], ['creditsEarned', 'CREDITS EARNED'], ['bestScore', 'BEST SCORE']
      ].forEach(([key, label]) => {
        const row = mk('div', 'hud-summary-row', grid);
        mk('dt', '', row, label);
        this.summaryVals[key] = mk('dd', '', row, '-');
      });
      this.summaryNewBest = mk('p', 'hud-summary-newbest', scard, 'NEW BEST SCORE');
      this.summaryNewBest.hidden = true;
      const sbtns = mk('div', 'hud-card-actions', scard);
      this.summaryAgainBtn = mk('button', 'hud-btn hud-btn-primary', sbtns, 'Run again');
      this.summaryGarageBtn = mk('button', 'hud-btn', sbtns, 'Garage');
      this.summaryAgainBtn.type = 'button';
      this.summaryGarageBtn.type = 'button';
      this.summaryAgainBtn.addEventListener('click', () => this._summaryAction('onRunAgain'));
      this.summaryGarageBtn.addEventListener('click', () => this._summaryAction('onGarage'));
      this.summaryEl = sov;
      this.summaryOpen = false;

      // While the summary is open the game must not see keystrokes (keyup still passes).
      document.addEventListener('keydown', (e) => {
        if (!this.summaryOpen) return;
        e.stopPropagation();
        const k = e.key;
        if (k === 'Escape') { e.preventDefault(); this._summaryAction('onGarage'); }
        else if (k === 'r' || k === 'R') { e.preventDefault(); this._summaryAction('onRunAgain'); }
        else if (k === 'Tab' || k === 'ArrowLeft' || k === 'ArrowRight') {
          e.preventDefault();
          const a = this.summaryAgainBtn, g = this.summaryGarageBtn;
          (document.activeElement === a ? g : a).focus();
        } else if (k === ' ' || k === 'Enter') {
          if (!(document.activeElement instanceof HTMLButtonElement)) {
            e.preventDefault();
            this._summaryAction('onRunAgain');
          }
        }
      }, true);
    },

    ALERT_KINDS: {
      busted:      { lane: 'major', pri: 100, dur: 3200 },
      evaded:      { lane: 'major', pri: 75,  dur: 2800 },
      takedown:    { lane: 'major', pri: 80,  dur: 2600 },
      'heat-up':   { lane: 'major', pri: 70,  dur: 2400 },
      chopper:     { lane: 'major', pri: 65,  dur: 2200 },
      'heat-down': { lane: 'major', pri: 40,  dur: 2200 },
      spike:       { lane: 'minor', pri: 50,  dur: 1800 },
      'near-miss': { lane: 'minor', pri: 20,  dur: 1300 },
      info:        { lane: 'minor', pri: 10,  dur: 1500 }
    },

    /**
     * Queue an alert. {text, kind, amount, sub, duration}
     * kind: busted | evaded | takedown | heat-up | heat-down | chopper | spike | near-miss | info
     * amount: credits (number) shown as "+$1,500".
     */
    pushAlert: function (a) {
      if (!a || !this.lanes) return;
      const kind = this.ALERT_KINDS[a.kind] ? a.kind : 'info';
      const def = this.ALERT_KINDS[kind];
      const amt = Number(a.amount);
      const item = {
        kind: kind,
        text: String(a.text || '').toUpperCase(),
        sub: a.sub ? String(a.sub) : '',
        amount: isFinite(amt) ? amt : 0,
        pri: def.pri,
        dur: Number(a.duration) > 0 ? Number(a.duration) : def.dur,
        count: 1,
        t: performance.now()
      };
      const L = this.lanes[def.lane];
      const now = performance.now();
      const cur = L.cur;
      if (cur && cur.kind === item.kind && cur.text === item.text && cur.sub === item.sub) {
        cur.count++;
        cur.amount += item.amount;
        this._laneShow(def.lane, cur, true);
        return;
      }
      if (!cur) { this._laneShow(def.lane, item); return; }
      if (now - L.shownAt >= ALERT_MIN_SHOW_MS && item.pri >= cur.pri) {
        this._laneShow(def.lane, item);
        return;
      }
      L.queue.push(item);
      while (L.queue.length > ALERT_QUEUE_MAX) {
        let w = 0; // drop the weakest, oldest entry
        for (let i = 1; i < L.queue.length; i++) {
          if (L.queue[i].pri < L.queue[w].pri) w = i;
        }
        L.queue.splice(w, 1);
      }
      clearTimeout(L.minTimer);
      L.minTimer = setTimeout(() => this._laneCheck(def.lane),
        Math.max(0, ALERT_MIN_SHOW_MS - (now - L.shownAt)) + 5);
    },

    _laneBest: function (L) {
      const now = performance.now();
      L.queue = L.queue.filter((q) => now - q.t < 5000);
      let b = -1;
      for (let i = 0; i < L.queue.length; i++) {
        const q = L.queue[i];
        if (b < 0 || q.pri > L.queue[b].pri || (q.pri === L.queue[b].pri && q.t >= L.queue[b].t)) b = i;
      }
      return b;
    },

    _laneCheck: function (lane) {
      const L = this.lanes[lane];
      const b = this._laneBest(L);
      if (b >= 0 && (!L.cur || L.queue[b].pri >= L.cur.pri)) {
        this._laneShow(lane, L.queue.splice(b, 1)[0]);
      }
    },

    _laneAdvance: function (lane) {
      const L = this.lanes[lane];
      L.cur = null;
      const b = this._laneBest(L);
      if (b >= 0) { this._laneShow(lane, L.queue.splice(b, 1)[0]); return; }
      this._laneRender(lane, null);
    },

    _laneShow: function (lane, item, refreshOnly) {
      const L = this.lanes[lane];
      L.cur = item;
      if (!refreshOnly) L.shownAt = performance.now();
      clearTimeout(L.timer);
      L.timer = setTimeout(() => this._laneAdvance(lane), item.dur);
      this._laneRender(lane, item, refreshOnly);
    },

    _laneRender: function (lane, item, refreshOnly) {
      const el = this.elements;
      const money = item && item.amount ? '+$' + Math.round(item.amount).toLocaleString('en-US') : '';
      if (lane === 'major') {
        const b = el.takedownBanner;
        if (!b) return;
        if (!item) { b.classList.remove('active'); return; }
        const title = item.text + (item.count > 1 ? ' x' + item.count : '');
        const sub = item.sub && money ? item.sub + '  ' + money : (item.sub || money);
        if (el.takedownTitle) el.takedownTitle.textContent = title;
        if (el.takedownSubtitle) {
          el.takedownSubtitle.textContent = sub;
          el.takedownSubtitle.hidden = !sub;
        }
        b.dataset.kind = item.kind;
        if (!refreshOnly) {
          b.classList.remove('active');
          void b.offsetWidth; // restart the pop-in transition
        }
        b.classList.add('active');
      } else {
        const t = this.toastEl;
        if (!t) return;
        if (!item) { t.classList.remove('active'); return; }
        this.toastTextEl.textContent = item.text + (item.count > 1 ? ' x' + item.count : '') + (item.sub ? ' · ' + item.sub : '');
        this.toastAmtEl.textContent = money;
        t.dataset.kind = item.kind;
        t.classList.add('active');
      }
    },

    /** Legacy API: big banner with a title and a subtitle. */
    triggerTakedownBanner: function (title, subtitle) {
      const t = String(title || 'CRUISER ELIMINATED');
      this.pushAlert({
        kind: /BUSTED/i.test(t) ? 'busted' : 'takedown',
        text: t,
        sub: subtitle || ''
      });
    },

    _announceHeat: function (level, prev, name) {
      const tier = name || HEAT_NAMES[level] || '';
      if (level > prev) {
        this.pushAlert({ kind: 'heat-up', text: 'HEAT ' + level + ' · ' + tier, sub: 'PURSUIT ESCALATING' });
      } else if (level < prev) {
        this.pushAlert({ kind: 'heat-down', text: 'HEAT ' + level + ' · ' + tier, sub: 'COOLING DOWN' });
      }
    },

    /** Clear alerts, summary and pause state. Call when a run (re)starts. */
    reset: function () {
      if (this.lanes) {
        ['major', 'minor'].forEach((n) => {
          const L = this.lanes[n];
          clearTimeout(L.timer); clearTimeout(L.minTimer);
          L.cur = null; L.queue = [];
          this._laneRender(n, null);
        });
      }
      this._lastHeatSeen = undefined;
      this.hideSummary();
      this.setPaused(false);
      this._releaseAll();
    },

    /**
     * setCallbacks({ onRunAgain(), onGarage(), onPause(wantPaused:boolean) })
     */
    setCallbacks: function (cbs) {
      this.callbacks = Object.assign(this.callbacks || {}, cbs || {});
    },

    _callback: function (name, arg, override) {
      const fn = (override && override[name]) || (this.callbacks && this.callbacks[name]);
      if (typeof fn !== 'function') return;
      try { fn(arg); } catch (err) { console.warn('[NeonHUD] callback ' + name + ' failed:', err); }
    },

    /** PAUSE INDICATOR */
    setPaused: function (paused) {
      paused = !!paused;
      if (!!this.paused === paused || !this.pausedEl) return;
      this.paused = paused;
      this.pausedEl.hidden = !paused;
      if (this.pauseBtn) {
        this.pauseBtn.setAttribute('aria-pressed', String(paused));
        this.pauseBtn.setAttribute('aria-label', paused ? 'Resume' : 'Pause');
        this.pauseBtn.textContent = paused ? '▶' : 'Ⅱ';
      }
      if (paused) {
        this._releaseAll();
        this._prevFocus = document.activeElement;
        if (this.pausedResumeBtn) this.pausedResumeBtn.focus();
      } else {
        const p = this._prevFocus;
        this._prevFocus = null;
        if (p && p !== document.body && document.contains(p) && typeof p.focus === 'function') p.focus();
        else if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      }
    },

    /** RUN SUMMARY */
    showSummary: function (d) {
      if (!this.summaryEl) return;
      d = d || {};
      const busted = d.reason === 'busted';
      this.summaryTitle.textContent = busted ? 'BUSTED' : 'RUN OVER';
      this.summarySub.textContent = busted ? 'The pursuit caught you.' : 'You made it out.';
      this.summaryEl.dataset.reason = busted ? 'busted' : 'ended';
      const n = (v) => Math.round(Number(v) || 0).toLocaleString('en-US');
      const secs = Math.max(0, Math.round(Number(d.duration) || 0));
      const v = this.summaryVals;
      v.duration.textContent = Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
      v.takedowns.textContent = n(d.takedowns);
      v.peakHeat.textContent = 'HEAT ' + n(d.peakHeat);
      v.driftScore.textContent = n(d.driftScore);
      v.creditsEarned.textContent = '+$' + n(d.creditsEarned);
      v.bestScore.textContent = n(d.bestScore);
      this.summaryNewBest.hidden = !d.newBest;
      this._summaryOverrides = { onRunAgain: d.onRunAgain, onGarage: d.onGarage };
      this.setPaused(false);
      this._releaseAll();
      if (!this.summaryOpen) this._summaryPrevFocus = document.activeElement;
      this.summaryOpen = true;
      this.summaryEl.hidden = false;
      this.summaryAgainBtn.focus();
    },

    hideSummary: function () {
      if (!this.summaryEl || !this.summaryOpen) return;
      this.summaryOpen = false;
      this.summaryEl.hidden = true;
      const p = this._summaryPrevFocus;
      this._summaryPrevFocus = null;
      if (p && p !== document.body && document.contains(p) && p.focus) p.focus();
      else if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    },

    _summaryAction: function (name) {
      const ov = this._summaryOverrides;
      this.hideSummary();
      this._callback(name, undefined, ov);
    },

    /**
     * ROBUST POINTER & MULTI-TOUCH CONTROLS (Zero Lag, Pointer Capture)
     */
    _bindTouchControls: function () {
      const el = this.elements;
      const inputs = this.mobileInputs;
      this._releasers = [];
      const held = { left: false, right: false };
      const syncSteer = () => { inputs.steer = (held.right ? 1 : 0) - (held.left ? 1 : 0); };

      const warnOnce = (err) => {
        if (this._warnedCapture) return;
        this._warnedCapture = true;
        console.warn('[NeonHUD] pointer capture unavailable:', err);
      };

      const attachPointerEvents = (domElement, onDown, onUp) => {
        if (!domElement) return;
        let active = false;

        const press = () => {
          active = true;
          domElement.classList.add('pressed');
          onDown();
        };
        const release = () => {
          if (!active) return;
          active = false;
          domElement.classList.remove('pressed');
          onUp();
        };
        this._releasers.push(release);

        domElement.addEventListener('pointerdown', (e) => {
          if (e.cancelable) e.preventDefault();
          if (domElement.setPointerCapture && e.pointerId !== undefined) {
            try { domElement.setPointerCapture(e.pointerId); } catch (err) { warnOnce(err); }
          }
          press();
        });
        const stop = (e) => {
          if (e && e.type !== 'lostpointercapture' && domElement.releasePointerCapture && e.pointerId !== undefined) {
            try { domElement.releasePointerCapture(e.pointerId); } catch (err) { warnOnce(err); }
          }
          release();
        };
        domElement.addEventListener('pointerup', stop);
        domElement.addEventListener('pointercancel', stop);
        domElement.addEventListener('lostpointercapture', stop);
        domElement.addEventListener('contextmenu', (e) => e.preventDefault());

        // Fallbacks for browsers without pointer events
        domElement.addEventListener('touchstart', (e) => { if (e.cancelable) e.preventDefault(); press(); }, { passive: false });
        domElement.addEventListener('touchend', (e) => { if (e.cancelable) e.preventDefault(); release(); }, { passive: false });
        domElement.addEventListener('touchcancel', release, { passive: false });
      };

      attachPointerEvents(el.pedalGas, () => { inputs.throttle = 1.0; }, () => { inputs.throttle = 0; });
      attachPointerEvents(el.pedalBrake, () => { inputs.brake = 1.0; }, () => { inputs.brake = 0; });
      attachPointerEvents(el.btnHandbrake, () => { inputs.handbrake = true; }, () => { inputs.handbrake = false; });
      attachPointerEvents(el.btnNitro, () => { inputs.nitro = true; }, () => { inputs.nitro = false; });
      attachPointerEvents(el.steerLeftBtn, () => { held.left = true; syncSteer(); }, () => { held.left = false; syncSteer(); });
      attachPointerEvents(el.steerRightBtn, () => { held.right = true; syncSteer(); }, () => { held.right = false; syncSteer(); });

      // Never leave a control latched when the page loses focus
      window.addEventListener('blur', () => this._releaseAll());
      document.addEventListener('visibilitychange', () => { if (document.hidden) this._releaseAll(); });

      // Touch layer follows the device/viewport instead of being decided once
      const sync = () => {
        if (!el.mobileLayer) return;
        const touch = this._sawTouch || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.innerWidth <= 900;
        el.mobileLayer.classList.toggle('active', !!touch);
      };
      sync();
      let pending = false;
      window.addEventListener('resize', () => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => { pending = false; sync(); });
      });
      window.addEventListener('touchstart', () => {
        if (!this._sawTouch) { this._sawTouch = true; sync(); }
      }, { passive: true });
    },

    _releaseAll: function () {
      if (this._releasers) this._releasers.forEach((r) => r());
    },

    /**
     * Virtual Girişləri Təqdim edən Getter
     */
    getMobileInputs: function () {
      return { ...this.mobileInputs };
    }
  };

  // Expose to window namespace
  window.NeonHUD = NeonHUD;

})(window, document);
