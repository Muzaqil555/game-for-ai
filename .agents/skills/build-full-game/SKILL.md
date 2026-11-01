---
name: build-full-game
description: >-
  22 agentli studiya komandası ilə sıfır toqquşma (Zero-Conflict) və yüksək keyfiyyətlə
  tam funksional 2D/3D oyun yaratma konveyeri. İstifadəçi "oyun yarat", "oyun düzəlt"
  və ya hər hansı yeni oyun layihəsi istədikdə bu skill-i aktivləşdir.
---

# Tam Komanda İlə Oyun Yaratma Konveyeri (`build-full-game`)

İstifadəçi yeni bir oyun yaratmağı tapşırdıqda, **4-cü Agent (CEO)** olaraq aşağıdakı 6 mərhələli konveyeri **məcburi** icra et.

---

## Mərhələ 0: Skill, MCP, Proqram Seçimi və Master Plan (`tech_stack_architect_planner` — Agent 26)
Hər hansı kod yazılmazdan əvvəl `tech_stack_architect_planner` alt agentini işə sal (və ya `MASTER_PLAN.md` hazırla):
1. **Lazım olan Skill-lər:** Hansı daxili/qlobal skill-lər (`build-full-game`, `chrome-devtools`, `memory-leak-debugging`, `elevenlabs-sound-effects`, `hyperframes`, `cloudflare` və s.) istifadə olunacaq?
2. **Lazım olan MCP Serverlər:** Hansı MCP-lər (`sequential-thinking`, `gemini-api-docs`, `canva`, `elevenlabs-mcp` və s.) qoşulacaq?
3. **Lazım olan Proqramlar və Mühərrik:** HTML5 Canvas 2.5D, Three.js WebGL 3D, Web Audio API, Node.js test mühiti, Python HTTP Server.
4. **Toqquşmasız Paralel İş Bölgüsü Planı (`MASTER_PLAN.md` & `GAME_SPEC.md`):** Hər agentin yazacağı dəqiq fayl və funksiya cədvəli.

---

## Mərhələ 1: Mimari Müqavilə (`GAME_SPEC.md`) — Toqquşmasız Fayl Bölgüsü
Paralel agentlər bir-birinin kodunu əzməməsi üçün əvvəlcə layihə qovluğunda qısa `GAME_SPEC.md` (və ya əsas `index.html` karkası) yarat və qlobal obyekt adlarını (`window.Game.*`) sabitlə:

| Modul Faylı | Məsul Agent (`invoke_subagent`) | Qlobal İnterfeys / Vəzifə |
| :--- | :--- | :--- |
| `src/audio.js` | `audio_designer` (`Model: "flash"`) | `window.GameAudio` — Web Audio API prosedural musiqi və SFX (`playShoot()`, `playHit()`, `playExplosion()`, `playLevelUp()`, `playBoss()`, `toggleMute()`) |
| `src/vfx.js` | `art_director` (`Model: "flash"`) | `window.GameVFX` — Parlaq neon/3D/sprite çəkilişi, partlayış hissəcikləri (particles), izlər (trails), ulduz/fon effektləri, üzən rəqəmlər (floating damage texts) |
| `src/physics_juice.js` | `physics_juice_specialist` (`Model: "flash"`) | `window.GameJuice` — Kamera titrəməsi (`shake()`), hit-stop (`freeze()`), slow-motion, knockback və toqquşma (collision) köməkçiləri |
| `src/levels_bosses.js` | `level_boss_designer` + `game_writer` (`Model: "flash"`) | `window.GameLevels` — Mərhələlər, xəritə maneələri, düşmən növləri, dalğa (wave) generatoru və Boss döyüş fazaları |
| `src/ai_director.js` | `ai_specialist` (`Model: "flash"`) | `window.GameAI` — Ağıllı düşmən hərəkəti (flanking, dodging, targeting) və oyunçunun gücünə görə dinamik çətinlik balansı |
| `src/progression.js` | `monetization_expert` + `backend_specialist` (`Model: "flash"`) | `window.GameProgression` — Qızıl/kristal, Mağaza (Shop upgrades: silah, sürət, qalxan, skinlər), nailiyyətlər (Achievements), gündəlik bonus və `localStorage` yaddaş sistemi |
| `src/engine.js` | `game_developer` (`Model: "flash"`) | `window.GameEngine` — 60+ FPS `requestAnimationFrame` oyun döngüsü, oyunçu idarəetməsi (WASD/Oxlar + Siçan + Mobil Sensor), bütün digər modulların birləşdirilməsi |
| `src/ui.js` & `index.html` | `frontend_specialist` (`Model: "flash"`) | `window.GameUI` — Başlanğıc ekranı, canlı HUD (can, enerji, xal, dalğa, boss barı), Mağaza/Upgrade pəncərəsi, Pauza və Game Over ekranları |

---

## Mərhələ 2: Paralel Yaradılma (Eyni Anda İşə Salma)
Yuxarıdakı mütəxəssis subagentləri **eyni anda (`invoke_subagent` çağırışlarını paralel göndərərək)** işə sal. Hər agentə:
1. Yalnız öz faylına yazmağı,
2. `window.Game*` qlobal interfeys adlarına dəqiq əməl etməyi tapşır.

---

## Mərhələ 3: Birləşdirmə, Təhlükəsizlik, 120 FPS və Canlı Brauzer Yoxlaması
Kodlar yazıldıqdan sonra paralel olaraq:
1. **`security_specialist` (`Model: "inherit"`):** Bütün fayllarda XSS, localStorage korrupsiyası, sonsuz döngü və məntiq boşluqlarını tapıb birbaşa düzəltsin.
2. **`performance_optimizer` (`Model: "flash"`):** Obyekt hovuzu (object pooling), massiv təmizlənməsi və yüksək FPS optimallaşdırmasını tətbiq etsin.
3. **`qa_browser_tester` (`Model: "flash"`):** Oyunu işə salıb heç bir `ReferenceError` / `TypeError` olmadığını və modulların bir-birinə tam bağlandığını təsdiqləsin.

---

## Mərhələ 4: 5 İstifadəçi Sınağı və Avto-Təmir (Quality Gate)
1. 5 istifadəçi agentini (`user_casual`, `user_hardcore_gamer`, `user_ui_critic`, `user_impatient`, `user_explorer`) **eyni anda paralel** işə sal.
2. Onların bəyənmədiyi kritik məqamları və ya tapılan xətaları dərhal **`bug_fixer`** (`Model: "flash"`) vasitəsilə düzəltdir.
3. **`devops_deployer`** (`Model: "flash"`) ilə oyunu lokal serverdə (və ya tələb olunarsa buludda) işlək vəziyyətə gətir.

---

## Mərhələ 5: Qısa CEO Hesabatı
İstifadəçiyə uzun texniki mətnlər deyil, qısa və konkret CEO xülasəsi ver:
- Oyunun adı, janrı və necə açıldığı (link/fayl),
- Hər mütəxəssisin oyuna qatdığı əsas özəllik,
- Təhlükəsizlik və FPS optimallaşdırma nəticəsi,
- 5 istifadəçinin nəyi bəyənib, nəyi bəyənmədiyi (və düzəldilən nöqsanlar).
