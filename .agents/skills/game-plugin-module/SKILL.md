---
name: game-plugin-module
description: AETHERIA oyununa yeni oyun sistemini (loot, talent, elite düşmən, gündəlik sınaq və s.) toqquşmasız, ayrıca src/*.js plugin faylı kimi əlavə etmə müqaviləsi. Hər hansı subagent oyuna yeni modul yazanda bu skill-i oxumalıdır.
---

# Game Plugin Module Contract (AETHERIA V4.0+)

Bu skill bir neçə subagentin **eyni anda paralel** işləyərək oyuna yeni sistemlər əlavə etməsi üçün
**sıfır toqquşma** qaydasıdır. Heç bir plugin agenti `src/engine.js`, `src/ui.js`, `index.html`
və ya başqa agentin faylını redaktə ETMİR. Yalnız öz faylını yaradır. İnteqrasiyanı CEO edir.

## 1. Fayl və qlobal ad
- Fayl: `src/<modul_adı>.js` — IIFE `(function(){ 'use strict'; ... })();`
- Qlobal obyekt: `window.Game<Ad>` (məs. `window.GameLoot`)
- Faylın sonunda özünü qeydiyyatdan keçir:
```js
if (typeof window !== 'undefined') {
  window.GameLoot = GameLoot;
  (window.GamePlugins = window.GamePlugins || []).push(GameLoot);
}
if (typeof module !== 'undefined' && module.exports) module.exports = GameLoot;
```
- `id` və `name` sahələri olsun: `id: 'loot'`.

## 2. Plugin hook-ları (hamısı OPSIONALDIR — lazım olmayanı yazma)
Mühərrik hər hook-u `try/catch` daxilində, yalnız funksiya mövcuddursa çağırır.

| Hook | Nə vaxt | Qaytarır |
| :--- | :--- | :--- |
| `init(api)` | Səhifə açılarkən 1 dəfə | – |
| `onRunStart(mode, api)` | Yeni oyun/Arena (`mode`: `'story'`/`'arena'`/`'continue'`) | – |
| `onRegionLoaded(regionIndex, worldState, api)` | Bölgə yüklənəndə | – |
| `update(dt, player, worldState, api)` | Hər kadr (pauza deyilsə) | – |
| `onEnemySpawned(enemy, worldState, api)` | Hər yeni düşmən siyahıya düşəndə (adi patrul, dalğa, minion) | – |
| `modifyOutgoingDamage(enemy, damage, isCrit, player, api)` | Oyunçu düşmənə zərər vurmazdan əvvəl | **yeni zərər (number)** |
| `onEnemyHit(enemy, damage, isCrit, player, api)` | Zərər tətbiq olunduqdan sonra | – |
| `onEnemyKilled(enemy, player, worldState, api)` | Düşmən öləndə (boss daxil, `enemy.isBoss`) | – |
| `modifyIncomingDamage(amount, player, source, api)` | Oyunçu zərər almazdan əvvəl | **yeni zərər (number)** |
| `onPlayerDamaged(amount, player, api)` | Zərər alındıqdan sonra | – |
| `onPlayerDeath(player, stats, api)` | Can 0 olanda (respawn-dan ƏVVƏL) | `true` qaytarsa ölüm ləğv olunur (məs. dirilmə talantı) |
| `onBossDefeated(boss, worldState, api)` | Boss öləndə | – |
| `onRelicPicked(relicId, api)` | Relikt seçiləndə | – |
| `onWeaponSwitched(weaponId, api)` | Silah dəyişəndə | – |
| `getStatMultipliers()` | Hər kadr oxunur | `{ damageMult, speedMult, critBonus, goldMult, xpMult, damageTakenMult, maxHpBonus, manaRegenMult, dropChanceMult }` (yalnız lazım olanlar; default 1 / 0) |
| `handleKey(code, api)` | Klaviatura (`e.code`) | `true` = hadisəni udduq |
| `renderWorld(ctx, time, worldState)` | Kamera transformu AKTİV ikən — **dünya koordinatları** (`x,y` birbaşa) | – |
| `renderHUD(ctx, w, h, worldState)` | Ekran koordinatları (kamera bərpa olunduqdan sonra) | – |
| `isBlockingInput()` | Plugin öz modalını açıbsa `true` (oyun pauza olur) | boolean |

## 3. Mühərrikin verdiyi `api` obyekti
```js
api.engine                 // window.GameEngine
api.player                 // oyunçu obyekti (x,y,hp,maxHp,mana,radius,angle,critChance,attackDamage...)
api.worldState             // { enemies, projectiles, pickups, region, boss, time, ... }
api.spawnEnemy(type, x, y, opts)  // type: 'goblin'|'archer'|'golem'|'wraith'|'knight'; opts {elite:true}; düşməni qaytarır
api.damageEnemy(enemy, dmg, isCrit)
api.healPlayer(amount)
api.addGold(n); api.addCrystals(n); api.addXP(n); api.addRage(n)
api.openRelicDraft()
api.notify(title, subtitle, type)       // type: 'quest'|'boss'|'bonus'|'warning'|'levelUp'
api.floatingText(x, y, text, color, size)
api.explosion(x, y, color, count, radius)
api.shake(amount, duration); api.slowMo(scale, duration); api.hitStop(sec)
api.playSFX(name)                        // mövcud deyilsə səssiz keçir
api.pause(); api.resume()
api.getActiveWeaponId(); api.getRelicIds(); api.getCompanionId()
```

## 4. Mövcud SFX adları (`GameAudio.playSFX`)
`hit, slash1, slash2, slash3, dagger, hammer, bow, spell, explosion, dash, perfectDodge, coin, chest,
quest, levelUp, relic, portal, bossRoar, ultimate, comboSSS, lightningChain, playerHurt, click`
V4.0 ilə əlavə olunanlar (audio-designer): `lootRare, lootEpic, lootLegendary, evolution, eliteSpawn,
talentUnlock, dailyComplete, soulGain`. Həmişə `api.playSFX(...)` ilə çağır (təhlükəsiz fallback var).

## 5. Qaydalar
1. **Yalnız öz faylını yarat.** Başqa faylı redaktə etmə.
2. DOM modal lazımdırsa — `document.createElement` ilə özün yarat, `document.body`-yə əlavə et,
   bütün CSS-i `<style id="<modul>-styles">` ilə öz faylından inject et. `innerHTML` istifadə edəndə
   dinamik mətnləri escape et (XSS qadağandır).
3. `localStorage` açarları `aetheria_<modul>_*` prefiksi ilə.
4. Performans: hər kadr yeni massiv/obyekt yığını yaratma, hissəciklərə limit qoy (≤ 200).
5. Bütün mətnlər **Azərbaycan dilində**.
6. Node-da `node -c src/<fayl>.js` keçməlidir və `window` olmadan da yüklənə bilməlidir (guard et).
7. Bitəndə CEO-ya qısa hesabat: fayl, qlobal ad, istifadə olunan hook-lar, yeni düymələr, yeni SFX adları.
