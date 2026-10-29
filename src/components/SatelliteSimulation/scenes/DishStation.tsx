import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { colors, stationSize } from "../config";
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
  uniform float uTime;      // visual seconds, independent of time acceleration
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
    float taper = smoothstep(0.0, 0.25, u) * (1.0 - smoothstep(0.7, 1.0, u));
    float edge = smoothstep(0.0, 0.12, abs(vUv.x - 0.5) * 2.0);

    // Animated wavefront rings travelling dish → satellite.
    float ringU = fract(u * uRingCount - uTime * uRingSpeed);
    float ring = pow(max(0.0, 1.0 - abs(ringU - 0.5) * 9.0), 3.0);

    // Glowing 0/1 digits streaming up and down the beam.
    vec4 up = texture2D(uDigits, vec2(fract(u * uDigitRepeat + uTime * uDigitSpeed), 0.5));
    vec4 down = texture2D(uDigits, vec2(fract(u * uDigitRepeat - uTime * uDigitSpeed * 0.75), 0.5));
    float digits = max(up.a, down.a);

    vec3 col = uColor * (0.28 + ring * 0.7 + digits * 0.35);
    float alpha = clamp(taper * edge * (0.3 + ring * 0.5 + digits * 0.35) * uAlpha, 0.0, 0.8);
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Shared beam uniforms; the strips differ only in which satellite they target. */
function makeBeamMaterial(digits: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAlpha: { value: 1 },
      uRingCount: { value: 9 },
      uRingSpeed: { value: 0.3 },
      uDigitRepeat: { value: 22 },
      uDigitSpeed: { value: 0.55 },
      uDigits: { value: digits },
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

const _b = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _upY = new THREE.Vector3(0, 1, 0);
const _radial = new THREE.Vector3();

function updateBeamStrip(
  strip: THREE.Mesh | null,
  mat: THREE.ShaderMaterial,
  satId: number | null,
  alpha: number,
  visualTime: number,
): void {
  mat.uniforms.uAlpha.value = alpha;
  mat.uniforms.uTime.value = visualTime;
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
  strip.scale.set(0.004, len, 1);
  strip.quaternion.setFromUnitVectors(_upY, _dir);
}

/* -------------------------------------------------------------------------- */
/* Dish model (earth-fixed)                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The user terminal: a flat white phased-array panel on a short black pole
 * with a tripod base. No moving parts — the beam steers electronically, which
 * is why the dish never rotates even as it tracks satellites. Sizes are
 * exaggerated for visibility. The driver computes matching world anchors.
 */
export function DishModel() {
  const user = useSimStore((s) => s.user);
  const local = useMemo(() => {
    const v = new THREE.Vector3();
    latLonToEarthFixed(user.lat, user.lon, stationSize.baseRadius, v);
    return v;
  }, [user]);

  const orientation = useMemo(() => {
    _radial.copy(local).normalize();
    return new THREE.Quaternion().setFromUnitVectors(_upY, _radial);
  }, [local]);

  const legs = useMemo(() => [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle) => {
    const top = new THREE.Vector3(0, 0.0037, 0);
    const foot = new THREE.Vector3(Math.cos(angle) * 0.0038, 0.00015, Math.sin(angle) * 0.0038);
    const direction = foot.clone().sub(top);
    return {
      position: top.add(foot).multiplyScalar(0.5),
      length: direction.length(),
      quaternion: new THREE.Quaternion().setFromUnitVectors(_upY, direction.normalize()),
    };
  }), []);

  return (
    <group position={[local.x, local.y, local.z]} quaternion={orientation}>
      {/* A small, earth-fixed pad makes the feet visibly rest on the surface. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.00035, 0]} raycast={() => null}>
        <circleGeometry args={[0.008, 48]} />
        <meshStandardMaterial color="#526252" roughness={1} />
      </mesh>
      {legs.map((leg, i) => (
        <mesh key={i} position={leg.position} quaternion={leg.quaternion}>
          <cylinderGeometry args={[0.00024, 0.00032, leg.length, 8]} />
          <meshStandardMaterial color="#27323b" metalness={0.45} roughness={0.55} />
        </mesh>
      ))}
      <mesh position={[0, 0.003, 0]}>
        <cylinderGeometry args={[0.00042, 0.0005, 0.006, 10]} />
        <meshStandardMaterial color="#27323b" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* The panel is fixed: only its electronic radio beam changes direction. */}
      <group position={[0, stationSize.dishApertureHeight, 0]} rotation={[0.3, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.013, 0.0006, 0.0104]} />
          <meshStandardMaterial color="#dce5e9" roughness={0.8} metalness={0.08} />
        </mesh>
        <mesh position={[0, -0.00045, 0]}>
          <boxGeometry args={[0.0132, 0.0003, 0.0106]} />
          <meshStandardMaterial color="#475664" roughness={0.7} />
        </mesh>
      </group>
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
  const digits = useMemo(() => makeDigitTexture(), []);
  const primaryMat = useMemo(() => makeBeamMaterial(digits), [digits]);
  const secondaryMat = useMemo(() => makeBeamMaterial(digits), [digits]);
  const visualTime = useRef(0);
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
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  const coreLine = useMemo(
    () => {
      const line = new THREE.Line(coreGeometry, coreMaterial);
      line.visible = false;
      // Its positions change every frame; the original zero-length bounding
      // sphere would incorrectly cull the core in the close ground camera.
      line.frustumCulled = false;
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
      digits.dispose();
    };
  }, [geometry, coreGeometry, primaryMat, secondaryMat, coreMaterial, digits]);

  useFrame((_, dt) => {
    if (useSimStore.getState().playing || useSimStore.getState().storyActive) {
      visualTime.current += Math.min(dt, 0.05);
    }
    const connected = simState.connectedSat;
    const secondary = simState.secondarySat;
    updateBeamStrip(primaryRef.current, primaryMat, connected, 1, visualTime.current);
    updateBeamStrip(secondaryRef.current, secondaryMat, secondary, simState.secondaryAlpha, visualTime.current);

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
