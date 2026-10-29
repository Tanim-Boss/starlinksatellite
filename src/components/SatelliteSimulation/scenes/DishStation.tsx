import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { colors } from "../config";
import { SATS, sitePositions } from "../hooks/useSimDriver";
import { simState, useSimStore } from "../hooks/useSimStore";
import { latLonToEarthFixed, satPosition } from "../utils/orbit";
import { makeDigitTexture } from "../utils/textures";

/* -------------------------------------------------------------------------- */
/* Beam shader                                                                */
/* -------------------------------------------------------------------------- */

const BEAM_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BEAM_FRAG = /* glsl */ `
  uniform float uTime;      // simulated seconds
  uniform float uAlpha;     // 0..1 overall opacity (handoff fade)
  uniform float uRingCount; // wavefront rings along the beam
  uniform float uRingSpeed; // cycles per simulated second
  uniform float uDigitRepeat;
  uniform float uDigitSpeed;
  uniform sampler2D uDigits;
  uniform vec3 uColor;
  varying vec2 vUv;

  void main() {
    float u = vUv.y; // 0 at the dish, 1 at the satellite

    // The beam is a taper: cut off at the dish, sharp at the satellite.
    float taper = smoothstep(0.0, 0.25, u) * smoothstep(1.0, 0.7, u);
    float edge = smoothstep(0.0, 0.12, abs(vUv.x - 0.5) * 2.0);

    // Animated wavefront rings travelling dish → satellite.
    float ringU = fract(u * uRingCount - uTime * uRingSpeed);
    float ring = pow(max(0.0, 1.0 - abs(ringU - 0.5) * 9.0), 3.0);

    // Glowing 0/1 digits streaming up and down the beam.
    vec4 up = texture2D(uDigits, vec2(fract(u * uDigitRepeat + uTime * uDigitSpeed), 0.5));
    vec4 down = texture2D(uDigits, vec2(fract(u * uDigitRepeat - uTime * uDigitSpeed * 0.75), 0.5));
    float digits = max(up.a, down.a);

    vec3 col = uColor * (0.22 + ring * 1.5 + digits * 0.9);
    float alpha = taper * edge * (0.3 + ring * 1.3 + digits * 1.1) * uAlpha;
    gl_FragColor = vec4(col, alpha);
  }
`;

/** Shared beam uniforms; the strips differ only in which satellite they target. */
function makeBeamMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAlpha: { value: 1 },
      uRingCount: { value: 9 },
      uRingSpeed: { value: 0.3 },
      uDigitRepeat: { value: 22 },
      uDigitSpeed: { value: 0.55 },
      uDigits: { value: makeDigitTexture() },
      uColor: { value: new THREE.Color(colors.rf) },
    },
    vertexShader: BEAM_VERT,
    fragmentShader: BEAM_FRAG,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _upY = new THREE.Vector3(0, 1, 0);
const _radial = new THREE.Vector3();

function updateBeamStrip(
  strip: THREE.Mesh | null,
  mat: THREE.ShaderMaterial,
  satId: number | null,
  alpha: number,
): void {
  mat.uniforms.uAlpha.value = alpha;
  mat.uniforms.uTime.value = simState.time;
  if (!strip) return;
  if (satId === null) {
    strip.visible = false;
    return;
  }
  const dish = sitePositions.dishAperture;
  satPosition(SATS[satId], simState.time, _b);
  _dir.copy(_b).sub(dish);
  const len = _dir.length();
  if (len < 1e-6) {
    strip.visible = false;
    return;
  }
  strip.visible = true;
  _dir.multiplyScalar(1 / len);
  strip.position.copy(dish).addScaledVector(_dir, len * 0.5);
  strip.scale.set(0.05, len, 1);
  strip.quaternion.setFromUnitVectors(_upY, _dir);
}

/* -------------------------------------------------------------------------- */
/* Dish model (earth-fixed)                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The user terminal: a flat white phased-array panel on a short black pole
 * with a tripod base. No moving parts — the beam steers electronically, which
 * is why the dish never rotates even as it tracks satellites. Sizes are
 * exaggerated for visibility. Also publishes its world anchors each frame.
 */
export function DishModel() {
  const user = useSimStore((s) => s.user);
  const groupRef = useRef<THREE.Group>(null);

  const local = useMemo(() => {
    const v = new THREE.Vector3();
    latLonToEarthFixed(user.lat, user.lon, 1.004, v);
    return v;
  }, [user]);

  const orientation = useMemo(() => {
    _radial.copy(local).normalize();
    return new THREE.Quaternion().setFromUnitVectors(_upY, _radial);
  }, [local]);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.getWorldPosition(_a);
      _radial.copy(_a).normalize();
      sitePositions.dishWorld.copy(_a);
      sitePositions.dishAperture.copy(_a).addScaledVector(_radial, 0.035);
    }
  });

  // Three tripod legs.
  const legs = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];

  return (
    <group ref={groupRef} position={[local.x, local.y, local.z]} quaternion={orientation}>
      {/* Tripod base */}
      {legs.map((a) => (
        <mesh
          key={a}
          position={[Math.cos(a) * 0.014, 0.0015, Math.sin(a) * 0.014]}
          rotation={[0, -a, 0.28]}
        >
          <boxGeometry args={[0.003, 0.006, 0.022]} />
          <meshStandardMaterial color="#0b0f18" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
      {/* Pole */}
      <mesh position={[0, 0.015, 0]}>
        <cylinderGeometry args={[0.002, 0.0028, 0.03, 8]} />
        <meshStandardMaterial color="#0b0f18" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Phased-array panel, tilted toward the sky */}
      <group position={[0, 0.033, 0]} rotation={[0.4, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.038, 0.0024, 0.03]} />
          <meshStandardMaterial
            color="#f2f5fa"
            emissive="#16293f"
            emissiveIntensity={0.8}
            metalness={0.4}
            roughness={0.5}
          />
        </mesh>
      </group>
      {/* Faint translucent field-of-view cone above the dish */}
      <mesh position={[0, 0.045, 0]}>
        <coneGeometry args={[0.13, 0.24, 24, 1, true]} />
        <meshBasicMaterial
          color={colors.fov}
          transparent
          opacity={0.05}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Beam strips (inertial frame)                                               */
/* -------------------------------------------------------------------------- */

/**
 * The radio link to the connected satellite: two animated strip planes with
 * the ring/digit shader — the primary beam and the fading previous one after
 * a handoff — plus a faint core line. Strips are repositioned every frame in
 * world space, so they sit at scene root, not on the spinning Earth.
 */
export function DishBeam() {
  const show = useSimStore((s) => s.toggles.dishBeam);
  const primaryRef = useRef<THREE.Mesh>(null);
  const secondaryRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Line>(null);
  const primaryMat = useMemo(() => makeBeamMaterial(), []);
  const secondaryMat = useMemo(() => makeBeamMaterial(), []);
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1, 1, 24), []);
  const coreGeometry = useMemo(
    () => new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    [],
  );
  const coreMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(colors.rf),
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  const coreLine = useMemo(
    () => {
      const line = new THREE.Line(coreGeometry, coreMaterial);
      line.visible = false;
      line.raycast = () => null;
      return line;
    },
    [coreGeometry, coreMaterial],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      coreGeometry.dispose();
      primaryMat.dispose();
      secondaryMat.dispose();
      coreMaterial.dispose();
      const digitsA = primaryMat.uniforms.uDigits.value as THREE.Texture;
      const digitsB = secondaryMat.uniforms.uDigits.value as THREE.Texture;
      digitsA.dispose();
      digitsB.dispose();
    };
  }, [geometry, coreGeometry, primaryMat, secondaryMat, coreMaterial]);

  useFrame(() => {
    const connected = simState.connectedSat;
    const secondary = simState.secondarySat;
    updateBeamStrip(primaryRef.current, primaryMat, connected, 1);
    updateBeamStrip(secondaryRef.current, secondaryMat, secondary, simState.secondaryAlpha);

    // Faint core line along the primary beam.
    const core = coreRef.current;
    if (core && connected !== null) {
      const dish = sitePositions.dishAperture;
      satPosition(SATS[connected], simState.time, _b);
      const positions = coreGeometry.getAttribute("position") as THREE.BufferAttribute;
      positions.setXYZ(0, dish.x, dish.y, dish.z);
      positions.setXYZ(1, _b.x, _b.y, _b.z);
      positions.needsUpdate = true;
      core.visible = true;
    } else if (core) {
      core.visible = false;
    }
  });

  return (
    <group visible={show}>
      <mesh ref={primaryRef} geometry={geometry} material={primaryMat} visible={false} raycast={() => null} />
      <mesh ref={secondaryRef} geometry={geometry} material={secondaryMat} visible={false} raycast={() => null} />
      <primitive object={coreLine} ref={coreRef} />
    </group>
  );
}
