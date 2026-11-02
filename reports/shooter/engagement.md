# Void Nova (shooter.html) - Engagement Review

- Game: VOID NOVA, 360° twin-stick roguelite bullet-hell (`shooter.html`, single file, global `window.VoidNova`)
- Spec: `ARCADE_SPEC.md` section 3 (Game 3)
- Date: 2026-11-02
- Reviewer: engagement review (report only, no game files edited, `npm run playtest` not run)
- Evidence: `playtest-results/shooter/` (desktop 1280x720, 24 s), `playtest-results/shooter-mobile/` (375x812, 20 s), code reading of `shooter.html` (2368 lines)

---

## 0. Summary

1. **The first screens look sparse for a real reason.** Wave 1 starts spawning 0.5 s after launch, but every spawn is placed 700-1000 px from the ship, which is outside the visible area at normal zoom. Early frames therefore show almost nothing. (Section 2.1.)
2. **Contact damage is applied every frame with no cooldown.** One touch of a Singularity Mine can cost 105 of the 160 combined HP and shield. This is the most severe fairness problem found.
3. **Boss danmaku density depends on the monitor refresh rate.** Phase 2 volley rate is about fps/3 and Phase 3 beam rate is about 0.3 x fps. A 144 Hz player faces about 2.4x the bullets of a 60 Hz player. The playtest ran at 143 FPS, so its numbers are not what a 60 Hz player sees.
4. **Boon deck is partly dishonest and partly dead.** `TESLA HYPER-CONDUIT` does nothing (its `chainChance` is never read). `PHOTONIC AEGIS` claims a 25% damage reduction that does not exist. Rarity labels do not change draft odds.
5. **Mobile is effectively unplayable.** Touch only sets aim and fire. Nothing sets the movement keys, so a phone player cannot move. Fire requires a finger drag. The HUD overlaps on a 375 px screen.
6. **Nothing carries between runs except one high-score number.** The run ends with a modal that says "Sector cleared" even when the player died mid-wave. There is no run summary, no progress display within a wave, and no cross-run goal. The spec promised a persistent vault and crystal currency; neither exists in code.
7. **Dark-pattern check: 0 of the defined patterns found** (fake scarcity, loss-aversion streaks, manipulative near-miss, pay/wait walls, guilt messaging). Two watch items are listed in section 6.

---

## 1. Evidence and limits

- Desktop playtest: 24 s, 0 errors, 0 warnings, avg 143.8 FPS, p95 7.1 ms, pass. Only the first wave was exercised. Frames: `start.png` (menu, record 0), `mid.png` (score 00000, one asteroid far away, no enemies near the ship), `end.png` (score 00500, a swarmer pack on screen).
- Mobile playtest: 20 s, 0 errors, avg 143.2 FPS, pass. `mid.png` shows score 0 and no enemies on screen; the ship never moved. Touch-fire is not triggered by a tap, so the playtest did not exercise firing.
- Not covered by any evidence: wave 2+, boon draft, boss fight, phase changes, game-over, record persistence, any run longer than 24 s. Timings below for those are **estimates from code**, marked "est.".
- Frame-rate claims are from code analysis, not measurement. A 60 Hz run was not captured.

---

## 2. Requested questions

### 2.1 Time to first enemy and first reward

Spawn timing (from code):

| Item | Value | Code |
| :- | :- | :- |
| Wave 1 spawn events | 14 + 6 x 1 = **20** | `startWave` L975 |
| First spawn after launch | **0.5 s** (`spawnTimer = 0.5`) | L976 |
| Spawn interval | `max(0.4, 1.4 - 0.1 x wave)` = **1.3 s** at wave 1 | L1687 |
| Spawn distance from ship | **700-1000 px** | L1695 |
| Visible half-extents at zoom 1.0 (1280x676 canvas) | **640 x 338 px** | render transform L1987-1993 |
| Zoom when moving at full speed | 0.78 (view half-extents ~820 x 433) | L1192 |

Conclusion: at zoom 1.0 essentially every spawn point lies outside the visible area (the only overlap is a sliver at distance 700 in a narrow angle band). Enemies then have to travel in from the edge. The first visible threat is a swarmer pack (speed 280 px/s, chases the ship), reaching the screen about 2-4 s after spawn (est.). Asteroids (45% of spawns) and singularity mines (8%) do not chase the ship; they drift randomly, so they may never reach it. This is why the early frames look empty.

- **Time to first enemy on screen:** about 3-5 s (est.). Spawn at 0.5 s, then a swarmer must cross 700+ px.
- **Time to first reward (first kill, +100 points):** est. 5-10 s. The mid frame still shows 0 points.
- **Time to first named reward (boon draft):** only at wave clear. Wave 1 expected kill load is about 86 (see 2.2), so the first boon likely arrives after 1-2 minutes (est.). Gap over 30 s in the first 5 minutes: **yes**, flagged.

### 2.2 Wave pacing and intensity curve

Waves are sized by **spawn events**, not enemies. A large asteroid splits into 7 kills in total (1 + 2 + 4), a swarm pack is 3, a sniper or mine is 1. With the spawn mix in `spawnWaveUnit` (asteroid 45%, swarm 30%, sniper 17%, mine 8%), expected kills per spawn event are about **4.3** (est.).

| Wave | Spawn events | Interval (s) | Spawn phase length (s) | Expected kills (est.) |
| :- | :- | :- | :- | :- |
| 1 | 20 | 1.3 | ~26 | ~86 |
| 2 | 26 | 1.2 | ~31 | ~112 |
| 3 | 32 | 1.1 | ~35 | ~138 |
| 4 | 38 | 1.0 | ~38 | ~163 |
| 5 | BOSS | - | boss only | boss 12,000 HP |
| 6 | 50 | 0.8 | ~40 | ~215 |
| 9 | 68 | 0.5 | ~34 | ~292 |
| 10 | BOSS | - | - | - |

Intensity findings:
- The spawn window stays between 26 and 40 s, but the kill load rises about 3.4x from wave 1 to wave 9. The difficulty ramp is carried by enemy count and clear time, not by spawn speed.
- The wave clears only when `enemies.length === 0` (L1679). Asteroids and mines drift with no despawn and no leash. A wave can drag while the player hunts stragglers. The HUD has **no progress indicator** (no enemies remaining, no wave progress bar), so the player cannot tell how far the wave is from clearing.
- Asteroids spawned far from the ship drift toward the walls and may stall. No timeout exists.

### 2.3 Boon draft: are the choices meaningful?

Eight boons, three shown at random, no reroll, no skip (`openBoonDraft` L1833-1861). Results:

| Boon | Matches its text? | Meaningful? |
| :- | :- | :- |
| OVERDRIVE CORE | **No.** Text promises "secondary spark pulses on critical hits"; there is no critical hit in code. Only `attackSpeedMult x1.35`. | Yes as a stacking stat (multiplicative, exponential). |
| TACTICAL EMP ARRAY | Yes (+2 EMP, clears bullets, 3 s stun). | Yes, but stat-like. |
| PHOTONIC AEGIS BARRIER | **No.** Text promises "-25% damage taken"; code only adds +50 max shield (L679). No damage reduction exists in `damagePlayer` (L1810). | Weak. |
| AUTONOMOUS COMBAT DRONE | Partly. Text says it "mirrors your secondary fire"; the drone fires an 18-damage yellow bolt at `enemies[0]` (L1155-1177). | Yes (stacks). |
| TESLA HYPER-CONDUIT | **No. Dead.** `chainChance` is set (L697) and reset (L796, L944) but **never read** by any combat code. | **No effect.** |
| QUANTUM DASH DECOY | Yes (250 damage, 2.2 s timer). | Yes. |
| NANO-REPAIR SIPHON | **No.** Text says +5 HP and +12 shield; code gives +4 HP and +10 shield (L1802-1803). | Yes, small. |
| VORTEX WARHEADS | Yes, for missiles only (L1375). | Yes for Missile builds. |

Other problems:
- **Rarity is cosmetic.** Cards are picked by a uniform shuffle (`sort(() => 0.5 - Math.random())`, L1838). "Legendary" appears as often as "rare", and the sort is also a biased shuffle.
- **Choice is thin.** Most boons are either a flat stat or a stacking multiplier. There is no tradeoff text, no synergy, and no way to decline. The only weapon-scaling stat is attack speed, which also multiplies Tesla's already high rate.
- **Weapon balance (est. from code):** Tesla fires 40 shots/s, each hitting up to 3 targets for 12, 9.6 and 7.7 damage (about 1,170 dps to a cluster, 480 dps to a single target). Twin Laser is 2 x 22 x 12 = 528 dps single-target and needs aim. Tesla auto-targets within 340 px. Tesla is therefore the dominant pick and the rest of the weapon choice is weak. This is an estimate and needs playtest confirmation.

### 2.4 Boss timing

- Boss appears at **wave 5** (then 10, 15...), immediately at (1600, 1100), with a chime and the banner "WAVE 5 INCOMING!". No intro, no telegraph beyond the phase label (`spawnBoss` L1044-1072, `startWave` L969-972).
- Boss HP is **12,000** (spec says 15,000 in ARCADE_SPEC section 3.3).
- Phase 1: 6 shield orbiters at 600 HP each (3,600 HP total). The core takes damage only when all orbiters are dead (`updateBullets` L1414-1422). Boss moves toward the ship at 60 px/s. No boss contact damage.
- Phase 2 at 66% HP, phase 3 at 33% HP (L1577-1585).
- Expected time to kill with Twin Laser (est.): about 30 s if every shot lands. Estimated arrival of the boss: after waves 1-4 spawn windows, roughly 2.2 min of spawn time alone, probably 3-5 min including clears (est.).
- **Boss invulnerability is bypassed** by two paths (see recommendation 6). With no mobs alive (the case in the boss wave), Tesla targets the boss core whenever it is within 340 px.
- **Danmaku density depends on FPS** (see recommendation 3). The boss difficulty a player experiences is set by their monitor refresh rate.

### 2.5 What persists between runs

- **Only one value:** `localStorage['void_nova_high_score']`, written when the score beats it (L1974-1978).
- Not persisted: run stats, kills, waves reached as a record, boons, weapons, currency, unlocks, settings (there are no settings at all).
- The spec (ARCADE_SPEC section 1, section 3.4 and the storage line in the core-infra table) describes a persistent vault with currency, garage and talents, and crystal drops from asteroids ("Drop crystal currency"). None of this is in `shooter.html`. Grep for `crystal` and `currency` returns nothing.

### 2.6 How a run ends

- The only end is death (`damagePlayer` to `gameOver`, L1828-1830). There is no victory state; the game is endless.
- The modal title is "STARSHIP DESTROYED", with a subtitle reading **"Sector cleared: WAVE N"** (L1969). This is misleading when the player died during a wave, because that sector was not cleared.
- Shown: wave number, final score, and "NEW RECORD" if applicable. Not shown: time survived, kills, boons taken, best combo, weapons used.
- No sound at game-over. Re-launch resets everything (`startNewGame` L935-962); no continue option, which is correct for this design.
- Reason to return: beat the record score, and nothing else. This is weak. (Recommendation 5.)

---

## 3. Core-loop review (checklist)

### 3.1 Action-to-reward and reward-to-goal gaps (first 5 minutes, est.)

| Gap | Estimate | Flag |
| :- | :- | :- |
| Launch to first visible enemy | 3-5 s | OK |
| Shot to kill feedback | instant (score tick, particles) | OK |
| Kill to next kill | 1-3 s during spawn window | OK |
| Launch to first boon draft (first named reward) | 1-2 min | **Over 30 s** |
| Boon to next wave start | immediate (banner) | OK |
| Boon 4 to boss arrival | about 40 s (plus the wave 4 spawn window) | Borderline |

### 3.2 Feedback: actions that feel silent

| Action | Visual | Sound | Number | Verdict |
| :- | :- | :- | :- | :- |
| Twin Laser fire | yes | yes (`playTwinLaser`) | damage float | OK |
| Hit an enemy without killing it | particles | **no** | damage float | Partly silent |
| Kill | particles, shake | yes (`playExplosion`) | **no "+score" float** (score only in HUD) | Partly silent |
| Plasma, Missile launch | yes | yes | yes | OK |
| Missile hit (no kill) | particles | **no** | damage float | Silent |
| Tesla zap | **chain arc never draws** (see rec. 7) | yes (square blip, 40/s) | damage float | Visual missing |
| **Player takes damage (bullet or contact)** | shake 14 px, particles | **no** | HP bar only | **Silent hurt** |
| Shield absorbs a hit | shield bar only | **no** | none | Silent |
| Shield recharge starts/ends | none | none | bar only | Silent |
| Dash | none beyond ship motion | yes (`playDash`) | none | OK |
| EMP | yes (shake 22) | yes | count | OK |
| Drone fires | bolt | **no** | damage float | Silent |
| Wave starts | banner | **no** | wave label | Silent |
| Boon picked | modal closes | **no** (chime only on open) | none | Silent |
| Combo tier up (10/25/50) | label changes | **no** (BPM slowly changes) | combo count | Silent |
| Sniper fires | telegraph ray (1.2 s, good) | reuses the **explosion** sound (L1539) | none | Mislabeled cue |
| Boss phase change, boss death | banner label | chime / explosion | +15000 score | OK |
| Game over | modal | **no** | score | Silent |

### 3.3 Goals: short, mid and long term visible?

- Short (this wave): "WAVE N" label, but **no remaining-enemy count or progress bar**. Partly visible.
- Mid (this run): nothing shown beyond the current wave. Boss is announced only by wave number. No "next boss at wave 5" hint. Not visible.
- Long (across runs): record score only. Weak.

### 3.4 Mastery: does skill visibly matter?

- Positive: dash is invulnerable for 0.22 s (L1437, L1559) and kill combos add score (100 x (1 + 0.1 x combo), L1755). Combo timer 3.5 s (L1754).
- Missing: no perfect dodge or graze reward, no rank grade for a run, no time-based bonus, no per-kill "+score" float. Combo tiers only change the BPM and the label; they do not change difficulty or rewards beyond score.
- The dash dodge gives no feedback when it saves the player, so skilled play is invisible.

### 3.5 Ending a session well

See section 2.6. Summary: score and record only; no summary, no progress gained, no clear reason to return beyond beating the record. Fixable without any compulsion mechanic (recommendation 5).

---

## 4. Top 5 recommendations (ranked by impact / effort)

| # | Recommendation | Impact | Effort | Owning agent | Area of `shooter.html` |
| :- | :- | :- | :- | :- | :- |
| 1 | Apply contact damage once per contact (cooldown or i-frames), not every frame. | High | S | `enemy-ai-engineer` (numbers: `narrative-balance-designer`) | `updateEnemies` contact block L1558-1567; `damagePlayer` L1810-1831 |
| 2 | Make the boon deck truthful: wire or remove TESLA HYPER-CONDUIT, make AEGIS and OVERDRIVE do what they say, fix NANO numbers and drone text, and make rarity affect odds. | High | S | `weapons-upgrades-designer` | `BOON_DECK` L653-726; `openBoonDraft` L1833-1861; `damagePlayer` L1810 (aegis); `killEnemy` L1801-1805 (nano); `updateBullets` L1355-1391 (where chain would hook; not implemented) |
| 3 | Make boss danmaku and beams frame-rate independent. | High | S | `enemy-ai-engineer` (boss logic), `game-engine-developer` (dt helper) | `updateBoss` phase 2 volley gate L1622 and phase 3 beam roll L1653; per-frame rolls in exhaust L1102 and missile smoke L1341 |
| 4 | Make mobile playable: a touch movement stick, touch-start fire, and a HUD layout for phones. | High (mobile players) | M | `ui-hud-engineer` (touch UI, HUD CSS), `game-engine-developer` (input) | `initEvents` touch L897-904 (movement keys never set); HUD CSS L40-130; HUD markup L235-300; no `@media` in file |
| 5 | Give runs an ending and a reason to return: wave-progress readout in the HUD, a run summary screen, an honest game-over title, and saved run stats. | High | M | `ui-hud-engineer` (HUD, summary, copy), `backend-persistence-engineer` (versioned stats save), `meta-progression-designer` (cross-run goal) | HUD markup L235-300; `updateSpawner` L1677-1691 (remaining count); `gameOver` L1963-1979; `initUI` L916-925 |

### Rec 1. Contact damage every frame
- **Evidence:** `updateEnemies` applies `damagePlayer(e.contactDmg)` and `e.hp -= 40` on each frame of overlap, with no cooldown. Per contact: asteroid 25 x 3 frames = **75**, Singularity Mine 35 x 3 = **105**, sniper 20 x 2 = **40**, swarmer 15 x 1. The pool is 100 HP + 60 shield = 160.
- **Why it matters:** one touch of a mine can remove two-thirds of the pool, and the damage does not depend on how fast the player reacts. This is the largest source of unfair deaths in the code.
- **Fix direction:** an i-frame or per-enemy contact cooldown (for example one hit per 0.5 s per enemy), plus a short knockback or a deal-once rule. The mine is the first to change. Numbers are for `narrative-balance-designer`.

### Rec 2. Boon deck truthfulness and dead boon
- **Evidence:** Section 2.3 table. Dead: `chainChance` (L697, L796, L944) is never read. Untrue text: AEGIS (L678), OVERDRIVE (L660), NANO (L714), DRONE (L687). Rarity has no effect on odds (L1838).
- **Why it matters:** choice is the core of a roguelite. A card that does nothing or describes something that is not there teaches the player to distrust the draft.
- **Fix direction:** implement or remove each boon so the text matches; weight draws by rarity; replace the biased sort with a Fisher-Yates shuffle; consider a reroll or a "skip for +N" choice (not a paywall).

### Rec 3. Frame-rate-dependent boss and danmaku
- **Evidence:** Phase 2 fires when `Math.floor(timer * 35) % 3 === 0` (L1622). Each frame increments the timer by dt, so the gate is open about one frame in three. Volley rate is therefore about **fps / 3**: 20/s at 60 Hz, 48/s at 144 Hz (intended 11.7/s). Phase 3 rolls `Math.random() < 0.3` per frame (L1653), giving about 18 beams/s at 60 Hz and 43/s at 144 Hz, each 25 damage. Exhaust (L1102, 0.6 per frame) and missile smoke (L1341, 0.4 per frame) are also per frame.
- **Why it matters:** the boss gets about 2.4x denser on a 144 Hz display than on 60 Hz. The playtest ran at 143 FPS, so it measured the harder version. Balance cannot be judged from it.
- **Fix direction:** time-based accumulators (`timer += dt; while (timer >= 1/11.7) { fire; timer -= ... }`), and dt-based random rates (`rate * dt`). Add a QA check at a fixed 60 Hz and at 144 Hz.

### Rec 4. Mobile controls
- **Evidence:** `touchmove` only sets the aim position and `mouse.down = true` (L898-903). No `touchstart`, so a tap does not fire. The movement keys `keys.w/a/s/d` are set only by keyboard (L865-883). A phone player cannot move. The mobile screenshot shows the ship in the centre with DASH and EMP circles overlapping the weapon bar and the header wrapping to three lines (`shooter-mobile/mid.png`). The file has no `@media` queries.
- **Why it matters:** on a phone the game cannot be played as designed. The mobile playtest scored 0 points in 20 s, which is consistent with this.
- **Fix direction:** a left virtual stick for movement, a right area for aim and hold-to-fire (`touchstart` and `touchmove`), and a phone layout for the HUD (smaller panels, weapon bar and action buttons placed in separate safe zones).

### Rec 5. Run ending and reason to return
- **Evidence:** Section 2.5 and 2.6. The game-over title says "Sector cleared" (L1969) even when the wave was not cleared. No wave-progress readout. No summary. Only one persisted value.
- **Why it matters:** the run ends and the player has no sense of what they achieved or what is next. A mid-run goal and a clear summary are the healthy version of "one more run".
- **Fix direction (no compulsion):** (a) HUD line "ENEMIES LEFT n" or a wave progress bar. (b) Game-over title "STARSHIP DESTROYED - reached WAVE n" and a summary: time, kills, best combo, boons taken, new record flag. (c) Versioned save for lifetime stats (runs, best wave, best combo). (d) A cross-run goal that is earned, not timed, for example a new boon or ship colour unlocked at wave 10. Do not add streak penalties, daily timers or pay-to-continue.

---

## 5. Further items (not in the top 5)

6. **Boss shield-matrix bypass.** EMP applies `boss.hp -= 250` directly (L1036-1039), and `findNearestEnemy` returns the boss core when no mobs are in range (L1310). `applyTeslaArc` then does `target.hp -= dmg` (L1285), so the core takes Tesla damage with no orbiter check. In the boss wave there are no mobs, so Tesla can skip phase 1 entirely. Owner: `enemy-ai-engineer` with `level-boss-designer`. Impact M-H, effort S.
7. **Tesla visuals and dominance.** `applyTeslaArc` draws the chain with `drawJaggedLightning` during `update()` (L1294, L1922-1941). `render()` clears the canvas afterwards (L1985), so the arcs are never visible. Owner: `game-engine-developer` (draw order), `weapons-upgrades-designer` (balance). Impact M, effort S.
8. **Feedback gaps.** Add sounds for: damage taken (`damagePlayer` L1810), shield absorb, boon pick (L1851), wave start (L964), combo tier up (L1950), and a dedicated sniper shot (L1539 reuses explosion). Add a "+score" float on kill (L1747). Owner: `audio-designer`, with `combo-events-designer` for the tier cue. Impact M, effort S.
9. **Onboarding.** The menu (L308-322) and HUD never state controls: no WASD, no "hold mouse to fire", no mention of the boon draft or the boss. First-run players learn by dying. Owner: `onboarding-designer` (copy), `ui-hud-engineer` (placement). Impact M, effort S.
10. **Comfort and accessibility.** No mute, no reduced-shake or reduced-flash option (camera shake up to 22 px on EMP, 30 px on boss death, 14 px on every hit), no pause. Owner: `ui-hud-engineer`. Impact M, effort S-M.
11. **Wave sizing and non-chasing enemies.** `14 + 6n` counts spawn events, not enemies (about 86 kills in wave 1 and 215 in wave 6, est.). 45% of spawns are asteroids that do not chase. Owner: `narrative-balance-designer` (sizing), `enemy-ai-engineer` (chase or leash). Impact M, effort M.
12. **Spec gap: persistent vault and currency.** ARCADE_SPEC describes crystal drops, a garage and talents in a persistent vault, and a 15,000 HP boss. The shipped game has none of these (12,000 HP). The team needs a decision: keep the spec or update it. Owner: `game-architect` for the decision, then `meta-progression-designer`. Impact H long term, effort L-M.
13. **Minor.** `killEnemy` runs on the boss object when Tesla kills it (L1287), adding a stray kill count. Boon text for DRONE says "secondary fire" (L687) but it fires its own bolt. Owners: `enemy-ai-engineer`, `weapons-upgrades-designer`.

---

## 6. Dark-pattern check

| Pattern | Result | Evidence |
| :- | :- | :- |
| Fake scarcity or countdowns | **None found** | No timers, stock counters or "only N left" text in `shooter.html`. |
| Loss-aversion streaks | **None found** (watch item) | Combo resets after 3.5 s (L1754). The loss is score multiplier and BPM only: no HP, weapon or currency is taken. Keep it that way. |
| Manipulative near-miss | **None found** | No near-miss messaging. Dash invulnerability is not announced as a near miss. |
| Pay or wait walls | **None found** | No shop, currency, ads, continue prompts or energy timers. The "Star Repo" link (L216) goes to GitHub and is not a paywall. |
| Guilt or shame messaging | **None found** | Game-over copy is neutral. The "Sector cleared" title (L1969) is misleading, but it is not guilt messaging; it is tracked as a truthfulness defect in rec. 5. |
| Variable reward | Watch item | Random boon draw (L1838) is standard roguelite draft, with no payment attached. Do not add pay-to-reroll. |
| Intensity feedback loop | Watch item | BPM rises to 160 with combo (L371). Acceptable as intensity feedback. Keep it as a feel cue, not a reward loop, and add a mute option (rec. 10). |

**Result: 0 dark patterns found.** Two watch items recorded. The boon-text mismatch and the misleading game-over title are truthfulness defects, not dark patterns, but both are high severity and are in the top 5.

---

## 7. Verification performed

- Read `ARCADE_SPEC.md` section 3, `AGENTS.md`, the shooter playtest reports, and the screenshots.
- Inline script of `shooter.html` extracted to `<scratchpad>\shooter_inline.js` and checked with `node --check`: **SYNTAX_OK**.
- Screenshot dimensions read from PNG headers: desktop 1280x720 (`start`, `mid`, `end`), mobile 750x1624 (`start`, `mid`, `end`, device-pixel ratio 2 for 375x812).
- Greps for: boon field usage (`chainChance`, `sparkOnHit`, `photonic`, `aegis`), audio call sites, touch and key handlers, `@media`, `mute`/`volume`/`reduce`/`motion`/`settings`, `crystal`/`currency`, `waveEnemiesLeft` in HUD markup, `WASD`.
- Not run: `npm run playtest` (as instructed). No game file was edited.

---

## 8. REQUESTS routed to owners

- `enemy-ai-engineer`: rec 1 (contact cooldown, `updateEnemies` L1558-1567, `damagePlayer` L1810), rec 3 (boss phase 2/3 dt gates, L1620-1663), rec 6 (EMP and Tesla boss bypass, L1036-1039, L1284-1313), numbers in rec 11.
- `weapons-upgrades-designer`: rec 2 (`BOON_DECK` L653-726, `openBoonDraft` L1833-1861, chain wiring), rec 7 balance (Tesla vs Twin Laser).
- `game-engine-developer`: rec 3 (dt helper for per-frame rolls L1102, L1341, L1653), rec 4 (touch input L897-904), rec 7 (Tesla arc draw order, L1294 vs L1985).
- `ui-hud-engineer`: rec 4 (mobile HUD and touch stick), rec 5 (wave progress, summary, game-over copy L1963-1979), rec 10 (mute, shake toggle, pause).
- `backend-persistence-engineer`: rec 5 (versioned run-stats save, replacing the single `void_nova_high_score` L1974-1978).
- `meta-progression-designer`: rec 5 (cross-run goal), rec 12.
- `narrative-balance-designer`: rec 1 numbers, rec 11 wave sizing.
- `audio-designer`: rec 8 (missing cues).
- `onboarding-designer`: rec 9 (controls copy and first-run pacing).
- `level-boss-designer`: rec 6 boss telegraph and phase 1 design intent.
- `combo-events-designer`: rec 8 combo tier cue; mastery feedback for dash dodges (section 3.4).
- `game-architect`: rec 12 spec decision (vault, currency, boss HP).
- `qa-browser-tester` (report only): add a boon-draft, boss and game-over run to the playtest, and run the boss at a fixed 60 Hz and at 144 Hz to confirm rec 3.

---

## 9. Notes on recommendation order

Ranking uses impact over effort. Recs 1, 2 and 3 are each small code changes (effort S) with high impact on fairness, choice and boss balance, so they are first. Rec 4 is high impact for phone players but needs a touch control design (M). Rec 5 needs HUD and save work across three owners (M), so it comes last in the top 5.
