# Agentlər 33–36: AETHERIA V4.0 — Dərinlik, Meta-Tərəqqi, Elit Döyüş və Gündəlik Retention Komandası

Bu 4 agent **AETHERIA V4.0** genişlənməsində oyunu bütün 9 oyunçu arxetipi üçün uzunmüddətli, rəngarəng və asılılıq yaradan bir dünyaya çevirən ixtisaslaşmış mühəndislərdir. Hər biri [`.agents/skills/game-plugin-module/SKILL.md`](../skills/game-plugin-module/SKILL.md) sıfır-toqquşma (`window.GamePlugins`) müqaviləsi ilə öz müstəqil moduluna sahibdir.

---

## 33. `loot_synergy_specialist` — Qənimət Şüaları, Nadirlik və Silah-Relikt Evolyusiya Mütəxəssisi
- **Cavabdeh olduğu fayl:** `src/loot_synergy.js` (`window.GameLoot`, plugin `id: 'loot'`)
- **Əsas Sistemlər:**
  - **Diablo-tipli İşıq Sütunları (Loot Beams):** Nadir (Mavi `#38bdf8`), Epik (Bənövşəyi `#c084fc`) və Əfsanəvi (Qızılı/Narıncı `#f59e0b`) qənimət kürələri və səmaya ucalan lazer şüaları.
  - **8 Əfsanəvi Affiks:** `shadow_echo`, `star_fall`, `blood_god`, `time_warp`, `chain_explosion`, `thunder_god`, `blade_dance`, `immortal_will`.
  - **6 Gizli Evolyusiya Sinerjisi:** Silah + Relikt + Yoldaş Ruhu kombinasiyasından doğan *Qiyamət Qasırğası*, *Kölgə Sürüsü*, *Astral İldırım Oxları*, *Mütləq Sıfır Zərbəsi*, *Qanlı Biçin* və *Titan Qəzəbi*.

---

## 34. `meta_progression_specialist` — Qədim İstedad Ağacı və Meta-Tərəqqi Mütəxəssisi
- **Cavabdeh olduğu fayl:** `src/talent_tree.js` (`window.GameTalents`, plugin `id: 'talents'`)
- **Əsas Sistemlər:**
  - **Ruh Daşları (`💠` Soul Stones):** Elitlərdən, Boss-lardan və döyüşlərdən qazanılan, heç vaxt itməyən daimi meta-valyuta.
  - **Qədim İstedad Ağacı (`[T]` Modalı):** 3 budaq (*Döyüş*, *Dözüm*, *Sərvət*) üzrə 12 daimi istedad və pulsuz sıfırlama (*Respec*).
  - **Feniks Ruhu (`phoenix_soul`):** Hər yürüşdə 1 dəfə ölümcül zərbə aldıqda qəhrəmanı alov partlayışı ilə 50% canla dirildən əfsanəvi istedad.

---

## 35. `elite_enemy_specialist` — Elit/Çempion Düşmənlər, Affikslər və Regional Təhlükələr Mütəxəssisi
- **Cavabdeh olduğu fayl:** `src/elite_affixes.js` (`window.GameElites`, plugin `id: 'elites'`)
- **Əsas Sistemlər:**
  - **8 Elit Affiksi:** *Alovlu*, *Buzlu*, *Vampir*, *Qalxanlı*, *Teleport*, *Partlayan*, *Sürətli*, *Çağırışçı*.
  - **Çempion Dəstəsi (Champion Pack):** Hər 70 saniyədən bir peyda olan 3-lü elit düşmən qrupu və yüksək mükafatlar.
  - **3 Regional Təhlükə:** Zümrüd Meşəsində *Zəhərli Göbələk Halqaları*, Kristal Mağaralarında *Buzlu Kristal Şüaları*, Obsidian Qalasında *Lava Çatları və Alov Geyzerləri*.

---

## 36. `onboarding_daily_specialist` — Kontekstual Tutorial (FTUE), Gündəlik Sınaqlar və Seriya Mütəxəssisi
- **Cavabdeh olduğu fayl:** `src/daily_trials.js` (`window.GameDaily`, plugin `id: 'daily_trials'`)
- **Əsas Sistemlər:**
  - **Kontekstual FTUE Tutorialı:** İlk dəfə oynayanlar üçün oyunu dayandırmadan 6 addımlı canlı bələdçi (`WASD` -> `Sol Klik` -> `Space` -> `1-4` -> `GPS Oxu` -> `R Ultimate`, `[H]` ilə keçilə bilən).
  - **Deterministik Gündəlik Sınaqlar (`[J]` Paneli):** Hər gün tarix seed-i ilə seçilən 3 sınaq və 3/3 bitdikdə pulsuz Əntiq Relikt mükafatı.
  - **7 Günlük Giriş Seriyası (Login Streak):** Ardıcıl günlərdə artan Qızıl və Kristal mükafatları.
