import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  ANTENNA_Y,
  BEAM_START,
  WAVE_RINGS,
  directionFromAzEl,
  getTarget,
} from "@/lib/steering";
import { makeGlowTexture } from "@/lib/textures";
import { steerClock, useSteerLab } from "./steerStore";

/**
 * The communication beam, rebuilt every frame from the *current* gimbal
 * direction, so the wavefronts and the laser sweep with the antenna instead of
 * staying fixed in space.
 *
 * RF mode: a narrow column of glowing orange constant-phase wavefronts —
 * explanatory surfaces, not individual photons. Optical mode: a thin violet
 * laser with travelling pulses and the same data-packet layer on top.
 */

const Z_AXIS = new THREE.Vector3(0, 0, 1);

/* -------------------------------------------------------------------------- */
/* Wavefront ring shader (annulus in the local XY plane, facing +Z)           */
/* -------------------------------------------------------------------------- */

const RING_VERTEX = /* glsl */ `
  attribute float aSide;
  uniform vec2 uCam;
  varying float vSide;
  varying float vNear;
  void main() {
    vec3 radial = normalize(vec3(position.x, position.y, 0.0));
    vec2 dir = normalize(uCam + vec2(0.0001));
    vNear = smoothstep(-0.45, 0.55, dot(normalize(radial.xy), dir));
    vSide = aSide;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const RING_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uHot;
  uniform float uOpacity;
  varying float vSide;
  varying float vNear;
  void main() {
    float band = 1.0 - abs(vSide);
    float core = smoothstep(0.45, 1.0, band);
    float halo = pow(max(band, 0.0), 1.7) * 0.55;
    float a = uOpacity * vNear * (core * 0.95 + halo * 0.5);
    if (a < 0.003) discard;
    vec3 col = mix(uColor, uHot, core * 0.75);
    gl_FragColor = vec4(col * (0.72 + 0.75 * core), a);
  }
`;

function makeRingGeometry(segments = 128): THREE.BufferGeometry {
  const position: number[] = [];
  const side: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cx = Math.cos(angle);
    const cy = Math.sin(angle);
    for (const s of [-1, 1]) {
      const r = 1 + s * 0.05;
      position.push(cx * r, cy * r, 0);
      side.push(s);
    }
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    index.push(a, a + 1, a + 3, a, a + 3, a + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute("aSide", new THREE.Float32BufferAttribute(side, 1));
  geometry.setIndex(index);
  return geometry;
}

function makeRingMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uCam: { value: new THREE.Vector2(0, 1) },
      uColor: { value: new THREE.Color(1.0, 0.3, 0.04) },
      uHot: { value: new THREE.Color(1.0, 0.7, 0.34) },
      uOpacity: { value: 1 },
    },
    vertexShader: RING_VERTEX,
    fragmentShader: RING_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0 || 1)));
  return t * t * (3 - 2 * t);
}

/* -------------------------------------------------------------------------- */
/* Beam                                                                        */
/* -------------------------------------------------------------------------- */

export function BeamLink() {
  const group = useRef<THREE.Group>(null);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const packets = useRef<(THREE.Mesh | null)[]>([]);
  const pulses = useRef<(THREE.Sprite | null)[]>([]);
  const laserCore = useRef<THREE.Mesh>(null);
  const laserGlow = useRef<THREE.Mesh>(null);
  const cone = useRef<THREE.Mesh>(null);
  const endGlow = useRef<THREE.Sprite>(null);

  const tech = useSteerLab((s) => s.tech);
  const ringGeometry = useMemo(() => makeRingGeometry(), []);
  const ringMaterials = useMemo(
    () => Array.from({ length: WAVE_RINGS }, () => makeRingMaterial()),
    [],
  );
  const glow = useMemo(() => makeGlowTexture(), []);

  const packetMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: tech === "rf" ? "#ffb066" : "#c4b5fd",
        emissive: tech === "rf" ? "#ff7a1a" : "#a78bfa",
        emissiveIntensity: 2.6,
        toneMapped: false,
      }),
    [tech],
  );

  useEffect(
    () => () => {
      ringGeometry.dispose();
      for (const material of ringMaterials) material.dispose();
      packetMaterial.dispose();
    },
    [ringGeometry, ringMaterials, packetMaterial],
  );

  const tmpQuat = useMemo(() => new THREE.Quaternion(), []);
  const tmpDir = useMemo(() => new THREE.Vector3(), []);
  const tmpCam = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const node = group.current;
    if (!node) return;

    const { targetId, showWavefronts } = useSteerLab.getState();
    const target = getTarget(targetId);
    const range = target.range;
    const locked = steerClock.status === "locked";

    // Orient the whole beam assembly along the live gimbal direction.
    const [dx, dy, dz] = directionFromAzEl(steerClock.az, steerClock.el);
    tmpDir.set(dx, dy, dz).normalize();
    tmpQuat.setFromUnitVectors(Z_AXIS, tmpDir);
    node.position.set(0, ANTENNA_Y, 0);
    node.quaternion.copy(tmpQuat);
    node.updateMatrixWorld();

    // Camera position in beam-local XY for the crescent shading.
    tmpCam.copy(state.camera.position);
    node.worldToLocal(tmpCam);
    const planar = Math.hypot(tmpCam.x, tmpCam.y) || 1;
    const camX = tmpCam.x / planar;
    const camY = tmpCam.y / planar;

    const intro = steerClock.intro;
    const span = range - BEAM_START - 0.3;

    /* ----- RF wavefronts ----- */
    for (let i = 0; i < WAVE_RINGS; i++) {
      const mesh = rings.current[i];
      if (!mesh) continue;
      if (tech !== "rf" || !showWavefronts) {
        mesh.visible = false;
        continue;
      }
      const u = (i / WAVE_RINGS + steerClock.wave) % 1;
      const z = BEAM_START + u * span;
      const radius = 0.16 + u * 0.3; // deliberately narrow, mildly divergent
      const fade = smoothstep(0, 0.06, u) * (1 - smoothstep(0.88, 0.99, u));
      const opacity = 0.78 * fade * intro;
      mesh.visible = opacity > 0.004;
      mesh.position.set(0, 0, z);
      mesh.scale.set(radius, radius, 1);
      const material = ringMaterials[i];
      material.uniforms.uCam.value.set(camX, camY);
      material.uniforms.uOpacity.value = opacity;
    }

    /* ----- Faint RF beam volume ----- */
    if (cone.current) {
      cone.current.visible = tech === "rf";
      if (tech === "rf") {
        cone.current.position.set(0, 0, BEAM_START + span / 2);
        cone.current.scale.set(1, span, 1);
        const mat = cone.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.05 * intro;
      }
    }

    /* ----- Optical laser ----- */
    const laserOn = tech === "optical";
    if (laserCore.current && laserGlow.current) {
      laserCore.current.visible = laserOn;
      laserGlow.current.visible = laserOn;
      if (laserOn) {
        for (const mesh of [laserCore.current, laserGlow.current]) {
          mesh.position.set(0, 0, BEAM_START + span / 2);
          mesh.scale.set(1, span, 1);
        }
        const coreMat = laserCore.current.material as THREE.MeshBasicMaterial;
        const glowMat = laserGlow.current.material as THREE.MeshBasicMaterial;
        const pulse = 0.75 + 0.25 * Math.sin(steerClock.wave * Math.PI * 2);
        coreMat.opacity = (locked ? 0.95 : 0.55) * intro * pulse;
        glowMat.opacity = (locked ? 0.22 : 0.1) * intro;
      }
    }
    for (let i = 0; i < 3; i++) {
      const sprite = pulses.current[i];
      if (!sprite) continue;
      sprite.visible = laserOn && showWavefronts && intro > 0.4;
      if (sprite.visible) {
        const u = (steerClock.packet + i / 3) % 1;
        sprite.position.set(0, 0, BEAM_START + u * span);
        const mat = sprite.material as THREE.SpriteMaterial;
        mat.opacity = 0.8 * (1 - Math.abs(u - 0.5) * 0.8);
      }
    }

    /* ----- Data packets, once the link is locked ----- */
    for (let i = 0; i < 2; i++) {
      const mesh = packets.current[i];
      if (!mesh) continue;
      mesh.visible = locked;
      if (mesh.visible) {
        const phase = (steerClock.packet + i * 0.5) % 1;
        const outward = i === 0;
        const u = outward ? phase : 1 - phase;
        mesh.position.set(0, 0, BEAM_START + 0.2 + u * (span - 0.4));
        mesh.rotation.z = state.clock.elapsedTime * 2;
      }
    }

    /* ----- End-point connection glow ----- */
    if (endGlow.current) {
      endGlow.current.position.set(0, 0, range - 0.25);
      const mat = endGlow.current.material as THREE.SpriteMaterial;
      mat.opacity = (locked ? 0.85 : 0.22) * intro * (0.85 + 0.15 * Math.sin(state.clock.elapsedTime * 4));
      mat.color.set(locked ? (tech === "rf" ? "#ff8a3c" : "#a78bfa") : "#5f7ea8");
    }
  });

  return (
    <group ref={group}>
      {/* RF wavefront rings */}
      {Array.from({ length: WAVE_RINGS }, (_, i) => (
        <mesh
          key={`ring-${i}`}
          ref={(mesh) => {
            rings.current[i] = mesh;
          }}
          geometry={ringGeometry}
          material={ringMaterials[i]}
          visible={false}
          raycast={() => null}
        />
      ))}

      {/* Faint tapered RF beam volume */}
      <mesh ref={cone} rotation-x={Math.PI / 2} visible={false} raycast={() => null}>
        <cylinderGeometry args={[0.46, 0.18, 1, 24, 1, true]} />
        <meshBasicMaterial
          color="#ff7a1a"
          transparent
          opacity={0.05}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Optical laser: bright core + soft glow sleeve */}
      <mesh ref={laserCore} rotation-x={Math.PI / 2} visible={false} raycast={() => null}>
        <cylinderGeometry args={[0.012, 0.012, 1, 10]} />
        <meshBasicMaterial
          color="#e9d5ff"
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={laserGlow} rotation-x={Math.PI / 2} visible={false} raycast={() => null}>
        <cylinderGeometry args={[0.05, 0.05, 1, 14, 1, true]} />
        <meshBasicMaterial
          color="#a78bfa"
          transparent
          opacity={0.18}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      {Array.from({ length: 3 }, (_, i) => (
        <sprite
          key={`pulse-${i}`}
          ref={(sprite) => {
            pulses.current[i] = sprite;
          }}
          scale={[0.34, 0.34, 1]}
          visible={false}
          raycast={() => null}
        >
          <spriteMaterial
            map={glow}
            color="#c4b5fd"
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}

      {/* Data packets */}
      {Array.from({ length: 2 }, (_, i) => (
        <mesh
          key={`packet-${i}`}
          ref={(mesh) => {
            packets.current[i] = mesh;
          }}
          material={packetMaterial}
          visible={false}
          raycast={() => null}
        >
          <boxGeometry args={[0.1, 0.1, 0.22]} />
        </mesh>
      ))}

      {/* Aperture glow at the terminal exit */}
      <sprite position={[0, 0, BEAM_START]} scale={[0.8, 0.8, 1]} raycast={() => null}>
        <spriteMaterial
          map={glow}
          color={tech === "rf" ? "#ff8a3c" : "#a78bfa"}
          transparent
          opacity={0.45}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>

      {/* End-point glow (connection indicator) */}
      <sprite ref={endGlow} scale={[1.5, 1.5, 1]} raycast={() => null}>
        <spriteMaterial
          map={glow}
          color="#5f7ea8"
          transparent
          opacity={0.2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}
