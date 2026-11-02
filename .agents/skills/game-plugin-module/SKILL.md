---
name: game-plugin-module
description: Contract for adding a new gameplay system (loot, talents, elite enemies, daily challenge, etc.) to the AETHERIA game as a standalone src/*.js plugin file with no merge conflicts. Read it before writing any new game module for AETHERIA.
---

# Game Plugin Module Contract (AETHERIA V4.0+)

This skill defines the **zero-conflict** rules that let several subagents work **in parallel** and add new systems to the game. No plugin agent edits `src/engine.js`, `src/ui.js`, `index.html` or another agent's file. Each agent creates only its own file. The CEO does the integration.

## 1. File and Global Name
- File: `src/<module_name>.js`, written as an IIFE: `(function(){ 'use strict'; ... })();`
- Global object: `window.Game<Name>` (e.g. `window.GameLoot`)
- Register the module at the end of the file:
```js
if (typeof window !== 'undefined') {
  window.GameLoot = GameLoot;
  (window.GamePlugins = window.GamePlugins || []).push(GameLoot);
}
if (typeof module !== 'undefined' && module.exports) module.exports = GameLoot;
```
- Give the object `id` and `name` fields, e.g. `id: 'loot'`.

## 2. Plugin Hooks (all OPTIONAL: write only the ones you need)
The engine calls each hook inside `try/catch`, and only if the function exists.

| Hook | When | Returns |
| :--- | :--- | :--- |
| `init(api)` | Once, when the page opens | – |
| `onRunStart(mode, api)` | New game / Arena (`mode`: `'story'`/`'arena'`/`'continue'`) | – |
| `onRegionLoaded(regionIndex, worldState, api)` | When a region loads | – |
| `update(dt, player, worldState, api)` | Every frame (unless paused) | – |
| `onEnemySpawned(enemy, worldState, api)` | Every time a new enemy enters the list (normal patrol, wave, minion) | – |
| `modifyOutgoingDamage(enemy, damage, isCrit, player, api)` | Before the player damages an enemy | **new damage (number)** |
| `onEnemyHit(enemy, damage, isCrit, player, api)` | After damage is applied | – |
| `onEnemyKilled(enemy, player, worldState, api)` | When an enemy dies (including bosses, `enemy.isBoss`) | – |
| `modifyIncomingDamage(amount, player, source, api)` | Before the player takes damage | **new damage (number)** |
| `onPlayerDamaged(amount, player, api)` | After damage is taken | – |
| `onPlayerDeath(player, stats, api)` | When health reaches 0 (BEFORE respawn) | Returning `true` cancels the death (e.g. a revive talent) |
| `onBossDefeated(boss, worldState, api)` | When a boss dies | – |
| `onRelicPicked(relicId, api)` | When a relic is chosen | – |
| `onWeaponSwitched(weaponId, api)` | When the weapon changes | – |
| `getStatMultipliers()` | Read every frame | `{ damageMult, speedMult, critBonus, goldMult, xpMult, damageTakenMult, maxHpBonus, manaRegenMult, dropChanceMult }` (only the ones you need; defaults are 1 / 0) |
| `handleKey(code, api)` | Keyboard (`e.code`) | `true` = we consumed the event |
| `renderWorld(ctx, time, worldState)` | While the camera transform is ACTIVE: **world coordinates** (use `x,y` directly) | – |
| `renderHUD(ctx, w, h, worldState)` | Screen coordinates (after the camera is restored) | – |
| `isBlockingInput()` | Return `true` if the plugin has its own modal open (the game pauses) | boolean |

## 3. The `api` Object Provided by the Engine
```js
api.engine                 // window.GameEngine
api.player                 // player object (x,y,hp,maxHp,mana,radius,angle,critChance,attackDamage...)
api.worldState             // { enemies, projectiles, pickups, region, boss, time, ... }
api.spawnEnemy(type, x, y, opts)  // type: 'goblin'|'archer'|'golem'|'wraith'|'knight'; opts {elite:true}; returns the enemy
api.damageEnemy(enemy, dmg, isCrit)
api.healPlayer(amount)
api.addGold(n); api.addCrystals(n); api.addXP(n); api.addRage(n)
api.openRelicDraft()
api.notify(title, subtitle, type)       // type: 'quest'|'boss'|'bonus'|'warning'|'levelUp'
api.floatingText(x, y, text, color, size)
api.explosion(x, y, color, count, radius)
api.shake(amount, duration); api.slowMo(scale, duration); api.hitStop(sec)
api.playSFX(name)                        // silently ignored if the name does not exist
api.pause(); api.resume()
api.getActiveWeaponId(); api.getRelicIds(); api.getCompanionId()
```

## 4. Available SFX Names (`GameAudio.playSFX`)
`hit, slash1, slash2, slash3, dagger, hammer, bow, spell, explosion, dash, perfectDodge, coin, chest,
quest, levelUp, relic, portal, bossRoar, ultimate, comboSSS, lightningChain, playerHurt, click`
Added in V4.0 (by `audio-designer`): `lootRare, lootEpic, lootLegendary, evolution, eliteSpawn,
talentUnlock, dailyComplete, soulGain`. Always call through `api.playSFX(...)` (it has a safe fallback).

## 5. Rules
1. **Create only your own file.** Do not edit any other file.
2. If you need a DOM modal, create it yourself with `document.createElement`, append it to `document.body`,
   and inject all CSS from your own file via `<style id="<module>-styles">`. When using `innerHTML`,
   escape dynamic text (XSS is not allowed).
3. `localStorage` keys use the `aetheria_<module>_*` prefix.
4. Performance: do not allocate new arrays/objects every frame, and cap particles (≤ 200).
5. Player-facing text matches the game's existing language (Aetheria's is **Azerbaijani**).
6. `node -c src/<file>.js` must pass, and the file must load without `window` (guard for it).
7. When finished, send the CEO a short report: file, global name, hooks used, new keys, new SFX names.
