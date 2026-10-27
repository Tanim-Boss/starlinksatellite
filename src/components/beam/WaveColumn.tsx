import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  ARRAY_ROWS,
  DISH_Y,
  SKY_RADIUS,
  WAVE_RINGS,
  directionFrom,
  phaseWord,
  scanAngleFromElevation,
} from "@/lib/dishBeam";
import { beamClock, useBeamLab } from "./beamStore";
import { makeCodeTexture } from "./beamTextures";

/**
 * The wavefront column: concentric surfaces of constant phase travelling from
 * the panel toward the satellite.
 *
 * Each ring is a flat annulus whose shader keeps the half facing the camera
 * bright and lets the far side fall away, which is what turns a circle into
 * the open orange crescents of the reference animation. The ring spacing and
 * width are exaggerated; the binary word riding each front is the quantised
 * phase of one array row, computed from the current scan angle.
 */

const UP = new THREE.Vector3(0, 1, 0);
const START = 0.55;
const END = SKY_RADIUS - 0.4;
const SPAN = END - START;

const RING_VERTEX = /* glsl */ `
  attribute float aSide;
  uniform vec2 uCam;
  varying float vSide;
  varying float vNear;

  void main() {
    vec3 radial = normalize(vec3(position.x, 0.0, position.z));
    vec2 dir = normalize(uCam + vec2(0.0001));
    // Bright on the side of the ring nearest the camera, gone on the far side.
    vNear = smoothstep(-0.45, 0.55, dot(normalize(radial.xz), dir));
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

function makeRingGeometry(segments = 192): THREE.BufferGeometry {
  const position: number[] = [];
  const side: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cx = Math.cos(angle);
    const cz = Math.sin(angle);
    for (const s of [-1, 1]) {
      const r = 1 + s * 0.04;
      position.push(cx * r, 0, cz * r);
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
      // Raw components: the custom shader writes straight to the framebuffer,
      // so these are the sRGB values we actually want on screen.
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

export function WaveColumn({ compact }: { compact: boolean }) {
  const group = useRef<THREE.Group>(null);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const labels = useRef<(THREE.Sprite | null)[]>([]);

  const geometry = useMemo(() => makeRingGeometry(), []);
  const materials = useMemo(
    () => Array.from({ length: WAVE_RINGS }, () => makeRingMaterial()),
    [],
  );
  const labelMaterials = useMemo(
    () =>
      Array.from({ length: WAVE_RINGS }, () => {
        const material = new THREE.SpriteMaterial({
          map: makeCodeTexture("0000"),
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        });
        material.userData.code = "";
        return material;
      }),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      for (const material of materials) material.dispose();
      for (const material of labelMaterials) {
        material.map?.dispose();
        material.dispose();
      }
    },
    [geometry, materials, labelMaterials],
  );

  useFrame((state) => {
    const node = group.current;
    if (!node) return;

    const direction = new THREE.Vector3(...directionFrom(beamClock.az, beamClock.el));
    node.quaternion.setFromUnitVectors(UP, direction);
    node.updateMatrixWorld();

    const cameraLocal = state.camera.position.clone();
    node.worldToLocal(cameraLocal);
    const planar = Math.hypot(cameraLocal.x, cameraLocal.z) || 1;
    const cameraX = cameraLocal.x / planar;
    const cameraZ = cameraLocal.z / planar;

    const scan = scanAngleFromElevation(beamClock.el);
    const pulse = 0.88 + 0.12 * Math.sin(beamClock.wave * Math.PI * 2);
    const codesOn = useBeamLab.getState().showCodes;
    // The wavefronts rise out of the panel over the first couple of seconds,
    // like the opening of the reference animation. Reset replays it.
    const intro = useBeamLab.getState().playing ? smoothstep(0, 1.6, beamClock.t) : 1;

    for (let i = 0; i < WAVE_RINGS; i++) {
      const mesh = rings.current[i];
      if (!mesh) continue;

      const u = (i / WAVE_RINGS + beamClock.wave) % 1;
      const y = START + u * SPAN;
      const radius = 0.5 + u * 1.5;
      const fade = smoothstep(0, 0.05, u) * (1 - smoothstep(0.9, 0.99, u));
      const opacity = 0.72 * fade * pulse * intro;

      const material = materials[i];
      mesh.position.set(0, y, 0);
      mesh.scale.set(radius, 1, radius);
      mesh.visible = opacity > 0.004;
      material.uniforms.uCam.value.set(cameraX, cameraZ);
      material.uniforms.uOpacity.value = opacity;

      const sprite = labels.current[i];
      if (!sprite) continue;
      const showLabel = codesOn && (compact ? i % 2 === 0 : true);
      sprite.visible = showLabel && fade * intro > 0.3;
      if (!sprite.visible) continue;

      sprite.position.set(cameraX * radius * 0.94, y + 0.05, cameraZ * radius * 0.94);

      const material2 = labelMaterials[i];
      const code = phaseWord(i % ARRAY_ROWS, scan);
      if (material2.userData.code !== code) {
        material2.map = makeCodeTexture(code);
        material2.userData.code = code;
        material2.needsUpdate = true;
      }
      material2.opacity = 0.9 * fade * intro;
    }
  });

  return (
    <group ref={group} position={[0, DISH_Y + 0.05, 0]}>
      {Array.from({ length: WAVE_RINGS }, (_, i) => (
        <mesh
          key={`ring-${i}`}
          ref={(mesh) => {
            rings.current[i] = mesh;
          }}
          geometry={geometry}
          material={materials[i]}
          visible={false}
          raycast={() => null}
        />
      ))}
      {Array.from({ length: WAVE_RINGS }, (_, i) => (
        <sprite
          key={`code-${i}`}
          ref={(sprite) => {
            labels.current[i] = sprite;
          }}
          material={labelMaterials[i]}
          scale={[0.52, 0.2, 1]}
          visible={false}
          raycast={() => null}
        />
      ))}
    </group>
  );
}
