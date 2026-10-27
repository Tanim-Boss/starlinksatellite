import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  ARRAY_N,
  arrayFactor,
  directionFromAngles,
  elementPhaseDeg,
  phaseHue,
  steeringFromAngles,
  type BeamView,
} from "@/lib/phasedArray";
import { makeGlowTexture } from "@/lib/textures";
import { antennaClock, beamState, useBeamLab } from "./antennaStore";

const UP = new THREE.Vector3(0, 1, 0);
const BEAM_LEN = 10.1;
const BEAM_ORIGIN_Y = 0.3;

/* -------------------------------------------------------------------------- */
/* Main beam                                                                  */
/* -------------------------------------------------------------------------- */

// More closely spaced wavefronts make propagation legible at a glance, as in the
// reference animation, while remaining a schematic rather than wavelength-scale model.
const WAVE_RING_COUNT = 12;

/**
 * The main lobe. Its direction is computed from the steering angles on every
 * frame — the cone follows the array factor, not a hard-coded animation.
 * Its width is a visual exaggeration: a real 16 × 16 array's main lobe is only
 * a few degrees wide, too thin to see on a sky-scale diagram.
 */
export function MainBeam({ view }: { view: BeamView }) {
  const camera = useBeamLab((s) => s.camera);
  const group = useRef<THREE.Group>(null);
  const ringMeshes = useRef<(THREE.Mesh | null)[]>([]);
  const ringMaterials = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const beamAxis = useMemo(() => new THREE.Vector3(), []);

  const cone = useMemo(() => {
    const g = new THREE.ConeGeometry(0.62, BEAM_LEN, 40, 1, true);
    g.rotateX(Math.PI);
    g.translate(0, BEAM_LEN / 2, 0);
    return g;
  }, []);
  const wideCone = useMemo(() => {
    const g = new THREE.ConeGeometry(1.5, BEAM_LEN * 0.92, 36, 1, true);
    g.rotateX(Math.PI);
    g.translate(0, (BEAM_LEN * 0.92) / 2, 0);
    return g;
  }, []);
  const coreCone = useMemo(() => {
    const g = new THREE.ConeGeometry(0.18, BEAM_LEN * 0.97, 24, 1, true);
    g.rotateX(Math.PI);
    g.translate(0, (BEAM_LEN * 0.97) / 2, 0);
    return g;
  }, []);
  const disc = useMemo(() => {
    const g = new THREE.RingGeometry(0.94, 1, 64);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const glow = useMemo(() => makeGlowTexture(), []);

  const isBeam = view === "beam";
  const isWave = view === "wave";
  // Amber wavefronts echo the reference animation; beam and pattern modes retain
  // the lab's cyan analytical palette.
  const beamColor = isWave ? "#ff7a3d" : "#3ddbd9";
  const wavefrontColor = isWave ? "#ff8a4a" : "#7ee7e2";
  const coreColor = isWave ? "#ffc08a" : "#9ff7f2";
  // From the panel camera the cone is seen end-on and would cover the lattice,
  // so it is drawn faintly there; the close-up is about the elements.
  const dim = camera === "panel" ? 0.4 : 1;
  const opacity = (isBeam ? 0.14 : view === "pattern" ? 0.045 : 0.06) * dim;

  useFrame(() => {
    if (!group.current) return;
    const dir = directionFromAngles(beamState.azDeg, beamState.elDeg);
    beamAxis.set(dir.ux, dir.uy, dir.uz);
    group.current.quaternion.setFromUnitVectors(UP, beamAxis);

    const t = antennaClock.waveTime;
    for (let n = 0; n < WAVE_RING_COUNT; n++) {
      const mesh = ringMeshes.current[n];
      const mat = ringMaterials.current[n];
      if (!mesh || !mat) continue;
      const progress = (t * 0.26 + n / WAVE_RING_COUNT) % 1;
      const y = 0.7 + progress * (BEAM_LEN - 1.1);
      mesh.position.y = y;
      const s = 0.16 + progress * 0.52;
      mesh.scale.set(s, 1, s);
      mat.opacity = (1 - progress) * (isBeam ? 0.34 : isWave ? 0.42 : 0.08) * dim;
    }

  });

  return (
    <group position={[0, BEAM_ORIGIN_Y, 0]}>
      <group ref={group}>
        <mesh geometry={wideCone} renderOrder={2} raycast={() => null}>
          <meshBasicMaterial
            color={isWave ? "#8c321e" : "#2b9fae"}
            transparent
            opacity={opacity * 0.45}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh geometry={cone} renderOrder={3} raycast={() => null}>
          <meshBasicMaterial
            color={beamColor}
            transparent
            opacity={opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh geometry={coreCone} renderOrder={4} raycast={() => null}>
          <meshBasicMaterial
            color={coreColor}
            transparent
            opacity={opacity * 1.35}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>

        {/* Axis core */}
        <mesh position={[0, BEAM_LEN / 2, 0]} raycast={() => null}>
          <cylinderGeometry args={[0.009, 0.009, BEAM_LEN, 6]} />
          <meshBasicMaterial
            color={coreColor}
            transparent
            opacity={(isBeam ? 0.65 : isWave ? 0.34 : 0.22) * dim}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {/* Expanding wavefronts along the beam, perpendicular to its axis. */}
        {Array.from({ length: WAVE_RING_COUNT }).map((_, n) => (
          <mesh
            key={n}
            ref={(el) => {
              ringMeshes.current[n] = el;
            }}
            geometry={disc}
            renderOrder={5}
            raycast={() => null}
          >
            <meshBasicMaterial
              ref={(el) => {
                ringMaterials.current[n] = el;
              }}
              color={wavefrontColor}
              transparent
              opacity={0}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        ))}

        {/* Dome marker where the beam axis meets the sky. */}
        <sprite position={[0, BEAM_LEN - 0.2, 0]} scale={[1.9, 1.9, 1]} raycast={() => null}>
          <spriteMaterial
            map={glow}
            color={wavefrontColor}
            transparent
            opacity={(isBeam ? 0.65 : isWave ? 0.58 : 0.25) * dim}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
        <mesh
          position={[0, BEAM_LEN - 0.2, 0]}
          rotation-x={-Math.PI / 2}
          raycast={() => null}
        >
          <ringGeometry args={[0.42, 0.48, 56]} />
          <meshBasicMaterial
            color={coreColor}
            transparent
            opacity={(isBeam ? 0.6 : isWave ? 0.45 : 0.2) * dim}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {isBeam && camera === "sky" && (
          <Html
            position={[0, 5.55, 0]}
            center
            zIndexRange={[8, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div className="hidden whitespace-nowrap rounded-full border border-signal/30 bg-[#04121a]/85 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-signal backdrop-blur sm:block">
              Main lobe · simplified envelope
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Interference sheet                                                         */
/* -------------------------------------------------------------------------- */

const SHEET_SIZE = 15;
const SHEET_HEIGHT = 2.55;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * A horizontal sheet above the panel showing the *combined* field. For every
 * point we know the direction from the array, so the normalised array factor
 * gives the interference envelope. Constructive regions glow cyan; directions
 * where the field cancels stay dim amber. The travelling bands are a schematic
 * indication of wavefront motion, not a physical wavelength on screen.
 */
const fragmentShader = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uAmp;
  uniform float uUx;
  uniform float uUz;
  uniform float uSize;
  uniform float uHeight;
  varying vec2 vUv;

  float dirichlet(float n, float psi) {
    float s = sin(psi * 0.5);
    if (abs(s) < 0.0001) return n;
    return sin(n * psi * 0.5) / s;
  }

  void main() {
    vec2 p = (vUv - 0.5) * uSize;
    float r = length(p);
    float r3 = sqrt(dot(p, p) + uHeight * uHeight);
    vec3 u = vec3(p.x, uHeight, -p.y) / r3;

    float psiX = 3.14159265 * (u.x - uUx);
    float psiZ = 3.14159265 * (u.z - uUz);
    float af = abs(dirichlet(16.0, psiX) / 16.0 * dirichlet(16.0, psiZ) / 16.0);
    float env = smoothstep(0.035, 0.72, af);

    float band = 0.5 + 0.5 * sin(r * 4.1 - uTime * 3.0);
    float edge = smoothstep(1.0, 0.55, length(vUv - 0.5) * 2.0);

    vec3 warm = vec3(0.55, 0.28, 0.04);
    vec3 cool = vec3(0.16, 0.82, 0.84);
    vec3 col = mix(warm, cool, env);
    float alpha = (0.055 + 0.5 * env) * (0.62 + 0.38 * band) * edge * uAmp;

    gl_FragColor = vec4(col * (0.75 + 0.9 * env) * (0.8 + 0.2 * band), alpha);
  }
`;

export function InterferenceSheet() {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 1 },
      uUx: { value: 0 },
      uUz: { value: 0 },
      uSize: { value: SHEET_SIZE },
      uHeight: { value: SHEET_HEIGHT },
    }),
    [],
  );

  useFrame(() => {
    if (!material.current) return;
    const u = material.current.uniforms;
    u.uTime.value = antennaClock.waveTime;
    const steer = steeringFromAngles(beamState.azDeg, beamState.elDeg);
    u.uUx.value = steer.ux;
    u.uUz.value = steer.uz;
  });

  return (
    <group>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, SHEET_HEIGHT, 0]}
        renderOrder={1}
        raycast={() => null}
      >
        <planeGeometry args={[SHEET_SIZE, SHEET_SIZE, 1, 1]} />
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh position={[0, SHEET_HEIGHT + 0.005, 0]} rotation-x={-Math.PI / 2} raycast={() => null}>
        <ringGeometry args={[SHEET_SIZE * 0.46, SHEET_SIZE * 0.462, 128]} />
        <meshBasicMaterial
          color="#3ddbd9"
          transparent
          opacity={0.22}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <Html
        position={[0, SHEET_HEIGHT + 0.18, SHEET_SIZE * 0.47]}
        center
        zIndexRange={[8, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div className="hidden whitespace-nowrap rounded-full border border-white/10 bg-[#040a14]/75 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-faint backdrop-blur md:block">
          Interference sheet · |array factor|
        </div>
      </Html>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Individual element wavefronts                                              */
/* -------------------------------------------------------------------------- */

const SOURCE_INDICES = [0, 5, 10, 15];
const SPACING = 0.275;

function sourcePosition(ii: number, jj: number) {
  return {
    x: (ii - (ARRAY_N - 1) / 2) * SPACING,
    z: ((ARRAY_N - 1) / 2 - jj) * SPACING,
  };
}

/**
 * Expanding rings from sixteen representative elements (every fifth element
 * along each axis). Their emission offset is their commanded phase, so the
 * phase gradient is visible as a staggered set of rings. Additive blending
 * makes their overlaps read as constructive reinforcement.
 */
export function ElementWavefrontRings() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  // The close-up camera is inside the near field, so the rings are drawn
  // smaller and fainter there or they would bury the element colours.
  const camera = useBeamLab((s) => s.camera);
  const closeUp = camera === "panel";
  const count = SOURCE_INDICES.length * SOURCE_INDICES.length * 3;
  const geometry = useMemo(() => {
    const g = new THREE.RingGeometry(0.972, 1, 72);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let n = 0; n < count; n++) {
      dummy.position.set(0, 0.26, 0);
      dummy.scale.set(0.001, 1, 0.001);
      dummy.updateMatrix();
      mesh.setMatrixAt(n, dummy.matrix);
      mesh.setColorAt(n, color.setRGB(0, 0, 0));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count, color, dummy]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (!mesh.instanceColor) {
      mesh.setColorAt(0, color.setRGB(0, 0, 0));
    }
    const steer = steeringFromAngles(beamState.azDeg, beamState.elDeg);
    const travel = antennaClock.waveTime * 0.19;
    let idx = 0;
    for (let a = 0; a < SOURCE_INDICES.length; a++) {
      for (let b = 0; b < SOURCE_INDICES.length; b++) {
        const i = SOURCE_INDICES[a];
        const j = SOURCE_INDICES[b];
        const { x, z } = sourcePosition(i, j);
        const phaseDeg = elementPhaseDeg(i, j, steer);
        const phaseOffset = phaseDeg / 360;

        for (let k = 0; k < 3; k++) {
          const progress = (((travel + phaseOffset + k / 3) % 1) + 1) % 1;
          const radius = 0.2 + progress * (closeUp ? 2.4 : 6.6);
          dummy.position.set(x, 0.26, z);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(radius, 1, radius);
          dummy.updateMatrix();
          mesh.setMatrixAt(idx, dummy.matrix);

          const brightness = Math.pow(1 - progress, 1.7) * (closeUp ? 0.42 : 0.8);
          color.setHSL(phaseHue(phaseDeg) / 360, 0.8, 0.6);
          color.multiplyScalar(brightness);
          mesh.setColorAt(idx, color);
          idx++;
        }
      }
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      frustumCulled={false}
      raycast={() => null}
      renderOrder={4}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Radiation pattern surface                                                  */
/* -------------------------------------------------------------------------- */

const AZ_SEGMENTS = 96;
const EL_SEGMENTS = 30;
const PATTERN_MIN_R = 2.1;
const PATTERN_SPAN = 7.0;

function buildPatternGeometry() {
  const vertCount = (AZ_SEGMENTS + 1) * (EL_SEGMENTS + 1);
  const positions = new Float32Array(vertCount * 3);
  const colors = new Float32Array(vertCount * 3);
  const indices: number[] = [];

  for (let v = 0; v <= EL_SEGMENTS; v++) {
    for (let u = 0; u <= AZ_SEGMENTS; u++) {
      const idx = v * (AZ_SEGMENTS + 1) + u;
      positions[idx * 3 + 1] = 1; // replaced on the first update
      colors[idx * 3] = 0.3;
      colors[idx * 3 + 1] = 0.6;
      colors[idx * 3 + 2] = 0.65;
    }
  }
  for (let v = 0; v < EL_SEGMENTS; v++) {
    for (let u = 0; u < AZ_SEGMENTS; u++) {
      const a = v * (AZ_SEGMENTS + 1) + u;
      const b = a + 1;
      const c = a + (AZ_SEGMENTS + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), PATTERN_MIN_R + PATTERN_SPAN + 0.5);
  return geometry;
}

const PATTERN_LOW = new THREE.Color("#152a44");
const PATTERN_HIGH = new THREE.Color("#6ff7ee");

/**
 * A 3-D cut of the array factor over the upper hemisphere, radii exaggerated.
 * The surface, its colours and the labels are recomputed from the same array
 * factor as the beam direction; side lobes and nulls are therefore in the
 * right places rather than hand-placed.
 */
export function RadiationPattern({ showLabels }: { showLabels: boolean }) {
  const geometry = useMemo(buildPatternGeometry, []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.62,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  const mainLabel = useRef<THREE.Group>(null);
  const sideLabel = useRef<THREE.Group>(null);
  const nullLabel = useRef<THREE.Group>(null);
  const last = useRef({ az: Number.NaN, el: Number.NaN });
  const tmpColor = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    if (
      Math.abs(beamState.azDeg - last.current.az) < 0.02 &&
      Math.abs(beamState.elDeg - last.current.el) < 0.02
    ) {
      return;
    }
    last.current.az = beamState.azDeg;
    last.current.el = beamState.elDeg;

    const steer = steeringFromAngles(beamState.azDeg, beamState.elDeg);
    const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
    const col = geometry.getAttribute("color") as THREE.BufferAttribute;
    const pa = pos.array as Float32Array;
    const ca = col.array as Float32Array;

    let idx = 0;
    for (let v = 0; v <= EL_SEGMENTS; v++) {
      const elDeg = 4 + (86 * v) / EL_SEGMENTS;
      const el = (elDeg * Math.PI) / 180;
      const cosEl = Math.cos(el);
      const sinEl = Math.sin(el);
      for (let u = 0; u <= AZ_SEGMENTS; u++) {
        const azDeg = -180 + (360 * u) / AZ_SEGMENTS;
        const az = (azDeg * Math.PI) / 180;
        const gain = arrayFactor(azDeg, elDeg, steer);
        const radius = PATTERN_MIN_R + PATTERN_SPAN * Math.pow(gain, 0.6);
        pa[idx * 3] = radius * cosEl * Math.sin(az);
        pa[idx * 3 + 1] = radius * sinEl;
        pa[idx * 3 + 2] = radius * cosEl * Math.cos(az);

        tmpColor.copy(PATTERN_LOW).lerp(PATTERN_HIGH, Math.pow(gain, 0.72));
        ca[idx * 3] = tmpColor.r;
        ca[idx * 3 + 1] = tmpColor.g;
        ca[idx * 3 + 2] = tmpColor.b;
        idx++;
      }
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;

    const sinEl = Math.sin((steer.elDeg * Math.PI) / 180);
    const mainDir = directionFromAngles(steer.azDeg, steer.elDeg);
    mainLabel.current?.position.set(
      mainDir.ux * (PATTERN_MIN_R + PATTERN_SPAN + 0.35),
      mainDir.uy * (PATTERN_MIN_R + PATTERN_SPAN + 0.35),
      mainDir.uz * (PATTERN_MIN_R + PATTERN_SPAN + 0.35),
    );

    // First side-lobe peak of a uniform N-element array: Δu ≈ 4.493/(πN).
    const sideOffset = 4.493 / (Math.PI * ARRAY_N);
    let sideEl = Math.asin(Math.min(1, sinEl + sideOffset)) * (180 / Math.PI);
    if (sideEl > 88) sideEl = Math.asin(Math.max(-1, sinEl - sideOffset)) * (180 / Math.PI);
    const sideDir = directionFromAngles(steer.azDeg, sideEl);
    const sideGain = arrayFactor(steer.azDeg, sideEl, steer);
    const sideR = PATTERN_MIN_R + PATTERN_SPAN * Math.pow(sideGain, 0.6);
    sideLabel.current?.position.set(sideDir.ux * sideR, sideDir.uy * sideR, sideDir.uz * sideR);

    // First null: Δu = 2/N.
    const nullOffset = 2 / ARRAY_N;
    let nullEl = Math.asin(Math.min(1, sinEl + nullOffset)) * (180 / Math.PI);
    if (nullEl > 88) nullEl = Math.asin(Math.max(-1, sinEl - nullOffset)) * (180 / Math.PI);
    const nullDir = directionFromAngles(steer.azDeg, nullEl);
    nullLabel.current?.position.set(
      nullDir.ux * (PATTERN_MIN_R + 0.55),
      nullDir.uy * (PATTERN_MIN_R + 0.55),
      nullDir.uz * (PATTERN_MIN_R + 0.55),
    );
  });

  return (
    <group>
      <mesh geometry={geometry} material={material} raycast={() => null} renderOrder={2} />
      <mesh geometry={geometry} raycast={() => null} renderOrder={3}>
        <meshBasicMaterial
          wireframe
          color="#74e8e2"
          transparent
          opacity={0.09}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {showLabels && (
        <>
          <group ref={mainLabel}>
            <Html center zIndexRange={[8, 0]} style={{ pointerEvents: "none" }}>
              <div className="whitespace-nowrap rounded-full border border-signal/35 bg-[#04121a]/85 px-2 py-0.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-signal">
                Main lobe · 0 dB
              </div>
            </Html>
          </group>
          <group ref={sideLabel}>
            <Html center zIndexRange={[8, 0]} style={{ pointerEvents: "none" }}>
              <div
                className="hidden whitespace-nowrap rounded-full border border-warn/30 bg-[#120d04]/85 px-2 py-0.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-warn sm:block"
                style={{ transform: "translate(26px, -4px)" }}
              >
                Side lobe · −13 dB
              </div>
            </Html>
          </group>
          <group ref={nullLabel}>
            <Html center zIndexRange={[8, 0]} style={{ pointerEvents: "none" }}>
              <div
                className="hidden whitespace-nowrap rounded-full border border-white/15 bg-[#040a14]/85 px-2 py-0.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-faint sm:block"
                style={{ transform: "translate(-22px, 6px)" }}
              >
                Null
              </div>
            </Html>
          </group>
        </>
      )}
    </group>
  );
}
