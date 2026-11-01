const assert = require('assert');
const { NeonPursuitAI, HEAT_CONFIG, ARCHETYPES } = require('../src/racer_ai.js');

console.log('--- Testing NeonPursuitAI ---');

// 1. Initialization Test
const ai = new NeonPursuitAI();
assert.strictEqual(ai.heatLevel, 1, 'Initial heat level should be 1');
assert.strictEqual(ai.hitStopTimer, 0, 'Hit-stop should be 0');
console.log('✔ Initialization passed');

// 2. Heat 1: Patrol Cruiser Spawning and Boxing AI
const player = {
  x: 0.0,
  z: 1000,
  y: 0,
  speed: 220,
  isDrifting: false,
  isNitro: false,
  driftAngle: 0
};

// Force spawn
ai._spawnPoliceUnit(player, HEAT_CONFIG[1]);
assert.strictEqual(ai.policeUnits.length, 1, 'Should have spawned 1 patrol cruiser');
const cruiser = ai.policeUnits[0];
assert.strictEqual(cruiser.type, 'patrol_cruiser', 'Cruiser type matches');
assert.strictEqual(cruiser.role, 'boxer', 'Role is boxer');

// Update patrol cruiser
ai._updatePatrolCruiserAI(cruiser, player, 0.016);
assert(cruiser.vz > 0, 'Cruiser should have forward velocity');
console.log('✔ Heat 1 Patrol Cruiser AI passed');

// 3. Heat 2: Interceptor PIT Maneuver
ai.reset();
ai.heatLevel = 2;
ai._spawnPoliceUnit(player, HEAT_CONFIG[2]);
// Force interceptor type
const interceptor = ai.policeUnits[0];
interceptor.type = 'highway_interceptor';
interceptor.role = 'pit_flanker';
interceptor.state = 'flanking';
interceptor.pitTimer = 0.01; // trigger PIT

ai._updateInterceptorAI(interceptor, player, 0.02);
assert.strictEqual(interceptor.state, 'pit_executing', 'Interceptor should enter pit_executing state');
console.log('✔ Heat 2 Interceptor PIT Maneuver passed');

// 4. Heat 3: Roadblocks and Spike Strips
ai.reset();
ai.heatLevel = 3;
ai._spawnRoadblockWithSpikes(player.z + 500);
assert(ai.spikeStrips.length > 0 || ai.policeUnits.length > 0, 'Should spawn roadblocks and spike strips');
console.log('✔ Heat 3 Roadblock and Spike Strips passed');

// Test Spike Collision
const testSpike = {
  id: 'test_spike',
  x: 0.0,
  z: player.z + 5,
  length: 4.5,
  hitboxW: 0.45,
  triggered: false
};
ai.spikeStrips = [testSpike];
let blowoutFired = false;
ai.options.onSpikeBlowout = () => { blowoutFired = true; };

ai._resolveCollisions(0.016, player);
assert.strictEqual(testSpike.triggered, true, 'Spike should be triggered');
assert.strictEqual(ai.blowoutRemaining, 4.0, 'Blowout duration should be 4.0s');
assert.strictEqual(blowoutFired, true, 'onSpikeBlowout callback should be fired');
console.log('✔ Heat 3 Spike Collision & Blowout passed');

// Test Spike Evasion
ai.reset();
const evadeSpike = {
  id: 'evade_spike',
  x: 0.3,
  z: 1000,
  length: 4.5,
  hitboxW: 0.4,
  triggered: false
};
ai.spikeStrips = [evadeSpike];
let evasionFired = false;
ai.options.onSpikeEvasion = () => { evasionFired = true; };

// Player passes spike safely at x = -0.1 (dX = 0.4 < 0.55), at z = 1015 (> 1000 + 4.5 + 8)
const passingPlayer = { x: -0.1, z: 1015, speed: 200 };
ai._resolveCollisions(0.016, passingPlayer);
assert.strictEqual(evasionFired, true, 'Spike Evasion should be triggered');
console.log('✔ Heat 3 Spike Evasion bonus passed');

// 5. Heat 4: Helicopter Spotlight and Aerial Drops
ai.reset();
ai.heatLevel = 4;
ai._activateChopper(player);
assert.strictEqual(ai.chopper.active, true, 'Chopper should be active');

// Update chopper with player in beam
ai.chopper.spotlight.x = player.x;
ai.chopper.spotlight.z = player.z;
let lockedAlertFired = false;
ai.options.onSpotlightLock = (data) => { if (data.locked) lockedAlertFired = true; };

for (let i = 0; i < 90; i++) {
  ai._updateChopperAI(0.016, player);
}
assert.strictEqual(ai.chopper.spotlight.isLocked, true, 'Spotlight should lock on');
assert.strictEqual(lockedAlertFired, true, 'Spotlight lock callback fired');
console.log('✔ Heat 4 Helicopter Spotlight lock-on passed');

// 6. Heat 5: SWAT Rhino
ai.reset();
ai.heatLevel = 5;
ai._spawnSwatRhino(player);
const rhino = ai.policeUnits.find(u => u.type === 'swat_rhino');
assert(rhino, 'SWAT Rhino must exist');
assert(rhino.vz < 0, 'Rhino should have negative velocity (oncoming)');
assert.strictEqual(rhino.mass, 8.5, 'Rhino has 8.5 mass');

// Head-on crash test
rhino.x = player.x;
rhino.z = player.z;
const playerBeforeSpeed = player.speed;
ai._resolveCollisions(0.016, player);
assert(player.speed < playerBeforeSpeed, 'Player speed should drop significantly on Rhino crash');
console.log('✔ Heat 5 SWAT Rhino oncoming charge & impact passed');

// 7. Burnout Takedown (80ms Hit-stop & Particles)
ai.reset();
ai.heatLevel = 2;
const copTarget = {
  id: 'cop_takedown',
  type: 'highway_interceptor',
  x: 0.1,
  z: 1000,
  vz: 180,
  hitboxW: 0.3,
  hitboxL: 12.0,
  isWrecked: false,
  health: 100,
  takedownValue: 1500
};
ai.policeUnits.push(copTarget);

let takedownFired = false;
ai.options.onTakedown = (data) => {
  takedownFired = true;
  assert.strictEqual(data.reward, 1500, 'Takedown reward matches');
  assert.strictEqual(data.nitroRefill, 1.0, 'Nitro refilled 100%');
};

const nitroPlayer = {
  x: 0.1,
  z: 1000,
  speed: 280,
  isNitro: true,
  isDrifting: false
};

const res = ai.update(0.016, nitroPlayer);
assert.strictEqual(copTarget.isWrecked, true, 'Cop should be wrecked');
assert.strictEqual(ai.hitStopTimer, 0.080, 'Hit-stop should be set to 80ms (0.080s)');
assert.strictEqual(takedownFired, true, 'onTakedown callback fired');
assert(ai.particles.length >= 80, 'At least 80 sparks emitted');
assert(ai.debris.length >= 8, 'Debris emitted');
console.log('✔ Burnout Takedown with 80ms hit-stop & spark shower passed');

// Test hit-stop freezing game world
const frameDuringHitStop = ai.update(0.040, nitroPlayer);
assert.strictEqual(frameDuringHitStop.hitStopActive, true, 'Hit-stop must be active during freeze');
assert(ai.hitStopTimer > 0, 'Hit-stop timer still counting down');
console.log('✔ Hit-stop frame freeze passed');

// 8. Canvas Rendering Routines Test (Mock Context)
const dummyCtx = {
  save: () => {},
  restore: () => {},
  translate: () => {},
  rotate: () => {},
  beginPath: () => {},
  closePath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  stroke: () => {},
  fill: () => {},
  fillRect: () => {},
  strokeRect: () => {},
  arc: () => {},
  ellipse: () => {},
  fillText: () => {},
  createRadialGradient: () => ({ addColorStop: () => {} })
};
const dummyProject = (x, y, z) => ({ x: 400, y: 300, scale: 0.8 });

// Test render calls
ai.renderChopperSpotlight(dummyCtx, dummyProject);
ai.renderChopper(dummyCtx, dummyProject);
ai.renderSpikeStrip(dummyCtx, { x: 0, z: 100, length: 4, width: 0.5, triggered: false }, dummyProject);
ai.renderPoliceVehicle(dummyCtx, { type: 'patrol_cruiser', x: 0, z: 100, strobeState: true }, dummyProject);
ai.renderPoliceVehicle(dummyCtx, { type: 'highway_interceptor', x: 0, z: 100, strobeState: false }, dummyProject);
ai.renderPoliceVehicle(dummyCtx, { type: 'swat_rhino', x: 0, z: 100, strobeState: true }, dummyProject);
ai.renderTrafficVehicle(dummyCtx, { type: 'civilian_sedan', x: 0, z: 100, color: '#ff5500' }, dummyProject);
ai.renderParticles(dummyCtx, dummyProject);
ai.renderHUDAlerts(dummyCtx, 800, 600);
console.log('✔ Procedural canvas rendering functions verified');

console.log('--- ALL TESTS PASSED SUCCESSFULLY! ---');
