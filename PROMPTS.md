# Prompt Cookbook

Ten-second recipes for the studio. Copy a prompt and run it with `/new-game` in Claude Code (`/game-studio:new-game` when installed as a plugin), or paste it into Codex, Cursor or Antigravity. The studio writes `GAME_SPEC.md`, builds the modules in parallel, playtests the game in Chromium and fixes what it finds. Each recipe also has an Azerbaijani version: prompts work in any language.

---

## 🗡️ 1. Cyberpunk Katana Roguelite (Hades / Dead Cells style)
*Fast-paced neon hack-and-slash with bullet-time dash, style rank combos, and boon drafting.*

#### English prompt
```text
Build a fast-paced Neon Cyberpunk Roguelite action game where I play as a cyber-samurai with a laser katana. Include 360-degree dash with perfect-dodge bullet-time slowdown, a 5-hit combo attack with procedural spark particles, roguelike boon selection cards upon clearing waves (chain lightning, fiery cleave, shadow clone), a DMC-style dynamic combo rank (D -> C -> B -> A -> S -> SSS) with hype voice announcements, and procedural synthwave combat music synthesized via Web Audio API.
```

#### Azerbaijani prompt (Azərbaycanca)
```text
Mənə Hades və Dead Cells üslubunda sürətli Neon Cyberpunk Roguelite döyüş oyunu yarat. Baş qəhrəman lazer katanası olan kiber-samuray olsun. 360 dərəcə yayınma və mükəmməl yayındıqda bullet-time vaxt yavaşlaması, 5 mərhələli qığılcımlı kombo zərbələri, dalğaları təmizləyəndə lütf kartları seçimi (zəncirvari ildırım, alovlu qılınc, kölgə klonu), DMC üslubunda dinamik kombo dərəcələri (D -> C -> B -> A -> S -> SSS) və Web Audio API ilə sıfır mp3 faylsız prosedural synthwave döyüş musiqisi olsun.
```

* **Agents involved:** `game-engine-developer`, `physics-game-feel-engineer`, `weapons-upgrades-designer`, `combo-events-designer`, `audio-designer`, plus `game-architect`, `qa-browser-tester` and `playtest-council` on every build.
* **Key mechanics:** Screen shake, hit-stop, slow-mo dodge, procedural katana trails, roguelike boon picker.

---

## 🦇 2. Vampire Horde 60–120 FPS (Vampire Survivors style, 5,000 enemies)
*Massive mob density, spatial grid object pooling, automatic evolved arsenals.*

#### English prompt
```text
Build an ultra-performant Vampire Survivors-style survival horde game. Features: 5,000+ simultaneous swarming alien enemies rendered smoothly at 60–120 FPS using strict spatial grid object pooling, auto-firing orbiting plasma blades and ricocheting energy shurikens, experience gem magnetism, level-up card drafting with weapon evolution fusions (e.g., Plasma Blade + Magnet = Orbital Death Vortex), a 15-minute countdown clock, phased miniboss encounters with energy shields, and an energetic procedural chiptune synth track.
```

#### Azerbaijani prompt (Azərbaycanca)
```text
Mənə 120 FPS sabitliyi ilə işləyən Vampire Survivors tipli sonsuz dalğalı sağ qalma oyunu yarat. Ekranda eyni anda 5,000+ düşmən canavarı lagsız hərəkət etsin (Object Pooling ilə). Oyunçunun ətrafında fırlanan avtomatik plazma bıçaqları və rikoşet vuran enerji ulduzları, təcrübə kristalları maqniti, hər səviyyə artımında silah birləşmələri və təkamülü (məsələn: Plazma Bıçaq + Maqnit = Ölüm Burulğanı), 15 dəqiqəlik taymer, 5 dəqiqədən bir gələn qalxanlı nəhəng bosslar və prosedural chiptune musiqisi olsun.
```

* **Agents involved:** `performance-optimizer`, `enemy-ai-engineer`, `loot-synergy-designer`, `art-director`, plus `game-architect`, `qa-browser-tester` and `playtest-council` on every build.
* **Key mechanics:** 5,000-entity object pooling, spatial partitioning, weapon synergy picker.

---

## 🍓 3. Gravity-Shift Neon Runner (Celeste / Geometry Dash mechanics)
*Pixel-perfect platforming kinematics, coyote time, and instant gravity flipping.*

#### English prompt
```text
Create an ultra-responsive precision platformer and gravity-runner fusing Celeste kinematics with Geometry Dash rhythm. Controls: tight sub-pixel movement, 8-frame coyote time, 6-frame jump buffering, wall-sliding/wall-jumping, and an instant gravity-reversal flip button on Space. Features: 6 increasingly difficult obstacle zones with rotating neon buzzsaws, laser barriers, disappearing jump pads, death counter, instant 0-millisecond respawn, dynamic screen shake on impact, and ambient procedural lofi synthesizer music.
```

#### Azerbaijani prompt (Azərbaycanca)
```text
Mənə Celeste kinematikası və Geometry Dash ritmini birləşdirən ultra-həssas dəqiq platformer və cazibə qaçış oyunu yarat. İdarəetmə: 8 kadr coyote time, 6 kadr tullanma buferi, divarda sürüşmə və divardan tullanma, Boşluq (Space) düyməsi ilə cazibə qüvvəsini anında tərsinə çevirmək (Gravity Flip). 6 fərqli çətin maneə zonası (fırlanan neon mişarlar, lazerlər, yox olan platformalar), ölüm sayğacı, 0 millisaniyəlik ani dirilmə və prosedural lofi sintezator fon musiqisi olsun.
```

* **Agents involved:** `physics-game-feel-engineer`, `game-engine-developer`, `level-boss-designer`, `audio-designer`, plus `game-architect`, `qa-browser-tester` and `playtest-council` on every build.
* **Key mechanics:** Coyote time, jump buffering, instant gravity flip, zero-delay restart.

---

## ⚔️ 4. Diablo-style Procedural Dungeon Crawler (loot beams and bosses)
*Top-down ARPG, randomized affixes, vertical loot beams, and permanent meta talents.*

#### English prompt
```text
Build a dark-fantasy top-down dungeon crawler RPG. Features: procedural interconnected dungeon rooms with dynamic fog of war, WASD movement and mouse-aim casting with 4 hot-swappable spells (Fireball, Frost Nova, Teleport, Whirlwind), elite champion enemies equipped with randomized procedural affixes (Fiery Mortar, Frozen Aura, Teleporter, Shielded), Diablo-style radiant vertical loot beams for rare and legendary equipment drops, a 3-branch ancient talent tree with persistent save data, and atmospheric dark synthesizer audio.
```

#### Azerbaijani prompt (Azərbaycanca)
```text
Mənə Diablo və Path of Exile üslubunda qaranlıq fentezi top-down Dungeon Crawler RPG oyunu yarat. Xüsusiyyətlər: təsadüfi birləşən zindan otaqları, qaranlıq duman (fog of war), 4 aktiv sehir yuvası (Alov topu, Dondurucu nova, Teleport, Qasırğa), elit çempion düşmənlər (Alovlu, Don vuran, Teleport olan, Qalxanlı), Diablo tipli şaquli parıldayan rəngli qənimət şüaları (Loot Beams), daimi yaddaşlı 3 qollu istedad ağacı (Talent Tree) və qaranlıq prosedural zindan musiqisi olsun.
```

* **Agents involved:** `elite-enemy-designer`, `loot-synergy-designer`, `meta-progression-designer`, `art-director`, plus `game-architect`, `qa-browser-tester` and `playtest-council` on every build.
* **Key mechanics:** Loot beams, champion affixes, a talent tree saved in local storage.

---

## 🏎️ 5. Synthwave 80s Retro Drift Racer (OutRun-style pseudo-3D)
*Pseudo-3D perspective math, high-speed drifting, and 80s FM-synth bassline.*

#### English prompt
```text
Create an 80s OutRun-style pseudo-3D retro arcade highway racer. Features: smooth pseudo-3D road curve mathematics with undulating hills, high-speed sports car with drift physics and tire smoke particles, procedural roadside neon palm trees and cyberpunk skyscrapers, oncoming traffic to overtake with near-miss bonus points, checkpoint countdown timer with overtime bonuses, nitrous speed-lines effect, and a high-energy 80s synthwave FM-bassline generated in real-time via Web Audio API.
```

#### Azerbaijani prompt (Azərbaycanca)
```text
Mənə 80-ci illərin OutRun və Horizon Chase üslubunda pseudo-3D retro magistral yarış oyunu yarat. Xüsusiyyətlər: riyazi əyri yollar və enişli-yoxuşlu təpələr, drift edən idman maşını və təkər tüstüsü zərrəcikləri, yol kənarında prosedural neon palma ağacları və kiberpank göydələnlər, ötüb keçmək üçün digər maşınlar, yaxından keçmə bonus xalları, çempionat yoxlama məntəqəsi (checkpoint) taymeri, azot (nitro) sürət xətləri və Web Audio API ilə canlı sintez olunan dinamik 80s synthwave FM-bas musiqisi olsun.
```

* **Agents involved:** `physics-game-feel-engineer`, `art-director`, `audio-designer`, `game-engine-developer`, plus `game-architect`, `qa-browser-tester` and `playtest-council` on every build.
* **Key mechanics:** Pseudo-3D road maths, drift physics, a procedural retro engine roar.

---

## 🛸 6. Space Fleet Void Defender (Tower Defense + Ballistics)
*Strategic hexagonal grid placement, A* pathfinding, and branching specializations.*

#### English prompt
```text
Build a sci-fi cosmic tower defense game on an interactive glowing grid. Features: creeping waves of alien swarm drones navigating dynamic paths via A* pathfinding, 4 specialized turret classes (Rapid Laser, Cryo Slowdown, Chain Lightning Tesla, Long-range Splash Mortar), branching Tier-3 upgrade specializations for every turret, interactive range circles and hover damage stats, fast-forward 1x/2x/4x controls, phased titan dreadnought boss waves with recharging deflector shields, and sci-fi synth pulses.
```

#### Azerbaijani prompt (Azərbaycanca)
```text
Mənə kosmik tor üzərində qurulan elmi-fantastik Qüllə Müdafiəsi (Tower Defense) oyunu yarat. A* alqoritmi ilə hərəkət edən yadplanetli sürüsü dalğaları, 4 ixtisaslaşmış qüllə növü (Sürətli Lazer, Dondurucu Şüa, Zəncirvari Tesla, Uzaqvuran Minaatan), hər qüllə üçün 3-cü dərəcəli şaxələnən ixtisaslaşma təkmilləşdirməsi, qüllənin atəş radiusu dairəsi, 1x/2x/4x sürətləndirmə düymələri, bərpa olunan güc qalxanına malik nəhəng kosmik gəmi bossları və kosmik ambient sintez səsləri olsun.
```

* **Agents involved:** `enemy-ai-engineer`, `ui-hud-engineer`, `level-boss-designer`, `narrative-balance-designer`, plus `game-architect`, `qa-browser-tester` and `playtest-council` on every build.
* **Key mechanics:** A* pathfinding, interactive grid placement, a DPS balance curve.

---

## Tip
Write prompts in any language (English, Azerbaijani, Turkish, Russian...). Name the mechanics and the feel you want; the architect turns them into a spec, and the playtest council tells you whether the result is fun.
