using System;
using System.Collections.Generic;
using UnityEngine;

namespace ApexPursuit.Physics
{
    /// <summary>
    /// APEX PURSUIT 3D: REAL-WORLD NEWTONIAN DYNAMICS & UNITY PHYSX BRIDGE
    /// Developed by 37-Agent Game & Software Studio
    /// Synchronizes 1:1 with WebGL Three.js Vehicle Physics & PhysX Classical Mechanics
    /// </summary>
    [RequireComponent(typeof(Rigidbody))]
    public class ApexPursuitPhysX : MonoBehaviour
    {
        [Header("Chassis & Mass Properties (Real-World Specs)")]
        [Tooltip("Vehicle kerb mass in kg")]
        public float vehicleMass = 1500f;

        [Tooltip("Center of mass offset from transform root")]
        public Vector3 centerOfMassOffset = new Vector3(0f, -0.25f, 0.12f);

        [Tooltip("Front/Rear static weight distribution (0.52 = 52% front)")]
        [Range(0.4f, 0.65f)]
        public float weightDistributionFront = 0.52f;

        [Header("Suspension & Aerodynamics (Spring-Damper Dynamics)")]
        [Tooltip("Suspension spring rate in N/m (Hooke's Law: F = -k*x)")]
        public float suspensionSpringRate = 38000f;

        [Tooltip("Suspension damper rate in Ns/m (F = -c*v)")]
        public float suspensionDamperRate = 3200f;

        [Tooltip("Aerodynamic drag coefficient Cd")]
        public float aerodynamicDragCd = 0.32f;

        [Tooltip("Frontal cross-sectional area A in m^2")]
        public float frontalArea = 2.2f;

        [Tooltip("Aerodynamic downforce coefficient CL")]
        public float aerodynamicDownforceCl = 0.45f;

        [Header("Restitution & Coulomb Friction")]
        [Tooltip("Coefficient of restitution e for rigid body impacts")]
        [Range(0.1f, 0.8f)]
        public float coefficientOfRestitution = 0.38f;

        [Tooltip("Dynamic friction coefficient against steel/guardrail")]
        public float frictionCoefficient = 0.65f;

        [Header("Wheel Colliders (4-Wheel Independent Assembly)")]
        public WheelCollider wheelFrontLeft;
        public WheelCollider wheelFrontRight;
        public WheelCollider wheelRearLeft;
        public WheelCollider wheelRearRight;

        [Header("VFX & Audio Hooks")]
        public ParticleSystem collisionSparksPrefab;
        public AudioSource impactAudioSource;
        public AudioClip metalScrapeSound;
        public AudioClip heavyCrashSound;

        // Internal State
        private Rigidbody _rb;
        private Vector3 _lastVelocity;
        private Vector3 _acceleration;
        private float _currentGForceLong;
        private float _currentGForceLat;

        // Dynamic Normal Load on Each Tire (N)
        public float NormalLoadFL { get; private set; }
        public float NormalLoadFR { get; private set; }
        public float NormalLoadRL { get; private set; }
        public float NormalLoadRR { get; private set; }

        public float SpeedKmh => _rb != null ? _rb.velocity.magnitude * 3.6f : 0f;

        private void Awake()
        {
            _rb = GetComponent<Rigidbody>();
            ConfigureRigidbody();
            ConfigureWheelSuspensions();
        }

        private void ConfigureRigidbody()
        {
            _rb.mass = vehicleMass;
            _rb.centerOfMass = centerOfMassOffset;
            _rb.interpolation = RigidbodyInterpolation.Interpolate;
            _rb.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
            _rb.drag = 0.01f; // Handled explicitly via aero equations
            _rb.angularDrag = 1.8f;
        }

        private void ConfigureWheelSuspensions()
        {
            JointSpring springConfig = new JointSpring
            {
                spring = suspensionSpringRate,
                damper = suspensionDamperRate,
                targetPosition = 0.5f
            };

            if (wheelFrontLeft != null) wheelFrontLeft.suspensionSpring = springConfig;
            if (wheelFrontRight != null) wheelFrontRight.suspensionSpring = springConfig;
            if (wheelRearLeft != null) wheelRearLeft.suspensionSpring = springConfig;
            if (wheelRearRight != null) wheelRearRight.suspensionSpring = springConfig;
        }

        private void FixedUpdate()
        {
            float dt = Time.fixedDeltaTime;
            if (dt <= 0f) return;

            // 1. Calculate Linear Acceleration & G-Forces
            Vector3 currentVel = _rb.velocity;
            _acceleration = (currentVel - _lastVelocity) / dt;
            _lastVelocity = currentVel;

            Vector3 localAccel = transform.InverseTransformDirection(_acceleration);
            _currentGForceLong = localAccel.z / 9.81f;
            _currentGForceLat = localAccel.x / 9.81f;

            // 2. Real-World Dynamic 4-Wheel Weight Transfer
            CalculateWeightTransfer();

            // 3. Aerodynamic Drag & High-Speed Downforce
            ApplyAerodynamicForces();
        }

        /// <summary>
        /// Calculates true normal force (Fz) on each tire governed by longitudinal & lateral weight transfer
        /// </summary>
        private void CalculateWeightTransfer()
        {
            float g = 9.81f;
            float totalWeight = vehicleMass * g;
            float wheelbase = 2.75f;
            float trackWidth = 1.65f;
            float hCom = Mathf.Abs(centerOfMassOffset.y) + 0.35f;

            // Longitudinal transfer: Delta Fz = (m * ax * h) / L
            float deltaFzLong = (vehicleMass * _acceleration.z * hCom) / wheelbase;

            float frontAxleLoad = (totalWeight * (1f - weightDistributionFront)) - deltaFzLong;
            float rearAxleLoad = (totalWeight * weightDistributionFront) + deltaFzLong;

            // Lateral transfer: Delta Fz = (m * ay * h) / W
            float deltaFzLatFront = (vehicleMass * _acceleration.x * hCom * 0.5f) / trackWidth;
            float deltaFzLatRear = (vehicleMass * _acceleration.x * hCom * 0.5f) / trackWidth;

            NormalLoadFL = Mathf.Max(200f, (frontAxleLoad * 0.5f) - deltaFzLatFront);
            NormalLoadFR = Mathf.Max(200f, (frontAxleLoad * 0.5f) + deltaFzLatFront);
            NormalLoadRL = Mathf.Max(200f, (rearAxleLoad * 0.5f) - deltaFzLatRear);
            NormalLoadRR = Mathf.Max(200f, (rearAxleLoad * 0.5f) + deltaFzLatRear);
        }

        /// <summary>
        /// Applies realistic aerodynamic drag (0.5 * rho * v^2 * Cd * A) and downforce
        /// </summary>
        private void ApplyAerodynamicForces()
        {
            float speed = _rb.velocity.magnitude;
            float rho = 1.225f; // Sea level air density

            // Drag = 0.5 * rho * v^2 * Cd * A
            float dragMag = 0.5f * rho * (speed * speed) * aerodynamicDragCd * frontalArea;
            Vector3 dragForce = -_rb.velocity.normalized * dragMag;
            _rb.AddForce(dragForce, ForceMode.Force);

            // Downforce = 0.5 * rho * v^2 * CL * A
            float downforceMag = 0.5f * rho * (speed * speed) * aerodynamicDownforceCl * frontalArea;
            Vector3 downforce = -transform.up * downforceMag;
            _rb.AddForce(downforce, ForceMode.Force);
        }

        /// <summary>
        /// Real-world PhysX Contact Manifold Resolution
        /// Evaluates contact normal, tangential friction, rotational torque from lever arms, and dissipated energy
        /// </summary>
        private void OnCollisionEnter(Collision collision)
        {
            ResolveContactManifold(collision, true);
        }

        private void OnCollisionStay(Collision collision)
        {
            ResolveContactManifold(collision, false);
        }

        private void ResolveContactManifold(Collision collision, bool isFirstImpact)
        {
            if (collision.contactCount == 0) return;

            ContactPoint primaryContact = collision.GetContact(0);
            Vector3 contactPoint = primaryContact.point;
            Vector3 contactNormal = primaryContact.normal;

            // Lever arm from center of mass: r = p - CoM
            Vector3 leverArm = contactPoint - _rb.worldCenterOfMass;

            // Relative contact velocity
            Vector3 relativeVelocity = collision.relativeVelocity;
            float normalVelocity = Vector3.Dot(relativeVelocity, contactNormal);

            // Dissipated Kinetic Energy: Delta E = 0.5 * m_eff * (1 - e^2) * vn^2
            float effectiveMass = vehicleMass * (collision.rigidbody != null ? collision.rigidbody.mass : 5000f) /
                                 (vehicleMass + (collision.rigidbody != null ? collision.rigidbody.mass : 5000f));
            float dissipatedEnergy = 0.5f * effectiveMass * (1f - (coefficientOfRestitution * coefficientOfRestitution)) *
                                     (normalVelocity * normalVelocity);

            // Rotational Torque generated from contact offset: tau = r x J
            Vector3 normalImpulse = contactNormal * Mathf.Abs(normalVelocity) * effectiveMass * (1f + coefficientOfRestitution);
            Vector3 torque = Vector3.Cross(leverArm, normalImpulse);
            _rb.AddTorque(torque * 0.45f, ForceMode.Impulse);

            if (isFirstImpact || dissipatedEnergy > 1200f)
            {
                TriggerImpactVFXAndAudio(contactPoint, -contactNormal, dissipatedEnergy);
            }
        }

        private void TriggerImpactVFXAndAudio(Vector3 point, Vector3 direction, float energy)
        {
            // Spawn 3D Sparks proportional to dissipated kinetic energy
            if (collisionSparksPrefab != null)
            {
                int sparkCount = Mathf.Clamp((int)(energy / 800f), 10, 60);
                var sparks = Instantiate(collisionSparksPrefab, point, Quaternion.LookRotation(direction));
                sparks.Emit(sparkCount);
                Destroy(sparks.gameObject, 0.8f);
            }

            // Audio trigger with severity
            if (impactAudioSource != null)
            {
                if (energy > 8000f && heavyCrashSound != null)
                {
                    impactAudioSource.PlayOneShot(heavyCrashSound, Mathf.Clamp01(energy / 25000f));
                }
                else if (metalScrapeSound != null)
                {
                    impactAudioSource.PlayOneShot(metalScrapeSound, 0.45f);
                }
            }
        }

        /// <summary>
        /// Serializes current real-world physical telemetry for WebGL / AI Studio bridge
        /// </summary>
        public string ExportTelemetryJson()
        {
            return JsonUtility.ToJson(new VehicleTelemetryData
            {
                speedKmh = SpeedKmh,
                gForceLong = _currentGForceLong,
                gForceLat = _currentGForceLat,
                loadFL = NormalLoadFL,
                loadFR = NormalLoadFR,
                loadRL = NormalLoadRL,
                loadRR = NormalLoadRR
            });
        }

        [Serializable]
        private struct VehicleTelemetryData
        {
            public float speedKmh;
            public float gForceLong;
            public float gForceLat;
            public float loadFL;
            public float loadFR;
            public float loadRL;
            public float loadRR;
        }
    }
}
