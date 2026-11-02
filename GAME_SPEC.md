# GAME_SPEC.md — "AETHERIA: KÖLGƏLƏRİN SƏLTƏNƏTİ" (V2.0 — 25 Agentli AAA Mega-Edition)

Bu sənəd **25 agentli komandanın** paralel iş zamanı sıfır toqquşma (Zero-Conflict) ilə işləməsi və hər agentin öz moduluna cavabdeh olması üçün **Məcburi İnterfeys Müqaviləsidir**.

---

## 1. Dəqiq İş Bölgüsü və Fayl Sərhədləri (Hər Agent YALNIZ Öz Faylına Yazır!)

| № | Fayl Yolu | Məsul Agent | Qlobal Obyekt | Vəzifə |
| :- | :--- | :--- | :--- | :--- |
| **1** | `src/audio.js` | `audio_designer` | `window.GameAudio` | 6 BGM (`menu`, `forest`, `cavern`, `citadel`, `boss`, `arena`) + 22 SFX (`bow`, `hammer`, `dagger`, `ultimate`, `relic`, `comboSSS`, `perfectDodge` daxil) |
| **2** | `src/vfx.js` | `art_director` | `window.GameVFX` | 2.5D işıqlandırma, 4 silah rəsmi, uçan Yoldaş (Pet) rəsmi, fırlanan Relikt kürələri, İldırım Zənciri (`spawnChainLightning`), Ultimate Meteor yağışı (`spawnMeteorStrike`) |
| **3** | `src/physics_juice.js` | `physics_juice_specialist` | `window.GameJuice` | Kamera izləmə, screen-shake, hit-stop, slow-motion, zoom-punch, knockback və maneə fizikası |
| **4** | `src/levels_bosses.js` | `level_boss_designer` | `window.GameLevels` | 3 Hekayə Bölgəsi + 4-cü Xüsusi **Kolizey Arenası (`arena`)**, NPC-lər, Obelisklər, Sandıqlar və Boss-lar |
| **5** | `src/ai_director.js` | `ai_specialist` | `window.GameAI` | Yaxın/uzaq döyüş AI-ı, Qaçan Qızıl Qoblin AI-ı, 3 fazalı Boss AI-ı və dinamik qənimət |
| **6** | `src/progression.js` | `monetization_expert` | `window.GameProgression` | Qızıl/Kristal, Upgrades, 4 Skin, Nailiyyətlər, Gündəlik Bonus, Yoldaş (Pet) açılması və `localStorage` |
| **7** | `src/weapons_relics.js` | `weapon_relic_specialist` | `window.GameRelics` | **YENİ:** 4 Dəyişdirilən Silah (`[1]` Qılınc, `[2]` Əkiz Xəncər, `[3]` Astral Çəkic, `[4]` Alov Yayı) + 12 Roguelike Level-Up Relikt Kartı |
| **8** | `src/companions_ultimates.js` | `companion_mount_specialist` | `window.GameCompanions` | **YENİ:** 3 Uçan Döyüşçü Yoldaş (`phoenix`, `dragon`, `wolf` — avto-atəş və qızıl maqniti) + `[R]` Ultimate "Aether Qiyaməti" |
| **9** | `src/events_arena.js` | `world_events_arena_specialist` | `window.GameEvents` | **YENİ:** `D->C->B->A->S->SSS` Stil Kombo çarpanı, Perfect Dodge (Witch Time), Qızıl Qoblin & Meteor Sandığı hadisəsi, Sonsuz Kolizey dalğa generatoru |
| **10** | `src/ui.js` & `index.html` | `frontend_specialist` | `window.GameUI` | Silah Seçim Barı (`1-4`), `[R]` Ultimate Barı, 3 Kartlı **Relikt Seçim Modalı**, Canlı `SSS` Kombo Sayğacı, Yoldaş seçimi və "🔥 Sonsuz Kolizey" düyməsi |
| **11** | `src/engine.js` | `game_developer` | `window.GameEngine` | Bütün 10 modulu 60–120 FPS-də birləşdirən əsas mühərrik |

---

## 2. Yeni Modulların Dəqiq API Müqaviləsi (V2.0)

### I. `window.GameRelics` (`src/weapons_relics.js`)
1. **4 Əfsanəvi Silah (`weapons`):**
   - `1` (`'sword'`): **Aether Qılıncı** — Balanslı 3-lü kombo, 3-cü vuruş 330° burulğan.
   - `2` (`'daggers'`): **Əkiz Kölgə Xəncərləri** — Çok sürətli vuruş (0.13s cooldown), +25% Krit şansı, hər vuruşda qanaxma/kölgə zəhəri (DOT).
   - `3` (`'hammer'`): **Astral Döyüş Çəkici** — Ağır zərbə (1.8x zərər), geniş şok dalğası (AOE), yüksək knockback və düşmənləri 0.8s dondurma (stun).
   - `4` (`'bow'`): **Simurq Alov Yayı** — Uzaq məsafəyə eyni anda 3 alov oxu (cone spread) atır, mana sərf etmir!
2. **Metodlar:**
   - `init()`
   - `getActiveWeapon()`: Cari silah obyektini qaytarır (`{ id, key, name, icon, damageMult, cooldown, range, spread, color, description }`).
   - `switchWeapon(slotIndexOrId)`: `1..4` və ya `'sword'|'daggers'|'hammer'|'bow'` ilə silahı dəyişir.
   - `getAllWeapons()`: 4 silahın siyahısını qaytarır.
   - `getRelicChoices(count = 3)`: Level-Up zamanı oyunçuya təqdim etmək üçün təsadüfi 3 Relikt kartı qaytarır (`[{ id, name, icon, rarity, color, description, level }]`).
   - `selectRelic(relicId)`: Seçilmiş relikti aktivləşdirir (və ya səviyyəsini artırır).
   - `getActiveRelics()`: Oyunçunun topladığı bütün aktiv reliktləri qaytarır.
   - `updateOrbitals(dt, player, enemies, callbacks)`: Əgər oyunçuda "Alov Halqası" və ya "Qoruyucu Kristal" relikti varsa, oyunçunun ətrafında fırlanan kürələri yeniləyir və toxunan düşmənlərə zərər verir (`callbacks.onHitEnemy(enemy, dmg, 'orbital')`).
   - `applyOnHitEffects(player, targetEnemy, enemies, baseDamage, callbacks)`:
     - Vampir Dişi (can bərpası),
     - İldırım Zənciri (yaxınlıqdakı 3 düşmənə ildırım sıçratma — `callbacks.onChainLightning(fromEnemy, toEnemy, dmg)`),
     - Buzlu Toxunuş (düşməni yavaşlatma `targetEnemy.slowTimer = 2.0`),
     - Kritik Partlayış və s. effektləri tətbiq edir.
   - `applyOnDashEffects(player, enemies, callbacks)`: Dash edəndə arxada alov/kölgə tələsi və ya ildırım qoyur.
   - `getStatModifiers()`: Reliktlərdən gələn bonus çarpanları (`{ damageMult, speedMult, critBonus, maxHpBonus, manaRegenBonus }`) qaytarır.

### II. `window.GameCompanions` (`src/companions_ultimates.js`)
1. **3 Sadiq Yoldaş Ruhu (`companions`):**
   - `'phoenix'` (**Alov Simurqu**): Oyunçunun sol-yuxarısında uçur, hər 1.1 saniyədən bir ən yaxın düşmənə alov mərmisi atır və hər 5 saniyədən bir oyunçunun +8 canını bərpa edir.
   - `'dragon'` (**Astral Bala Əjdaha**): Oyunçunun sağ-yuxarısında uçur, düşmənlərə deşici astral plazma atır və 260px radiusdakı bütün qızıl/kristal/can kürələrini sürətlə oyunçuya doğru çəkir (Loot Magnet).
   - `'wolf'` (**Kölgə Ruh Qurdu**): Yaxınlıqdakı düşmənlərə ildırım sürəti ilə hücum edib zərər verir və onları 35% yavaşladır.
2. **Ultimate: "Aether Qiyaməti" (`[R]` düyməsi):**
   - `rage`: `0`–`100` arası Qəzəb enerjisi (düşmən vurduqca və zərbə aldıqca dolur).
   - `addRage(amount)`: Qəzəb barını artırır.
   - `canCastUltimate()`: `rage >= 100` olduqda `true` qaytarır.
   - `triggerUltimate(player, enemies, callbacks)`: `rage = 0` edir, 3 saniyə ərzində göydən 12 nəhəng qızılı-astral meteor yağdırır (`callbacks.onMeteorImpact(x, y, radius, damage)`).
3. **Metodlar:**
   - `init()`
   - `setActiveCompanion(type)`: `'phoenix' | 'dragon' | 'wolf'` seçir (`getActiveCompanion()`, `cycleCompanion()`).
   - `update(dt, player, enemies, pickups, projectiles, callbacks)`: Yoldaşın hamar uçuş mövqeyini (`x, y, angle, bobOffset`), avto-atəşini, qənimət maqnitini və aktiv Ultimate meteor yağışını yeniləyir.

### III. `window.GameEvents` (`src/events_arena.js`)
1. **Stil Kombo Sayğacı (`combo`):**
   - `registerHit(damage)`: Kombo sayğacını (`count`) artırır, taymeri (`timer = 4.0s`) yeniləyir, dərəcəni (`rank`: `'D' | 'C' | 'B' | 'A' | 'S' | 'SSS'`) və çarpanı (`multiplier`: `1.0` -> `2.5`) hesablayır.
   - `onPlayerDamaged()`: Kombonu yarıya endirir.
   - `getComboState()`: `{ count, rank, color, title, timer, maxTimer, multiplier }` qaytarır.
2. **Mükəmməl Yayınma (`checkPerfectDodge(player, enemies, projectiles)`):**
   - Oyunçu `Dash` basdığı anda `95px` yaxınlıqda hücum edən düşmən və ya düşmən mərmisi varsa `true` qaytarır:
     - `player.perfectDodgeBuff = 3.0` (növbəti vuruş 100% Kritik və 2x zərər!),
     - Oyunçuya +25 Mana və +20 Rage verir!
3. **Dinamik Dünya Hadisələri (`updateWorldEvents(dt, worldState, callbacks)`):**
   - Hər 45–60 saniyədən bir xəritədə təsadüfi hadisə yaradır:
     - **Hadisə 1: "Qızıl Xəzinə Qoblini Peyda Oldu!"** — Qaçan qızılı parıltılı qoblin (`isTreasureGoblin: true`), vurduqca qızıl tökür, öldürdükdə +250 Qızıl, +15 Kristal və Relikt verir!
     - **Hadisə 2: "Qanlı Astral Meteor Sandığı!"** — Xəritəyə düşən xüsusi sandıq və ətrafında elit gözətçilər.
4. **Sonsuz Kolizey Arenası (`isArenaMode`, `startArenaMode(worldState, callbacks)`, `updateArena(dt, worldState, callbacks)`):**
   - Oyunçu Ana Menyudan **"🔥 Sonsuz Kolizey (Endless Arena)"** seçdikdə işə düşür.
   - Hər dalğada (`wave = 1, 2, 3...`) düşmənlər güclənir, hər 3-cü dalğada Boss çıxır, hər dalğa sonunda Relikt seçimi verilir!
