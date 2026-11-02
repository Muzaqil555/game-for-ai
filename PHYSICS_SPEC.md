# 🌐 REAL-WORLD NEWTONIAN DYNAMICS & UNITY PHYSX SPECIFICATION
**Studio:** Universal Autonomous 37-Agent Game & Software Studio  
**Coordinator:** Agent 4 — CEO  
**Lead Architect:** Agent 26 (`tech_stack_architect_planner`)  
**Physics Specialist:** Agent 20 (`physics_juice_specialist`)  
**Standard:** 100% Real-World Classical Mechanics (Newtonian Laws, Coulomb Friction, Torque, Weight Transfer & Unity PhysX Bridge)

---

## 🏛️ 1. Real-World Physical Laws & Mathematical Formulation

### 1.1 Newtonian Momentum & Impulse Collision Solver
For any two rigid bodies with mass $m_1, m_2$, moment of inertia $I_1, I_2$, velocity $\mathbf{v}_1, \mathbf{v}_2$, and angular velocity $\boldsymbol{\omega}_1, \boldsymbol{\omega}_2$:
* Contact point: $\mathbf{p}$
* Lever arms from centers of mass: $\mathbf{r}_1 = \mathbf{p} - \mathbf{x}_1, \quad \mathbf{r}_2 = \mathbf{p} - \mathbf{x}_2$
* Relative contact velocity:
  $$\mathbf{v}_{\text{rel}} = (\mathbf{v}_1 + \boldsymbol{\omega}_1 \times \mathbf{r}_1) - (\mathbf{v}_2 + \boldsymbol{\omega}_2 \times \mathbf{r}_2)$$
* Normal contact velocity: $v_n = \mathbf{v}_{\text{rel}} \cdot \mathbf{n}$
* Effective mass along normal:
  $$m_{\text{eff}, n} = \frac{1}{\frac{1}{m_1} + \frac{1}{m_2} + \left(I_1^{-1}(\mathbf{r}_1 \times \mathbf{n}) \times \mathbf{r}_1 + I_2^{-1}(\mathbf{r}_2 \times \mathbf{n}) \times \mathbf{r}_2\right) \cdot \mathbf{n}}$$
* Normal Impulse ($e \in [0.25, 0.55]$):
  $$J_n = \max\left(0, -(1 + e) \cdot v_n \cdot m_{\text{eff}, n}\right)$$
* Coulomb Friction Cone ($J_t$ along tangent $\mathbf{t}$):
  $$J_t = \text{clamp}\left(-(\mathbf{v}_{\text{rel}} \cdot \mathbf{t}) \cdot m_{\text{eff}, t}, -\mu J_n, \mu J_n\right)$$
* Total Contact Impulse: $\mathbf{J} = J_n \mathbf{n} + J_t \mathbf{t}$
* Linear & Angular Velocity Updates:
  $$\Delta \mathbf{v}_1 = +\frac{\mathbf{J}}{m_1}, \quad \Delta \boldsymbol{\omega}_1 = +I_1^{-1}(\mathbf{r}_1 \times \mathbf{J})$$
  $$\Delta \mathbf{v}_2 = -\frac{\mathbf{J}}{m_2}, \quad \Delta \boldsymbol{\omega}_2 = -I_2^{-1}(\mathbf{r}_2 \times \mathbf{J})$$

### 1.2 Torque from Contact Offsets (PIT Maneuver & Oblique Spinouts)
When a police cruiser hits the player's rear quarter panel at lever arm $\mathbf{r}_1 = (-w/2, 0, -l/2)$:
$$\boldsymbol{\tau} = \mathbf{r}_1 \times \mathbf{J} = (r_x J_z - r_z J_x) \hat{\mathbf{k}}$$
This induces an immediate real angular acceleration $\alpha = \tau / I_z$, realistically rotating the vehicle around its center of gravity just like in real life and Unity PhysX!

### 1.3 Dynamic 4-Wheel Weight Transfer (Normal Load $F_z$)
* Longitudinal weight transfer during acceleration ($a_x > 0$) and braking ($a_x < 0$):
  $$\Delta F_{z,\text{long}} = \frac{m a_x h_{\text{com}}}{L}$$
  Front axle load: $F_{z,f} = m g \frac{L_r}{L} - \Delta F_{z,\text{long}}$
  Rear axle load: $F_{z,r} = m g \frac{L_f}{L} + \Delta F_{z,\text{long}}$
* Lateral weight transfer during steering ($a_y$):
  $$\Delta F_{z,\text{lat}} = \frac{m a_y h_{\text{com}}}{w}$$
* Maximum available grip per tire scales with normal load:
  $$F_{\text{friction, max}} = \mu(F_z) \cdot F_z$$

### 1.4 Aerodynamic Drag & Downforce
* Air density: $\rho = 1.225\text{ kg/m}^3$
* Aerodynamic Drag: $F_{\text{drag}} = \frac{1}{2} \rho v^2 C_d A$
* Aerodynamic Downforce: $F_{\text{down}} = \frac{1}{2} \rho v^2 C_L A$ (increases high-speed tire normal force)

### 1.5 Dissipated Kinetic Energy & Realistic Spark / Crunch Synthesis
$$\Delta E_{\text{kinetic}} = \frac{1}{2} m_{\text{eff}} (1 - e^2) v_n^2 + |J_t \cdot v_t|$$
Sparks emitted count $= \text{clamp}(\Delta E / 800, 5, 80)$.
Audio decibel level is proportional to $\log_{10}(\Delta E)$.

---

## 🎮 2. Unity PhysX Interoperability Bridge (`Unity/`)
Our JavaScript/WebGL engine and Unity PhysX C# engine share the exact same mathematical properties:
* `ApexPursuitPhysX.cs`: Unity C# script implementing `Rigidbody`, `WheelCollider` suspension springs ($k = 38000\text{ N/m}, c = 3200\text{ Ns/m}$), Coulomb friction curves, and contact manifold impulse evaluation.
* Seamless export/import of vehicle telemetry (RPM, Gear, Slip, Normal Loads, G-Forces).

---

## 👥 3. 37-Agent Responsibilities
* **Agent 4 (CEO):** Orchestration, verification, and user presentation.
* **Agent 26 (`tech_stack_architect_planner`):** Spec validation and physics contract integrity.
* **Agent 20 (`physics_juice_specialist`):** Newtonian impulse solver, torque from contact offsets, weight transfer.
* **Agent 6 (`game_developer`):** Core engine integration in `src/vehicle_physics.js` and `racer.html`.
* **Agent 1 (`ai_specialist`):** Physics-aware tactical AI exploiting lever arms for PIT maneuvers.
* **Agent 12 (`audio_designer`):** Energy-dissipation audio scaling.
* **Agent 3 (`frontend_specialist`):** G-Force and dynamic weight transfer telemetry in HUD.
* **Agent 22 (`qa_browser_tester`):** Zero-error browser QA and performance audit.
* **9-User Council:** Tactile realism review.
