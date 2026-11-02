/**
 * AETHERIA: KÖLGƏLƏRİN SƏLTƏNƏTİ
 * Modul: window.GameLevels (src/levels_bosses.js)
 * Məsul Agent: 21 - Xəritə, Mərhələ və Boss Mütəxəssisi (level_boss_designer)
 * 
 * Bu modul oyunun 3 əsas macəra bölgəsini, zəngin hekayəli NPC-ləri,
 * tapşırıqları (quests), rün obelisklərini, xəzinə sandıqlarını, maneələri,
 * düşmən növlərini və 3 çoxmərhələli epik Boss döyüşünü təmin edir.
 */

(function () {
  'use strict';

  let enemyIdCounter = 0;
  function getUniqueId(prefix) {
    return (prefix || 'ent') + '_' + (++enemyIdCounter) + '_' + Math.random().toString(36).substr(2, 5);
  }

  // ---------------------------------------------------------------------------
  // 1. MACƏRA BÖLGƏLƏRİNİN ŞABLON MƏLUMATLARI (REGIONS)
  // ---------------------------------------------------------------------------

  const REGION_TEMPLATES = [
    // ==========================================
    // BÖLGƏ 0: ZÜMRÜD QƏDİM MEŞƏSİ (FOREST)
    // ==========================================
    {
      id: 'forest',
      name: 'Zümrüd Qədim Meşəsi',
      theme: 'forest',
      width: 2600,
      height: 2600,
      lore: 'Əzəli meşənin nəhəng zümrüd tacları altında qədim rün daşları mürgüləyir. Qaranlıq meşə varlıqlarını dəli edib.',
      ambientColor: 'rgba(16, 37, 23, 0.4)',
      groundColor: '#122316',
      gridColor: '#1b3823',
      particleType: 'leaves_and_fireflies',
      playerSpawn: { x: 320, y: 1300 },
      portal: {
        x: 2360,
        y: 1300,
        radius: 48,
        active: false,
        name: 'Kristal Mağaralara Keçid Portalı',
        targetRegion: 1,
        color: '#2ecc71',
        auraColor: '#1abc9c',
        description: 'Sylvanos məğlub edildikdən sonra parıldayan ulduz keçidi.'
      },
      npcs: [
        {
          id: 'npc_orion',
          name: 'Qoca Müdrik Orion',
          title: 'Qədim Meşənin Gözətçisi',
          x: 440,
          y: 1240,
          radius: 28,
          color: '#27ae60',
          auraColor: 'rgba(46, 204, 113, 0.4)',
          dialogues: [
            "Xoş gəldin, gənc qəhrəman! Səltənət qaranlığa qərq olarkən meşəmizin müqəddəs rünləri susdu...",
            "Bu meşənin dərinliklərində 3 qədim Zümrüd Rün Obeliski yerləşir. Onları qoruyan kölgələri dəf et və rünləri oyat!",
            "Ehtiyatlı ol: Meşənin əzəli hamisi Sylvanos qaranlıq cadunun təsirilə qəzəblənib. Onu xilas etməyin tək yolu zəiflətməkdir.",
            "Qılıncını hazırla, rünləri alovlandır və Sylvanosun qəzəbinə qalib gələrək növbəti aləmə keçid aç!"
          ]
        }
      ],
      obelisks: [
        {
          id: 'obelisk_forest_1',
          name: 'Həyat Rünü Obeliski',
          x: 950,
          y: 750,
          radius: 36,
          activated: false,
          activationRadius: 65,
          color: '#2ecc71',
          auraColor: 'rgba(46, 204, 113, 0.5)',
          lore: 'Təbiətin və bitkilərin ilkin canlılıq enerjisini daşıyır.'
        },
        {
          id: 'obelisk_forest_2',
          name: 'Külək Rünü Obeliski',
          x: 1800,
          y: 820,
          radius: 36,
          activated: false,
          activationRadius: 65,
          color: '#1abc9c',
          auraColor: 'rgba(26, 188, 156, 0.5)',
          lore: 'Qədim fırtınaların və sürət küləklərinin cərəyanı.'
        },
        {
          id: 'obelisk_forest_3',
          name: 'Torpaq Rünü Obeliski',
          x: 1300,
          y: 1950,
          radius: 36,
          activated: false,
          activationRadius: 65,
          color: '#27ae60',
          auraColor: 'rgba(39, 174, 96, 0.5)',
          lore: 'Meşənin daxili təməlini saxlayan sarsılmaz daş qaynaq.'
        }
      ],
      chests: [
        { id: 'chest_f_1', x: 620, y: 680, radius: 24, opened: false, gold: 55, crystals: 6, color: '#f39c12' },
        { id: 'chest_f_2', x: 1480, y: 460, radius: 24, opened: false, gold: 75, crystals: 8, color: '#f39c12' },
        { id: 'chest_f_3', x: 820, y: 2050, radius: 24, opened: false, gold: 65, crystals: 7, color: '#f39c12' },
        { id: 'chest_f_4', x: 2050, y: 1950, radius: 24, opened: false, gold: 110, crystals: 12, color: '#f1c40f' },
        { id: 'chest_f_5', x: 1750, y: 1350, radius: 24, opened: false, gold: 85, crystals: 10, color: '#f39c12' }
      ],
      quests: [
        {
          id: 'q_forest_obelisks',
          title: 'Qədim Rünlərin Oyanışı',
          description: 'Zümrüd meşəsindəki 3 müqəddəs rün obeliskini tap və aktivləşdir.',
          type: 'obelisks',
          target: 3,
          progress: 0,
          completed: false,
          rewardExp: 180,
          rewardGold: 80,
          rewardCrystals: 5
        },
        {
          id: 'q_forest_kills',
          title: 'Meşənin Təmizlənməsi',
          description: 'Qaranlığa bulaşmış 12 meşə qoblin və canavarını məhv et.',
          type: 'kill',
          target: 12,
          progress: 0,
          completed: false,
          rewardExp: 220,
          rewardGold: 110,
          rewardCrystals: 6
        },
        {
          id: 'q_forest_boss',
          title: 'Qədim Nəhəngin Azadlığı',
          description: 'Sylvanos, Qədim Meşə Nəhəngini məğlub et və kristal aləminə yolu aç!',
          type: 'boss',
          target: 1,
          progress: 0,
          completed: false,
          rewardExp: 550,
          rewardGold: 300,
          rewardCrystals: 25
        }
      ],
      bossSpawn: { x: 2150, y: 1300 },
      initialEnemiesConfig: [
        { type: 'goblin', x: 720, y: 1100 },
        { type: 'goblin', x: 780, y: 1350 },
        { type: 'archer', x: 920, y: 950 },
        { type: 'goblin', x: 1150, y: 700 },
        { type: 'golem', x: 1000, y: 800 },
        { type: 'archer', x: 1350, y: 1150 },
        { type: 'goblin', x: 1450, y: 1600 },
        { type: 'archer', x: 1720, y: 920 },
        { type: 'golem', x: 1850, y: 880 },
        { type: 'goblin', x: 1250, y: 1850 },
        { type: 'golem', x: 1380, y: 2050 },
        { type: 'archer', x: 1650, y: 1850 },
        { type: 'goblin', x: 1980, y: 1350 },
        { type: 'archer', x: 2020, y: 1220 }
      ],
      wavesConfig: [
        { waveNumber: 1, name: 'Qoblin Cığır Kəşfiyyatçıları', enemies: [{ type: 'goblin', count: 4 }, { type: 'archer', count: 2 }], delay: 2 },
        { waveNumber: 2, name: 'Meşə Daş Golemlərinin İrəliləyişi', enemies: [{ type: 'golem', count: 2 }, { type: 'goblin', count: 3 }, { type: 'archer', count: 3 }], delay: 18 },
        { waveNumber: 3, name: 'Sylvanosun Qəzəbli Mühafizəçiləri', enemies: [{ type: 'golem', count: 3 }, { type: 'archer', count: 4 }, { type: 'goblin', count: 5 }], delay: 24 }
      ]
    },

    // ==========================================
    // BÖLGƏ 1: ASTRAL KRİSTAL MAĞARALARI (CAVERN)
    // ==========================================
    {
      id: 'cavern',
      name: 'Astral Kristal Mağaraları',
      theme: 'cavern',
      width: 2800,
      height: 2800,
      lore: 'Yeraltı kvars qayalıqlar kosmik rezonansla parıldayır. Kristal Arxontu Kryos cazibə qanunlarını pozub.',
      ambientColor: 'rgba(18, 14, 38, 0.45)',
      groundColor: '#0f1026',
      gridColor: '#1d2250',
      particleType: 'crystal_sparks_and_dust',
      playerSpawn: { x: 350, y: 1400 },
      portal: {
        x: 2550,
        y: 1400,
        radius: 48,
        active: false,
        name: 'Obsidian Qalaya Keçid Portalı',
        targetRegion: 2,
        color: '#00d2d3',
        auraColor: '#54a0ff',
        description: 'Kryosun rezonansı qırıldıqdan sonra açılan qara qranit qapısı.'
      },
      npcs: [
        {
          id: 'npc_lyra',
          name: 'Ulduz Mühafizəçisi Lyra',
          title: 'Astral Cərəyanın Keşikçisi',
          x: 520,
          y: 1340,
          radius: 28,
          color: '#00d2d3',
          auraColor: 'rgba(0, 210, 211, 0.4)',
          dialogues: [
            "Salam, cəsur səyyah... Bura Astral Mağaralardır. Hər kristal kosmik yaddaşın əks-sədasını pıçıldayır.",
            "Kristal Arxontu Kryos bu mağaranın cazibə mərkəzini qəsb edib və özünə sarsılmaz kristal zireh yaradıb.",
            "Onun toxunulmazlığını yalnız 3 Astral Obeliskin kosmik tezliyini bərpa etməklə qıra bilərsən!",
            "Kölgə ruhlarına (wraith) və uzaqdan parıldayan kristal oxatanlara diqqət yetir. Mağaranın nəbzi səninlə olsun!"
          ]
        }
      ],
      obelisks: [
        {
          id: 'obelisk_cavern_1',
          name: 'Astral Şəfəq Obeliski',
          x: 1100,
          y: 820,
          radius: 36,
          activated: false,
          activationRadius: 65,
          color: '#9b59b6',
          auraColor: 'rgba(155, 89, 182, 0.55)',
          lore: 'Astral spektrin ən təmiz bənövşəyi şüasını saxlayır.'
        },
        {
          id: 'obelisk_cavern_2',
          name: 'Zaman Rezonansı Obeliski',
          x: 1900,
          y: 780,
          radius: 36,
          activated: false,
          activationRadius: 65,
          color: '#3498db',
          auraColor: 'rgba(52, 152, 219, 0.55)',
          lore: 'Zamanın və kosmik axının rezonans titrəyişlərini tarazlayır.'
        },
        {
          id: 'obelisk_cavern_3',
          name: 'Mavi Alov Obeliski',
          x: 1450,
          y: 2150,
          radius: 36,
          activated: false,
          activationRadius: 65,
          color: '#00cec9',
          auraColor: 'rgba(0, 206, 201, 0.55)',
          lore: 'Dondurucu mavi kristal plazmasını püskürdən enerji mənbəyi.'
        }
      ],
      chests: [
        { id: 'chest_c_1', x: 720, y: 880, radius: 24, opened: false, gold: 95, crystals: 12, color: '#9b59b6' },
        { id: 'chest_c_2', x: 1650, y: 420, radius: 24, opened: false, gold: 125, crystals: 16, color: '#3498db' },
        { id: 'chest_c_3', x: 980, y: 2240, radius: 24, opened: false, gold: 115, crystals: 14, color: '#00cec9' },
        { id: 'chest_c_4', x: 2250, y: 2050, radius: 24, opened: false, gold: 160, crystals: 22, color: '#f1c40f' },
        { id: 'chest_c_5', x: 2100, y: 1220, radius: 24, opened: false, gold: 135, crystals: 18, color: '#9b59b6' }
      ],
      quests: [
        {
          id: 'q_cavern_obelisks',
          title: 'Astral Şəbəkənin Bərpası',
          description: '3 Astral Rün Obeliskini aktivləşdirərək kosmik rezonansı bərpa et.',
          type: 'obelisks',
          target: 3,
          progress: 0,
          completed: false,
          rewardExp: 320,
          rewardGold: 160,
          rewardCrystals: 12
        },
        {
          id: 'q_cavern_kills',
          title: 'Kristal Qəlpələrinin Qırılması',
          description: 'Astral mağaranın dərinliklərindəki 15 qaranlıq varlığı məhv et.',
          type: 'kill',
          target: 15,
          progress: 0,
          completed: false,
          rewardExp: 380,
          rewardGold: 200,
          rewardCrystals: 15
        },
        {
          id: 'q_cavern_boss',
          title: 'Kristal Arxontunun Süqutu',
          description: 'Kryos, Kristal Arxontunu parçala və Obsidian Qalaya yol aç!',
          type: 'boss',
          target: 1,
          progress: 0,
          completed: false,
          rewardExp: 800,
          rewardGold: 450,
          rewardCrystals: 40
        }
      ],
      bossSpawn: { x: 2320, y: 1400 },
      initialEnemiesConfig: [
        { type: 'archer', x: 750, y: 1150 },
        { type: 'wraith', x: 860, y: 1450 },
        { type: 'golem', x: 1050, y: 880 },
        { type: 'archer', x: 1180, y: 780 },
        { type: 'wraith', x: 1350, y: 1100 },
        { type: 'archer', x: 1500, y: 1600 },
        { type: 'wraith', x: 1850, y: 820 },
        { type: 'golem', x: 1950, y: 740 },
        { type: 'wraith', x: 1400, y: 2050 },
        { type: 'golem', x: 1520, y: 2200 },
        { type: 'archer', x: 1750, y: 1950 },
        { type: 'wraith', x: 2050, y: 1500 },
        { type: 'archer', x: 2150, y: 1300 },
        { type: 'golem', x: 2250, y: 1480 }
      ],
      wavesConfig: [
        { waveNumber: 1, name: 'Kristal Keşikçiləri və Oxatanlar', enemies: [{ type: 'archer', count: 4 }, { type: 'wraith', count: 2 }], delay: 2 },
        { waveNumber: 2, name: 'Rezonans Kabusları Dalğası', enemies: [{ type: 'wraith', count: 4 }, { type: 'golem', count: 2 }, { type: 'archer', count: 2 }], delay: 20 },
        { waveNumber: 3, name: 'Kryosun Astral Qvardiyası', enemies: [{ type: 'golem', count: 3 }, { type: 'wraith', count: 5 }, { type: 'archer', count: 3 }], delay: 26 }
      ]
    },

    // ==========================================
    // BÖLGƏ 2: OBSİDİAN KÖLGƏLƏR QALASI (CITADEL)
    // ==========================================
    {
      id: 'citadel',
      name: 'Obsidian Kölgələr Qalası',
      theme: 'citadel',
      width: 3000,
      height: 3000,
      lore: 'Qara vulkanik qranit və qan qırmızı rünlər imperator Malakorun taxtını qoruyur. Səltənətin son döyüş meydanı.',
      ambientColor: 'rgba(28, 8, 14, 0.5)',
      groundColor: '#170b0e',
      gridColor: '#361219',
      particleType: 'ash_and_crimson_embers',
      playerSpawn: { x: 380, y: 1500 },
      portal: {
        x: 2750,
        y: 1500,
        radius: 52,
        active: false,
        name: 'Aetherianın Əbədi Zəfər Qapısı',
        targetRegion: 0,
        isEndGame: true,
        color: '#e74c3c',
        auraColor: '#ffd700',
        description: 'Malakor məğlub edildikdən sonra bütün dünyaya sülh gətirən möhtəşəm Zəfər Qapısı.'
      },
      npcs: [
        {
          id: 'npc_vael',
          name: 'Sürgün Edilmiş Komandir Vael',
          title: 'Qırmızı Mühafizənin Son Qəhrəmanı',
          x: 580,
          y: 1430,
          radius: 28,
          color: '#e74c3c',
          auraColor: 'rgba(231, 76, 60, 0.45)',
          dialogues: [
            "Nəhayət gəlib çatdın, cəsur cəngavər! Bura Malakorun lənətlənmiş Obsidian Qalasıdır.",
            "Mən bir vaxtlar onun ordularına qarşı vuruşdum, lakin kölgə cadusu bütün döyüşçülərimi qara cəngavərlərə çevirdi.",
            "Qalanın 3 Qara Əbədiyyət Obeliskini alovlandır. Onlar parçalanmadan Malakorun ölümsüzlük aurası yıxılmaz!",
            "İmperatorun 3 mərhələli dəhşətli qəzəbinə hazır ol! Səltənətin və bütün insanların gələcəyi sənin qılıncından asılıdır!"
          ]
        }
      ],
      obelisks: [
        {
          id: 'obelisk_citadel_1',
          name: 'Qan Tacı Obeliski',
          x: 1250,
          y: 880,
          radius: 36,
          activated: false,
          activationRadius: 65,
          color: '#e74c3c',
          auraColor: 'rgba(231, 76, 60, 0.6)',
          lore: 'İmperiyanın qədim qan paktını və güc andını simvolizə edir.'
        },
        {
          id: 'obelisk_citadel_2',
          name: 'Kölgə Əbədiyyəti Obeliski',
          x: 2050,
          y: 840,
          radius: 36,
          activated: false,
          activationRadius: 65,
          color: '#8e44ad',
          auraColor: 'rgba(142, 68, 173, 0.6)',
          lore: 'Zülmətin ruhları həbs edən tükənməz qara monolit qaynağı.'
        },
        {
          id: 'obelisk_citadel_3',
          name: 'Alovlu Dağıntı Obeliski',
          x: 1550,
          y: 2280,
          radius: 36,
          activated: false,
          activationRadius: 65,
          color: '#d35400',
          auraColor: 'rgba(211, 84, 0, 0.6)',
          lore: 'Obsidian vulkanın ən dərin lavalarını idarə edən qədim sütun.'
        }
      ],
      chests: [
        { id: 'chest_k_1', x: 820, y: 920, radius: 24, opened: false, gold: 160, crystals: 22, color: '#c0392b' },
        { id: 'chest_k_2', x: 1750, y: 460, radius: 24, opened: false, gold: 210, crystals: 28, color: '#8e44ad' },
        { id: 'chest_k_3', x: 1100, y: 2320, radius: 24, opened: false, gold: 190, crystals: 24, color: '#d35400' },
        { id: 'chest_k_4', x: 2420, y: 2200, radius: 24, opened: false, gold: 270, crystals: 38, color: '#f1c40f' },
        { id: 'chest_k_5', x: 2250, y: 1120, radius: 24, opened: false, gold: 240, crystals: 32, color: '#e74c3c' },
        { id: 'chest_k_6', x: 2820, y: 1500, radius: 26, opened: false, gold: 450, crystals: 60, color: '#f39c12', isRare: true }
      ],
      quests: [
        {
          id: 'q_citadel_obelisks',
          title: 'Ölümsüzlük Zəncirinin Qırılması',
          description: 'Qalanın 3 Qara Əbədiyyət Obeliskini fəth edib imperatorun qalxanını zəiflət.',
          type: 'obelisks',
          target: 3,
          progress: 0,
          completed: false,
          rewardExp: 550,
          rewardGold: 320,
          rewardCrystals: 20
        },
        {
          id: 'q_citadel_kills',
          title: 'İmperatorun Qara Qvardiyası',
          description: 'Obsidian qalasında keşik çəkən 20 elit cəngavər və kölgə varlığını məhv et.',
          type: 'kill',
          target: 20,
          progress: 0,
          completed: false,
          rewardExp: 650,
          rewardGold: 450,
          rewardCrystals: 25
        },
        {
          id: 'q_citadel_boss',
          title: 'Aetherianın Xilası',
          description: 'Malakor, Kölgələr İmperatorunu devir və səltənəti əbədi qaranlıqdan qurtar!',
          type: 'boss',
          target: 1,
          progress: 0,
          completed: false,
          rewardExp: 1800,
          rewardGold: 1200,
          rewardCrystals: 100
        }
      ],
      bossSpawn: { x: 2480, y: 1500 },
      initialEnemiesConfig: [
        { type: 'knight', x: 800, y: 1350 },
        { type: 'wraith', x: 880, y: 1650 },
        { type: 'knight', x: 1150, y: 920 },
        { type: 'golem', x: 1300, y: 840 },
        { type: 'wraith', x: 1450, y: 1200 },
        { type: 'knight', x: 1600, y: 1650 },
        { type: 'knight', x: 1980, y: 880 },
        { type: 'golem', x: 2120, y: 800 },
        { type: 'wraith', x: 1500, y: 2200 },
        { type: 'golem', x: 1620, y: 2350 },
        { type: 'knight', x: 1850, y: 2100 },
        { type: 'wraith', x: 2150, y: 1600 },
        { type: 'knight', x: 2280, y: 1400 },
        { type: 'golem', x: 2380, y: 1580 }
      ],
      wavesConfig: [
        { waveNumber: 1, name: 'Kölgə Cəngavərlərinin Hücumu', enemies: [{ type: 'knight', count: 3 }, { type: 'wraith', count: 3 }], delay: 2 },
        { waveNumber: 2, name: 'Obsidian Qala Nəhəngləri', enemies: [{ type: 'golem', count: 3 }, { type: 'knight', count: 4 }, { type: 'wraith', count: 3 }], delay: 22 },
        { waveNumber: 3, name: 'İmperatorun Son Qanlı Qvardiyası', enemies: [{ type: 'knight', count: 5 }, { type: 'wraith', count: 5 }, { type: 'golem', count: 3 }], delay: 28 }
      ]
    }
  ];

  // ---------------------------------------------------------------------------
  // 2. MANEƏLƏR VƏ XƏRİTƏ GENERASİYASI (OBSTACLES)
  // ---------------------------------------------------------------------------

  /**
   * Bölgəyə xas, oyunçu doğulma zonası və interaktiv obyektlərlə toqquşmayan
   * zəngin və strateji maneələr (ağaclar, sütunlar, kristallar, xarabalıqlar) yaradır.
   */
  function generateRegionObstacles(regionData) {
    const obstacles = [];
    const width = regionData.width;
    const height = regionData.height;
    const spawn = regionData.playerSpawn;
    const bossSpawn = regionData.bossSpawn;
    const portal = regionData.portal;

    // Təhlükəsiz zonalar (Maneə qoyulmayacaq mərkəzlər)
    const safeZones = [
      { x: spawn.x, y: spawn.y, radius: 220 }, // Oyunçu spawn sahəsi tam sərbəst olmalıdır!
      { x: portal.x, y: portal.y, radius: 160 }, // Portal qarşısı
      { x: bossSpawn.x, y: bossSpawn.y, radius: 240 } // Boss döyüş arenası mərkəzi
    ];

    // NPC-lərin ətrafı
    regionData.npcs.forEach(npc => {
      safeZones.push({ x: npc.x, y: npc.y, radius: 140 });
    });

    // Obelisklərin ətrafı
    regionData.obelisks.forEach(ob => {
      safeZones.push({ x: ob.x, y: ob.y, radius: 130 });
    });

    // Sandıqların ətrafı
    regionData.chests.forEach(ch => {
      safeZones.push({ x: ch.x, y: ch.y, radius: 90 });
    });

    function isInsideSafeZone(x, y, radius) {
      for (let i = 0; i < safeZones.length; i++) {
        const zone = safeZones[i];
        const dist = Math.hypot(x - zone.x, y - zone.y);
        if (dist < zone.radius + radius) {
          return true;
        }
      }
      return false;
    }

    function tryAddObstacle(obs) {
      if (isInsideSafeZone(obs.x, obs.y, obs.radius)) return false;
      // Digər maneələrlə həddindən artıq üst-üstə düşməsin
      for (let i = 0; i < obstacles.length; i++) {
        const other = obstacles[i];
        const d = Math.hypot(obs.x - other.x, obs.y - other.y);
        if (d < (obs.radius + other.radius) * 0.85) {
          return false;
        }
      }
      obstacles.push(obs);
      return true;
    }

    // A. Xəritənin kənar sərhədləri boyu qoruyucu maneə hasarı (Sərhəddən 70px içəridə)
    const margin = 80;
    const step = 95;
    const borderObsType = regionData.id === 'forest' ? 'tree' : (regionData.id === 'cavern' ? 'crystal' : 'pillar');
    const borderColor = regionData.id === 'forest' ? '#143d22' : (regionData.id === 'cavern' ? '#30336b' : '#2c1417');

    for (let x = margin; x < width - margin; x += step) {
      tryAddObstacle({ x: x, y: margin, radius: 36, type: borderObsType, color: borderColor, hp: 9999 });
      tryAddObstacle({ x: x, y: height - margin, radius: 36, type: borderObsType, color: borderColor, hp: 9999 });
    }
    for (let y = margin + step; y < height - margin - step; y += step) {
      tryAddObstacle({ x: margin, y: y, radius: 36, type: borderObsType, color: borderColor, hp: 9999 });
      tryAddObstacle({ x: width - margin, y: y, radius: 36, type: borderObsType, color: borderColor, hp: 9999 });
    }

    // B. Xəritə növünə uyğun daxili tematik maneələr
    if (regionData.id === 'forest') {
      // Meşə: Qədim ağaclar, mamırlı daş sütunlar və meşə qalıqları
      const forestProps = [
        // Şimal-Qərb meşə klasterləri
        { x: 750, y: 500, radius: 42, type: 'tree', color: '#1b4d2e' },
        { x: 820, y: 530, radius: 38, type: 'tree', color: '#153e24' },
        { x: 670, y: 550, radius: 40, type: 'tree', color: '#19492b' },
        { x: 500, y: 850, radius: 45, type: 'tree', color: '#1b4d2e' },
        { x: 560, y: 920, radius: 36, type: 'tree', color: '#153e24' },

        // Mərkəzi qədim xarabalıq sütunları
        { x: 1200, y: 1100, radius: 32, type: 'pillar', color: '#4a6254' },
        { x: 1200, y: 1450, radius: 32, type: 'pillar', color: '#4a6254' },
        { x: 1500, y: 1100, radius: 32, type: 'pillar', color: '#4a6254' },
        { x: 1500, y: 1450, radius: 32, type: 'pillar', color: '#4a6254' },
        { x: 1350, y: 950, radius: 35, type: 'ruin', color: '#3d5246' },
        { x: 1350, y: 1600, radius: 35, type: 'ruin', color: '#3d5246' },

        // Cənub-Qərb bataqlıq ağacları
        { x: 650, y: 1750, radius: 40, type: 'tree', color: '#173f27' },
        { x: 720, y: 1820, radius: 44, type: 'tree', color: '#1e5231' },
        { x: 1050, y: 2250, radius: 42, type: 'tree', color: '#19492b' },
        { x: 1150, y: 2320, radius: 38, type: 'tree', color: '#153e24' },

        // Şərq cığırının kənarları və Boss arenası ətrafı sütunları
        { x: 1850, y: 1100, radius: 38, type: 'tree', color: '#1b4d2e' },
        { x: 1850, y: 1500, radius: 38, type: 'tree', color: '#1b4d2e' },
        { x: 2350, y: 1050, radius: 34, type: 'pillar', color: '#2d4638' },
        { x: 2450, y: 1120, radius: 34, type: 'pillar', color: '#2d4638' },
        { x: 2350, y: 1550, radius: 34, type: 'pillar', color: '#2d4638' },
        { x: 2450, y: 1480, radius: 34, type: 'pillar', color: '#2d4638' }
      ];
      forestProps.forEach(p => tryAddObstacle(p));

      // Təsadüfi səpələnmiş kiçik ağac və kötük qrupları
      let seed = 42;
      for (let i = 0; i < 45; i++) {
        seed = (seed * 9301 + 49297) % 233280;
        const rx = 400 + (seed / 233280) * (width - 800);
        seed = (seed * 9301 + 49297) % 233280;
        const ry = 400 + (seed / 233280) * (height - 800);
        seed = (seed * 9301 + 49297) % 233280;
        const rRad = 28 + (seed / 233280) * 16;
        tryAddObstacle({
          x: Math.round(rx),
          y: Math.round(ry),
          radius: Math.round(rRad),
          type: (i % 5 === 0) ? 'ruin' : 'tree',
          color: (i % 5 === 0) ? '#384d40' : '#174428'
        });
      }
    } else if (regionData.id === 'cavern') {
      // Astral Mağaralar: Kvars sütunlar, bənövşəyi/mavi kristallar, nəhəng kanyon qayaları
      const cavernProps = [
        // Giriş zalı kristal sütunları
        { x: 750, y: 1050, radius: 38, type: 'crystal', color: '#4834d4' },
        { x: 750, y: 1750, radius: 38, type: 'crystal', color: '#686de0' },
        { x: 950, y: 1400, radius: 44, type: 'pillar', color: '#2c2c54' },

        // Mərkəzi kristal labirint formasiyaları
        { x: 1350, y: 900, radius: 46, type: 'crystal', color: '#be2edd' },
        { x: 1450, y: 960, radius: 40, type: 'crystal', color: '#e056fd' },
        { x: 1350, y: 1850, radius: 46, type: 'crystal', color: '#be2edd' },
        { x: 1450, y: 1780, radius: 40, type: 'crystal', color: '#e056fd' },
        { x: 1600, y: 1350, radius: 48, type: 'pillar', color: '#130f40' },
        { x: 1600, y: 1450, radius: 48, type: 'pillar', color: '#130f40' },

        // Şərq taxt zalı kristal mühafizəçiləri
        { x: 2150, y: 1100, radius: 42, type: 'crystal', color: '#22a6b3' },
        { x: 2150, y: 1700, radius: 42, type: 'crystal', color: '#22a6b3' },
        { x: 2500, y: 1150, radius: 36, type: 'pillar', color: '#192a56' },
        { x: 2500, y: 1650, radius: 36, type: 'pillar', color: '#192a56' }
      ];
      cavernProps.forEach(p => tryAddObstacle(p));

      let seed = 137;
      for (let i = 0; i < 55; i++) {
        seed = (seed * 9301 + 49297) % 233280;
        const rx = 400 + (seed / 233280) * (width - 800);
        seed = (seed * 9301 + 49297) % 233280;
        const ry = 400 + (seed / 233280) * (height - 800);
        seed = (seed * 9301 + 49297) % 233280;
        const rRad = 26 + (seed / 233280) * 18;
        const isCryst = (i % 2 === 0);
        tryAddObstacle({
          x: Math.round(rx),
          y: Math.round(ry),
          radius: Math.round(rRad),
          type: isCryst ? 'crystal' : 'pillar',
          color: isCryst ? (i % 4 === 0 ? '#00d2d3' : '#a29bfe') : '#2d3436'
        });
      }
    } else if (regionData.id === 'citadel') {
      // Obsidian Qalası: Nəhəng qara qranit sütunlar, qala divar qalıqları və imperator monolitləri
      const citadelProps = [
        // Böyük giriş tağı sütunları
        { x: 800, y: 1150, radius: 40, type: 'pillar', color: '#2d141e' },
        { x: 800, y: 1850, radius: 40, type: 'pillar', color: '#2d141e' },
        { x: 1000, y: 1500, radius: 48, type: 'ruin', color: '#3d1620' },

        // Şərəf koridoru monolitləri
        { x: 1400, y: 1150, radius: 44, type: 'pillar', color: '#1f0d14' },
        { x: 1400, y: 1850, radius: 44, type: 'pillar', color: '#1f0d14' },
        { x: 1750, y: 1150, radius: 44, type: 'pillar', color: '#1f0d14' },
        { x: 1750, y: 1850, radius: 44, type: 'pillar', color: '#1f0d14' },

        // Malakorun taxt zalı obsidian sütunları
        { x: 2250, y: 1200, radius: 45, type: 'pillar', color: '#110508' },
        { x: 2250, y: 1800, radius: 45, type: 'pillar', color: '#110508' },
        { x: 2680, y: 1200, radius: 42, type: 'pillar', color: '#2d141e' },
        { x: 2680, y: 1800, radius: 42, type: 'pillar', color: '#2d141e' }
      ];
      citadelProps.forEach(p => tryAddObstacle(p));

      let seed = 251;
      for (let i = 0; i < 60; i++) {
        seed = (seed * 9301 + 49297) % 233280;
        const rx = 400 + (seed / 233280) * (width - 800);
        seed = (seed * 9301 + 49297) % 233280;
        const ry = 400 + (seed / 233280) * (height - 800);
        seed = (seed * 9301 + 49297) % 233280;
        const rRad = 28 + (seed / 233280) * 20;
        const pType = (i % 3 === 0) ? 'ruin' : (i % 3 === 1 ? 'pillar' : 'crystal');
        tryAddObstacle({
          x: Math.round(rx),
          y: Math.round(ry),
          radius: Math.round(rRad),
          type: pType,
          color: pType === 'crystal' ? '#8e44ad' : '#1e0c12'
        });
      }
    }

    return obstacles;
  }

  // ---------------------------------------------------------------------------
  // 3. DÜŞMƏN YARADILMASI (CREATE ENEMY)
  // ---------------------------------------------------------------------------

  /**
   * Tələb olunan xassələrlə tam düşmən obyekti yaradır:
   * 'goblin' | 'archer' | 'golem' | 'wraith' | 'knight'
   */
  function createEnemy(type, x, y, regionIndex) {
    const rIdx = Math.max(0, Math.min(2, regionIndex || 0));
    const statScale = 1.0 + (rIdx * 0.45); // Mərhələyə görə can və ziyan artımı

    let config = {
      type: type || 'goblin',
      name: 'Meşə Qoblini',
      radius: 18,
      hp: Math.round(65 * statScale),
      speed: 130 + (rIdx * 10),
      damage: Math.round(12 * statScale),
      attackRange: 32,
      attackCooldown: 1.1,
      color: '#27ae60',
      auraColor: 'rgba(39, 174, 96, 0.3)',
      expValue: Math.round(20 * (1 + rIdx * 0.5)),
      goldValue: Math.round(6 * (1 + rIdx * 0.6))
    };

    switch (type) {
      case 'goblin':
        config.name = rIdx === 0 ? 'Meşə Qoblini' : (rIdx === 1 ? 'Kristal Qazıcısı' : 'Qara Qoblin');
        config.radius = 18;
        config.hp = Math.round(65 * statScale);
        config.speed = 135;
        config.damage = Math.round(12 * statScale);
        config.attackRange = 34;
        config.attackCooldown = 1.0;
        config.color = rIdx === 0 ? '#27ae60' : (rIdx === 1 ? '#1abc9c' : '#c0392b');
        config.expValue = Math.round(20 * statScale);
        config.goldValue = Math.round(7 * statScale);
        break;

      case 'archer':
        config.name = rIdx === 0 ? 'Meşə Oxatanı' : (rIdx === 1 ? 'Kristal Nişançısı' : 'Kölgə Oxatanı');
        config.radius = 17;
        config.hp = Math.round(50 * statScale);
        config.speed = 110;
        config.damage = Math.round(15 * statScale);
        config.attackRange = 340; // Uzaq məsafədən ox atır
        config.attackCooldown = 1.9;
        config.color = rIdx === 0 ? '#e67e22' : (rIdx === 1 ? '#3498db' : '#e74c3c');
        config.expValue = Math.round(28 * statScale);
        config.goldValue = Math.round(10 * statScale);
        config.isRanged = true;
        config.projectileSpeed = 300;
        config.projectileColor = config.color;
        break;

      case 'golem':
        config.name = rIdx === 0 ? 'Qədim Daş Golem' : (rIdx === 1 ? 'Kvars Kristal Golemi' : 'Obsidian Qala Nəhəngi');
        config.radius = 32;
        config.hp = Math.round(220 * statScale);
        config.speed = 70;
        config.damage = Math.round(28 * statScale);
        config.attackRange = 52;
        config.attackCooldown = 2.0;
        config.color = rIdx === 0 ? '#7f8c8d' : (rIdx === 1 ? '#0984e3' : '#8e44ad');
        config.expValue = Math.round(60 * statScale);
        config.goldValue = Math.round(22 * statScale);
        config.isTank = true;
        config.slamRadius = 75;
        break;

      case 'wraith':
        config.name = rIdx === 0 ? 'Meşə Kabusu' : (rIdx === 1 ? 'Astral Ruh' : 'Qara Kölgə Kabusu');
        config.radius = 21;
        config.hp = Math.round(110 * statScale);
        config.speed = 125;
        config.damage = Math.round(24 * statScale);
        config.attackRange = 45;
        config.attackCooldown = 1.3;
        config.color = rIdx === 0 ? '#16a085' : (rIdx === 1 ? '#9b59b6' : '#d63031');
        config.expValue = Math.round(50 * statScale);
        config.goldValue = Math.round(18 * statScale);
        config.canPhase = true; // Divarların yanından yumşaq süzülmə
        break;

      case 'knight':
        config.name = rIdx === 0 ? 'Meşə Cəngavəri' : (rIdx === 1 ? 'Kristal Paladini' : 'Obsidian Qara Cəngavər');
        config.radius = 25;
        config.hp = Math.round(280 * statScale);
        config.speed = 100;
        config.damage = Math.round(34 * statScale);
        config.attackRange = 48;
        config.attackCooldown = 1.4;
        config.color = rIdx === 0 ? '#2c3e50' : (rIdx === 1 ? '#6c5ce7' : '#2d141e');
        config.expValue = Math.round(85 * statScale);
        config.goldValue = Math.round(35 * statScale);
        config.hasShield = true;
        config.blockChance = 0.25;
        break;
    }

    return {
      id: getUniqueId(type),
      type: type,
      name: config.name,
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      radius: config.radius,
      hp: config.hp,
      maxHp: config.hp,
      speed: config.speed,
      baseSpeed: config.speed,
      damage: config.damage,
      attackRange: config.attackRange,
      attackCooldown: config.attackCooldown,
      attackTimer: Math.random() * 0.8, // Hücumların eyni anda olmaması üçün təsadüfi ofset
      color: config.color,
      auraColor: config.auraColor || config.color,
      expValue: config.expValue,
      goldValue: config.goldValue,
      regionIndex: rIdx,
      state: 'idle', // 'idle' | 'chase' | 'attack' | 'hit'
      facingAngle: 0,
      hitTimer: 0,
      isRanged: !!config.isRanged,
      isTank: !!config.isTank,
      canPhase: !!config.canPhase,
      hasShield: !!config.hasShield,
      blockChance: config.blockChance || 0,
      projectileSpeed: config.projectileSpeed || 280,
      projectileColor: config.projectileColor || '#ffffff',
      slamRadius: config.slamRadius || 0
    };
  }

  // ---------------------------------------------------------------------------
  // 4. ÇOXMƏRHƏLƏLİ BOSS YARADILMASI (CREATE BOSS)
  // ---------------------------------------------------------------------------

  /**
   * 3 Çoxmərhələli (Phase 1, 2, 3) unikal Boss obyekti qaytarır.
   * Region 0: Sylvanos, Qədim Meşə Nəhəngi
   * Region 1: Kryos, Kristal Arxontu
   * Region 2: Malakor, Kölgələr İmperatoru
   */
  function createBoss(regionIndex, x, y) {
    const rIdx = Math.max(0, Math.min(2, regionIndex || 0));

    let boss = {
      id: '',
      isBoss: true,
      name: '',
      title: '',
      regionIndex: rIdx,
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      radius: 48,
      hp: 1800,
      maxHp: 1800,
      phase: 1,
      maxPhases: 3,
      speed: 85,
      baseSpeed: 85,
      damage: 32,
      color: '#2ecc71',
      auraColor: 'rgba(46, 204, 113, 0.4)',
      attackTimer: 2.0,
      specialTimer: 5.0,
      state: 'idle', // 'idle' | 'chase' | 'attack' | 'special' | 'phase_transition' | 'enrage'
      facingAngle: 0,
      hitTimer: 0,
      isInvulnerable: false,
      invulnTimer: 0,
      expReward: 600,
      goldReward: 350,
      crystalsReward: 25,
      phasesConfig: {},
      dialogueOnSpawn: '',
      dialogueOnPhase2: '',
      dialogueOnPhase3: '',
      dialogueOnDeath: ''
    };

    if (rIdx === 0) {
      // ==========================================
      // BOSS 1: SYLVANOS, QƏDİM MEŞƏ NƏHƏNGİ
      // ==========================================
      boss.id = 'boss_sylvanos';
      boss.name = 'Sylvanos';
      boss.title = 'Qədim Meşə Nəhəngi';
      boss.radius = 48;
      boss.hp = 1800;
      boss.maxHp = 1800;
      boss.speed = 85;
      boss.baseSpeed = 85;
      boss.damage = 32;
      boss.color = '#2ecc71';
      boss.auraColor = 'rgba(46, 204, 113, 0.45)';
      boss.expReward = 600;
      boss.goldReward = 350;
      boss.crystalsReward = 25;
      boss.dialogueOnSpawn = "Sylvanos: Meşənin sükutunu kim pozmağa cürət edir?! Köklər səni udacaq!";
      boss.dialogueOnPhase2 = "Sylvanos: Təbiətin qəzəbi oyanır! Qədim tikanlar, parçalayın onu!";
      boss.dialogueOnPhase3 = "Sylvanos: Mən meşənin əzəli ruhuyam! Bu torpaqlar mənimlə nəfəs alır!";
      boss.dialogueOnDeath = "Sylvanos: Qaranlıq cadu... nəhayət dağıldı... Meşə artıq azaddır...";

      boss.phasesConfig = {
        1: {
          name: 'Meşənin Qəzəbi',
          speed: 85,
          damage: 32,
          attackCooldown: 1.8,
          specialCooldown: 6.0,
          abilities: ['rootSpikes', 'leafNova'],
          color: '#2ecc71',
          auraColor: 'rgba(46, 204, 113, 0.45)'
        },
        2: {
          name: 'Qədim Zərbə Dalğası',
          speed: 105,
          damage: 42,
          attackCooldown: 1.5,
          specialCooldown: 4.8,
          abilities: ['rootSpikes', 'leafNova', 'earthSlam'],
          color: '#e67e22',
          auraColor: 'rgba(230, 126, 34, 0.55)'
        },
        3: {
          name: 'Təbiətin Dəli Fırtınası (Enraged)',
          speed: 125,
          damage: 54,
          attackCooldown: 1.2,
          specialCooldown: 3.5,
          abilities: ['rootSpikes', 'leafNova', 'earthSlam', 'summonBrambles'],
          color: '#d63031',
          auraColor: 'rgba(214, 48, 49, 0.7)'
        }
      };
    } else if (rIdx === 1) {
      // ==========================================
      // BOSS 2: KRYOS, KRİSTAL ARXONTU
      // ==========================================
      boss.id = 'boss_kryos';
      boss.name = 'Kryos';
      boss.title = 'Kristal Arxontu';
      boss.radius = 52;
      boss.hp = 3000;
      boss.maxHp = 3000;
      boss.speed = 95;
      boss.baseSpeed = 95;
      boss.damage = 46;
      boss.color = '#00d2d3';
      boss.auraColor = 'rgba(0, 210, 211, 0.5)';
      boss.expReward = 950;
      boss.goldReward = 550;
      boss.crystalsReward = 45;
      boss.dialogueOnSpawn = "Kryos: Sənin astral bədənin kristal qəlpələrimə tab gətirə bilməz!";
      boss.dialogueOnPhase2 = "Kryos: Kosmik şüa rezonansı aktivləşir! Parçalanın toz zərrələrinə!";
      boss.dialogueOnPhase3 = "Kryos: Bütün mağara mənim iradəmlə titrəyir! Mütləq Donma!";
      boss.dialogueOnDeath = "Kryos: Rezonans... parçalandı... Taxtın açarı sənindir...";

      boss.phasesConfig = {
        1: {
          name: 'Kristal Qəlpələri',
          speed: 95,
          damage: 46,
          attackCooldown: 1.6,
          specialCooldown: 5.5,
          abilities: ['crystalBarrage', 'astralPulse'],
          color: '#00d2d3',
          auraColor: 'rgba(0, 210, 211, 0.5)'
        },
        2: {
          name: 'Rezonans Lazer Şüası',
          speed: 115,
          damage: 58,
          attackCooldown: 1.3,
          specialCooldown: 4.2,
          abilities: ['crystalBarrage', 'astralPulse', 'crystalBeam'],
          color: '#9b59b6',
          auraColor: 'rgba(155, 89, 182, 0.65)'
        },
        3: {
          name: 'Astral Qəzəb və Zindan (Enraged)',
          speed: 138,
          damage: 72,
          attackCooldown: 1.0,
          specialCooldown: 3.2,
          abilities: ['crystalBarrage', 'crystalBeam', 'crystalPrison', 'summonAstralSparks'],
          color: '#e056fd',
          auraColor: 'rgba(224, 86, 253, 0.75)'
        }
      };
    } else {
      // ==========================================
      // BOSS 3: MALAKOR, KÖLGƏLƏR İMPERATORU (FINAL BOSS)
      // ==========================================
      boss.id = 'boss_malakor';
      boss.name = 'Malakor';
      boss.title = 'Kölgələr İmperatoru';
      boss.radius = 58;
      boss.hp = 4800;
      boss.maxHp = 4800;
      boss.speed = 105;
      boss.baseSpeed = 105;
      boss.damage = 65;
      boss.color = '#8e44ad';
      boss.auraColor = 'rgba(142, 68, 173, 0.6)';
      boss.expReward = 2000;
      boss.goldReward = 1500;
      boss.crystalsReward = 120;
      boss.dialogueOnSpawn = "Malakor: Mənim taxt-tacımın qarşısında diz çökməyə cürət etdin?! Aetheria mənim kölgəmdir!";
      boss.dialogueOnPhase2 = "Malakor: Cəhənnəm qapıları açılsın! Kölgələr, onun ruhunu parçalayın!";
      boss.dialogueOnPhase3 = "Malakor: MƏN KÖLGƏNİN ÖZÜYƏM! HEÇ KƏS ƏBƏDİYYƏTİN QARŞISINDA SAĞ QALA BİLMƏZ!";
      boss.dialogueOnDeath = "Malakor: Bu qeyri-mümkündür... Qaranlıq... nurun qarşısında necə sına bilər... Ahhh!";

      boss.phasesConfig = {
        1: {
          name: 'İmperatorun Kölgə Sıçrayışı',
          speed: 105,
          damage: 65,
          attackCooldown: 1.5,
          specialCooldown: 5.0,
          abilities: ['shadowDash', 'voidNova'],
          color: '#8e44ad',
          auraColor: 'rgba(142, 68, 173, 0.6)'
        },
        2: {
          name: 'Qan və Zülmət Fırtınası',
          speed: 130,
          damage: 82,
          attackCooldown: 1.2,
          specialCooldown: 3.8,
          abilities: ['shadowDash', 'voidNova', 'infernalRain', 'summonWraiths'],
          color: '#c0392b',
          auraColor: 'rgba(192, 57, 43, 0.75)'
        },
        3: {
          name: 'Əbədi Qara Dəlik (Final Apocalyptic Phase)',
          speed: 155,
          damage: 105,
          attackCooldown: 0.9,
          specialCooldown: 2.8,
          abilities: ['shadowDash', 'voidNova', 'infernalRain', 'blackHole', 'summonEliteKnights'],
          color: '#2c003e',
          auraColor: 'rgba(255, 0, 85, 0.9)'
        }
      };
    }

    return boss;
  }

  // ---------------------------------------------------------------------------
  // 5. BÖLGƏNİ YÜKLƏMƏ VƏ DƏRİN KOPYALAMA (LOAD REGION)
  // ---------------------------------------------------------------------------

  /**
   * Seçilmiş bölgə indeksinə görə təmizlənmiş, dərin kopyalanmış tam bölgə
   * obyektini qaytarır.
   * Maneələr, obelisklər, sandıqlar, NPC-lər, başlanğıc düşmənləri, tapşırıqlar və portal.
   */
  function loadRegion(regionIndex) {
    const rIdx = Math.max(0, Math.min(REGION_TEMPLATES.length - 1, regionIndex || 0));
    const tmpl = REGION_TEMPLATES[rIdx];

    // Dərin kopya (JSON vasitəsilə təmiz obyekt nüsxəsi)
    const cloned = JSON.parse(JSON.stringify(tmpl));

    // Dinamik və xəritəyə uyğun maneələr yaradılır (PlayerSpawn və s. üzərinə düşməməsi zəmanətlidir)
    cloned.obstacles = generateRegionObstacles(cloned);

    // Başlanğıc düşmənlərinin (initialEnemies) tam xassəli obyektlər kimi yaradılması
    cloned.enemies = [];
    if (cloned.initialEnemiesConfig && Array.isArray(cloned.initialEnemiesConfig)) {
      cloned.initialEnemiesConfig.forEach(cfg => {
        cloned.enemies.push(createEnemy(cfg.type, cfg.x, cfg.y, rIdx));
      });
    }

    // Dalğalar və Spawner vəziyyəti
    cloned.waves = {
      currentWaveIndex: 0,
      totalWaves: cloned.wavesConfig.length,
      waveTimer: 0,
      isWaveActive: false,
      isBossSpawned: false,
      configs: cloned.wavesConfig
    };

    // Bölgəyə birbaşa Boss çağırma metodu bağlanır
    cloned.createBoss = function (x, y) {
      const bx = (typeof x === 'number') ? x : cloned.bossSpawn.x;
      const by = (typeof y === 'number') ? y : cloned.bossSpawn.y;
      return createBoss(rIdx, bx, by);
    };

    return cloned;
  }

  // ---------------------------------------------------------------------------
  // 6. QLOBAL MODULUN İXRAC EDİLMƏSİ (WINDOW.GAMELEVELS)
  // ---------------------------------------------------------------------------

  const GameLevels = {
    // 3 bölgənin xülasə məlumatları
    regions: [
      { id: 'forest', name: 'Zümrüd Qədim Meşəsi', theme: 'forest', width: 2600, height: 2600 },
      { id: 'cavern', name: 'Astral Kristal Mağaraları', theme: 'cavern', width: 2800, height: 2800 },
      { id: 'citadel', name: 'Obsidian Kölgələr Qalası', theme: 'citadel', width: 3000, height: 3000 }
    ],

    // Əsas metodlar (Exact contract from GAME_SPEC.md)
    loadRegion: loadRegion,
    createEnemy: createEnemy,
    createBoss: createBoss,

    // Köməkçi metodlar
    getRegionTemplate: function (index) {
      return REGION_TEMPLATES[index] || REGION_TEMPLATES[0];
    },
    getRegionCount: function () {
      return REGION_TEMPLATES.length;
    }
  };

  if (typeof window !== 'undefined') {
    window.GameLevels = GameLevels;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameLevels;
  }

})();
