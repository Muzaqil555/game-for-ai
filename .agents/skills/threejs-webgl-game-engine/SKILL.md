---
name: threejs-webgl-game-engine
description: Three.js WebGL standard for 3D and action games - PBR materials, UnrealBloomPass post-processing, soft shadows, chase camera, and solid rigid-body collision with no clipping. Use for any 3D game or when a game looks flat or like primitive 2D canvas.
---

# Three.js WebGL 3D Game Engine Standard

> ### Rule: realistic 3D by default
> Every agent applies this standard automatically, even if the user does not say the game looks "artificial" or "weak":
> * **No primitive 2D drawing:** simple Canvas 2D scribbles, bare rectangles and fake 1980s raster lines are not allowed (unless the user specifically asks for retro 8-bit).
> * **Real 3D space (Three.js WebGL):** every game is built with a real 3D scene, 3D mesh models, PBR materials, real shadows and Unreal Engine-style Bloom glow.
> * **Realistic lighting and atmosphere:** ACESFilmic tonemapping, soft shadow maps, point-light neon and fog.

---

## 1. CDN and Library Setup (Zero-Install, Runs Immediately)

Official fast CDNs that work in all browsers and on mobile devices:

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

## 2. Standard WebGL Render and Bloom Setup

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

// 2. Scene and camera
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x060212, 0.0035);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1500);
camera.position.set(0, 5, -12);

// 3. Unreal Bloom post-processing
const composer = new THREE.EffectComposer(renderer);
composer.addPass(new THREE.RenderPass(scene, camera));

const bloomPass = new THREE.UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,  // Bloom strength (glow intensity)
  0.4,  // Radius
  0.82  // Threshold
);
composer.addPass(bloomPass);
```

---

## 3. PBR 3D Car Geometry

```javascript
// Car body (PBR metallic paint)
const carBodyMat = new THREE.MeshStandardMaterial({
  color: 0x00f5ff,
  metalness: 0.85,
  roughness: 0.18,
  envMapIntensity: 1.2
});

const carGroup = new THREE.Group();

// Chassis
const chassisGeo = new THREE.BoxGeometry(2.1, 0.65, 4.6);
const chassis = new THREE.Mesh(chassisGeo, carBodyMat);
chassis.castShadow = true;
chassis.receiveShadow = true;
carGroup.add(chassis);

// Wheels (4 rotating 3D cylinders)
const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 24);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
const wheels = [];

const wheelPositions = [
  [-1.15, -0.25, 1.4],  // Front left
  [ 1.15, -0.25, 1.4],  // Front right
  [-1.15, -0.25, -1.4], // Rear left
  [ 1.15, -0.25, -1.4]  // Rear right
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

## 4. Cinematic Chase Camera and FOV Punch

```javascript
function updateCamera(playerCar, dt, isNitro, cameraShake) {
  // Smooth follow behind the car (lerp)
  const targetCamPos = playerCar.position.clone()
    .add(new THREE.Vector3(0, 3.8, -9.5));

  camera.position.lerp(targetCamPos, 0.14);
  camera.lookAt(playerCar.position.clone().add(new THREE.Vector3(0, 1.2, 5)));

  // FOV widening during nitro (warp effect)
  const targetFOV = isNitro ? 85 : 65;
  camera.fov += (targetFOV - camera.fov) * 0.1;
  camera.updateProjectionMatrix();

  // Impact shake
  if (cameraShake > 0) {
    camera.position.x += (Math.random() - 0.5) * cameraShake;
    camera.position.y += (Math.random() - 0.5) * cameraShake;
  }
}
```

---

## 5. Zero-Clipping (Anti-Clipping) and Solid Rigid-Body Collision Rule

No 3D mesh may pass through another object (other cars, walls, barriers). All collisions follow explicit physical rules:

```javascript
// 1. Geometric separation with the Minimum Translation Vector (MTV) (zero-clipping)
function resolveSolidVehicleCollision(carA, carB, massA, massB) {
  const dx = carA.position.x - carB.position.x;
  const dz = carA.position.z - carB.position.z;
  
  const halfW = (carA.boxHalfW + carB.boxHalfW);
  const halfL = (carA.boxHalfL + carB.boxHalfL);
  
  const penX = halfW - Math.abs(dx);
  const penZ = halfL - Math.abs(dz);
  
  if (penX > 0 && penZ > 0) {
    // Collision occurred: separate along the axis of least penetration (MTV)
    const totalMass = massA + massB;
    const ratioA = massB / totalMass;
    const ratioB = massA / totalMass;
    
    if (penX < penZ) {
      const signX = Math.sign(dx) || 1;
      carA.position.x += signX * penX * ratioA;
      carB.position.x -= signX * penX * ratioB;
      
      // Lateral Newtonian impulse and elastic bounce
      const relVx = carA.vx - carB.vx;
      const impulse = relVx * 0.45;
      carA.vx -= impulse * ratioA;
      carB.vx += impulse * ratioB;
    } else {
      const signZ = Math.sign(dz) || 1;
      carA.position.z += signZ * penZ * ratioA;
      carB.position.z -= signZ * penZ * ratioB;
      
      // Longitudinal velocity transfer
      const relVz = carA.vz - carB.vz;
      const impulse = relVz * 0.5;
      carA.vz -= impulse * ratioA;
      carB.vz += impulse * ratioB;
    }
    
    // Dynamic 3D metal spark shower at the contact point
    emit3DSparks((carA.position.x + carB.position.x) * 0.5, 0.4, (carA.position.z + carB.position.z) * 0.5, 25);
    return true;
  }
  return false;
}

// 2. Steel guardrail / barrier contact (hard bounce and spark shower)
function resolveGuardrailCollision(playerCar, barrierX, restitution = 0.5) {
  const carHalfW = 1.05;
  if (playerCar.position.x + carHalfW >= barrierX) {
    playerCar.position.x = barrierX - carHalfW;
    playerCar.velocityLat = -Math.abs(playerCar.velocityLat) * restitution;
    playerCar.velocityLong *= 0.94; // Friction loss
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

## 6. How Each Agent Applies This Standard

* **`game-architect`:** always writes `Render Engine: Three.js WebGL 3D (with UnrealBloomPass)` in `GAME_SPEC.md`.
* **`game-engine-developer`:** drives the core loop with Three.js `composer.render()`.
* **`art-director`:** builds meshes, PBR materials, glowing emissive neon lines and particles in 3D coordinates.
* **`physics-game-feel-engineer`:** applies the car's 2-DOF suspension directly to the 3D car mesh's `rotation.z` (roll) and `rotation.x` (pitch) angles.
* **`skill-scout`:** keeps the studio current with the latest Three.js modules and resources.
