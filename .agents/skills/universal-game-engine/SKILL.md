---
name: universal-game-engine
description: Universal autonomous game creation pipeline for any genre (2D Platformer, Top-Down Shooter, Tower Defense, Puzzle, Retro Racing, Roguelite RPG, 3D WebGL). Defines genre matrices, physics rules, procedural assets, procedural Web Audio, and multi-agent coordination.
---

# 🕹️ Universal AI Game Engine & Genre Pipeline

Bu bacarıq (**Skill**) studiyaya **istənilən janrda və istənilən üslubda** brauzer oyunlarını sıfırdan, xarici fayl asılılığı olmadan (Zero-Asset) və 60–120 FPS sabitliklə yaratmaq üçün universal memarlıq və riyazi qaydaları təmin edir.

---

## 🎯 1. Əsas Fəlsəfə və Prinsiplər

1. **Sıfır Xarici Asılılıq (Zero-Dependency):** İnternetdən heç bir `.png`, `.jpg`, `.mp3` və ya ağır kitabxana yüklənmir. Bütün vizuallar HTML5 Canvas/SVG, bütün səslər isə Web Audio API ilə kod səviyyəsində sintez olunur.
2. **60–120 FPS Standartı:** Obyekt hovuzları (Object Pooling), minimum garbage collection və `requestAnimationFrame` delta-time (`dt`) inteqrasiyası.
3. **Mükəmməl "Game Feel" (Juice):** İstənilən janrda ekran sarsıntısı (Screen Shake), zərbə anında mikroskopik dondurma (Hit-Stop), zərrəcik partlayışları (Particles) və dinamik rənglər.
4. **Hər Cihazda İşləmə:** Həm klaviatura/siçan, həm də toxunma (Touch/Mobil virtual joystik) dəstəyi.
5. **Sıfır-Keçmə və Bərk Cisimlər (Zero-Clipping Rigid Body Collisions):** Heç bir fiziki obyekt, düşmən və ya baryer bir-birinin içindən keçə bilməz. Bütün toqquşmalarda MTV (Minimum Translation Vector) ayırması, Nyuton impulsu, çəpər sıçrayışı və təmas nöqtəsindən qığılcım/zibil püskürməsi məcburidir.

---

## 🎮 2. 7 Əsas Janr Matrisi (Genre Matrix)

İstifadəçi bir oyun istədikdə, **`game-architect`** və **CEO (əsas sessiya)** dərhal aşağıdakı 7 şablondan ən uyğun olanını seçir:

### A. 2D Platformer (Mario, Celeste, Hollow Knight üslubu)
* **İdarəetmə:** `A/D` və ya Oxlar (Hərəkət), `Space / W` (Tullanma), `Shift` (Dash / Sürətlənmə).
* **Fizika:**
  * Qravitasiya: `vy += GRAVITY * dt` (`GRAVITY ≈ 1800-2400 px/s²`).
  * Tullanma İmpulsu: `vy = -JUMP_FORCE` (`JUMP_FORCE ≈ 650-800 px/s`).
  * **Coyote Time (0.1s):** Platformanın kənarından düşdükdən sonra 100ms ərzində tullanma şansı saxlanılır.
  * **Jump Buffering (0.1s):** Yerə enməzdən 100ms əvvəl tullanma düyməsi basılarsa, yerə dəyən an avtomatik tullanır.
  * Divardan Sürüşmə və Divardan Tullanma (Wall Slide / Wall Jump).
* **Məqsəd:** Maneələrdən keçmək, qızıl/ulduz toplamaq, bayrağa/qapıya çatmaq.

### B. Top-Down / Kosmik Atıcı (Vampire Survivors, Galaga, Asteroids)
* **İdarəetmə:** `WASD` (Hərəkət), Siçan Kursoru (360° Nişanalma), Sol Klik və ya Avtomatik Atəş.
* **Fizika:**
  * Bucaq: `const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x)`.
  * Mərmi sürəti: `vx = Math.cos(angle) * SPEED; vy = Math.sin(angle) * SPEED`.
  * Düşmən axını (Swarm / Wave Spawner) və toqquşma dairələri (`dist < r1 + r2`).
* **Məqsəd:** Düşmən dalğalarını məhv etmək, silahları upgrade etmək, vaxt bitənədək sağ qalmaq.

### C. Qüllə Müdafiəsi & Strategiya (Tower Defense / RTS)
* **İdarəetmə:** Siçan Kliki (Qüllə tikmək, upgrade etmək, qabiliyyət seçmək).
* **Fizika və Məntiq:**
  * Şəbəkə Sistemi (Grid Matrix: məsələn, 20x12 xanalar).
  * **A* (A-Star) və ya Yol Xətti (Waypoints):** Düşmənlərin bazaya doğru hərəkəti.
  * Qüllə Baxışı və Atəşi: Dairəvi radius daxilindəki ilk düşməni hədəf alıb atəş açmaq.
  * İqtisadiyyat: Qızıl qazanmaq, qüllələrin səviyyəsini artırmaq.
* **Məqsəd:** Baza canını 0-a düşməkdən qorumaq, 20-50 dalğanı dəf etmək.

### D. Puzzle / Məntiq / Qrid (Tetris, Match-3, 2048)
* **İdarəetmə:** Oxlar / WASD (Fiqurları fırlatmaq və ya sürüşdürmək).
* **Məntiq:**
  * İkiölçülü Matris Yoxlanışı (`grid[row][col]`).
  * Xətlərin tamamlanması və ya 3 eyni rəngin yan-yana gəlməsi alqoritmi.
  * Kombo sayğacı və kaskad partlayışlar.
* **Məqsəd:** Sahənin dolmasının qarşısını almaq, maksimum rekord xal (High Score) toplamaq.

### E. Retro Yarış və Sürət (Outrun, Micro Machines)
* **İdarəetmə:** `A/D` (Sükan / Dönmə), `W` (Qaz / Akselerasiya), `S` (Əyləc).
* **Fizika:**
  * Sürət və Sürtünmə: `speed = clamp(speed + accel * dt - friction * dt, 0, maxSpeed)`.
  * Psevdo-3D yol perspektivi və ya 2D yuxarıdan baxışlı maşın drifti (`driftFactor`).
  * Yoldakı maneələr, benzin/turbo çənləri və rəqib maşınlar.
* **Məqsəd:** Vaxt bitmədən finiş xəttini keçmək və ya 3 dövrə vurmaq.

### F. Zindan Kəşfiyyatı & Roguelike RPG (Hades, Binding of Isaac)
* **İdarəetmə:** `WASD` + Hücum + Xüsusi Güc + Dash.
* **Məntiq:**
  * Otaqdan-otağa keçid, təsadüfi qənimətlər, reliktlər, bacarıq ağacı.
  * Boss döyüşləri və faza dəyişmələri.
* **Məqsəd:** Zindanın son mərtəbəsinə çatıb qaranlıq hakimi devirmək.

### G. 3D WebGL (Three.js Minimalist)
* **Kitabxana:** CDN üzərindən tək Three.js script-i (`https://unpkg.com/three@0.160.0/build/three.min.js`).
* **Məntiq:**
  * 3D Səhnə (`Scene`), Perspektiv Kamera (`PerspectiveCamera`), İşıqlandırma (`DirectionalLight` + `AmbientLight`).
  * Sadə həndəsi fiqurlardan ibarət parlaq stilizə olunmuş 3D modellər (`BoxGeometry`, `SphereGeometry`, `CylinderGeometry`).
* **Məqsəd:** 3D dünyada qaçış, tullanma və ya kosmik uçuş.

---

## 🎨 3. Prosedural Qrafika Standartı (Procedural Asset Forge)

Heç bir xarici şəkil olmadan Canvas 2D API ilə hər şeyi çəkmək:

```javascript
// Universal Personaj Çəkmə Nümunəsi (Gözlər, Bədən və Parıltı)
function drawCharacter(ctx, x, y, radius, color, glowColor, facingAngle) {
  ctx.save();
  ctx.translate(x, y);
  
  // 1. Qızılı / Neon Parıltı Aurası
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 15;
  ctx.fillStyle = color;
  
  // 2. Əsas Bədən
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // 3. Baxış Bucaq İndikatoru və Gözlər
  ctx.rotate(facingAngle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(radius * 0.45, -radius * 0.3, radius * 0.22, 0, Math.PI * 2);
  ctx.arc(radius * 0.45, radius * 0.3, radius * 0.22, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}
```

---

## 🔊 4. Prosedural Universal Səs Sintezatoru (Web Audio API)

Hər janr üçün sıfır faylla səs effektləri:

```javascript
const AudioForge = {
  ctx: null,
  init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  },
  
  // Platformer Tullanma Səsi (Pitch up sweep)
  jump() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.start(); osc.stop(this.ctx.currentTime + 0.16);
  },

  // Kosmik Lazer Səsi (Pitch down laser)
  laser() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    osc.start(); osc.stop(this.ctx.currentTime + 0.13);
  },

  // Partlayış Gurultusu (Noise Buffer + Lowpass Filter)
  explosion() {
    this.init();
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.4);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    noise.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
    noise.start(); noise.stop(this.ctx.currentTime + 0.4);
  }
};
```

---

## ⚡ 5. Avtonom İstehsalat Konveyeri (İş Bölgüsü)

İstifadəçi hər hansı bir oyun istədikdə, CEO aşağıdakı paralel axını başladır:

1. **Mərhələ 1 (Plan & Arxitektura):**
   * **`game-architect`**: Janrı müəyyən edir, oyun mexanikalarını və qələbə şərtini yazır.
2. **Mərhələ 2 (Paralel Kodlaşdırma):**
   * **`game-engine-developer`**: Əsas Game Loop və Oyunçu idarəetməsini qurur.
   * **`physics-game-feel-engineer`**: Janra uyğun qravitasiya, toqquşma və ekran sarsıntısını yazır.
   * **`art-director`**: Canvas procedural qrafikalarını və rəng palitrasını çəkir.
   * **`audio-designer`**: Janra uyğun Web Audio SFX və fon ritmini qurur.
   * **`ui-hud-engineer`**: Xal sayğacı, Can barı və Menyu pəncərələrini hazırlayır.
3. **Mərhələ 3 (Təhlükəsizlik və 120 FPS):**
   * **`security-auditor`** və **`performance-optimizer`**: Kodu analiz edir, xətaları aradan qaldırır.
4. **Mərhələ 4 (9-Persona İstifadəçi Testi):**
   * `playtest-council` (9 persona) oyunu sınaqdan keçirir, rəy bildirir, **`bug-fixer`** düzəlişləri edir.
5. **Mərhələ 5 (Təhvil):**
   * CEO tam hazır, brauzerdə dərhal açılan oyunu təqdim edir!
