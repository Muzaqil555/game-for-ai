---
name: threejs-webgl-game-engine
description: Ultra-Realistic 3D WebGL Game Engine using Three.js, PBR Shaders, UnrealBloomPass, Dynamic Shadows, and Rigid Body Physics. MANDATORY for all 3D/Action games to eliminate flat/artificial 2D canvas visuals.
---

# 🌐 Three.js WebGL 3D Ultra-Realist Oyun Mühərriki Standartı

> ### 💎 🔥 DAİMİ VƏ QƏTİ QANUN: Sıfır-Süni & Maksimum Realizm Mandatı
> **İstifadəçi "süni" və ya "zəif" deməsə belə, bütün 37 agent bu standartı AVTOMATİK tətbiq edir:**
> * ❌ **İbtidai 2D Xətlər Qadağandır:** Sadə Canvas 2D cızma-qaraları, primitiv düzbucaqlılar və uydurma 1980-ci illər raster xətləri QƏTİ QADAĞANDIR (istifadəçi xüsusilə retro 8-bit istəmədikdə).
> * ✅ **Həqiqi Üçölçülü Məkan (Three.js WebGL):** Hər bir oyun həqiqi 3D səhnə, 3D mesh modelləri, PBR materialları, real kölgələr və Unreal Engine tipli Bloom parıltısı ilə qurulmalıdır!
> * ✅ **Realist İşıqlandırma & Atmosfer:** ACESFilmic tonemapping, Soft Shadow Maps, nöqtəvi neon işıqları və duman (fog).

---

## 🚀 1. CDN və Kitabxana Arxitekturası (Zero-Install, Dərhal İcra)

Bütün brauzerlərdə və mobil cihazlarda sıfır xəta ilə işləmək üçün rəsmi yüksək sürətli CDN-lər:

```html
<!-- Three.js Core (r128) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<!-- Post-Processing: UnrealBloomPass & EffectComposer -->
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js"></script>
```

---

## 🎨 2. Standart WebGL Render & Bloom Setup

```javascript
// 1. Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);

// 2. Səhnə və Kamera
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x060212, 0.0035);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1500);
camera.position.set(0, 5, -12);

// 3. Unreal Bloom Post-Processing
const composer = new THREE.EffectComposer(renderer);
composer.addPass(new THREE.RenderPass(scene, camera));

const bloomPass = new THREE.UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,  // Bloom gücü (Glow Intensity)
  0.4,  // Radius
  0.82  // Eşik (Threshold)
);
composer.addPass(bloomPass);
```

---

## 🏎️ 3. PBR Həqiqi 3D Avtomobil Həndəsəsi

```javascript
// Avtomobil Gövdəsi (PBR Metalik Lak)
const carBodyMat = new THREE.MeshStandardMaterial({
  color: 0x00f5ff,
  metalness: 0.85,
  roughness: 0.18,
  envMapIntensity: 1.2
});

const carGroup = new THREE.Group();

// Şassi
const chassisGeo = new THREE.BoxGeometry(2.1, 0.65, 4.6);
const chassis = new THREE.Mesh(chassisGeo, carBodyMat);
chassis.castShadow = true;
chassis.receiveShadow = true;
carGroup.add(chassis);

// Təkərlər (Fırlanan 4 ədəd 3D silindr)
const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 24);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
const wheels = [];

const wheelPositions = [
  [-1.15, -0.25, 1.4],  // Ön Sol
  [ 1.15, -0.25, 1.4],  // Ön Sağ
  [-1.15, -0.25, -1.4], // Arxa Sol
  [ 1.15, -0.25, -1.4]  // Arxa Sağ
];

wheelPositions.forEach(pos => {
  const wheel = new THREE.Mesh(wheelGeo, wheelMat);
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(...pos);
  wheel.castShadow = true;
  carGroup.add(wheel);
  wheels.push(wheel);
});

scene.add(carGroup);
```

---

## 🎥 4. Kinematoqrafik Təqib Kamerası & FOV Punch

```javascript
function updateCamera(playerCar, dt, isNitro, cameraShake) {
  // Avtomobilin arxasında yumşaq təqib (Lerp)
  const targetCamPos = playerCar.position.clone()
    .add(new THREE.Vector3(0, 3.8, -9.5));

  camera.position.lerp(targetCamPos, 0.14);
  camera.lookAt(playerCar.position.clone().add(new THREE.Vector3(0, 1.2, 5)));

  // Nitro zamanı FOV genişlənməsi (Warp effekti)
  const targetFOV = isNitro ? 85 : 65;
  camera.fov += (targetFOV - camera.fov) * 0.1;
  camera.updateProjectionMatrix();

  // Zərbə silkələnməsi
  if (cameraShake > 0) {
    camera.position.x += (Math.random() - 0.5) * cameraShake;
    camera.position.y += (Math.random() - 0.5) * cameraShake;
  }
}
```

---

## 🛑 6. Sıfır-Keçmə (Anti-Clipping) və Bərk Cisimlər (Rigid Body Solid Collision) Qaydası

Heç bir 3D mesh digər bir obyektin (digər maşınlar, divarlar, baryerlər) içindən keçə bilməz! Bütün toqquşmalar dəqiq fiziki qanunlarla idarə olunur:

```javascript
// 1. Minimum Translation Vector (MTV) ilə Həndəsi Ayırma (Zero-Clipping)
function resolveSolidVehicleCollision(carA, carB, massA, massB) {
  const dx = carA.position.x - carB.position.x;
  const dz = carA.position.z - carB.position.z;
  
  const halfW = (carA.boxHalfW + carB.boxHalfW);
  const halfL = (carA.boxHalfL + carB.boxHalfL);
  
  const penX = halfW - Math.abs(dx);
  const penZ = halfL - Math.abs(dz);
  
  if (penX > 0 && penZ > 0) {
    // Toqquşma baş verib: ən kiçik nüfuz oxu üzrə aralama (MTV)
    const totalMass = massA + massB;
    const ratioA = massB / totalMass;
    const ratioB = massA / totalMass;
    
    if (penX < penZ) {
      const signX = Math.sign(dx) || 1;
      carA.position.x += signX * penX * ratioA;
      carB.position.x -= signX * penX * ratioB;
      
      // Lateral Nyuton impulsu və elastik sıçrayış
      const relVx = carA.vx - carB.vx;
      const impulse = relVx * 0.45;
      carA.vx -= impulse * ratioA;
      carB.vx += impulse * ratioB;
    } else {
      const signZ = Math.sign(dz) || 1;
      carA.position.z += signZ * penZ * ratioA;
      carB.position.z -= signZ * penZ * ratioB;
      
      // Boyuna sürət ötürülməsi
      const relVz = carA.vz - carB.vz;
      const impulse = relVz * 0.5;
      carA.vz -= impulse * ratioA;
      carB.vz += impulse * ratioB;
    }
    
    // Təmas nöqtəsində dinamik 3D metal qığılcım yağışı
    emit3DSparks((carA.position.x + carB.position.x) * 0.5, 0.4, (carA.position.z + carB.position.z) * 0.5, 25);
    return true;
  }
  return false;
}

// 2. Polad Guardrail / Baryer Toxunması (Hard Bounce & Spark Shower)
function resolveGuardrailCollision(playerCar, barrierX, restitution = 0.5) {
  const carHalfW = 1.05;
  if (playerCar.position.x + carHalfW >= barrierX) {
    playerCar.position.x = barrierX - carHalfW;
    playerCar.velocityLat = -Math.abs(playerCar.velocityLat) * restitution;
    playerCar.velocityLong *= 0.94; // Sürtünmə itkisi
    emit3DSparks(barrierX, 0.45, playerCar.position.z, 20);
    playMetalScrapeSound();
  } else if (playerCar.position.x - carHalfW <= -barrierX) {
    playerCar.position.x = -barrierX + carHalfW;
    playerCar.velocityLat = Math.abs(playerCar.velocityLat) * restitution;
    playerCar.velocityLong *= 0.94;
    emit3DSparks(-barrierX, 0.45, playerCar.position.z, 20);
    playMetalScrapeSound();
  }
}
```

---

## 🌟 5. Bütün 37 Agent Üçün Tətbiq Qaydası

* **Agent 26 (Baş Memar):** `GAME_SPEC.md` hazırlayarkən mütləq `Render Engine: Three.js WebGL 3D (with UnrealBloomPass)` qeyd edir.
* **Agent 6 (`game_developer`):** Core loop-u Three.js `composer.render()` ilə idarə edir.
* **Agent 13 (`art_director`):** Mesh-ləri, PBR materiallarını, parlayan emissive neon xətləri və zərrəcikləri 3D koordinatlarda qurur.
* **Agent 20 (`physics_juice_specialist`):** Avtomobilin 2-DOF asqısını birbaşa 3D avtomobil mesh-inin `rotation.z` (roll) və `rotation.x` (pitch) bucaqlarına tətbiq edir.
* **Agent 37 (`marketplace_mcp_skill_scout`):** Ekosistemi daima ən yeni Three.js modul və resursları ilə zəngin saxlayır.
