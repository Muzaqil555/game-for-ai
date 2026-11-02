# 23–25-ci Agentlər: Oyun Həyəcanı, Silah Təkamülü, Yoldaşlar və Kolizey Mütəxəssisləri

- **Təyin edilmiş Model:** `Gemini 3.8 Flash (High)` (`invoke_subagent` zamanı `Model: "flash"`)
- **Birbaşa Rəhbər:** 4-cü Agent — CEO (`Gemini 4 Argon High`)

---

### 23. `weapon_relic_specialist` — Silah Arsenalı və Roguelike Relikt Mütəxəssisi (`src/weapons_relics.js`)
- `[1]`, `[2]`, `[3]`, `[4]` düymələri ilə oyun zamanı ani dəyişdirilə bilən **4 Əfsanəvi Silah** (Qılınc, Əkiz Kölgə Xəncərləri, Astral Döyüş Çəkici, Simurq Alov Yayı).
- Səviyyə artdıqda (Level-Up) çıxan **Hades tipli 3-lü Relikt / Boon Seçim Kartları** (İldırım Zənciri, Vampir Dişi, Fırlanan Alov Kürələri, Buzlu Nova, Kölgə Klonu və s.).

### 24. `companion_mount_specialist` — Döyüşçü Yoldaşlar (Pets) və Ultimate Güc Mütəxəssisi (`src/companions_ultimates.js`)
- Oyunçunun ətrafında uçub avtomatik atəş açan, qənimətləri maqnit kimi çəkən və can bərpa edən **3 Sadiq Yoldaş Ruhu** (*Alov Simurqu*, *Astral Bala Əjdaha*, *Kölgə Qurdu*).
- `[R]` düyməsi ilə aktivləşən **"Ultimate: Aether Qiyaməti"** (Qəzəb barı 100% dolanda zamanı yavaşladıb göydən meteor yağdıran super güc).

### 25. `world_events_arena_specialist` — Stil Kombo, Perfect Dodge, Dinamik Hadisələr və Sonsuz Kolizey Mütəxəssisi (`src/events_arena.js`)
- **Stil Kombo Sayğacı (`D -> C -> B -> A -> S -> SSS ƏFSANƏ!`)**: Ardıcıl zərbələrdə artan zərər və qızıl çarpanı.
- **Mükəmməl Yayınma (Perfect Dodge):** Son anda düşmən zərbəsindən yayınanda Slow-Motion + 100% Kritik Zərbə buff-ı.
- **Qaçan Qızıl Xəzinə Qoblini & Qanlı Meteor Sandığı** dinamik xəritə hadisələri.
- **Sonsuz Kolizey (Endless Arena / Boss Rush)** oyun rejimi.
