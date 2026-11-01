/**
 * AETHERIA: KÖLGƏLƏRİN SƏLTƏNƏTİ
 * Art Director & VFX Specialist — Ultra 2.5D / Isometric Visual Engine
 *
 * Fayl: src/vfx.js
 * Qlobal Obyekt: window.GameVFX
 */

(function () {
  'use strict';

  // --- Köməkçi Riyazi və Rəng Utilitləri ---
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // Deterministik psevdo-təsadüfi hash (Xəritə plitələrinin sabit vizual detalları üçün)
  function hash2D(x, y) {
    var h = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
    h = (h ^ (h >> 13)) * 1274126177;
    return (h ^ (h >> 16)) >>> 0;
  }

  // HEX / Color utiliti şəffaflıq üçün (Keşlənmiş sürətli RGB konvertasiyası)
  var _colorCache = {};
  function hexToRgba(hex, alpha) {
    if (!hex || hex[0] !== '#') return 'rgba(255, 255, 255, ' + alpha + ')';
    var rgb = _colorCache[hex];
    if (!rgb) {
      var c = hex.substring(1);
      if (c.length === 3) {
        c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
      }
      var num = parseInt(c, 16);
      rgb = {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
      };
      _colorCache[hex] = rgb;
    }
    return 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + alpha + ')';
  }

  // Y-Sıralama üçün təkrar istifadə olunan statik komparator
  function _sortRenderItems(a, b) {
    return a.y - b.y;
  }

  // --- GameVFX Əsas Obyekti ---
  var GameVFX = {
    canvas: null,
    ctx: null,

    // Hissəcik və effekt kolleksiyaları
    particles: [],
    ambientParticles: [],
    slashArcs: [],
    dashTrails: [],
    floatingTexts: [],
    shockwaves: [],
    chainLightnings: [],
    meteorStrikes: [],
    craters: [],

    // Dinamik plaş (Cape) fizika nöqtələri
    capePoints: [],
    lastCapePos: { x: 0, y: 0 },

    // Render hovuzu (Zero-GC obyekt allokasiyası üçün)
    _renderList: [],
    _renderPool: [],

    // PostFX vinyetka gradient keşi
    _vigGrad: null,
    _cachedVigW: 0,
    _cachedVigH: 0,

    // Max limitlər (unbounded array growth-un qarşısını almaq və 60-120+ FPS üçün)
    MAX_PARTICLES: 450,
    MAX_AMBIENT: 90,
    MAX_SLASH_ARCS: 30,
    MAX_DASH_TRAILS: 40,
    MAX_FLOATING_TEXTS: 60,
    MAX_SHOCKWAVES: 20,
    MAX_CHAIN_LIGHTNINGS: 30,
    MAX_METEORS: 20,
    MAX_CRATERS: 25,

    /**
     * VFX Sistemini inisializasiya edir
     */
    init: function (canvas, ctx) {
      this.canvas = canvas;
      this.ctx = ctx;

      this.particles = [];
      this.ambientParticles = [];
      this.slashArcs = [];
      this.dashTrails = [];
      this.floatingTexts = [];
      this.shockwaves = [];
      this.chainLightnings = [];
      this.meteorStrikes = [];
      this.craters = [];
      this._renderList = [];
      this._renderPool = [];
      this._vigGrad = null;

      // Cape simulyasiyası üçün 5 seqmentli zəncir
      this.capePoints = [];
      for (var i = 0; i < 5; i++) {
        this.capePoints.push({ x: 0, y: 0, vx: 0, vy: 0 });
      }

      // Hava hissəciklərini ilkin doldur
      for (var j = 0; j < this.MAX_AMBIENT; j++) {
        this.ambientParticles.push(this._createAmbientParticle(null, true));
      }
    },

    /**
     * Yeni hava (ambient) hissəciyi yaradır
     */
    _createAmbientParticle: function (worldState, randomizePos) {
      var camX = worldState && worldState.player ? worldState.player.x : 1300;
      var camY = worldState && worldState.player ? worldState.player.y : 1300;
      var spread = 1200;

      var p = {
        x: camX + (Math.random() - 0.5) * spread * 2,
        y: camY + (Math.random() - 0.5) * spread * 2,
        vx: (Math.random() - 0.5) * 20,
        vy: -15 - Math.random() * 25,
        size: 1.5 + Math.random() * 3,
        alpha: Math.random() * 0.8 + 0.2,
        pulseSpeed: 1 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2,
        seed: Math.random() * 1000
      };
      return p;
    },

    /**
     * Bütün aktiv vizual sistemləri və hissəcikləri yeniləyir
     */
    update: function (dt, camera, worldState) {
      dt = clamp(dt || 0.016, 0.001, 0.1);
      var time = (worldState && worldState.time) || (Date.now() * 0.001);
      var theme = (worldState && worldState.region && worldState.region.theme) || 'forest';
      var player = worldState ? worldState.player : null;

      // 1. Döyüş və partlayış hissəcikləri (O(1) Fast Removal - Array shifting ləğv edildi)
      for (var i = this.particles.length - 1; i >= 0; i--) {
        var p = this.particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          var lastP = this.particles.length - 1;
          if (i !== lastP) {
            this.particles[i] = this.particles[lastP];
          }
          this.particles.pop();
          continue;
        }

        // Hərəkət və sürtünmə
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        var drag = p.drag !== undefined ? p.drag : 3.0;
        p.vx *= Math.max(0, 1 - drag * dt);
        p.vy *= Math.max(0, 1 - drag * dt);

        if (p.gravity) {
          p.vy += p.gravity * dt;
        }

        if (p.rotSpeed) {
          p.rotation = (p.rotation || 0) + p.rotSpeed * dt;
        }

        // Ölçü və şəffaflıq animasiyası
        var progress = 1 - (p.life / p.maxLife);
        p.currentAlpha = p.alpha * (1 - progress);
        p.currentSize = p.size * (p.shrink ? (1 - progress * 0.7) : (1 + progress * 0.5));
      }

      // 2. Şok dalğaları (Shockwaves - O(1) Fast Removal)
      for (var sw = this.shockwaves.length - 1; sw >= 0; sw--) {
        var shock = this.shockwaves[sw];
        shock.life -= dt;
        if (shock.life <= 0) {
          var lastSW = this.shockwaves.length - 1;
          if (sw !== lastSW) {
            this.shockwaves[sw] = this.shockwaves[lastSW];
          }
          this.shockwaves.pop();
          continue;
        }
        var swProg = 1 - (shock.life / shock.maxLife);
        shock.currentRadius = shock.radius * Math.pow(swProg, 0.6);
        shock.currentAlpha = shock.alpha * (1 - swProg);
      }

      // 3. Qılınc kəsim qövsləri (Slash Arcs - O(1) Fast Removal)
      for (var s = this.slashArcs.length - 1; s >= 0; s--) {
        var arc = this.slashArcs[s];
        arc.life -= dt;
        if (arc.life <= 0) {
          var lastS = this.slashArcs.length - 1;
          if (s !== lastS) {
            this.slashArcs[s] = this.slashArcs[lastS];
          }
          this.slashArcs.pop();
          continue;
        }
        arc.currentRadius += (arc.targetRadius - arc.currentRadius) * (dt * 15);
        arc.currentAlpha = arc.alpha * (arc.life / arc.maxLife);
      }

      // 4. Dash Kölgələri (Dash Trails - O(1) Fast Removal)
      for (var d = this.dashTrails.length - 1; d >= 0; d--) {
        var tr = this.dashTrails[d];
        tr.life -= dt;
        if (tr.life <= 0) {
          var lastD = this.dashTrails.length - 1;
          if (d !== lastD) {
            this.dashTrails[d] = this.dashTrails[lastD];
          }
          this.dashTrails.pop();
          continue;
        }
        tr.currentAlpha = tr.alpha * (tr.life / tr.maxLife);
      }

      // 5. Üzən Mətnlər (Floating Texts - O(1) Fast Removal)
      for (var ft = this.floatingTexts.length - 1; ft >= 0; ft--) {
        var txt = this.floatingTexts[ft];
        txt.life -= dt;
        if (txt.life <= 0) {
          var lastFT = this.floatingTexts.length - 1;
          if (ft !== lastFT) {
            this.floatingTexts[ft] = this.floatingTexts[lastFT];
          }
          this.floatingTexts.pop();
          continue;
        }
        txt.y += txt.vy * dt;
        txt.vy += 35 * dt; // Zərif yuxarı qalxıb yavaşlama
        txt.x += txt.vx * dt;
        txt.vx *= 0.95;

        var txtProg = txt.life / txt.maxLife;
        txt.currentAlpha = Math.min(1, txtProg * 1.8);
        txt.currentScale = txtProg > 0.8 ? 1.25 : 1.0;
      }

      // 6. Hava Hissəcikləri (Ambient Weather Particles)
      var targetX = player ? player.x : (camera ? camera.x : 1300);
      var targetY = player ? player.y : (camera ? camera.y : 1300);
      var boundRadius = 900;

      for (var a = 0; a < this.ambientParticles.length; a++) {
        var ap = this.ambientParticles[a];

        if (theme === 'forest') {
          // İşıldaböcəklər və meşə yarpaqları: dalğalı, zərif uçuş
          ap.x += Math.sin(time * ap.pulseSpeed + ap.seed) * 30 * dt + ap.vx * dt;
          ap.y += Math.cos(time * 0.8 + ap.seed) * 15 * dt + (ap.vy * 0.3) * dt;
        } else if (theme === 'cavern') {
          // Kristal tozu: yuxarıya doğru süzülən astral zərrələr
          ap.x += Math.sin(time * 1.2 + ap.seed) * 10 * dt;
          ap.y += ap.vy * 0.6 * dt;
        } else if (theme === 'citadel') {
          // Qalada alov qığılcımları və kül: sürətli yuxarı qalxma və titrəmə
          ap.x += (Math.random() - 0.5) * 40 * dt;
          ap.y += (ap.vy * 1.5 - 20) * dt;
        }

        // Oyunçu/Kameradan uzaqlaşdıqda digər tərəfə tullanma (wrap-around)
        var dx = ap.x - targetX;
        var dy = ap.y - targetY;
        if (dx > boundRadius) ap.x -= boundRadius * 2;
        if (dx < -boundRadius) ap.x += boundRadius * 2;
        if (dy > boundRadius) ap.y -= boundRadius * 2;
        if (dy < -boundRadius) ap.y += boundRadius * 2;
      }

      // 7. Plaş (Cape) Dinamika Simulyasiyası
      if (player) {
        var capeAngle = player.angle || 0;
        // Çiyin arxası çıxış nöqtəsi
        var rootX = player.x - Math.cos(capeAngle) * (player.radius ? player.radius * 0.7 : 12);
        var rootY = player.y - Math.sin(capeAngle) * (player.radius ? player.radius * 0.7 : 12);

        this.capePoints[0].x = rootX;
        this.capePoints[0].y = rootY;

        var pVx = (player.vx || 0);
        var pVy = (player.vy || 0);
        var segDist = 5.5;

        for (var c = 1; c < this.capePoints.length; c++) {
          var prev = this.capePoints[c - 1];
          var curr = this.capePoints[c];

          // Ətalət və külək dalğalanması
          var windX = Math.sin(time * 8 + c * 0.9) * 2.5 - pVx * 0.08;
          var windY = Math.cos(time * 6 + c * 0.9) * 2.0 - pVy * 0.08;

          var diffX = curr.x - prev.x + windX;
          var diffY = curr.y - prev.y + windY;
          var dist = Math.hypot(diffX, diffY) || 1;

          // Məsafə tənzimlənməsi (String constraint)
          curr.x = prev.x + (diffX / dist) * segDist;
          curr.y = prev.y + (diffY / dist) * segDist;
        }
      }

      // 8. İldırım Zənciri (Chain Lightnings - O(1) Fast Removal)
      for (var cl = this.chainLightnings.length - 1; cl >= 0; cl--) {
        var ltg = this.chainLightnings[cl];
        ltg.life -= dt;
        if (ltg.life <= 0) {
          var lastCL = this.chainLightnings.length - 1;
          if (cl !== lastCL) {
            this.chainLightnings[cl] = this.chainLightnings[lastCL];
          }
          this.chainLightnings.pop();
          continue;
        }
        ltg.currentAlpha = clamp(ltg.life / ltg.maxLife, 0, 1);
      }

      // 9. Meteor Zərbələri (Meteor Strikes - O(1) Fast Removal)
      for (var ms = this.meteorStrikes.length - 1; ms >= 0; ms--) {
        var met = this.meteorStrikes[ms];
        met.elapsed += dt;
        var mProg = met.elapsed / met.travelDuration;

        if (mProg < 1.0) {
          met.curX = met.startX + (met.targetX - met.startX) * mProg;
          met.curY = met.startY + (met.targetY - met.startY) * mProg;

          // Eniş zamanı arxada odlu-astral tüstü/qığılcım zərrələri
          if (Math.random() < 0.65 && this.particles.length < this.MAX_PARTICLES) {
            this.particles.push({
              x: met.curX + (Math.random() - 0.5) * 16,
              y: met.curY + (Math.random() - 0.5) * 16,
              vx: (Math.random() - 0.5) * 40 - 25,
              vy: -20 - Math.random() * 50,
              size: 3 + Math.random() * 4.5,
              color: Math.random() < 0.5 ? met.color : '#ffd700',
              alpha: 0.85,
              shrink: true,
              drag: 2.2,
              life: 0.25 + Math.random() * 0.25,
              maxLife: 0.5
            });
          }
        } else if (!met.impacted) {
          // Zərbə anı! Yerdə nəhəng krater və partlayış
          met.impacted = true;
          met.curX = met.targetX;
          met.curY = met.targetY;

          if (this.craters.length >= this.MAX_CRATERS) {
            this.craters.shift();
          }
          this.craters.push({
            x: met.targetX,
            y: met.targetY,
            radius: met.radius,
            color: met.color,
            life: 2.5,
            maxLife: 2.5
          });

          this.spawnExplosion(met.targetX, met.targetY, met.color, 45, met.radius * 1.5);

          // İkinci odlu parlaq şok dalğası
          if (this.shockwaves.length < this.MAX_SHOCKWAVES) {
            this.shockwaves.push({
              x: met.targetX,
              y: met.targetY,
              radius: met.radius * 2.2,
              currentRadius: 10,
              color: '#ffffff',
              alpha: 1.0,
              life: 0.35,
              maxLife: 0.35
            });
          }
        } else {
          met.postImpactLife -= dt;
          if (met.postImpactLife <= 0) {
            var lastMS = this.meteorStrikes.length - 1;
            if (ms !== lastMS) {
              this.meteorStrikes[ms] = this.meteorStrikes[lastMS];
            }
            this.meteorStrikes.pop();
          }
        }
      }

      // 10. Kraterlərin ömrü (Craters - O(1) Fast Removal)
      for (var cr = this.craters.length - 1; cr >= 0; cr--) {
        var crt = this.craters[cr];
        crt.life -= dt;
        if (crt.life <= 0) {
          var lastCR = this.craters.length - 1;
          if (cr !== lastCR) {
            this.craters[cr] = this.craters[lastCR];
          }
          this.craters.pop();
        }
      }
    },

    /**
     * Yüksək detallı 2.5D / Izometrik fon, plitə relyefləri və parlayan rünlər
     */
    renderBackground: function (ctx, camera, regionData, time) {
      if (!ctx) return;
      time = time || (Date.now() * 0.001);
      var theme = (regionData && regionData.theme) || 'forest';
      var wWidth = (regionData && regionData.width) || 2600;
      var wHeight = (regionData && regionData.height) || 2600;

      // Kamera görünüş sahəsi (Viewport Culling üçün)
      var zoom = (camera && camera.zoom) || 1;
      var cW = (ctx.canvas ? ctx.canvas.width : 1280) / zoom;
      var cH = (ctx.canvas ? ctx.canvas.height : 720) / zoom;
      var camX = (camera && camera.x) || (wWidth / 2);
      var camY = (camera && camera.y) || (wHeight / 2);

      var minX = Math.max(0, camX - cW / 2 - 120);
      var maxX = Math.min(wWidth, camX + cW / 2 + 120);
      var minY = Math.max(0, camY - cH / 2 - 120);
      var maxY = Math.min(wHeight, camY + cH / 2 + 120);

      var tileSize = 80;
      var startCol = Math.floor(minX / tileSize);
      var endCol = Math.ceil(maxX / tileSize);
      var startRow = Math.floor(minY / tileSize);
      var endRow = Math.ceil(maxY / tileSize);

      // Bölgəyə görə rəng palitraları
      var bgPalettes = {
        forest: {
          groundA: '#0d1d14',
          groundB: '#12261b',
          tileBorder: '#1c3827',
          slabColor: '#172f22',
          crackGlow: 'rgba(57, 255, 136, 0.45)',
          mossColor: '#254a32',
          waterA: '#0a2328',
          waterB: '#133e47'
        },
        cavern: {
          groundA: '#0d0918',
          groundB: '#140f24',
          tileBorder: '#23183b',
          slabColor: '#1a1330',
          crackGlow: 'rgba(157, 78, 221, 0.55)',
          mossColor: '#2b1b4d',
          waterA: '#1a0c33',
          waterB: '#2e125c'
        },
        citadel: {
          groundA: '#110909',
          groundB: '#1a0e0e',
          tileBorder: '#301818',
          slabColor: '#211212',
          crackGlow: 'rgba(255, 90, 20, 0.65)',
          mossColor: '#3d1a1a',
          waterA: '#2b0900',
          waterB: '#541500' // Lava gölləri
        }
      };

      var pal = bgPalettes[theme] || bgPalettes.forest;

      // Xəritənin baza rəngi
      ctx.fillStyle = pal.groundA;
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

      // Yüksək performans: Dövr daxilindəki yüzlərlə ctx.save/restore stack əməliyyatları ləğv edildi
      ctx.save();
      var slabTopHighlight = 'rgba(255, 255, 255, 0.05)';
      var slabBottomShadow = 'rgba(0, 0, 0, 0.35)';
      var runeBaseColor = (theme === 'forest' ? '#39ff88' : (theme === 'cavern' ? '#00f0ff' : '#ff3300'));

      // 2.5D Plitələri və yer teksturasını çək
      for (var col = startCol; col <= endCol; col++) {
        for (var row = startRow; row <= endRow; row++) {
          var tx = col * tileSize;
          var ty = row * tileSize;
          var h = hash2D(col, row);

          // Plitə növü determinasiyası
          var isSlab = (h % 3 === 0);
          var hasRune = (h % 11 === 0);
          var hasCrack = (h % 5 === 0);
          var isLiquid = (h % 29 === 0);

          if (isLiquid) {
            // Su / Efir / Lava Gölməçəsi
            ctx.fillStyle = pal.waterA;
            ctx.beginPath();
            ctx.ellipse(tx + 40, ty + 40, 36, 28, 0, 0, Math.PI * 2);
            ctx.fill();

            // Dalğalanan daxili parıltı
            var wavePulse = 0.5 + 0.5 * Math.sin(time * 2 + (h % 10));
            ctx.fillStyle = pal.waterB;
            ctx.beginPath();
            ctx.ellipse(tx + 40, ty + 40, 26 * wavePulse, 20 * wavePulse, 0, 0, Math.PI * 2);
            ctx.fill();
            continue;
          }

          if (isSlab) {
            // 2.5D relyefli daş plitə
            ctx.fillStyle = pal.slabColor;
            ctx.fillRect(tx + 2, ty + 2, tileSize - 4, tileSize - 4);

            // 2.5D İşıqlı yuxarı haşiyə
            ctx.fillStyle = slabTopHighlight;
            ctx.fillRect(tx + 2, ty + 2, tileSize - 4, 2);
            ctx.fillRect(tx + 2, ty + 2, 2, tileSize - 4);

            // 2.5D Kölgəli alt haşiyə
            ctx.fillStyle = slabBottomShadow;
            ctx.fillRect(tx + 2, ty + tileSize - 4, tileSize - 4, 2);
            ctx.fillRect(tx + tileSize - 4, ty + 2, 2, tileSize - 4);
          } else {
            // Standart döşəmə xətləri
            ctx.strokeStyle = pal.tileBorder;
            ctx.lineWidth = 1;
            ctx.strokeRect(tx, ty, tileSize, tileSize);
          }

          // Parlayan rün çatları
          if (hasCrack) {
            ctx.strokeStyle = pal.crackGlow;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            var cx1 = tx + 10 + (h % 20);
            var cy1 = ty + 10 + ((h >> 4) % 20);
            var cx2 = tx + 40 + ((h >> 8) % 30);
            var cy2 = ty + 40 + ((h >> 12) % 30);
            var cx3 = tx + 70 - ((h >> 16) % 20);
            var cy3 = ty + 70 - ((h >> 20) % 20);
            ctx.moveTo(cx1, cy1);
            ctx.lineTo(cx2, cy2);
            ctx.lineTo(cx3, cy3);
            ctx.stroke();
          }

          // Qədim Rün Dairələri / Qravüraları
          if (hasRune) {
            var runePulse = 0.3 + 0.4 * Math.sin(time * 2.5 + (h % 7));
            ctx.strokeStyle = hexToRgba(runeBaseColor, runePulse);
            ctx.lineWidth = 1.2;

            // Rün halqası və spiral
            ctx.beginPath();
            ctx.arc(tx + 40, ty + 40, 18, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(tx + 40, ty + 26);
            ctx.lineTo(tx + 40, ty + 54);
            ctx.moveTo(tx + 26, ty + 40);
            ctx.lineTo(tx + 54, ty + 40);
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      // Xəritə Sərhədi (Borders) Mistik Duman Haşiyəsi
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 0, 80, 0.35)';
      ctx.lineWidth = 6;
      ctx.strokeRect(4, 4, wWidth - 8, wHeight - 8);
      ctx.restore();
    },

    /**
     * Bütün rekvizitləri, maneələri, varlıqları (NPC, Düşmən, Boss, Oyunçu) Y-sıralama ilə çəkir
     */
    renderPropsAndEntities: function (ctx, camera, worldState, time) {
      if (!ctx || !worldState) return;
      time = time || (Date.now() * 0.001);
      var self = this;

      // 0. Torpaq səthindəki aktiv zərbə kraterlərini çək
      this._renderCraters(ctx, time);

      // Kamera sahəsi culling üçün
      var zoom = (camera && camera.zoom) || 1;
      var cW = (ctx.canvas ? ctx.canvas.width : 1280) / zoom;
      var cH = (ctx.canvas ? ctx.canvas.height : 720) / zoom;
      var camX = (camera && camera.x) || 1300;
      var camY = (camera && camera.y) || 1300;
      var margin = 200;

      function inView(x, y, r) {
        r = r || 80;
        return (x + r >= camX - cW / 2 - margin &&
                x - r <= camX + cW / 2 + margin &&
                y + r >= camY - cH / 2 - margin &&
                y - r <= camY + cH / 2 + margin);
      }

      // Çəkiləcək bütün obyektləri Y-sorting üçün vahid siyahıya yığ (Zero-GC Object Pooling)
      var renderList = this._renderList;
      renderList.length = 0;
      var pool = this._renderPool;
      var poolIdx = 0;

      function pushRenderItem(type, data, y) {
        var item;
        if (poolIdx < pool.length) {
          item = pool[poolIdx++];
          item.type = type;
          item.data = data;
          item.y = y;
        } else {
          item = { type: type, data: data, y: y };
          pool.push(item);
          poolIdx++;
        }
        renderList.push(item);
      }

      // 1. Maneələr (Obstacles)
      if (worldState.region && worldState.region.obstacles) {
        for (var o = 0; o < worldState.region.obstacles.length; o++) {
          var obs = worldState.region.obstacles[o];
          if (inView(obs.x, obs.y, obs.radius || 60)) {
            pushRenderItem('obstacle', obs, obs.y);
          }
        }
      }

      // 2. Obelisklər
      if (worldState.region && worldState.region.obelisks) {
        for (var ob = 0; ob < worldState.region.obelisks.length; ob++) {
          var obl = worldState.region.obelisks[ob];
          if (inView(obl.x, obl.y, obl.radius || 70)) {
            pushRenderItem('obelisk', obl, obl.y);
          }
        }
      }

      // 3. Sandıqlar (Chests)
      if (worldState.region && worldState.region.chests) {
        for (var ch = 0; ch < worldState.region.chests.length; ch++) {
          var chest = worldState.region.chests[ch];
          if (inView(chest.x, chest.y, chest.radius || 40)) {
            pushRenderItem('chest', chest, chest.y);
          }
        }
      }

      // 4. Portal
      if (worldState.region && worldState.region.portal) {
        var port = worldState.region.portal;
        if (inView(port.x, port.y, port.radius || 90)) {
          pushRenderItem('portal', port, port.y);
        }
      }

      // 5. NPC-lər
      if (worldState.region && worldState.region.npcs) {
        for (var n = 0; n < worldState.region.npcs.length; n++) {
          var npc = worldState.region.npcs[n];
          if (inView(npc.x, npc.y, npc.radius || 40)) {
            pushRenderItem('npc', npc, npc.y);
          }
        }
      }

      // 6. Düşmənlər (Enemies)
      if (worldState.enemies) {
        for (var e = 0; e < worldState.enemies.length; e++) {
          var en = worldState.enemies[e];
          if (inView(en.x, en.y, en.radius || 45)) {
            pushRenderItem('enemy', en, en.y);
          }
        }
      }

      // 7. Boss
      if (worldState.boss) {
        if (inView(worldState.boss.x, worldState.boss.y, worldState.boss.radius || 90)) {
          pushRenderItem('boss', worldState.boss, worldState.boss.y);
        }
      }

      // 8. Yığılanlar (Pickups)
      if (worldState.pickups) {
        for (var pk = 0; pk < worldState.pickups.length; pk++) {
          var pku = worldState.pickups[pk];
          if (inView(pku.x, pku.y, pku.radius || 30)) {
            pushRenderItem('pickup', pku, pku.y);
          }
        }
      }

      // 9. Mərmilər (Projectiles)
      if (worldState.projectiles) {
        for (var pr = 0; pr < worldState.projectiles.length; pr++) {
          var proj = worldState.projectiles[pr];
          if (inView(proj.x, proj.y, proj.radius || 30)) {
            pushRenderItem('projectile', proj, proj.y);
          }
        }
      }

      // 10. Dash Kölgələri (Dash Trails)
      for (var dtI = 0; dtI < this.dashTrails.length; dtI++) {
        var dTrail = this.dashTrails[dtI];
        pushRenderItem('dashTrail', dTrail, dTrail.y);
      }

      // 11. Uçan Döyüşçü Yoldaş (Companion / Pet)
      var cRaw = worldState.companion;
      if (!cRaw && window.GameCompanions && typeof window.GameCompanions.getActiveCompanion === 'function') {
        cRaw = window.GameCompanions.getActiveCompanion();
      }
      if (cRaw) {
        var cType = (typeof cRaw === 'string') ? cRaw : (cRaw.type || cRaw.id || 'phoenix');
        var cX = (typeof cRaw === 'object' && cRaw.x != null) ? cRaw.x : null;
        var cY = (typeof cRaw === 'object' && cRaw.y != null) ? cRaw.y : null;
        var cAngle = (typeof cRaw === 'object' && cRaw.angle != null) ? cRaw.angle : 0;

        if (worldState.player && (cX == null || cY == null)) {
          var pX = worldState.player.x;
          var pY = worldState.player.y;
          if (cType === 'dragon') {
            cX = pX + 38 + Math.sin(time * 3.5) * 8;
            cY = pY - 34 + Math.cos(time * 3.5) * 6;
          } else if (cType === 'wolf') {
            cX = pX - 35 + Math.cos(time * 2.5) * 6;
            cY = pY + 12 + Math.sin(time * 3) * 5;
          } else {
            // phoenix
            cX = pX - 38 + Math.cos(time * 3) * 8;
            cY = pY - 36 + Math.sin(time * 4) * 6;
          }
        }

        if (cX != null && cY != null && inView(cX, cY, 60)) {
          pushRenderItem('companion', {
            type: cType,
            x: cX,
            y: cY,
            angle: cAngle,
            raw: cRaw
          }, cY);
        }
      }

      // 12. Relikt Kürələri (Orbitals)
      var orbitalsList = worldState.orbitals;
      if (!orbitalsList && window.GameRelics && typeof window.GameRelics.getOrbitals === 'function') {
        orbitalsList = window.GameRelics.getOrbitals();
      }
      if (orbitalsList && orbitalsList.length > 0) {
        for (var orbIdx = 0; orbIdx < orbitalsList.length; orbIdx++) {
          var orb = orbitalsList[orbIdx];
          if (!orb) continue;
          var ox = orb.x;
          var oy = orb.y;
          if (ox == null || oy == null) {
            if (worldState.player) {
              var oDist = orb.distance || orb.radius || 52;
              var oAng = (orb.angle != null) ? orb.angle : (time * 3.2 + (orbIdx * (Math.PI * 2 / orbitalsList.length)));
              ox = worldState.player.x + Math.cos(oAng) * oDist;
              oy = worldState.player.y + Math.sin(oAng) * oDist * 0.75;
            }
          }
          if (ox != null && oy != null && inView(ox, oy, 40)) {
            pushRenderItem('orbital', {
              x: ox,
              y: oy,
              radius: orb.orbRadius || orb.size || 8,
              color: orb.color || (orb.type === 'flame' ? '#ff4500' : '#00f0ff'),
              type: orb.type || 'astral',
              angle: orb.angle || 0,
              index: orbIdx
            }, oy);
          }
        }
      }

      // 13. Enməkdə olan Meteorlar (Meteors)
      for (var msI = 0; msI < this.meteorStrikes.length; msI++) {
        var mItem = this.meteorStrikes[msI];
        if (mItem && !mItem.impacted && inView(mItem.curX, mItem.curY, 140)) {
          pushRenderItem('meteor', mItem, mItem.curY);
        }
      }

      // 14. Oyunçu (Player)
      if (worldState.player) {
        pushRenderItem('player', worldState.player, worldState.player.y);
      }

      // 2.5D Y-SIRALAMA (Dərinlik üçün təkrar istifadə olunan statik komparatorla)
      renderList.sort(_sortRenderItems);

      // İcra: Sıralanmış massivi çək
      for (var idx = 0; idx < renderList.length; idx++) {
        var item = renderList[idx];
        switch (item.type) {
          case 'obstacle':
            self._renderObstacle(ctx, item.data, time);
            break;
          case 'obelisk':
            self._renderObelisk(ctx, item.data, time);
            break;
          case 'chest':
            self._renderChest(ctx, item.data, time);
            break;
          case 'portal':
            self._renderPortal(ctx, item.data, time);
            break;
          case 'npc':
            self._renderNPC(ctx, item.data, time);
            break;
          case 'enemy':
            self._renderEnemy(ctx, item.data, time);
            break;
          case 'boss':
            self._renderBoss(ctx, item.data, time);
            break;
          case 'pickup':
            self._renderPickup(ctx, item.data, time);
            break;
          case 'projectile':
            self._renderProjectile(ctx, item.data, time);
            break;
          case 'dashTrail':
            self._renderDashTrail(ctx, item.data);
            break;
          case 'companion':
            self._renderCompanion(ctx, item.data, time);
            break;
          case 'orbital':
            self._renderOrbital(ctx, item.data, time);
            break;
          case 'meteor':
            self._renderMeteor(ctx, item.data, time);
            break;
          case 'player':
            self._renderPlayer(ctx, item.data, time);
            break;
        }
      }

      // Qılınc Zərbə Qövsləri (Slash Arcs) ən üstdə
      this._renderSlashArcs(ctx);

      // İldırım Zənciri (Chain Lightning) ən üstdə parıldayan ziqzaqlar
      this._renderChainLightnings(ctx, time);
    },

    // --- Fərdi Rekvizit və Varlıq Rəsm Metodları ---

    /**
     * Zərbə kraterləri (torpaqda yanmış çatlar və közərmə)
     */
    _renderCraters: function (ctx, time) {
      if (!this.craters || this.craters.length === 0) return;
      ctx.save();
      for (var i = 0; i < this.craters.length; i++) {
        var cr = this.craters[i];
        var prog = cr.life / cr.maxLife; // 1 -> 0
        var alpha = clamp(prog * 1.2, 0, 0.85);

        // Kömürləşmiş qara qırıntı halqası
        ctx.fillStyle = 'rgba(10, 5, 5, ' + (alpha * 0.7) + ')';
        ctx.beginPath();
        ctx.ellipse(cr.x, cr.y, cr.radius * 0.9, cr.radius * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Yanıb sönən qırmızı-narıncı çatlar
        ctx.strokeStyle = hexToRgba(cr.color || '#ff4500', alpha * 0.8);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (var c = 0; c < 6; c++) {
          var cAng = (c * Math.PI / 3) + (c % 2 ? 0.3 : -0.2);
          var cDist = cr.radius * (0.6 + (c % 3) * 0.15);
          ctx.moveTo(cr.x, cr.y);
          ctx.lineTo(cr.x + Math.cos(cAng) * cDist, cr.y + Math.sin(cAng) * (cDist * 0.5));
        }
        ctx.stroke();

        // Mərkəzi közərən isti nüvə
        var hotCore = 0.5 + 0.5 * Math.sin(time * 6 + i);
        ctx.fillStyle = hexToRgba('#ffaa00', alpha * hotCore * 0.5);
        ctx.beginPath();
        ctx.ellipse(cr.x, cr.y, cr.radius * 0.35, cr.radius * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },

    /**
     * Uçan Döyüşçü Ruh Yoldaşı (Companion / Pet) — Phoenix, Dragon, Wolf
     */
    _renderCompanion: function (ctx, comp, time) {
      var x = comp.x;
      var y = comp.y;
      var type = comp.type || 'phoenix';
      var bounceY = Math.sin(time * 6) * 3;

      // Zəmində yumşaq kölgə
      this._drawShadow(ctx, x, y + 24, 14, 7, 0.35);

      ctx.save();
      ctx.translate(x, y + bounceY);

      if (type === 'dragon') {
        // --- Astral Bala Əjdaha ---
        var wingFlapD = Math.sin(time * 10);

        // Astral Aura
        var auraPulseD = 0.35 + 0.25 * Math.sin(time * 4);
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(168, 85, 247, ' + auraPulseD + ')';
        ctx.fill();

        // Quyruq (arxaya burulan)
        ctx.beginPath();
        ctx.moveTo(-6, 4);
        ctx.quadraticCurveTo(-16, 10 + Math.sin(time * 8) * 4, -22, 6);
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Quyruq ucu parlayan ulduz kristalı
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(-24, 4, 4, 4);

        // Əjdaha Qanadları (sol və sağ dəri membranlar)
        ctx.fillStyle = '#9333ea';
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 1.5;

        // Sol Qanad
        ctx.beginPath();
        ctx.moveTo(-2, -2);
        ctx.lineTo(-18, -14 * wingFlapD);
        ctx.lineTo(-8, -4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Sağ Qanad
        ctx.beginPath();
        ctx.moveTo(2, -2);
        ctx.lineTo(18, -14 * wingFlapD);
        ctx.lineTo(8, -4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Gövdə
        ctx.fillStyle = '#581c87';
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Baş və buynuzlar
        ctx.fillStyle = '#6b21a8';
        ctx.beginPath();
        ctx.arc(0, -10, 7, 0, Math.PI * 2);
        ctx.fill();

        // Xırda qızılı/cyan buynuzlar
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(-5, -18, 2, 5);
        ctx.fillRect(3, -18, 2, 5);

        // Gözlər (parlaq firuzəyi)
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 6;
        ctx.fillRect(-3, -12, 2, 2);
        ctx.fillRect(2, -12, 2, 2);

      } else if (type === 'wolf') {
        // --- Kölgə Ruh Qurdu ---
        var smokePulse = Math.sin(time * 7);

        // Kölgə duman aurası
        ctx.beginPath();
        ctx.ellipse(0, 0, 22, 16, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(49, 46, 129, 0.45)';
        ctx.fill();

        // Bədən (süzülən efir silueti)
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.moveTo(-14, 6 + smokePulse * 2);
        ctx.quadraticCurveTo(-4, -12, 8, -6);
        ctx.lineTo(12, 4);
        ctx.quadraticCurveTo(0, 14, -14, 6 + smokePulse * 2);
        ctx.closePath();
        ctx.fill();

        // İti Qurd Qulaqları
        ctx.fillStyle = '#312e81';
        ctx.beginPath();
        ctx.moveTo(6, -10);
        ctx.lineTo(10, -19);
        ctx.lineTo(12, -8);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(1, -10);
        ctx.lineTo(4, -18);
        ctx.lineTo(7, -8);
        ctx.closePath();
        ctx.fill();

        // Gözlər (parıldayan qırmızı/magenta kölgə baxışı)
        ctx.fillStyle = '#f43f5e';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 8;
        ctx.fillRect(7, -9, 2.5, 2.5);

        // Quyruq (arxaya axan duman zolaqları)
        ctx.strokeStyle = '#4338ca';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-12, 4);
        ctx.quadraticCurveTo(-22, 6 + smokePulse * 4, -26, 12);
        ctx.stroke();

      } else {
        // --- Alov Simurqu (Phoenix - Default) ---
        var wingFlapP = Math.sin(time * 14);

        // Parlaq alov aurası
        var auraPulseP = 0.4 + 0.3 * Math.sin(time * 5);
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 120, 0, ' + auraPulseP + ')';
        ctx.fill();

        // Alov quyruğu (3 dalğalanan lələk)
        for (var f = -1; f <= 1; f++) {
          ctx.beginPath();
          ctx.moveTo(0, 6);
          var tailWave = Math.sin(time * 8 + f * 1.2) * 5;
          ctx.quadraticCurveTo(f * 8, 16 + tailWave, f * 12, 26 + tailWave);
          ctx.strokeStyle = f === 0 ? '#ffd700' : '#ff4500';
          ctx.lineWidth = 2.2;
          ctx.stroke();
        }

        // Qanadlar (alov lələkləri şəklində)
        // Sol Alov Qanadı
        ctx.fillStyle = '#ff5400';
        ctx.beginPath();
        ctx.moveTo(-2, -2);
        ctx.quadraticCurveTo(-14, -8, -20, -18 * wingFlapP);
        ctx.quadraticCurveTo(-12, -4, 0, 4);
        ctx.closePath();
        ctx.fill();

        // Sağ Alov Qanadı
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.moveTo(2, -2);
        ctx.quadraticCurveTo(14, -8, 20, -18 * wingFlapP);
        ctx.quadraticCurveTo(12, -4, 0, 4);
        ctx.closePath();
        ctx.fill();

        // Qızılı Gövdə
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Baş və kəkil
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(0, -9, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Dimdik (narıncı)
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(6, -6);
        ctx.lineTo(0, -5);
        ctx.closePath();
        ctx.fill();

        // Parlaq göz
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 6;
        ctx.fillRect(1, -11, 2, 2);
      }

      ctx.restore();
    },

    /**
     * Fırlanan Relikt Kürələri və Parıltı İzləri (Orbitals)
     */
    _renderOrbital: function (ctx, orb, time) {
      var x = orb.x;
      var y = orb.y;
      var r = orb.radius || 8;
      var color = orb.color || '#ff4500';

      ctx.save();
      // Xarici parıltı halqası
      ctx.beginPath();
      ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(color, 0.35);
      ctx.fill();

      // Mərkəzi kürə
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fill();

      // Daxili ağ qaynar nüvə
      ctx.beginPath();
      ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.restore();
    },

    /**
     * Göydən enən Alovlu-Astral Meteor və Hədəf Halqası
     */
    _renderMeteor: function (ctx, meteor, time) {
      if (!meteor || meteor.impacted) return;

      ctx.save();

      // 1. Zəmində Hədəf Xəbərdarlıq Retikulu (Target Reticle)
      var tX = meteor.targetX;
      var tY = meteor.targetY;
      var rad = meteor.radius || 80;
      var prog = clamp(meteor.elapsed / meteor.travelDuration, 0, 1);

      // Yerdə daralan və qızaran dairəvi hədəf
      ctx.beginPath();
      ctx.ellipse(tX, tY, rad * (1.3 - prog * 0.3), rad * 0.55 * (1.3 - prog * 0.3), 0, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(meteor.color || '#ff4500', 0.5 + prog * 0.4);
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 8]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Hədəf mərkəzində xaç işarəsi
      ctx.strokeStyle = hexToRgba('#ffd700', 0.8);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tX - 14, tY);
      ctx.lineTo(tX + 14, tY);
      ctx.moveTo(tX, tY - 8);
      ctx.lineTo(tX, tY + 8);
      ctx.stroke();

      // 2. Göydən aşağı şığıyan meteor kürəsi və quyruğu
      var mX = meteor.curX;
      var mY = meteor.curY;

      // Arxaya uzanan nəhəng alovlu konus quyruq
      var tailGrad = ctx.createLinearGradient(mX, mY, mX - 80, mY - 170);
      tailGrad.addColorStop(0, '#ffffff');
      tailGrad.addColorStop(0.2, meteor.color || '#ff4500');
      tailGrad.addColorStop(0.7, '#d97706');
      tailGrad.addColorStop(1, 'rgba(120, 20, 0, 0)');

      ctx.beginPath();
      ctx.moveTo(mX + 12, mY);
      ctx.lineTo(mX - 100, mY - 210);
      ctx.lineTo(mX - 12, mY);
      ctx.closePath();
      ctx.fillStyle = tailGrad;
      ctx.fill();

      // Meteorun alovlu nüvəsi
      ctx.beginPath();
      ctx.arc(mX, mY, 15, 0, Math.PI * 2);
      ctx.fillStyle = meteor.color || '#ff4500';
      ctx.shadowColor = '#ff3b30';
      ctx.shadowBlur = 18;
      ctx.fill();

      // Ağ qaynar qəlpə mərkəzi
      ctx.beginPath();
      ctx.arc(mX, mY, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.restore();
    },

    /**
     * İki nöqtə arasında ziqzaqvari parlayan İldırım Qövsü
     */
    _renderChainLightnings: function (ctx, time) {
      if (!this.chainLightnings || this.chainLightnings.length === 0) return;

      ctx.save();
      for (var l = 0; l < this.chainLightnings.length; l++) {
        var ltg = this.chainLightnings[l];
        var alpha = ltg.currentAlpha || 1.0;
        var pts = ltg.points;
        if (!pts || pts.length < 2) continue;

        // Xarici parlaq elektrik aurası
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (var p = 1; p < pts.length; p++) {
          ctx.lineTo(pts[p].x, pts[p].y);
        }
        ctx.strokeStyle = hexToRgba(ltg.color || '#00f0ff', alpha * 0.9);
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'miter';
        ctx.shadowColor = ltg.color || '#00f0ff';
        ctx.shadowBlur = 14;
        ctx.stroke();

        // Daxili qaynar ağ nüvə
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (var p2 = 1; p2 < pts.length; p2++) {
          ctx.lineTo(pts[p2].x, pts[p2].y);
        }
        ctx.strokeStyle = hexToRgba('#ffffff', alpha);
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Yan budaqlar (Branches)
        if (ltg.branches && ltg.branches.length > 0) {
          for (var b = 0; b < ltg.branches.length; b++) {
            var br = ltg.branches[b];
            ctx.beginPath();
            ctx.moveTo(br[0].x, br[0].y);
            for (var bp = 1; bp < br.length; bp++) {
              ctx.lineTo(br[bp].x, br[bp].y);
            }
            ctx.strokeStyle = hexToRgba(ltg.color || '#00f0ff', alpha * 0.7);
            ctx.lineWidth = 2.0;
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    },

    // --- Fərdi Rekvizit və Varlıq Rəsm Metodları ---

    /**
     * Zəmində yumşaq 2.5D eliptik kölgə
     */
    _drawShadow: function (ctx, x, y, radiusX, radiusY, alpha) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, ' + (alpha || 0.45) + ')';
      ctx.fill();
      ctx.restore();
    },

    /**
     * Maneələr (tree, crystal, pillar, ruin)
     */
    _renderObstacle: function (ctx, obs, time) {
      var x = obs.x;
      var y = obs.y;
      var r = obs.radius || 35;
      var type = obs.type || 'tree';

      this._drawShadow(ctx, x, y + r * 0.4, r * 1.1, r * 0.55, 0.4);

      ctx.save();
      if (type === 'tree') {
        // Qədim Zümrüd Ağacı
        var sway = Math.sin(time * 2 + x * 0.05) * 3;

        // Gövdə
        ctx.fillStyle = '#2b1a0e';
        ctx.beginPath();
        ctx.moveTo(x - r * 0.3, y + r * 0.2);
        ctx.lineTo(x + r * 0.3, y + r * 0.2);
        ctx.lineTo(x + r * 0.15 + sway * 0.2, y - r * 0.8);
        ctx.lineTo(x - r * 0.15 + sway * 0.2, y - r * 0.8);
        ctx.closePath();
        ctx.fill();

        // 3 pilləli yarpaq çətiri (foliage tiers)
        var tiers = [
          { offsetY: -r * 0.7, size: r * 0.95, color: '#164223' },
          { offsetY: -r * 1.2, size: r * 0.8, color: '#225e34' },
          { offsetY: -r * 1.6, size: r * 0.6, color: '#32824a' }
        ];

        for (var t = 0; t < tiers.length; t++) {
          var tier = tiers[t];
          var tierSway = sway * (t + 1) * 0.6;
          ctx.beginPath();
          ctx.arc(x + tierSway, y + tier.offsetY, tier.size, 0, Math.PI * 2);
          ctx.fillStyle = tier.color;
          ctx.fill();

          // Yarpaq haşiyə parıltısı
          ctx.strokeStyle = 'rgba(57, 255, 136, 0.25)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Parlayan meşə tumurcuqları
        var fruitPulse = 0.5 + 0.5 * Math.sin(time * 4 + x);
        ctx.fillStyle = 'rgba(100, 255, 180, ' + fruitPulse + ')';
        ctx.beginPath();
        ctx.arc(x - r * 0.3 + sway, y - r * 1.1, 3.5, 0, Math.PI * 2);
        ctx.arc(x + r * 0.35 + sway, y - r * 0.8, 4, 0, Math.PI * 2);
        ctx.fill();

      } else if (type === 'crystal') {
        // Astral Kristal Monolit
        var pulse = 0.7 + 0.3 * Math.sin(time * 3 + x * 0.1);
        var cryH = r * 1.8;

        // Fasetlər (Facets)
        ctx.beginPath();
        ctx.moveTo(x, y - cryH);
        ctx.lineTo(x - r * 0.65, y - cryH * 0.35);
        ctx.lineTo(x - r * 0.3, y + r * 0.2);
        ctx.lineTo(x, y + r * 0.3);
        ctx.closePath();
        ctx.fillStyle = '#6a0dad';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x, y - cryH);
        ctx.lineTo(x + r * 0.65, y - cryH * 0.35);
        ctx.lineTo(x + r * 0.3, y + r * 0.2);
        ctx.lineTo(x, y + r * 0.3);
        ctx.closePath();
        ctx.fillStyle = '#9d4edd';
        ctx.fill();

        // Parlaq kəsim konturları
        ctx.strokeStyle = 'rgba(0, 240, 255, ' + pulse + ')';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Mərkəzi parlaq şüa nüvəsi
        ctx.beginPath();
        ctx.moveTo(x, y - cryH);
        ctx.lineTo(x, y + r * 0.3);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

      } else if (type === 'pillar') {
        // Qədim Sütun (Pillar)
        var pilH = r * 1.6;

        // Silindrik gövdə qradiyenti
        var pilGrad = ctx.createLinearGradient(x - r * 0.5, y, x + r * 0.5, y);
        pilGrad.addColorStop(0, '#2d2836');
        pilGrad.addColorStop(0.5, '#564d66');
        pilGrad.addColorStop(1, '#1b1722');

        ctx.fillStyle = pilGrad;
        ctx.fillRect(x - r * 0.45, y - pilH, r * 0.9, pilH);

        // Baza və kapitel
        ctx.fillStyle = '#6e6382';
        ctx.fillRect(x - r * 0.6, y - pilH - 8, r * 1.2, 8);
        ctx.fillRect(x - r * 0.6, y - 6, r * 1.2, 8);

        // Qazılmış parlayan rünlər
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - r * 0.2, y - pilH * 0.7, r * 0.4, pilH * 0.4);

      } else {
        // Ruin / Daş xarabalıq
        ctx.fillStyle = '#3a3347';
        ctx.beginPath();
        ctx.moveTo(x - r * 0.7, y + r * 0.2);
        ctx.lineTo(x - r * 0.5, y - r * 0.8);
        ctx.lineTo(x - r * 0.1, y - r * 0.9);
        ctx.lineTo(x + r * 0.2, y - r * 0.6);
        ctx.lineTo(x + r * 0.7, y + r * 0.2);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#5a506e';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    },

    /**
     * Rün Obeliski (Fırlanan enerji halqaları ilə)
     */
    _renderObelisk: function (ctx, obl, time) {
      var x = obl.x;
      var y = obl.y;
      var r = obl.radius || 40;
      var isAct = !!obl.activated;

      this._drawShadow(ctx, x, y + 15, r * 1.2, r * 0.6, 0.5);

      ctx.save();
      // Nəhəng qara obsidian sütun
      var obH = r * 2.2;
      ctx.fillStyle = '#100b1a';
      ctx.beginPath();
      ctx.moveTo(x, y - obH);
      ctx.lineTo(x - r * 0.4, y - obH * 0.8);
      ctx.lineTo(x - r * 0.5, y + 5);
      ctx.lineTo(x + r * 0.5, y + 5);
      ctx.lineTo(x + r * 0.4, y - obH * 0.8);
      ctx.closePath();
      ctx.fill();

      // Qədim rün naxışları
      var runeColor = isAct ? '#00f0ff' : '#4a3d6e';
      var runeAlpha = isAct ? (0.6 + 0.4 * Math.sin(time * 5)) : 0.35;
      ctx.strokeStyle = hexToRgba(runeColor, runeAlpha);
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(x, y - obH * 0.75);
      ctx.lineTo(x, y - 5);
      ctx.moveTo(x - r * 0.25, y - obH * 0.4);
      ctx.lineTo(x + r * 0.25, y - obH * 0.4);
      ctx.stroke();

      // Aktivdirsə: Fırlanan 3D enerji halqaları və şaquli şüa
      if (isAct) {
        // Şaquli lazer sütunu
        var beamGrad = ctx.createLinearGradient(x, y - obH, x, y - obH - 180);
        beamGrad.addColorStop(0, 'rgba(0, 240, 255, 0.7)');
        beamGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
        ctx.fillStyle = beamGrad;
        ctx.fillRect(x - 8, y - obH - 180, 16, 180);

        // Fırlanan 2 halqa
        for (var ring = 0; ring < 2; ring++) {
          var ringAngle = time * (ring === 0 ? 3 : -2.5);
          var ringY = y - obH * (0.35 + ring * 0.35);

          ctx.save();
          ctx.translate(x, ringY);
          ctx.rotate(ringAngle);
          ctx.beginPath();
          ctx.ellipse(0, 0, r * 0.85, r * 0.3, 0, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.85)';
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.restore();
        }
      }

      // Başının üstündə adı
      if (obl.name) {
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = isAct ? '#39ff88' : '#e0e0e0';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(obl.name + (isAct ? ' [AKTİV]' : ' [F]'), x, y - obH - 12);
      }
      ctx.restore();
    },

    /**
     * Sandıqlar (Chests)
     */
    _renderChest: function (ctx, chest, time) {
      var x = chest.x;
      var y = chest.y;
      var isOpened = !!chest.opened;

      this._drawShadow(ctx, x, y + 8, 24, 12, 0.45);

      ctx.save();
      // Korpus
      ctx.fillStyle = '#4a2e12';
      ctx.fillRect(x - 16, y - 10, 32, 20);

      // Qızıl metal haşiyələr
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 16, y - 10, 32, 20);

      if (isOpened) {
        // Açıq qapaq
        ctx.fillStyle = '#2d1b09';
        ctx.fillRect(x - 14, y - 18, 28, 8);
        ctx.strokeStyle = '#8a7223';
        ctx.strokeRect(x - 14, y - 18, 28, 8);
      } else {
        // Qapalı qızıl qıfıl və parıltı
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(x - 3, y - 3, 6, 8);

        // Nəfəs alan ulduzcuqlar
        var starPulse = 0.5 + 0.5 * Math.sin(time * 5);
        ctx.fillStyle = 'rgba(255, 215, 0, ' + starPulse + ')';
        ctx.beginPath();
        ctx.arc(x + Math.sin(time * 3) * 14, y - 14 + Math.cos(time * 3) * 6, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },

    /**
     * Qalaktik Portal Burulğanı (Swirling Cosmic Vortex)
     */
    _renderPortal: function (ctx, portal, time) {
      var x = portal.x;
      var y = portal.y;
      var r = portal.radius || 65;
      var isActive = !!portal.active;

      this._drawShadow(ctx, x, y + 10, r * 1.3, r * 0.7, 0.6);

      ctx.save();
      // Fırlanan qalaktik spiral qolları
      var arms = 3;
      var rotSpeed = isActive ? 3.5 : 1.2;

      for (var a = 0; a < arms; a++) {
        var baseAngle = (a * (Math.PI * 2 / arms)) + time * rotSpeed;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(baseAngle);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(r * 0.4, r * 0.3, r * 0.7, -r * 0.2, r, 0);
        ctx.strokeStyle = isActive ? 'rgba(0, 240, 255, 0.75)' : 'rgba(157, 78, 221, 0.4)';
        ctx.lineWidth = isActive ? 4 : 2;
        ctx.stroke();
        ctx.restore();
      }

      // Xarici fırlanan rün halqası
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-time * 1.5);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
      ctx.strokeStyle = isActive ? '#39ff88' : '#7b2cbf';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 12]);
      ctx.stroke();
      ctx.restore();

      // Mərkəzi Qara Dəlik (Event Horizon)
      ctx.beginPath();
      ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = '#05020a';
      ctx.fill();
      ctx.strokeStyle = isActive ? '#00f0ff' : '#9d4edd';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (isActive) {
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 5;
        ctx.fillText('PORTAL AÇIQDIR [F]', x, y - r - 10);
      }
      ctx.restore();
    },

    /**
     * NPC (Mistik bələdçi / personaj)
     */
    _renderNPC: function (ctx, npc, time) {
      var x = npc.x;
      var y = npc.y;
      var r = npc.radius || 24;

      this._drawShadow(ctx, x, y + 4, r * 1.1, r * 0.5, 0.4);

      ctx.save();
      // Ayaqaltı mistik enerji halqası
      var auraPulse = 0.4 + 0.3 * Math.sin(time * 3);
      ctx.beginPath();
      ctx.ellipse(x, y + 4, r * 1.15, r * 0.55, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 240, 255, ' + auraPulse + ')';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Mistik Cübbə və Bədən
      ctx.fillStyle = '#1e243d';
      ctx.beginPath();
      ctx.moveTo(x - 12, y + 8);
      ctx.lineTo(x + 12, y + 8);
      ctx.lineTo(x + 8, y - 22);
      ctx.lineTo(x - 8, y - 22);
      ctx.closePath();
      ctx.fill();

      // Kapüşon / Baş
      ctx.fillStyle = '#2c3559';
      ctx.beginPath();
      ctx.arc(x, y - 25, 9, 0, Math.PI * 2);
      ctx.fill();

      // Parlayan gözlər
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(x - 4, y - 26, 2, 2);
      ctx.fillRect(x + 2, y - 26, 2, 2);

      // Başının üstündə yellənən qızılı "!" ikonu
      var bounceY = Math.sin(time * 4) * 4;
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 20px serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 8;
      ctx.fillText('!', x, y - 42 + bounceY);

      // Ad və titul
      ctx.shadowBlur = 3;
      ctx.shadowColor = '#000000';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(npc.name || 'Müdrik', x, y - 56);
      if (npc.title) {
        ctx.fillStyle = '#90caf9';
        ctx.font = 'italic 9px sans-serif';
        ctx.fillText(npc.title, x, y - 68);
      }
      ctx.restore();
    },

    /**
     * Düşmənlər (goblin, archer, golem, wraith, knight, treasure goblin)
     */
    _renderEnemy: function (ctx, enemy, time) {
      var x = enemy.x;
      var y = enemy.y;
      var r = enemy.radius || 20;
      var type = enemy.type || 'goblin';
      var isTreasure = !!enemy.isTreasureGoblin;
      var isStunned = (enemy.stunTimer && enemy.stunTimer > 0);
      var isSlowed = (enemy.slowTimer && enemy.slowTimer > 0);

      this._drawShadow(ctx, x, y + r * 0.35, r * 1.1, r * 0.5, 0.45);

      ctx.save();

      // Qızıl Xəzinə Qoblini Aurası (Treasure Goblin Golden Star & Coin Aura)
      if (isTreasure) {
        var tAuraPulse = 0.5 + 0.5 * Math.sin(time * 6);
        ctx.beginPath();
        ctx.arc(x, y - 6, r * 1.35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 215, 0, ' + (0.2 + 0.2 * tAuraPulse) + ')';
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Fırlanan qızıl sikkələr / ulduzlar
        for (var sc = 0; sc < 5; sc++) {
          var scAng = time * 4 + (sc * (Math.PI * 2 / 5));
          var scX = x + Math.cos(scAng) * (r * 1.25);
          var scY = y - 6 + Math.sin(scAng) * (r * 0.8);
          ctx.fillStyle = '#ffd700';
          ctx.beginPath();
          ctx.arc(scX, scY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Yavaşlama (Slow Timer) Buz Mavisi Parıltı
      if (isSlowed) {
        ctx.beginPath();
        ctx.ellipse(x, y + 2, r * 1.2, r * 0.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';
        ctx.fill();
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 3D buz kristalları
        ctx.fillStyle = '#bae6fd';
        for (var ic = 0; ic < 3; ic++) {
          var icAng = (ic * 2.1) + time * 2;
          var icX = x + Math.cos(icAng) * (r * 0.7);
          var icY = y - 10 + Math.sin(icAng) * (r * 0.5);
          ctx.fillRect(icX - 2, icY - 2, 4, 4);
        }
      }

      // Növünə görə obraz rəsmi
      if (type === 'goblin' || isTreasure) {
        // Cəld yaşıl və ya Qızıl Xəzinə Qoblini
        ctx.fillStyle = isTreasure ? '#d97706' : '#3a6628';
        ctx.beginPath();
        ctx.arc(x, y - 6, r * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // Xəzinə kisəsi (arxasında)
        if (isTreasure) {
          ctx.fillStyle = '#92400e';
          ctx.beginPath();
          ctx.arc(x - 9, y - 2, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // Qulaqlar
        ctx.fillStyle = isTreasure ? '#f59e0b' : '#3a6628';
        ctx.beginPath();
        ctx.moveTo(x - r * 0.6, y - 8);
        ctx.lineTo(x - r * 1.1, y - 14);
        ctx.lineTo(x - r * 0.4, y - 3);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x + r * 0.6, y - 8);
        ctx.lineTo(x + r * 1.1, y - 14);
        ctx.lineTo(x + r * 0.4, y - 3);
        ctx.fill();

        // Parlayan gözlər
        ctx.fillStyle = isTreasure ? '#00f0ff' : '#ffe600';
        ctx.fillRect(x - 5, y - 7, 3, 3);
        ctx.fillRect(x + 2, y - 7, 3, 3);

      } else if (type === 'archer') {
        // Qaranlıq oxatan
        ctx.fillStyle = '#3b2f2f';
        ctx.beginPath();
        ctx.arc(x, y - 8, r * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // Kapüşon
        ctx.fillStyle = '#223826';
        ctx.beginPath();
        ctx.moveTo(x, y - 22);
        ctx.lineTo(x - 10, y - 8);
        ctx.lineTo(x + 10, y - 8);
        ctx.closePath();
        ctx.fill();

        // Kaman
        ctx.strokeStyle = '#cda869';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + 10, y - 8, 12, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();

      } else if (type === 'golem') {
        // Qaya və lava qolemi
        ctx.fillStyle = '#383838';
        ctx.fillRect(x - r * 0.7, y - r * 1.2, r * 1.4, r * 1.2);

        // Çatlarından parlayan qırmızı lava
        ctx.strokeStyle = '#ff3c00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 6, y - r * 0.9);
        ctx.lineTo(x + 6, y - r * 0.4);
        ctx.stroke();

        // Qırmızı göz yarıqları
        ctx.fillStyle = '#ff1a1a';
        ctx.fillRect(x - 7, y - r * 0.95, 4, 3);
        ctx.fillRect(x + 3, y - r * 0.95, 4, 3);

      } else if (type === 'wraith') {
        // Havada süzülən xəyal / kölgə
        var floatY = Math.sin(time * 5 + x) * 4;
        ctx.fillStyle = '#1f132e';
        ctx.beginPath();
        ctx.moveTo(x - 12, y - 24 + floatY);
        ctx.bezierCurveTo(x - 16, y + floatY, x + 16, y + floatY, x + 12, y - 24 + floatY);
        ctx.closePath();
        ctx.fill();

        // Bənövşəyi xəyal gözləri
        ctx.fillStyle = '#d946ef';
        ctx.shadowColor = '#d946ef';
        ctx.shadowBlur = 6;
        ctx.fillRect(x - 5, y - 18 + floatY, 3, 4);
        ctx.fillRect(x + 2, y - 18 + floatY, 3, 4);

      } else {
        // Knight / Qara cəngavər
        ctx.fillStyle = '#1c1c24';
        ctx.fillRect(x - 10, y - 24, 20, 22);

        // Polad dəbilqə və buynuzlar
        ctx.fillStyle = '#3a3a47';
        ctx.beginPath();
        ctx.arc(x, y - 24, 8, 0, Math.PI * 2);
        ctx.fill();

        // Qırmızı dəbilqə yarığı
        ctx.fillStyle = '#ff0033';
        ctx.fillRect(x - 5, y - 25, 10, 2);
      }

      // Can Barı (Mini HP Bar)
      var hp = enemy.hp || 0;
      var maxHp = enemy.maxHp || 1;
      var hpRatio = clamp(hp / maxHp, 0, 1);

      var barW = 28;
      var barH = 4;
      var barY = y - r * 1.3 - 8;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(x - barW / 2 - 1, barY - 1, barW + 2, barH + 2);

      ctx.fillStyle = isTreasure ? '#fbbf24' : '#e63946';
      ctx.fillRect(x - barW / 2, barY, barW * hpRatio, barH);

      // Stun Ulduzları (Stun Timer fırlanan ulduzlar)
      if (isStunned) {
        for (var st = 0; st < 3; st++) {
          var stAng = time * 7 + (st * (Math.PI * 2 / 3));
          var stX = x + Math.cos(stAng) * 14;
          var stY = barY - 8 + Math.sin(stAng) * 5;
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(stX, stY, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Xəzinə Qoblini Başüstü Nişanı
      if (isTreasure) {
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText('💰 XƏZİNƏ QOBLİNİ', x, barY - (isStunned ? 16 : 8));
      }

      ctx.restore();
    },

    /**
     * Çoxmərhələli Əfsanəvi Boss (Sylvanos, Kryos, Malakor)
     */
    _renderBoss: function (ctx, boss, time) {
      var x = boss.x;
      var y = boss.y;
      var r = boss.radius || 60;
      var phase = boss.phase || 1;
      var maxPhases = boss.maxPhases || 3;

      this._drawShadow(ctx, x, y + r * 0.45, r * 1.4, r * 0.65, 0.6);

      ctx.save();
      // Mərhələyə (Phase) görə Dəhşətli Aura
      var auraColors = {
        1: { glow: '#39ff88', core: '#143d22' },
        2: { glow: '#ff5400', core: '#4a1500' },
        3: { glow: '#ff0055', core: '#380013' }
      };
      var ac = auraColors[phase] || auraColors[1];

      // Fırlanan xarici aura tikanları
      var spikes = 8;
      for (var s = 0; s < spikes; s++) {
        var spAngle = (s * (Math.PI * 2 / spikes)) + time * (phase === 3 ? 4 : 2);
        var spX = x + Math.cos(spAngle) * (r * 1.15);
        var spY = y + Math.sin(spAngle) * (r * 0.85);

        ctx.beginPath();
        ctx.arc(spX, spY, 6 + phase * 2, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(ac.glow, 0.35 + 0.25 * Math.sin(time * 6 + s));
        ctx.fill();
      }

      // Nəhəng Bədən Monoliti
      ctx.fillStyle = ac.core;
      ctx.beginPath();
      ctx.arc(x, y - r * 0.3, r * 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Qorxunc Zireh və Qanadlar
      ctx.strokeStyle = ac.glow;
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Qorxunc gözlər və faza qəzəbi
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = ac.glow;
      ctx.shadowBlur = 12;
      ctx.fillRect(x - 14, y - r * 0.45, 8, 5);
      ctx.fillRect(x + 6, y - r * 0.45, 8, 5);

      // Boss Epik Can Barı (Başının üstündə)
      var hp = boss.hp || 0;
      var maxHp = boss.maxHp || 1;
      var hpRatio = clamp(hp / maxHp, 0, 1);

      var bBarW = 90;
      var bBarH = 7;
      var bBarY = y - r * 1.3 - 22;

      // Zirehli Çərçivə
      ctx.fillStyle = 'rgba(10, 5, 15, 0.85)';
      ctx.fillRect(x - bBarW / 2 - 2, bBarY - 2, bBarW + 4, bBarH + 4);

      // Qızılı haşiyə
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - bBarW / 2 - 2, bBarY - 2, bBarW + 4, bBarH + 4);

      // Can dolğusu
      var bGrad = ctx.createLinearGradient(x - bBarW / 2, 0, x + bBarW / 2, 0);
      bGrad.addColorStop(0, '#ff0055');
      bGrad.addColorStop(1, '#ff9900');
      ctx.fillStyle = bGrad;
      ctx.fillRect(x - bBarW / 2, bBarY, bBarW * hpRatio, bBarH);

      // Boss Adı və Faza
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText((boss.name || 'BOSS') + ' [Mərhələ ' + phase + '/' + maxPhases + ']', x, bBarY - 6);
      ctx.restore();
    },

    /**
     * Yığılan əşyalar (Gold, Crystals, Health Orbs)
     */
    _renderPickup: function (ctx, pickup, time) {
      var x = pickup.x;
      var y = pickup.y;
      var type = pickup.type || 'gold';
      var bounceY = Math.sin(time * 5 + x) * 5;

      this._drawShadow(ctx, x, y + 10, 12, 6, 0.35);

      ctx.save();
      if (type === 'gold' || type === 'coin') {
        // 3D fırlanan qızıl sikkə
        var rotScale = Math.abs(Math.cos(time * 6));
        ctx.translate(x, y + bounceY);
        ctx.scale(rotScale, 1);

        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd700';
        ctx.fill();
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 2;
        ctx.stroke();

      } else if (type === 'crystal') {
        // Prizmatik firuzəyi brilyant
        ctx.translate(x, y + bounceY);
        ctx.beginPath();
        ctx.moveTo(0, -11);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 11);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.fillStyle = '#00f0ff';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

      } else {
        // Can kürəsi (Health Orb)
        var orbPulse = 0.8 + 0.2 * Math.sin(time * 8);
        ctx.translate(x, y + bounceY);
        ctx.beginPath();
        ctx.arc(0, 0, 8 * orbPulse, 0, Math.PI * 2);
        ctx.fillStyle = '#ff1744';
        ctx.fill();
        ctx.strokeStyle = '#ff80ab';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    },

    /**
     * Mərmilər (Arcane Bolt, Fireball, Arrows, AOE Nova)
     */
    _renderProjectile: function (ctx, proj, time) {
      var x = proj.x;
      var y = proj.y;
      var r = proj.radius || 8;
      var color = proj.color || '#00f0ff';

      ctx.save();
      // Parlaq Mərkəzi Kürə
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fill();

      // Daxili ağ nüvə
      ctx.beginPath();
      ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    },

    /**
     * Dash Kölgəsi (Ghost after-image)
     */
    _renderDashTrail: function (ctx, trail) {
      ctx.save();
      ctx.globalAlpha = trail.currentAlpha || 0.4;
      ctx.beginPath();
      ctx.arc(trail.x, trail.y, trail.radius || 20, 0, Math.PI * 2);
      ctx.fillStyle = trail.color || '#9d4edd';
      ctx.shadowColor = trail.color || '#9d4edd';
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.restore();
    },

    /**
     * Oyunçu (Cəngavər/Sehrbaz, Dinamik Dalğalanan Plaş və Parlayan Silah)
     */
    _renderPlayer: function (ctx, player, time) {
      var x = player.x;
      var y = player.y;
      var r = player.radius || 20;
      var angle = player.angle || 0;
      var skin = player.skin || 'default';
      var isInvuln = (player.invulnTimer && player.invulnTimer > 0);

      // Zəmində kölgə
      this._drawShadow(ctx, x, y + r * 0.4, r * 1.1, r * 0.5, 0.45);

      ctx.save();

      // Əgər toxunulmazdırsa (Dash və ya zədə sonrası), sayrışma effekti
      if (isInvuln) {
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 25);

        // Qoruyucu Altıbucaqlı Enerji Sipəri (Shield)
        ctx.beginPath();
        for (var h = 0; h < 6; h++) {
          var hAngle = (h * Math.PI / 3) + time * 3;
          var hX = x + Math.cos(hAngle) * (r * 1.35);
          var hY = y + Math.sin(hAngle) * (r * 1.35);
          if (h === 0) ctx.moveTo(hX, hY);
          else ctx.lineTo(hX, hY);
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Skin rəngləri
      var skinPalettes = {
        default: { cloak: '#1e3a8a', armor: '#334155', sword: '#00f0ff', trim: '#60a5fa' },
        crimson_flame: { cloak: '#991b1b', armor: '#1c1917', sword: '#ff3b30', trim: '#f97316' },
        astral_void: { cloak: '#581c87', armor: '#0f172a', sword: '#c084fc', trim: '#e879f9' },
        golden_paladin: { cloak: '#854d0e', armor: '#f8fafc', sword: '#fbbf24', trim: '#fde047' }
      };
      var pPal = skinPalettes[skin] || skinPalettes.default;

      // 1. Dinamik Küləkdə Dalğalanan Plaş (Cape Drawing)
      if (this.capePoints && this.capePoints.length > 2) {
        ctx.beginPath();
        ctx.moveTo(this.capePoints[0].x - 6, this.capePoints[0].y);

        for (var cp = 1; cp < this.capePoints.length; cp++) {
          ctx.lineTo(this.capePoints[cp].x, this.capePoints[cp].y);
        }
        for (var cpb = this.capePoints.length - 1; cpb >= 1; cpb--) {
          ctx.lineTo(this.capePoints[cpb].x + 12, this.capePoints[cpb].y);
        }
        ctx.closePath();
        ctx.fillStyle = pPal.cloak;
        ctx.fill();

        ctx.strokeStyle = pPal.trim;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // 2. Cəngavər Zirehli Gövdəsi
      ctx.fillStyle = pPal.armor;
      ctx.beginPath();
      ctx.arc(x, y - 6, r * 0.65, 0, Math.PI * 2);
      ctx.fill();

      // Çiyinliklər (Pauldrons)
      ctx.fillStyle = pPal.trim;
      ctx.fillRect(x - r * 0.75, y - 10, 6, 9);
      ctx.fillRect(x + r * 0.45, y - 10, 6, 9);

      // 3. Dəbilqə və Parıldayan Visor
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(x, y - 14, 7, 0, Math.PI * 2);
      ctx.fill();

      // Baxış istiqamətinə görə dəbilqə göz yarığı
      var eyeOffX = Math.cos(angle) * 3;
      var eyeOffY = Math.sin(angle) * 3;
      ctx.fillStyle = pPal.sword;
      ctx.shadowColor = pPal.sword;
      ctx.shadowBlur = 6;
      ctx.fillRect(x - 3 + eyeOffX, y - 15 + eyeOffY, 6, 2.5);

      // 4. Parlayan Silah (player.weaponType: 'sword' | 'daggers' | 'hammer' | 'bow')
      var wType = player.weaponType;
      if (!wType && window.GameRelics && typeof window.GameRelics.getActiveWeapon === 'function') {
        var aW = window.GameRelics.getActiveWeapon();
        if (aW) wType = aW.id || aW.key;
      }
      wType = wType || 'sword';

      ctx.save();
      ctx.translate(x, y - 6);
      ctx.rotate(angle);

      if (wType === 'daggers') {
        // --- Əkiz Kölgə Xəncərləri (Twin Shadow Daggers) ---
        // Sağ əl xəncəri (irəli yönəlmiş)
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(8, 4, 4, 2.5); // Dəstək

        ctx.beginPath();
        ctx.moveTo(12, 3.5);
        ctx.lineTo(26, 5);
        ctx.lineTo(12, 7.5);
        ctx.closePath();
        ctx.fillStyle = '#e11d48';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 9;
        ctx.fill();

        // Sol əl xəncəri (ikinci əl / tərs tutuş)
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(6, -8, 4, 2.5);

        ctx.beginPath();
        ctx.moveTo(10, -8.5);
        ctx.lineTo(24, -7);
        ctx.lineTo(10, -5);
        ctx.closePath();
        ctx.fillStyle = '#a21caf';
        ctx.shadowColor = '#d946ef';
        ctx.shadowBlur = 9;
        ctx.fill();

        // Zəhərli / kölgəli aura parıltısı
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(18, 4.5, 2, 1.5);
        ctx.fillRect(16, -7.5, 2, 1.5);

      } else if (wType === 'hammer') {
        // --- İri İkiəlli Astral Döyüş Çəkici (Astral Warhammer) ---
        // Uzun ikiəlli sap
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(4, -2, 22, 4);
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(10, -2.5, 3, 5); // Qızıl bəzək halqası
        ctx.fillRect(18, -2.5, 3, 5);

        // Nəhəng Çəkic Başı (Double-headed warhammer block)
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(23, -11, 14, 22);

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(23, -11, 14, 22);

        // Astral parıldayan rün çatıları və nüvə
        ctx.fillStyle = '#818cf8';
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 10;
        ctx.fillRect(25, -8, 10, 3);
        ctx.fillRect(25, 5, 10, 3);

        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(30, 0, 3, 0, Math.PI * 2);
        ctx.fill();

      } else if (wType === 'bow') {
        // --- Qızılı-Alovlu Simurq Yayı və Oxu (Phoenix Bow & Arrow) ---
        // Yay Qövsü (Qızılı-alovlu əyri)
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(14, 0, 15, -Math.PI * 0.42, Math.PI * 0.42);
        ctx.stroke();

        // Mərkəzi qızıl ornament və yaqut
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(12, -2.5, 4, 5);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(13, -1.5, 2, 3);

        // İşıqlı gərilmiş sim
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(14 + Math.cos(-Math.PI * 0.42) * 15, Math.sin(-Math.PI * 0.42) * 15);
        ctx.lineTo(6, 0);
        ctx.lineTo(14 + Math.cos(Math.PI * 0.42) * 15, Math.sin(Math.PI * 0.42) * 15);
        ctx.stroke();

        // Çəkilmiş Simurq Oxu
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(26, 0);
        ctx.stroke();

        // Alovlanan ox ucluğu
        ctx.fillStyle = '#ff0033';
        ctx.shadowColor = '#ff5400';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(26, -3.5);
        ctx.lineTo(33, 0);
        ctx.lineTo(26, 3.5);
        ctx.closePath();
        ctx.fill();

      } else {
        // --- Parlayan Aether Qılıncı (Aether Sword - Default) ---
        // Qılınc dəstəyi və qızılı quba
        ctx.fillStyle = '#475569';
        ctx.fillRect(8, 4, 7, 3);
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(15, 2, 2.5, 7); // Crossguard

        // İşıq saçan Aether kristal tiyəsi
        ctx.beginPath();
        ctx.moveTo(17.5, 3.5);
        ctx.lineTo(36, 5.5);
        ctx.lineTo(17.5, 7.5);
        ctx.closePath();
        ctx.fillStyle = pPal.sword || '#00f0ff';
        ctx.shadowColor = pPal.sword || '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.fill();

        // Daxili parlaq rün zolağı
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(19, 5, 12, 1.2);
      }

      ctx.restore();

      ctx.restore();
    },

    /**
     * Oyunçunun Silah Rəsmi və Render Ləqəbi (_drawPlayer alias)
     */
    _drawPlayer: function (ctx, player, time) {
      this._renderPlayer(ctx, player, time);
    },

    /**
     * Qılınc Zərbə Qövsləri
     */
    _renderSlashArcs: function (ctx) {
      for (var s = 0; s < this.slashArcs.length; s++) {
        var arc = this.slashArcs[s];
        ctx.save();
        ctx.beginPath();
        var startA = arc.angle - arc.spread / 2;
        var endA = arc.angle + arc.spread / 2;
        ctx.arc(arc.x, arc.y, arc.currentRadius, startA, endA);
        ctx.strokeStyle = hexToRgba(arc.color, arc.currentAlpha);
        ctx.lineWidth = arc.width;
        ctx.lineCap = 'round';
        ctx.shadowColor = arc.color;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();
      }
    },

    /**
     * Atmosferik İşıqlandırma, Hava Hissəcikləri, Post-FX və Üzən Rəqəmlər
     */
    renderLightingAndPostFX: function (ctx, canvas, camera, worldState, time) {
      if (!ctx) return;
      time = time || (Date.now() * 0.001);
      canvas = canvas || this.canvas || ctx.canvas;
      var theme = (worldState && worldState.region && worldState.region.theme) || 'forest';
      var player = worldState ? worldState.player : null;

      // 1. Dinamik Parıltı və İşıq Mənbələri (Additive Blending / Bloom)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // A. Oyunçu ətrafında isti fənər və aura
      if (player) {
        var pLightRad = 190;
        var pGrad = ctx.createRadialGradient(player.x, player.y, 10, player.x, player.y, pLightRad);
        pGrad.addColorStop(0, 'rgba(180, 225, 255, 0.38)');
        pGrad.addColorStop(0.5, 'rgba(70, 150, 255, 0.14)');
        pGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(player.x, player.y, pLightRad, 0, Math.PI * 2);
        ctx.fill();
      }

      // B. Obelisklərin Rün Parıltısı
      if (worldState && worldState.region && worldState.region.obelisks) {
        for (var ob = 0; ob < worldState.region.obelisks.length; ob++) {
          var obl = worldState.region.obelisks[ob];
          var obRad = obl.activated ? 240 : 130;
          var obGrad = ctx.createRadialGradient(obl.x, obl.y, 5, obl.x, obl.y, obRad);
          obGrad.addColorStop(0, obl.activated ? 'rgba(0, 240, 255, 0.45)' : 'rgba(100, 70, 200, 0.22)');
          obGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = obGrad;
          ctx.beginPath();
          ctx.arc(obl.x, obl.y, obRad, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // C. Boss Dəhşətli Qaranlıq / Qəzəb İşığı
      if (worldState && worldState.boss) {
        var boss = worldState.boss;
        var bRad = 280;
        var bGrad = ctx.createRadialGradient(boss.x, boss.y, 15, boss.x, boss.y, bRad);
        bGrad.addColorStop(0, boss.phase === 3 ? 'rgba(255, 0, 80, 0.55)' : 'rgba(255, 80, 0, 0.35)');
        bGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, bRad, 0, Math.PI * 2);
        ctx.fill();
      }

      // D. Mərmilərin dinamik işıqları (Kamera culling və limitli gradient allokasiyası ilə)
      if (worldState && worldState.projectiles && worldState.projectiles.length > 0) {
        var prList = worldState.projectiles;
        var prLen = prList.length;
        var camX = (camera && camera.x) || (player ? player.x : 1300);
        var camY = (camera && camera.y) || (player ? player.y : 1300);
        var maxGradLights = 16;
        var gradLightsCount = 0;

        for (var pr = 0; pr < prLen; pr++) {
          var proj = prList[pr];
          if (!proj) continue;
          // Viewport sahəsi daxilində olmayanları dərhal ötür
          if (Math.abs(proj.x - camX) > 850 || Math.abs(proj.y - camY) > 550) continue;

          if (gradLightsCount < maxGradLights) {
            var prGrad = ctx.createRadialGradient(proj.x, proj.y, 2, proj.x, proj.y, 65);
            prGrad.addColorStop(0, hexToRgba(proj.color || '#00f0ff', 0.45));
            prGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = prGrad;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, 65, 0, Math.PI * 2);
            ctx.fill();
            gradLightsCount++;
          } else {
            // Çoxsaylı mərmilərdə sürətli yüngül parıltı (GC azaldılması)
            ctx.fillStyle = hexToRgba(proj.color || '#00f0ff', 0.16);
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, 25, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // E. Partlayış və Zərbə Şok Dalğaları (Shockwaves)
      for (var sw = 0; sw < this.shockwaves.length; sw++) {
        var shock = this.shockwaves[sw];
        ctx.beginPath();
        ctx.arc(shock.x, shock.y, shock.currentRadius, 0, Math.PI * 2);
        ctx.strokeStyle = hexToRgba(shock.color, shock.currentAlpha);
        ctx.lineWidth = 3.5;
        ctx.stroke();
      }

      ctx.restore();

      // 2. Döyüş Hissəcikləri (Ağır shadowBlur ləğv edildi, yüksək sürətli additive parıltı)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var pI = 0; pI < this.particles.length; pI++) {
        var pt = this.particles[pI];
        var sz = Math.max(0.5, pt.currentSize);
        var pAlpha = pt.currentAlpha;
        if (pAlpha <= 0.01) continue;

        // Xarici yumşaq parıltı
        ctx.fillStyle = hexToRgba(pt.color, pAlpha * 0.45);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, sz * 1.7, 0, Math.PI * 2);
        ctx.fill();

        // Parlaq mərkəz nüvəsi
        ctx.fillStyle = hexToRgba(pt.color, pAlpha);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, sz, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 3. Hava Hissəcikləri (İşıldaböcəklər, Kristal Tozu, Kül)
      ctx.save();
      for (var aI = 0; aI < this.ambientParticles.length; aI++) {
        var ap = this.ambientParticles[aI];
        var apPulse = 0.4 + 0.6 * Math.sin(time * ap.pulseSpeed + ap.phase);

        ctx.beginPath();
        ctx.arc(ap.x, ap.y, ap.size, 0, Math.PI * 2);

        if (theme === 'forest') {
          ctx.fillStyle = 'rgba(100, 255, 150, ' + (ap.alpha * apPulse) + ')';
        } else if (theme === 'cavern') {
          ctx.fillStyle = 'rgba(180, 100, 255, ' + (ap.alpha * apPulse) + ')';
        } else {
          ctx.fillStyle = 'rgba(255, 120, 40, ' + (ap.alpha * apPulse) + ')';
        }
        ctx.fill();
      }
      ctx.restore();

      // 4. Üzən Mətnlər (Floating Numbers / Status - Lazımsız save/restore və matrix transformasiyaları ləğv edildi)
      if (this.floatingTexts.length > 0) {
        ctx.save();
        ctx.textAlign = 'center';
        for (var ftI = 0; ftI < this.floatingTexts.length; ftI++) {
          var txt = this.floatingTexts[ftI];
          var fSize = Math.round((txt.size || 16) * (txt.currentScale || 1.0));
          ctx.font = 'bold ' + fSize + 'px sans-serif';

          // Qara dərin kontur
          ctx.strokeStyle = 'rgba(0, 0, 0, ' + txt.currentAlpha + ')';
          ctx.lineWidth = 3;
          ctx.strokeText(txt.text, txt.x, txt.y);

          // Parlaq daxili rəng
          ctx.fillStyle = hexToRgba(txt.color, txt.currentAlpha);
          ctx.fillText(txt.text, txt.x, txt.y);
        }
        ctx.restore();
      }

      // 5. Ekran Koordinatlarında Kinematoqrafik Vinyetka (Gradient Keşlənməsi ilə)
      if (canvas) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Ekran koordinatlarına qayıt

        var scrW = canvas.width;
        var scrH = canvas.height;

        // Vinyetka radial gradientini yalnız ölçü dəyişdikdə yenidən yarat
        if (!this._vigGrad || this._cachedVigW !== scrW || this._cachedVigH !== scrH) {
          var vigRad = Math.hypot(scrW, scrH) * 0.55;
          this._vigGrad = ctx.createRadialGradient(scrW / 2, scrH / 2, vigRad * 0.45, scrW / 2, scrH / 2, vigRad);
          this._vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
          this._vigGrad.addColorStop(1, 'rgba(5, 2, 10, 0.55)');
          this._cachedVigW = scrW;
          this._cachedVigH = scrH;
        }

        ctx.fillStyle = this._vigGrad;
        ctx.fillRect(0, 0, scrW, scrH);

        // Can kritik dərəcədə az olduqda (HP < 25%) döyünən qırmızı vinyetka
        if (player && player.maxHp && (player.hp / player.maxHp) < 0.25) {
          var dangerPulse = 0.5 + 0.5 * Math.sin(time * 6);
          ctx.fillStyle = 'rgba(180, 0, 20, ' + (dangerPulse * 0.25) + ')';
          ctx.fillRect(0, 0, scrW, scrH);
        }

        ctx.restore();
      }
    },

    // --- Xarici VFX Yaradıcı Metodlar (Spawners - Sərt Limitlər və Daşmanın Qarşısının Alınması) ---

    /**
     * Qılınc Zərbəsi Qövsü
     */
    spawnSlashArc: function (x, y, angle, comboStep, color) {
      if (this.slashArcs.length >= this.MAX_SLASH_ARCS) {
        this.slashArcs.shift();
      }
      comboStep = comboStep || 1;
      var targetR = comboStep === 3 ? 55 : 42;
      var spr = comboStep === 3 ? Math.PI * 1.5 : Math.PI * 0.85;

      this.slashArcs.push({
        x: x,
        y: y,
        angle: angle,
        spread: spr,
        currentRadius: 15,
        targetRadius: targetR,
        color: color || (comboStep === 3 ? '#ff3b30' : '#00f0ff'),
        width: comboStep === 3 ? 6 : 4,
        alpha: 0.9,
        life: 0.18,
        maxLife: 0.18
      });
    },

    /**
     * Partlayış və Şok Dalğası
     */
    spawnExplosion: function (x, y, color, count, radius) {
      color = color || '#ff5500';
      count = count || 25;
      radius = radius || 50;

      // Şok dalğası halqası (sərt limitlə)
      if (this.shockwaves.length >= this.MAX_SHOCKWAVES) {
        this.shockwaves.shift();
      }
      this.shockwaves.push({
        x: x,
        y: y,
        radius: radius * 1.3,
        currentRadius: 5,
        color: color,
        alpha: 0.85,
        life: 0.28,
        maxLife: 0.28
      });

      // Zərrəciklər
      for (var i = 0; i < count; i++) {
        if (this.particles.length >= this.MAX_PARTICLES) break;
        var ang = Math.random() * Math.PI * 2;
        var spd = 60 + Math.random() * 160;

        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          size: 2.5 + Math.random() * 4,
          color: color,
          alpha: 1,
          shrink: true,
          drag: 3.5,
          life: 0.35 + Math.random() * 0.3,
          maxLife: 0.65
        });
      }
    },

    /**
     * Zərbə Qığılcımları (Hit Sparks)
     */
    spawnHitSparks: function (x, y, color, count) {
      color = color || '#ffffff';
      count = count || 12;

      for (var i = 0; i < count; i++) {
        if (this.particles.length >= this.MAX_PARTICLES) break;
        var ang = Math.random() * Math.PI * 2;
        var spd = 80 + Math.random() * 140;

        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          size: 1.5 + Math.random() * 2.5,
          color: color,
          alpha: 1,
          shrink: true,
          drag: 4.5,
          life: 0.15 + Math.random() * 0.2,
          maxLife: 0.35
        });
      }
    },

    /**
     * Üzən Mətn (Dmg / Gold / Info)
     */
    spawnFloatingText: function (x, y, text, color, size) {
      if (this.floatingTexts.length >= this.MAX_FLOATING_TEXTS) {
        this.floatingTexts.shift();
      }
      this.floatingTexts.push({
        x: x + (Math.random() - 0.5) * 15,
        y: y - 10,
        vx: (Math.random() - 0.5) * 20,
        vy: -75 - Math.random() * 30,
        text: String(text),
        color: color || '#ffffff',
        size: size || 16,
        alpha: 1,
        life: 0.85,
        maxLife: 0.85
      });
    },

    /**
     * Dash Kölgəsi (Dash Trail)
     */
    spawnDashTrail: function (x, y, angle, color) {
      if (this.dashTrails.length >= this.MAX_DASH_TRAILS) {
        this.dashTrails.shift();
      }
      this.dashTrails.push({
        x: x,
        y: y,
        angle: angle || 0,
        color: color || '#9d4edd',
        radius: 22,
        alpha: 0.65,
        life: 0.22,
        maxLife: 0.22
      });
    },

    /**
     * İki nöqtə arasında ziqzaqvari parlayan ildırım qövsü yaradır və 0.25s ərzində çəkir
     */
    spawnChainLightning: function (x1, y1, x2, y2, color) {
      if (this.chainLightnings.length >= this.MAX_CHAIN_LIGHTNINGS) {
        this.chainLightnings.shift();
      }
      color = color || '#00f0ff';

      // İldırım ziqzaq xəttinin nöqtələrini əvvəlcədən hesabla
      var dx = x2 - x1;
      var dy = y2 - y1;
      var dist = Math.hypot(dx, dy) || 1;
      var steps = Math.max(5, Math.min(12, Math.floor(dist / 25)));
      var points = [{ x: x1, y: y1 }];

      var nx = -dy / dist;
      var ny = dx / dist;

      for (var s = 1; s < steps; s++) {
        var t = s / steps;
        var baseX = x1 + dx * t;
        var baseY = y1 + dy * t;
        var jitter = (Math.random() - 0.5) * Math.min(35, dist * 0.25);
        points.push({
          x: baseX + nx * jitter,
          y: baseY + ny * jitter
        });
      }
      points.push({ x: x2, y: y2 });

      // Yan budaq (branch) nöqtələri
      var branches = [];
      if (dist > 60 && Math.random() < 0.8) {
        var midP = points[Math.floor(points.length / 2)];
        var bAngle = Math.atan2(dy, dx) + (Math.random() < 0.5 ? 0.7 : -0.7);
        var bLen = 25 + Math.random() * 30;
        branches.push([
          { x: midP.x, y: midP.y },
          { x: midP.x + Math.cos(bAngle) * (bLen * 0.5) + nx * 8, y: midP.y + Math.sin(bAngle) * (bLen * 0.5) + ny * 8 },
          { x: midP.x + Math.cos(bAngle) * bLen, y: midP.y + Math.sin(bAngle) * bLen }
        ]);
      }

      this.chainLightnings.push({
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        points: points,
        branches: branches,
        color: color,
        life: 0.25,
        maxLife: 0.25,
        currentAlpha: 1.0
      });

      // Uclarda kiçik qığılcımlar
      this.spawnHitSparks(x2, y2, color, 6);
    },

    /**
     * Göydən enən alovlu-astral meteor zolağı və yerə dəyəndə nəhəng krater/şok dalğası yaradır
     */
    spawnMeteorStrike: function (x, y, radius, color) {
      if (this.meteorStrikes.length >= this.MAX_METEORS) {
        this.meteorStrikes.shift();
      }
      color = color || '#ff5500';
      radius = radius || 80;

      var travelDuration = 0.32; // 0.32s sürətli eniş
      var startOffX = -180;
      var startOffY = -460;

      this.meteorStrikes.push({
        targetX: x,
        targetY: y,
        startX: x + startOffX,
        startY: y + startOffY,
        curX: x + startOffX,
        curY: y + startOffY,
        radius: radius,
        color: color,
        travelDuration: travelDuration,
        elapsed: 0,
        impacted: false,
        postImpactLife: 0.25
      });
    }
  };

  // Qlobal interfeysə bağla
  window.GameVFX = GameVFX;
})();
