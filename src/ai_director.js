/**
 * ============================================================================
 * AETHERIA: KÖLGƏLƏRİN SƏLTƏNƏTİ
 * Fayl: src/ai_director.js
 * Qlobal Obyekt: window.GameAI
 * Məsul Agent: 1-ci Agent — AI Mütəxəssisi (AI Specialist)
 * Təsvir: Ağıllı Düşmən, Boss Fazaları və Dinamik Çətinlik Direktoru
 * ============================================================================
 */

(function (root) {
  'use strict';

  // Daxili AI vəziyyəti və unikal ID generatoru (Zero-garbage fast counter)
  let _idCounter = 0;
  function getUniqueId(prefix = 'ai') {
    _idCounter = (_idCounter + 1) % 1000000;
    return `${prefix}_${_idCounter}`;
  }

  // Təkrar istifadə olunan daxili massivlər (GC zibilini aradan qaldırmaq üçün)
  const _sharedMeleeList = [];

  // Riyazi köməkçilər
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
  const distSq = (x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  };
  const dist = (x1, y1, x2, y2) => Math.sqrt(distSq(x1, y1, x2, y2));

  /**
   * Əsas AI Direktoru Obyekti
   */
  const GameAI = {
    version: '1.0.0',

    // Qlobal tənzimləmələr
    config: {
      flankSlotCount: 8,
      meleeSpacing: 35,
      archerMinDist: 180,
      archerIdealDist: 270,
      archerMaxDist: 360,
      wraithMinDist: 150,
      wraithIdealDist: 240,
      wraithMaxDist: 340,
      predictionFactor: 0.65 // Oyunçunun sürətini nəzərə alma əmsalı
    },

    /**
     * AI Direktoru sıfırlama/yeniləmə
     */
    reset() {
      _idCounter = 0;
    },

    /**
     * Dinamik Qənimət (Drop) Sistemi:
     * Oyunçunun canı və manası azaldıqda can və mana kürəsi düşmə ehtimalını
     * ağıllı şəkildə artırır (Dinamik Balanslaşdırma).
     *
     * @param {Object} player - { hp, maxHp, mana, maxMana }
     * @returns {Object} dropChance məlumatları və rollDrop() metodu
     */
    getDynamicDropChance(player) {
      if (!player) {
        return {
          healthOrb: 0.20,
          manaOrb: 0.20,
          gold: 0.50,
          crystal: 0.10,
          rollDrop: () => 'gold'
        };
      }

      const hpRatio = clamp((player.hp || 1) / (player.maxHp || 100), 0, 1);
      const manaRatio = clamp((player.mana || 1) / (player.maxMana || 100), 0, 1);

      // Can nə qədər azdırsa, can kürəsi ehtimalı bir o qədər kəskin artır:
      // Tam can (1.0) olduqda: 10%
      // 50% can olduqda: 35%
      // 20% can olduqda: 75%
      // 5% can olduqda: 90% (Həyat qurtaran mexanizm)
      const healthOrbChance = clamp(0.10 + Math.pow(1 - hpRatio, 1.8) * 0.82, 0.10, 0.92);

      // Mana azaldıqda mana kürəsi ehtimalı artır
      const manaOrbChance = clamp(0.12 + Math.pow(1 - manaRatio, 1.5) * 0.65, 0.12, 0.80);

      // Qızıl və Kristal çəkiləri
      const goldWeight = 0.45;
      const crystalWeight = 0.15;

      return {
        healthOrb: healthOrbChance,
        manaOrb: manaOrbChance,
        gold: goldWeight,
        crystal: crystalWeight,
        hpRatio,
        manaRatio,

        /**
         * Qənimətin təsadüfi seçilməsi
         * @returns {'health_orb' | 'mana_orb' | 'gold' | 'crystal' | null}
         */
        rollDrop() {
          const rand = Math.random();

          // Əgər oyunçunun vəziyyəti kritikdirsə, ilk növbədə can/mana yoxlanılır
          if (hpRatio < 0.35 && Math.random() < healthOrbChance) {
            return 'health_orb';
          }
          if (manaRatio < 0.30 && Math.random() < manaOrbChance) {
            return 'mana_orb';
          }

          // Ümumi zər atışı
          if (rand < healthOrbChance * 0.4) {
            return 'health_orb';
          } else if (rand < (healthOrbChance * 0.4 + manaOrbChance * 0.35)) {
            return 'mana_orb';
          } else if (rand < 0.82) {
            return 'gold';
          } else {
            return 'crystal';
          }
        }
      };
    },

    /**
     * Bütün düşmənlərin və Boss-un hərəkət və hücum məntiqini yeniləyir.
     *
     * @param {Array} enemies - Sahədəki düşmənlər massivi
     * @param {Object} player - Oyunçu obyekti ({ x, y, vx, vy, radius, hp, maxHp })
     * @param {Array} projectiles - Mərmilər massivi
     * @param {number} dt - Delta time (saniyə)
     * @param {Object} worldState - Dünya vəziyyəti ({ region, obstacles, boss, time })
     * @param {Object} callbacks - { onEnemyAttack, onSpawnProjectile, onSpawnMinion, onBossPhaseChange }
     */
    updateEnemies(enemies, player, projectiles, dt, worldState = {}, callbacks = {}) {
      if (!enemies || !player) return;

      // dt-ni stabilləşdir (kəskin atlamaların qarşısını almaq üçün)
      const safeDt = clamp(dt || 0.016, 0.001, 0.1);

      // Callback-lərin təhlükəsiz wrapper-ləri
      const onEnemyAttack = typeof callbacks.onEnemyAttack === 'function' ? callbacks.onEnemyAttack : () => {};
      const onSpawnProjectile = typeof callbacks.onSpawnProjectile === 'function' ? callbacks.onSpawnProjectile : () => {};
      const onSpawnMinion = typeof callbacks.onSpawnMinion === 'function' ? callbacks.onSpawnMinion : () => {};
      const onBossPhaseChange = typeof callbacks.onBossPhaseChange === 'function' ? callbacks.onBossPhaseChange : () => {};

      const obstacles = worldState.obstacles || [];
      const region = worldState.region || { width: 2600, height: 2600 };

      // Boss ayrıca worldState.boss kimi verilibsə və enemies içində deyilsə, onu da idarə et
      let bossProcessed = false;

      // 1. Düşmənlərin toqquşmasını və mühasirə (flanking) yuvalarını O(1) indekslə hesabla
      _sharedMeleeList.length = 0;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e || e.hp <= 0) continue;
        if (!e.isBoss && (e.type === 'goblin' || e.type === 'knight' || e.type === 'golem')) {
          e._flankSlotIndex = _sharedMeleeList.length;
          _sharedMeleeList.push(e);
        }
      }
      const meleeList = _sharedMeleeList;

      // 2. Hər bir düşməni yenilə
      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (!enemy || enemy.hp <= 0) continue;

        if (enemy.isBoss) {
          bossProcessed = true;
          this._updateBossAI(enemy, player, safeDt, worldState, {
            onEnemyAttack,
            onSpawnProjectile,
            onSpawnMinion,
            onBossPhaseChange
          });
        } else {
          switch (enemy.type) {
            case 'goblin':
              this._updateGoblinAI(enemy, player, meleeList, safeDt, obstacles, region, onEnemyAttack);
              break;

            case 'knight':
              this._updateKnightAI(enemy, player, meleeList, safeDt, obstacles, region, onEnemyAttack);
              break;

            case 'golem':
              this._updateGolemAI(enemy, player, meleeList, safeDt, obstacles, region, onEnemyAttack);
              break;

            case 'archer':
              this._updateArcherAI(enemy, player, safeDt, obstacles, region, onSpawnProjectile);
              break;

            case 'wraith':
              this._updateWraithAI(enemy, player, safeDt, obstacles, region, onSpawnProjectile);
              break;

            default:
              // Standart yaxın döyüş fallback
              this._updateGenericMeleeAI(enemy, player, safeDt, obstacles, region, onEnemyAttack);
              break;
          }
        }
      }

      // Əgər Boss worldState.boss kimi ayrıca saxlanılıbsa və enemies siyahısında deyildisə:
      if (!bossProcessed && worldState.boss && worldState.boss.hp > 0) {
        this._updateBossAI(worldState.boss, player, safeDt, worldState, {
          onEnemyAttack,
          onSpawnProjectile,
          onSpawnMinion,
          onBossPhaseChange
        });
      }
    },

    /* ========================================================================
     * YAXIN DÖYÜŞ DÜŞMƏNLƏRİ (Melee AI)
     * ======================================================================== */

    /**
     * Goblin AI: Cəld, qeyri-müntəzəm hərəkət, ziqzaq hücum, qrup halında mühasirə
     */
    _updateGoblinAI(enemy, player, meleeList, dt, obstacles, region, onEnemyAttack) {
      this._initEnemyProps(enemy, {
        speed: 165,
        attackRange: 42,
        attackCooldown: 0.9,
        damage: 12
      });

      enemy.facingAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);

      // Ziqzaq / xaotik yayınma üçün daxili vaxt
      enemy.jinkTimer = (enemy.jinkTimer || 0) + dt * 4;

      const d = dist(enemy.x, enemy.y, player.x, player.y);
      const attackRange = enemy.attackRange + (player.radius || 20);

      // Hücum taymerini yenilə
      enemy.attackTimer = Math.max(0, (enemy.attackTimer || 0) - dt);

      if (d <= attackRange) {
        // Zərbə endir
        enemy.vx = (enemy.vx || 0) * 0.6;
        enemy.vy = (enemy.vy || 0) * 0.6;

        if (enemy.attackTimer <= 0) {
          enemy.attackTimer = enemy.attackCooldown;
          onEnemyAttack(enemy);
        }
      } else {
        // Mühasirə və təqib vektoru
        const flankSlot = this._getFlankPosition(enemy, player, meleeList, 50);
        let targetX = flankSlot.x;
        let targetY = flankSlot.y;

        // Qeyri-müntəzəm ziqzaq ofseti əlavə et
        const jinkMag = 18;
        targetX += Math.cos(enemy.jinkTimer) * jinkMag;
        targetY += Math.sin(enemy.jinkTimer) * jinkMag;

        this._steerTowards(enemy, targetX, targetY, enemy.speed, dt);
      }

      this._applySeparation(enemy, meleeList, this.config.meleeSpacing);
      this._applyObstacleAvoidance(enemy, obstacles, dt);
      this._applyWorldBounds(enemy, region);
    },

    /**
     * Knight AI: İntizamlı, dayanıqlı irəliləmə, qalxanla mühasirə və güclü qılınc zərbəsi
     */
    _updateKnightAI(enemy, player, meleeList, dt, obstacles, region, onEnemyAttack) {
      this._initEnemyProps(enemy, {
        speed: 125,
        attackRange: 55,
        attackCooldown: 1.35,
        damage: 22
      });

      enemy.facingAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);

      const d = dist(enemy.x, enemy.y, player.x, player.y);
      const attackRange = enemy.attackRange + (player.radius || 20);

      enemy.attackTimer = Math.max(0, (enemy.attackTimer || 0) - dt);

      // Hücum hazırlığı (windup) vəziyyəti
      if (enemy.isWindingUp) {
        enemy.windupTimer = (enemy.windupTimer || 0) - dt;
        enemy.vx = (enemy.vx || 0) * 0.3;
        enemy.vy = (enemy.vy || 0) * 0.3;

        if (enemy.windupTimer <= 0) {
          enemy.isWindingUp = false;
          // Zərbə anı lunge (kiçik irəli sıçrayış)
          const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
          enemy.vx = Math.cos(angle) * 140;
          enemy.vy = Math.sin(angle) * 140;
          enemy.attackTimer = enemy.attackCooldown;
          onEnemyAttack(enemy);
        }
        return;
      }

      if (d <= attackRange) {
        if (enemy.attackTimer <= 0) {
          // 0.2 saniyəlik qılınc yelləmə hazırlığı
          enemy.isWindingUp = true;
          enemy.windupTimer = 0.22;
        } else {
          // Hücum soyuma zamanı oyunçunun ətrafında dairəvi addımla
          const circleAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x) + 0.03;
          const orbitDist = attackRange + 15;
          const ox = player.x + Math.cos(circleAngle) * orbitDist;
          const oy = player.y + Math.sin(circleAngle) * orbitDist;
          this._steerTowards(enemy, ox, oy, enemy.speed * 0.65, dt);
        }
      } else {
        // Taktiki mühasirə yeri seç
        const flankSlot = this._getFlankPosition(enemy, player, meleeList, 65);
        this._steerTowards(enemy, flankSlot.x, flankSlot.y, enemy.speed, dt);
      }

      this._applySeparation(enemy, meleeList, this.config.meleeSpacing + 8);
      this._applyObstacleAvoidance(enemy, obstacles, dt);
      this._applyWorldBounds(enemy, region);
    },

    /**
     * Golem AI: Ağır nəhəng, sarsıdıcı yerə çırpma zərbəsi (Smash AOE)
     */
    _updateGolemAI(enemy, player, meleeList, dt, obstacles, region, onEnemyAttack) {
      this._initEnemyProps(enemy, {
        speed: 85,
        attackRange: 75,
        attackCooldown: 2.1,
        damage: 38
      });

      enemy.facingAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);

      const d = dist(enemy.x, enemy.y, player.x, player.y);
      const attackRange = enemy.attackRange + (player.radius || 20);

      enemy.attackTimer = Math.max(0, (enemy.attackTimer || 0) - dt);

      // Ağır zərbə hazırlığı
      if (enemy.isSmashing) {
        enemy.smashTimer = (enemy.smashTimer || 0) - dt;
        enemy.vx = 0;
        enemy.vy = 0;

        if (enemy.smashTimer <= 0) {
          enemy.isSmashing = false;
          enemy.attackTimer = enemy.attackCooldown;
          onEnemyAttack(enemy);
        }
        return;
      }

      if (d <= attackRange) {
        if (enemy.attackTimer <= 0) {
          // 0.45 saniyəlik yerə vurma hazırlığı (telegraph)
          enemy.isSmashing = true;
          enemy.smashTimer = 0.45;
        } else {
          // Birbaşa oyunçuya doğru ağır addımlar
          this._steerTowards(enemy, player.x, player.y, enemy.speed * 0.5, dt);
        }
      } else {
        // Birbaşa oyunçunu əzməyə yönəl
        this._steerTowards(enemy, player.x, player.y, enemy.speed, dt);
      }

      this._applySeparation(enemy, meleeList, this.config.meleeSpacing + 15);
      this._applyObstacleAvoidance(enemy, obstacles, dt);
      this._applyWorldBounds(enemy, region);
    },

    /**
     * Generic Melee Fallback
     */
    _updateGenericMeleeAI(enemy, player, dt, obstacles, region, onEnemyAttack) {
      this._initEnemyProps(enemy, {
        speed: 130,
        attackRange: 45,
        attackCooldown: 1.1,
        damage: 15
      });

      enemy.facingAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);

      const d = dist(enemy.x, enemy.y, player.x, player.y);
      const attackRange = enemy.attackRange + (player.radius || 20);

      enemy.attackTimer = Math.max(0, (enemy.attackTimer || 0) - dt);

      if (d <= attackRange) {
        if (enemy.attackTimer <= 0) {
          enemy.attackTimer = enemy.attackCooldown;
          onEnemyAttack(enemy);
        }
      } else {
        this._steerTowards(enemy, player.x, player.y, enemy.speed, dt);
      }

      this._applyObstacleAvoidance(enemy, obstacles, dt);
      this._applyWorldBounds(enemy, region);
    },

    /* ========================================================================
     * UZAQ DÖYÜŞ DÜŞMƏNLƏRİ (Ranged AI — Archer, Wraith)
     * ======================================================================== */

    /**
     * Archer AI: Məsafə saxlayır (kiting), oyunçunun hərəkətini qabaqlayaraq ox atır
     */
    _updateArcherAI(enemy, player, dt, obstacles, region, onSpawnProjectile) {
      this._initEnemyProps(enemy, {
        speed: 140,
        attackRange: 320,
        attackCooldown: 1.6,
        damage: 16
      });

      const d = dist(enemy.x, enemy.y, player.x, player.y);
      const cfg = this.config;

      enemy.facingAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      enemy.attackTimer = Math.max(0, (enemy.attackTimer || 0) - dt);

      // Kiting məntiqi:
      // Çox yaxındırsa: geri çəkil (retreat)
      // Çox uzaqdırsa: yaxınlaş
      // İdeal məsafədədirsə: yana doğru addımla (strafe)
      if (d < cfg.archerMinDist) {
        // Geri qaç
        const retreatAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
        enemy.vx = Math.cos(retreatAngle) * enemy.speed;
        enemy.vy = Math.sin(retreatAngle) * enemy.speed;
      } else if (d > cfg.archerMaxDist) {
        // Yaxınlaş
        this._steerTowards(enemy, player.x, player.y, enemy.speed, dt);
      } else {
        // Strafe (yan tərəfə hərəkət)
        enemy.strafeDir = enemy.strafeDir || (Math.random() < 0.5 ? 1 : -1);
        enemy.strafeTimer = (enemy.strafeTimer || 0) - dt;
        if (enemy.strafeTimer <= 0) {
          enemy.strafeDir *= -1;
          enemy.strafeTimer = 1.2 + Math.random() * 1.5;
        }

        const toPlayerAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        const strafeAngle = toPlayerAngle + (Math.PI / 2) * enemy.strafeDir;
        enemy.vx = Math.cos(strafeAngle) * (enemy.speed * 0.75);
        enemy.vy = Math.sin(strafeAngle) * (enemy.speed * 0.75);
      }

      // Ox atışı (Qabaqlayıcı Hədəfləmə — Lead Target)
      if (enemy.attackTimer <= 0 && d <= cfg.archerMaxDist + 50) {
        enemy.attackTimer = enemy.attackCooldown + (Math.random() * 0.3 - 0.15);

        const arrowSpeed = enemy.projectileSpeed || 370;
        const arrowColor = enemy.projectileColor || enemy.color || '#f59e0b';
        const targetPoint = this._predictPlayerPosition(player, enemy, arrowSpeed);
        const aimAngle = Math.atan2(targetPoint.y - enemy.y, targetPoint.x - enemy.x);

        onSpawnProjectile({
          id: getUniqueId('proj_arrow'),
          type: 'arrow',
          name: 'Düşmən Oxu',
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(aimAngle) * arrowSpeed,
          vy: Math.sin(aimAngle) * arrowSpeed,
          speed: arrowSpeed,
          radius: 5,
          damage: enemy.damage,
          color: arrowColor,
          fromEnemy: true,
          life: 2.2,
          maxLife: 2.2
        });
      }

      this._applyObstacleAvoidance(enemy, obstacles, dt);
      this._applyWorldBounds(enemy, region);
    },

    /**
     * Wraith AI: Efirik uçuş, maneələrin üzərindən axıcı süzülmə, qaranlıq astral mərmi
     */
    _updateWraithAI(enemy, player, dt, obstacles, region, onSpawnProjectile) {
      this._initEnemyProps(enemy, {
        speed: 135,
        attackRange: 280,
        attackCooldown: 1.85,
        damage: 22
      });

      const d = dist(enemy.x, enemy.y, player.x, player.y);
      const cfg = this.config;

      enemy.facingAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      enemy.floatTimer = (enemy.floatTimer || 0) + dt * 3;
      enemy.attackTimer = Math.max(0, (enemy.attackTimer || 0) - dt);

      // Wraith hərəkəti: dalğavari efirik süzülmə
      if (d < cfg.wraithMinDist) {
        const retreatAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
        enemy.vx = Math.cos(retreatAngle) * enemy.speed;
        enemy.vy = Math.sin(retreatAngle) * enemy.speed;
      } else if (d > cfg.wraithMaxDist) {
        this._steerTowards(enemy, player.x, player.y, enemy.speed, dt);
      } else {
        // Dalğavari uçuş
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        const wave = Math.sin(enemy.floatTimer) * (enemy.speed * 0.6);
        enemy.vx = Math.cos(angle + Math.PI / 2) * wave;
        enemy.vy = Math.sin(angle + Math.PI / 2) * wave;
      }

      // Astral Mərmi atışı
      if (enemy.attackTimer <= 0 && d <= cfg.wraithMaxDist + 40) {
        enemy.attackTimer = enemy.attackCooldown + (Math.random() * 0.4);

        const orbSpeed = enemy.projectileSpeed || 240;
        const orbColor = enemy.projectileColor || enemy.color || '#a855f7';
        const targetPoint = this._predictPlayerPosition(player, enemy, orbSpeed);
        const aimAngle = Math.atan2(targetPoint.y - enemy.y, targetPoint.x - enemy.x);

        onSpawnProjectile({
          id: getUniqueId('proj_wraith'),
          type: 'wraith_orb',
          name: 'Kölgə Sferası',
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(aimAngle) * orbSpeed,
          vy: Math.sin(aimAngle) * orbSpeed,
          speed: orbSpeed,
          radius: 9,
          damage: enemy.damage,
          color: orbColor,
          fromEnemy: true,
          homing: 0.25, // Zəif yönəlmə
          life: 3.0,
          maxLife: 3.0
        });
      }

      this._applyWorldBounds(enemy, region);
    },

    /* ========================================================================
     * ÇOXMƏRHƏLƏLİ BOSS AI (Multi-Phase Boss AI)
     * ======================================================================== */

    /**
     * Boss AI: Fazalar (1, 2, 3) üzrə dinamik döyüş alqoritmi
     *
     * Faza 1 (100% - 66% HP):
     *  - Dairəvi enerji mərmiləri (Radial Nova)
     *  - Sürətli hücum sıçrayışı (Charge / Dash)
     *
     * Faza 2 (66% - 33% HP):
     *  - Spiral mərmi yağışı (Bullet-hell spiral)
     *  - Köməkçi düşmən çağırma (Minion Summoning)
     *  - Gücləndirilmiş cüt zərbəli hücum
     *
     * Faza 3 (< 33% HP):
     *  - Teleportasiya + Ani kombo zərbəsi
     *  - Xaos meteor və lazer dalğası (Chaos Apocalypse)
     */
    _updateBossAI(boss, player, dt, worldState, callbacks) {
      if (!boss || boss.hp <= 0) return;

      const { onEnemyAttack, onSpawnProjectile, onSpawnMinion, onBossPhaseChange } = callbacks;

      // Boss xüsusiyyətlərini ilkinləşdir
      boss.phase = boss.phase || 1;
      boss.maxPhases = boss.maxPhases || 3;
      boss.maxHp = boss.maxHp || 1000;
      boss.damage = boss.damage || 28;
      boss.speed = boss.speed || 110;
      boss.state = boss.state || 'chase'; // 'chase' | 'windup_dash' | 'dashing' | 'spiral' | 'channeling'
      boss.facingAngle = Math.atan2(player.y - boss.y, player.x - boss.x);

      // Daxili Boss taymerləri
      boss.novaTimer = boss.novaTimer !== undefined ? boss.novaTimer - dt : 3.5;
      boss.dashTimer = boss.dashTimer !== undefined ? boss.dashTimer - dt : 5.0;
      boss.spiralTimer = boss.spiralTimer !== undefined ? boss.spiralTimer - dt : 4.5;
      boss.summonTimer = boss.summonTimer !== undefined ? boss.summonTimer - dt : 6.0;
      boss.teleportTimer = boss.teleportTimer !== undefined ? boss.teleportTimer - dt : 4.0;
      boss.chaosTimer = boss.chaosTimer !== undefined ? boss.chaosTimer - dt : 5.5;
      boss.meleeTimer = boss.meleeTimer !== undefined ? boss.meleeTimer - dt : 1.2;

      const hpRatio = boss.hp / boss.maxHp;

      // ==========================
      // FAZA KEÇİDİ YOXLANIŞI
      // ==========================
      if (hpRatio <= 0.33 && boss.phase < 3) {
        boss.phase = 3;
        boss.color = '#ef4444'; // Qəzəbli qırmızı
        boss.speed = (boss.baseSpeed || 110) * 1.45;
        // Ani faza keçidi partlayışı
        this._castRadialNova(boss, onSpawnProjectile, 18, 280, '#ef4444', (boss.damage || 28) * 0.9);
        onBossPhaseChange(boss);
      } else if (hpRatio <= 0.66 && boss.phase < 2) {
        boss.phase = 2;
        boss.color = '#a855f7'; // Bənövşəyi xaos
        boss.speed = (boss.baseSpeed || 110) * 1.25;
        // İlkin köməkçi dəstəsini çağır
        this._summonMinionWave(boss, onSpawnMinion, 3);
        onBossPhaseChange(boss);
      }

      const d = dist(boss.x, boss.y, player.x, player.y);
      const meleeRange = (boss.radius || 40) + (player.radius || 20) + 15;

      // Əsas yaxın məsafə hücumu (hər fazada işləyir)
      if (d <= meleeRange && boss.meleeTimer <= 0 && boss.state === 'chase') {
        boss.meleeTimer = 1.3;
        onEnemyAttack(boss);
      }

      // ==========================
      // XÜSUSİ VƏZİYYƏT MAŞINI (State Machine)
      // ==========================

      // 1. Dash / Charge İdarəetməsi
      if (boss.state === 'windup_dash') {
        boss.dashWindupTimer -= dt;
        boss.vx = (boss.vx || 0) * 0.2;
        boss.vy = (boss.vy || 0) * 0.2;

        if (boss.dashWindupTimer <= 0) {
          boss.state = 'dashing';
          boss.dashDuration = 0.45;
          const dashSpeed = 680;
          boss.vx = boss.dashDirX * dashSpeed;
          boss.vy = boss.dashDirY * dashSpeed;
        }
        return;
      }

      if (boss.state === 'dashing') {
        boss.dashDuration -= dt;

        // Oyunçuya toxunarsa zərbə vur
        if (d <= meleeRange + 20) {
          onEnemyAttack(boss);
        }

        if (boss.dashDuration <= 0) {
          boss.state = 'chase';
          boss.dashTimer = boss.phase === 3 ? 3.8 : 5.2;
          boss.vx = 0;
          boss.vy = 0;
        }
        return;
      }

      // 2. Spiral Barrage İdarəetməsi (Faza 2 və 3)
      if (boss.state === 'spiral') {
        boss.spiralDuration -= dt;
        boss.spiralStepTimer = (boss.spiralStepTimer || 0) - dt;
        boss.vx = (boss.vx || 0) * 0.4;
        boss.vy = (boss.vy || 0) * 0.4;

        if (boss.spiralStepTimer <= 0) {
          boss.spiralStepTimer = 0.08;
          boss.spiralAngle = (boss.spiralAngle || 0) + 0.38;

          // Qarşı-qarşıya iki mərmi at
          const projSpeed = 260;
          const angles = [boss.spiralAngle, boss.spiralAngle + Math.PI];

          angles.forEach((ang) => {
            onSpawnProjectile({
              id: getUniqueId('boss_spiral'),
              type: 'boss_spiral',
              name: 'Xaos Spirali',
              x: boss.x,
              y: boss.y,
              vx: Math.cos(ang) * projSpeed,
              vy: Math.sin(ang) * projSpeed,
              speed: projSpeed,
              radius: 8,
              damage: boss.damage * 0.7,
              color: boss.phase === 3 ? '#fb7185' : '#c084fc',
              fromEnemy: true,
              life: 3.2,
              maxLife: 3.2
            });
          });
        }

        if (boss.spiralDuration <= 0) {
          boss.state = 'chase';
          boss.spiralTimer = boss.phase === 3 ? 4.2 : 5.8;
        }
        return;
      }

      // ==========================
      // FAZALARA GÖRƏ HÜCUMLAR
      // ==========================

      // ----- FAZA 1 HÜCUMLARI -----
      if (boss.phase === 1) {
        // Hücum 1: Dairəvi Enerji Mərmiləri (Radial Nova)
        if (boss.novaTimer <= 0) {
          boss.novaTimer = 4.2;
          this._castRadialNova(boss, onSpawnProjectile, 14, 230, '#f43f5e', boss.damage * 0.75);
        }

        // Hücum 2: Sürətli Hücum Sıçrayışı (Charge / Dash)
        if (boss.dashTimer <= 0 && d > 120) {
          this._initiateBossDash(boss, player, 0.55);
          return;
        }

        // Standart Təqib
        this._steerTowards(boss, player.x, player.y, boss.speed, dt);
      }

      // ----- FAZA 2 HÜCUMLARI -----
      else if (boss.phase === 2) {
        // Hücum 1: Spiral Mərmi Yağışı
        if (boss.spiralTimer <= 0) {
          boss.state = 'spiral';
          boss.spiralDuration = 1.9;
          boss.spiralStepTimer = 0;
          return;
        }

        // Hücum 2: Köməkçi Çağırma (Minion Summoning)
        if (boss.summonTimer <= 0) {
          boss.summonTimer = 13.0;
          this._summonMinionWave(boss, onSpawnMinion, 3);
        }

        // Hücum 3: Sürətli Hücum Sıçrayışı (Daha tez-tez)
        if (boss.dashTimer <= 0 && d > 100) {
          this._initiateBossDash(boss, player, 0.42);
          return;
        }

        // Standart Təqib
        this._steerTowards(boss, player.x, player.y, boss.speed, dt);
      }

      // ----- FAZA 3 HÜCUMLARI (Xaos / Apocalypse) -----
      else if (boss.phase === 3) {
        // Hücum 1: Teleportasiya + Sürətli Kombo
        if (boss.teleportTimer <= 0) {
          boss.teleportTimer = 4.8;
          this._executeTeleportCombo(boss, player, onEnemyAttack, onSpawnProjectile);
          return;
        }

        // Hücum 2: Xaos Meteor / Lazer Dalğası
        if (boss.chaosTimer <= 0) {
          boss.chaosTimer = 5.2;
          this._castChaosWave(boss, player, onSpawnProjectile);
        }

        // Hücum 3: Spiral Barrage (Qısa fasilə ilə)
        if (boss.spiralTimer <= 0) {
          boss.state = 'spiral';
          boss.spiralDuration = 1.5;
          boss.spiralStepTimer = 0;
          return;
        }

        // Hücum 4: Köməkçi çağırma (düşmənlər azaldıqda)
        if (boss.summonTimer <= 0) {
          boss.summonTimer = 11.0;
          this._summonMinionWave(boss, onSpawnMinion, 2);
        }

        // Təqib və aqressiv sıxışdırma
        this._steerTowards(boss, player.x, player.y, boss.speed, dt);
      }

      this._applyWorldBounds(boss, worldState.region || { width: 2600, height: 2600 });
    },

    /**
     * Boss Dairəvi Nova Hücumu (Radial Nova)
     */
    _castRadialNova(boss, onSpawnProjectile, count, speed, color, damage) {
      const angleStep = (Math.PI * 2) / count;
      const baseAngle = Math.random() * Math.PI;

      for (let i = 0; i < count; i++) {
        const ang = baseAngle + i * angleStep;
        onSpawnProjectile({
          id: getUniqueId('boss_nova'),
          type: 'boss_nova',
          name: 'Nova Mərmisi',
          x: boss.x,
          y: boss.y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          speed: speed,
          radius: 9,
          damage: damage,
          color: color,
          fromEnemy: true,
          life: 3.2,
          maxLife: 3.2
        });
      }
    },

    /**
     * Boss Sürətli Hücum Hazırlığı (Dash Windup)
     */
    _initiateBossDash(boss, player, windupDuration) {
      boss.state = 'windup_dash';
      boss.dashWindupTimer = windupDuration;

      // Oyunçunun gələcək mövqeyinə doğru istiqaməti kilidlə
      const targetPoint = this._predictPlayerPosition(player, boss, 500);
      const angle = Math.atan2(targetPoint.y - boss.y, targetPoint.x - boss.x);
      boss.dashDirX = Math.cos(angle);
      boss.dashDirY = Math.sin(angle);
    },

    /**
     * Boss Köməkçi Çağırma (Summon Minions)
     */
    _summonMinionWave(boss, onSpawnMinion, count) {
      const minionTypes = ['goblin', 'archer', 'knight'];
      for (let i = 0; i < count; i++) {
        const type = minionTypes[i % minionTypes.length];
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const spawnDist = 110 + Math.random() * 45;
        const sx = boss.x + Math.cos(angle) * spawnDist;
        const sy = boss.y + Math.sin(angle) * spawnDist;

        onSpawnMinion(type, sx, sy);
      }
    },

    /**
     * Boss Teleportasiya və Ani Kombo Zərbəsi (Phase 3)
     */
    _executeTeleportCombo(boss, player, onEnemyAttack, onSpawnProjectile) {
      // Oyunçunun arxasına və ya cinahına teleportasiya ol
      const teleportAngle = Math.random() * Math.PI * 2;
      const teleportDist = 95 + Math.random() * 35;
      boss.x = player.x + Math.cos(teleportAngle) * teleportDist;
      boss.y = player.y + Math.sin(teleportAngle) * teleportDist;
      boss.vx = 0;
      boss.vy = 0;

      // Ani qılınc kombo zərbəsi
      onEnemyAttack(boss);

      // Teleport nöqtəsindən dərhal 8 istiqamətli qaranlıq tikan dalğası çıxır
      const burstCount = 8;
      const speed = 310;
      for (let i = 0; i < burstCount; i++) {
        const ang = (i / burstCount) * Math.PI * 2;
        onSpawnProjectile({
          id: getUniqueId('boss_teleport_burst'),
          type: 'boss_shard',
          name: 'Kölgə Tikanı',
          x: boss.x,
          y: boss.y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          speed: speed,
          radius: 7,
          damage: boss.damage * 0.8,
          color: '#fb7185',
          fromEnemy: true,
          life: 1.8,
          maxLife: 1.8
        });
      }
    },

    /**
     * Boss Xaos Meteor və Lazer Dalğası (Phase 3)
     */
    _castChaosWave(boss, player, onSpawnProjectile) {
      // 1. Oyunçunun hərəkət istiqamətinə yelpikvari 16 lazer mərmisi dalğası
      const toPlayer = Math.atan2(player.y - boss.y, player.x - boss.x);
      const waveCount = 12;
      const spread = Math.PI * 0.65; // ~117 dərəcə qövs
      const startAngle = toPlayer - spread / 2;
      const angleStep = spread / (waveCount - 1);
      const laserSpeed = 380;

      for (let i = 0; i < waveCount; i++) {
        const ang = startAngle + i * angleStep;
        onSpawnProjectile({
          id: getUniqueId('boss_laser_wave'),
          type: 'laser_wave',
          name: 'Xaos Lazer Dalğası',
          x: boss.x,
          y: boss.y,
          vx: Math.cos(ang) * laserSpeed,
          vy: Math.sin(ang) * laserSpeed,
          speed: laserSpeed,
          radius: 8,
          damage: boss.damage * 0.85,
          color: '#ef4444',
          fromEnemy: true,
          life: 2.4,
          maxLife: 2.4
        });
      }

      // 2. Oyunçunun ətrafına 3 ədəd konsentrik xaos meteor partlayışı təyin et
      for (let i = 0; i < 3; i++) {
        const meteorOffsetAngle = Math.random() * Math.PI * 2;
        const meteorDist = 40 + i * 50;
        const mx = player.x + Math.cos(meteorOffsetAngle) * meteorDist;
        const my = player.y + Math.sin(meteorOffsetAngle) * meteorDist;

        // Meteor mərmisi yuxarıdan hədəf nöqtəyə düşür
        const mAngle = Math.atan2(my - boss.y, mx - boss.x);
        onSpawnProjectile({
          id: getUniqueId('boss_meteor'),
          type: 'chaos_meteor',
          name: 'Xaos Meteoru',
          x: boss.x,
          y: boss.y,
          vx: Math.cos(mAngle) * 320,
          vy: Math.sin(mAngle) * 320,
          speed: 320,
          radius: 12,
          damage: boss.damage * 1.2,
          color: '#f97316',
          fromEnemy: true,
          life: 2.0,
          maxLife: 2.0
        });
      }
    },

    /* ========================================================================
     * KÖMƏKÇİ FİZİKA VƏ HƏRƏKƏT ALQORİTMLƏRİ
     * ======================================================================== */

    /**
     * Düşmənin daxili xüsusiyyətlərini ilkinləşdirir (varsa toxunmur)
     */
    _initEnemyProps(enemy, defaults) {
      if (enemy.speed === undefined) enemy.speed = defaults.speed;
      if (enemy.attackRange === undefined) enemy.attackRange = defaults.attackRange;
      if (enemy.attackCooldown === undefined) enemy.attackCooldown = defaults.attackCooldown;
      if (enemy.damage === undefined) enemy.damage = defaults.damage;
      if (enemy.radius === undefined) enemy.radius = 20;
    },

    /**
     * Oyunçunun ətrafında mühasirə (flanking) üçün optimal yuva təyin edir (O(1) sürətli indeks)
     */
    _getFlankPosition(enemy, player, meleeList, flankDistance) {
      const slotIndex = (enemy._flankSlotIndex !== undefined) ? enemy._flankSlotIndex : 0;
      const total = Math.max(1, meleeList.length);

      // Oyunçunun ətrafındakı mühasirə bucağı
      const angle = (slotIndex / total) * Math.PI * 2;
      return {
        x: player.x + Math.cos(angle) * flankDistance,
        y: player.y + Math.sin(angle) * flankDistance
      };
    },

    /**
     * Hədəf nöqtəyə doğru yumşaq sükan (steering) hərəkəti
     */
    _steerTowards(entity, targetX, targetY, targetSpeed, dt) {
      const dx = targetX - entity.x;
      const dy = targetY - entity.y;
      const d = Math.sqrt(dx * dx + dy * dy);

      if (d > 2) {
        const desiredVx = (dx / d) * targetSpeed;
        const desiredVy = (dy / d) * targetSpeed;

        // Yumşaq sürətlənmə (lerp / steering)
        const steerStrength = 8.0 * dt;
        entity.vx = (entity.vx || 0) + (desiredVx - (entity.vx || 0)) * steerStrength;
        entity.vy = (entity.vy || 0) + (desiredVy - (entity.vy || 0)) * steerStrength;
      } else {
        entity.vx = (entity.vx || 0) * 0.7;
        entity.vy = (entity.vy || 0) * 0.7;
      }
    },

    /**
     * Düşmənlərin üst-üstə minməməsi üçün ayrılma qüvvəsi (AABB Pre-filtering ilə Boids Separation)
     */
    _applySeparation(entity, list, minDist) {
      const minDistSq = minDist * minDist;
      let sepX = 0;
      let sepY = 0;
      let count = 0;

      for (let i = 0; i < list.length; i++) {
        const other = list[i];
        if (other === entity || other.hp <= 0) continue;

        // Sürətli AABB Bounding Box pre-filter (kökaltı və kvadrat əməliyyatlarını 80-90% azaldır)
        const dx = entity.x - other.x;
        if (dx > minDist || dx < -minDist) continue;
        const dy = entity.y - other.y;
        if (dy > minDist || dy < -minDist) continue;

        const d2 = dx * dx + dy * dy;
        if (d2 > 0 && d2 < minDistSq) {
          const d = Math.sqrt(d2);
          const push = (minDist - d) / minDist;
          sepX += (dx / d) * push;
          sepY += (dy / d) * push;
          count++;
        }
      }

      if (count > 0) {
        const force = 90;
        entity.vx = (entity.vx || 0) + (sepX / count) * force;
        entity.vy = (entity.vy || 0) + (sepY / count) * force;
      }
    },

    /**
     * Maneələrdən (ağaclar, sütunlar, kristallar) yan keçmə (AABB Pre-filtering ilə)
     */
    _applyObstacleAvoidance(entity, obstacles, dt) {
      if (!obstacles || obstacles.length === 0) return;

      const entityRadius = entity.radius || 20;

      for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        if (!obs) continue;

        const obsRadius = obs.radius || 30;
        const totalRadius = entityRadius + obsRadius;

        // Sürətli AABB Bounding Box pre-filter
        const dx = entity.x - obs.x;
        if (dx > totalRadius || dx < -totalRadius) continue;
        const dy = entity.y - obs.y;
        if (dy > totalRadius || dy < -totalRadius) continue;

        const d2 = dx * dx + dy * dy;

        if (d2 < totalRadius * totalRadius && d2 > 0) {
          const d = Math.sqrt(d2);
          const overlap = totalRadius - d;
          const nx = dx / d;
          const ny = dy / d;

          // Mövqeni maneədən kənara çıxar
          entity.x += nx * overlap * 0.5;
          entity.y += ny * overlap * 0.5;

          // Sürət vektorunu toqquşma normalına görə söndür
          const dot = (entity.vx || 0) * nx + (entity.vy || 0) * ny;
          if (dot < 0) {
            entity.vx = (entity.vx || 0) - nx * dot;
            entity.vy = (entity.vy || 0) - ny * dot;
          }
        }
      }
    },

    /**
     * Dünya sərhədlərindən kənara çıxmama
     */
    _applyWorldBounds(entity, region) {
      const padding = (entity.radius || 20) + 10;
      const minX = padding;
      const minY = padding;
      const maxX = (region.width || 2600) - padding;
      const maxY = (region.height || 2600) - padding;

      if (entity.x < minX) {
        entity.x = minX;
        if (entity.vx < 0) entity.vx = 0;
      } else if (entity.x > maxX) {
        entity.x = maxX;
        if (entity.vx > 0) entity.vx = 0;
      }

      if (entity.y < minY) {
        entity.y = minY;
        if (entity.vy < 0) entity.vy = 0;
      } else if (entity.y > maxY) {
        entity.y = maxY;
        if (entity.vy > 0) entity.vy = 0;
      }
    },

    /**
     * Oyunçunun gələcək mövqeyini qabaqlama (Predictive Leading)
     */
    _predictPlayerPosition(player, shooter, projectileSpeed) {
      const d = dist(shooter.x, shooter.y, player.x, player.y);
      const timeToTarget = d / Math.max(1, projectileSpeed);
      const factor = this.config.predictionFactor;

      const pvx = player.vx || 0;
      const pvy = player.vy || 0;

      return {
        x: player.x + pvx * timeToTarget * factor,
        y: player.y + pvy * timeToTarget * factor
      };
    }
  };

  // Qlobal window obyektinə və ya Node moduluna bağla
  if (typeof window !== 'undefined') {
    window.GameAI = GameAI;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameAI;
  }

})(typeof window !== 'undefined' ? window : globalThis);
