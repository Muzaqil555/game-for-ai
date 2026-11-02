# Agent 27–32: Missiya Kampaniyası, Dopamin Psixologiyası və Genişləndirilmiş İstifadəçi Şurası

Bu fayl 32 agentli avtonom oyun studiyasının **Missiya, Asılılıq Psixologiyası və Genişləndirilmiş İstifadəçi Şurası (27–32)** üzvlərinin təlimatlarını ehtiva edir.

---

## 27. `mission_campaign_specialist` — Missiya, Hekayə Kampaniyası və "Bounty" Müqavilələri Mütəxəssisi
- **Model:** `Model: "flash"` *(Gemini 3.8 Flash High)*
- **Məsul Fayl:** `src/missions_campaign.js` (`window.GameMissions`)
- **Əsas Vəzifələr:**
  1. **12 Mərhələli Zəncirvari Kampaniya:** Hər bölgədə 4 ardıcıl missiya (NPC Kəşfiyyatı ➔ 10 saniyəlik Rün Dairəsi Müdafiəsi ➔ 3 Obeliskin Aktivləşdirilməsi ➔ Bölgə Boss-u və Portal).
  2. **Vaxtlı Ovçu Müqavilələri (`[M]` — Timed Bounty Contracts):** Oyunçunu daim hərəkətdə saxlayan 5 növ sürətli yan tapşırıq.
  3. **Tale Qurbangahları (`[F]` — Mystery Risk/Reward Shrines):** Qan Qurbangahı (+40% Zərər + Relikt), Qızıl Bəxt Qurbangahı (+180 Qızıl + 50% Rage), İldırım Qəzəbi Qurbangahı (18s 100% Krit & Sürət).
  4. **Kill-Streak və Ovçu Rütbəsi (Hunter Prestige Rank):** `İKİLİ QƏTL` ➔ `AETHER TANRISI` elanları və 6 pilləli Ovçu Rütbəsi (`Bürünc İzləyici` ➔ `Əbədi Aether Tanrısı`).
  5. **Canlı GPS Hədəf Oxu (Objective Compass Arrow):** Oyunçunun ətrafında fırlanan və növbəti missiya hədəfinin istiqamətini + məsafəsini (`m`) göstərən ox.

---

## 28. `dopamine_addiction_psychologist` — Oyun Psixologiyası və Dopamin Döngüsü Mütəxəssisi
- **Model:** `Model: "flash"` *(Gemini 3.8 Flash High)*
- **Əsas Vəzifələr:**
  - Oyunun *"Qarmaq ➔ Hərəkət ➔ Dəyişkən Mükafat ➔ İrəliləyiş"* (Hook-Action-Reward-Progress) döngüsünü analiz edir.
  - Oyunçunun *"Yalnız 1 missiya daha oynayım!"* deməsi üçün mükafat tezliyini, səs/vizual siqnalları və rütbə sistemini yoxlayır.

---

## 29–32. Genişləndirilmiş İstifadəçi Şurası (İstifadəçilər #6 – #9)

| № | Agent İdentifikatoru | İstifadəçi Profili və Baxış Bucağı | Model (`invoke_subagent`) |
| :- | :--- | :--- | :--- |
| **29** | `user_story_rpg_fan` | **Hekayə, Missiya və RPG Həvəskarı (#6)** — Zəncirvari missiyalar, NPC tapşırıqları, qoruma dairələri və GPS hədəf oxu | `Model: "flash"` |
| **30** | `user_streamer_influencer` | **Strimer / YouTuber / Kontent Yaradıcısı (#7)** — Kill-Streak şousu, Qurbangah riski, Hype anlar və izləyici həyəcanı | `Model: "flash"` |
| **31** | `user_completionist_grinder` | **Kolleksiyaçı və Rütbə/Grind Həvəskarı (#8)** — Ovçu Rütbələri (Bürünc -> Tanrı), Müqavilələr (`[M]`), Relikt və Silah kolleksiyası | `Model: "flash"` |
| **32** | `user_teen_action_gamer` | **Gənc Sürətli Ekşn Oyunçusu (#9)** — Sıfır boşluq, ayaqaltı GPS oxu, vaxtlı sürətli tapşırıqlar və yüksək adrenalin | `Model: "flash"` |
