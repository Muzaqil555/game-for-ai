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

      this.initialized = true;

      // Start internal 60-120 FPS render loop for gauges & mirrors
      requestAnimationFrame(this._renderTick.bind(this));
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

        // Drift Dynamics & Scoring
        driftContainer: document.getElementById('hud-drift-dynamics'),
        driftMultTag: document.getElementById('drift-mult-tag'),
        driftScoreVal: document.getElementById('drift-score-val'),
        driftAngleTag: document.getElementById('drift-angle-tag'),

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
      if (data.heatLevel !== undefined) s.heatLevel = data.heatLevel;
      if (data.heatPercent !== undefined) s.heatPercent = data.heatPercent;
      if (data.isDrifting !== undefined) s.isDrifting = data.isDrifting;
      if (data.driftAngle !== undefined) s.driftAngle = data.driftAngle;
      if (data.driftScore !== undefined) s.driftScore = data.driftScore;
      if (data.driftMult !== undefined) s.driftMult = data.driftMult;
      if (data.credits !== undefined) s.credits = data.credits;
      if (data.statusMessage !== undefined) s.statusMessage = data.statusMessage;
      if (data.rearview !== undefined) s.rearviewData = data.rearview;
      if (data.radar !== undefined) s.radarData = data.radar;
    },

    /**
     * Əsas 60-120 FPS Render Dövrü
     */
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

      requestAnimationFrame(this._renderTick.bind(this));
    },

    /**
     * DOM Telemetriya Mətnlərinin və Barlarının Yenilənməsi
     */
    _updateDOMTelemetry: function () {
      const el = this.elements;
      const s = this.state;

      // 1. Digital Speedometer
      if (el.digitalSpeedVal) {
        el.digitalSpeedVal.textContent = Math.round(s.speed).toString();
      }

      // 2. RPM Text
      if (el.digitalRpmVal) {
        el.digitalRpmVal.textContent = Math.round(s.rpm).toLocaleString() + ' RPM';
      }

      // 3. Gear Indicator
      if (el.gearIndicator && s.gear !== this.lastGear) {
        el.gearIndicator.textContent = s.gear;
        this.lastGear = s.gear;
      }

      // 4. Redline Warning Flasher
      if (el.redlineFlasher) {
        if (s.rpm >= REDLINE_RPM) {
          el.redlineFlasher.classList.add('active');
        } else {
          el.redlineFlasher.classList.remove('active');
        }
      }

      // 5. Nitro Bar
      if (el.nitroBarFill) {
        el.nitroBarFill.style.width = (s.nitro * 100).toFixed(1) + '%';
      }

      // 6. Heat Level & Stars
      if (el.heatValTag) {
        el.heatValTag.textContent = 'HEAT ' + s.heatLevel;
      }
      if (el.heatMeterFill) {
        el.heatMeterFill.style.width = (s.heatPercent || (s.heatLevel * 20)).toFixed(1) + '%';
      }
      if (el.heatStars && el.heatStars.length > 0) {
        el.heatStars.forEach((star, idx) => {
          if (idx < s.heatLevel) {
            star.classList.add('active');
            if (s.heatLevel >= 4) {
              star.classList.add('danger');
            } else {
              star.classList.remove('danger');
            }
          } else {
            star.classList.remove('active', 'danger');
          }
        });
      }

      // 7. Police Dispatch Text
      if (el.policeDispatch) {
        const textNode = el.policeDispatch.querySelector('.dispatch-text') || el.policeDispatch.children[1];
        if (textNode) {
          textNode.textContent = s.statusMessage;
        }
      }

      // 8. Drift Dynamics & Score
      if (el.driftContainer) {
        if (s.isDrifting || s.driftScore > 0) {
          el.driftContainer.style.opacity = '1';
          if (el.driftMultTag) el.driftMultTag.textContent = s.driftMult.toFixed(1) + 'x';
          if (el.driftScoreVal) el.driftScoreVal.textContent = Math.round(s.driftScore).toLocaleString();
          if (el.driftAngleTag) el.driftAngleTag.textContent = Math.abs(Math.round(s.driftAngle)) + '° SLIP';
        } else {
          el.driftContainer.style.opacity = '0.35';
        }
      }

      // 9. Career Credits
      if (el.statCreditsVal) {
        el.statCreditsVal.textContent = '$' + (s.credits || 0).toLocaleString();
      }
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
          this.elements.mirrorStatus.textContent = `ALERT // PATROL PURSUIT CLOSING [${nearest}m]`;
          this.elements.mirrorStatus.style.color = isRedCycle ? PALETTE.red : PALETTE.blue;
        } else {
          this.elements.mirrorStatus.textContent = 'AUTO-DIM ACTIVE // REAR SECTOR CLEAR';
          this.elements.mirrorStatus.style.color = PALETTE.slate;
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
          this.elements.radarWarningTicker.textContent = 'ROADBLOCK AHEAD';
          this.elements.radarWarningTicker.style.color = PALETTE.red;
        } else {
          this.elements.radarWarningTicker.textContent = 'TACTICAL GPS // SCANNING';
          this.elements.radarWarningTicker.style.color = PALETTE.slate;
        }
      }
    },

    /**
     * 4. NOTIFICATION BANNERS & TAKEDOWNS
     */
    triggerTakedownBanner: function (title, subtitle) {
      const banner = this.elements.takedownBanner;
      if (!banner) return;

      if (this.elements.takedownTitle) this.elements.takedownTitle.textContent = title || 'CRUISER ELIMINATED';
      if (this.elements.takedownSubtitle) this.elements.takedownSubtitle.textContent = subtitle || '+$1,500 BOUNTY';

      banner.classList.add('active');

      if (this.bannerTimer) clearTimeout(this.bannerTimer);
      this.bannerTimer = setTimeout(() => {
        banner.classList.remove('active');
      }, 2600);
    },

    /**
     * 5. ROBUST POINTER & MULTI-TOUCH CONTROLS (Zero Lag, Pointer Capture)
     */
    _bindTouchControls: function () {
      const el = this.elements;
      const inputs = this.mobileInputs;

      const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.innerWidth <= 900;
      if (hasTouch && el.mobileLayer) {
        el.mobileLayer.classList.add('active');
      }

      const attachPointerEvents = (domElement, onDown, onUp) => {
        if (!domElement) return;

        let active = false;

        const start = (e) => {
          if (e.cancelable) e.preventDefault();
          if (domElement.setPointerCapture && e.pointerId) {
            try { domElement.setPointerCapture(e.pointerId); } catch (_) {}
          }
          active = true;
          domElement.classList.add('pressed');
          onDown();
        };

        const stop = (e) => {
          if (!active) return;
          active = false;
          if (domElement.releasePointerCapture && e && e.pointerId) {
            try { domElement.releasePointerCapture(e.pointerId); } catch (_) {}
          }
          domElement.classList.remove('pressed');
          onUp();
        };

        domElement.addEventListener('pointerdown', start);
        domElement.addEventListener('pointerup', stop);
        domElement.addEventListener('pointercancel', stop);
        domElement.addEventListener('pointerleave', stop);
        domElement.addEventListener('lostpointercapture', stop);

        // Fallbacks
        domElement.addEventListener('touchstart', (e) => {
          if (e.cancelable) e.preventDefault();
          domElement.classList.add('pressed');
          onDown();
        }, { passive: false });

        domElement.addEventListener('touchend', (e) => {
          if (e.cancelable) e.preventDefault();
          domElement.classList.remove('pressed');
          onUp();
        }, { passive: false });

        domElement.addEventListener('touchcancel', () => {
          domElement.classList.remove('pressed');
          onUp();
        }, { passive: false });
      };

      // 1. Gas Pedal
      attachPointerEvents(el.pedalGas,
        () => { inputs.throttle = 1.0; },
        () => { inputs.throttle = 0; }
      );

      // 2. Brake Pedal
      attachPointerEvents(el.pedalBrake,
        () => { inputs.brake = 1.0; },
        () => { inputs.brake = 0; }
      );

      // 3. Handbrake
      attachPointerEvents(el.btnHandbrake,
        () => { inputs.handbrake = true; },
        () => { inputs.handbrake = false; }
      );

      // 4. Nitro Boost
      attachPointerEvents(el.btnNitro,
        () => { inputs.nitro = true; },
        () => { inputs.nitro = false; }
      );

      // 5. Steering Left & Right
      attachPointerEvents(el.steerLeftBtn,
        () => { inputs.steer = -1.0; },
        () => { if (inputs.steer === -1.0) inputs.steer = 0; }
      );

      attachPointerEvents(el.steerRightBtn,
        () => { inputs.steer = 1.0; },
        () => { if (inputs.steer === 1.0) inputs.steer = 0; }
      );
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
