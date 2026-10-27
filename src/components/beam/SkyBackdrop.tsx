import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { makeGlowTexture } from "@/lib/textures";
import { makeSheenTexture } from "./beamTextures";

/* -------------------------------------------------------------------------- */
/* Sky                                                                        */
/* -------------------------------------------------------------------------- */

const skyVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vWorld = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragment = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    float h = clamp(vWorld.y, -1.0, 1.0);
    vec3 floorCol = vec3(0.012, 0.020, 0.038);
    vec3 haze = vec3(0.065, 0.105, 0.165);
    vec3 zenith = vec3(0.011, 0.019, 0.044);

    // A thin, cold band of airglow just above the horizon.
    float d = (h - 0.035) * 9.0;
    float band = exp(-d * d);
    vec3 col = mix(floorCol, zenith, smoothstep(0.0, 0.7, h));
    col = mix(col, haze, band * 0.55 * smoothstep(-0.25, 0.05, h));

    // Slightly warmer and darker behind the viewer's feet.
    col += vec3(0.006, 0.012, 0.026) * smoothstep(-0.35, 0.15, h);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function SkyShell() {
  return (
    <mesh scale={[52, 52, 52]} raycast={() => null}>
      <sphereGeometry args={[1, 40, 28]} />
      <shaderMaterial
        vertexShader={skyVertex}
        fragmentShader={skyFragment}
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/* Stars                                                                      */
/* -------------------------------------------------------------------------- */

function makeStarField(count: number, radius: number, seed: number): THREE.BufferGeometry {
  const positions = new Float32Array(count * 3);
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < count; i++) {
    const u = rnd() * 1.15 - 0.12; // keep the lower sky sparse
    const theta = rnd() * Math.PI * 2;
    const r = radius + rnd() * 10;
    const ring = Math.sqrt(Math.max(0, 1 - u * u));
    positions[i * 3] = Math.cos(theta) * ring * r;
    positions[i * 3 + 1] = u * r;
    positions[i * 3 + 2] = Math.sin(theta) * ring * r;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return g;
}

function Stars() {
  const group = useRef<THREE.Group>(null);
  const fine = useMemo(() => makeStarField(1300, 36, 29), []);
  const bright = useMemo(() => makeStarField(160, 40, 71), []);
  const sprite = useMemo(() => makeGlowTexture(), []);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.0025;
  });

  return (
    <group ref={group} raycast={() => null}>
      <points geometry={fine} raycast={() => null}>
        <pointsMaterial
          map={sprite}
          color="#c8dbf5"
          size={0.17}
          sizeAttenuation
          transparent
          opacity={0.62}
          depthWrite={false}
          fog={false}
          alphaTest={0.02}
          toneMapped={false}
        />
      </points>
      <points geometry={bright} raycast={() => null}>
        <pointsMaterial
          map={sprite}
          color="#e6f1ff"
          size={0.42}
          sizeAttenuation
          transparent
          opacity={0.85}
          depthWrite={false}
          fog={false}
          alphaTest={0.02}
          toneMapped={false}
        />
      </points>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Ground                                                                     */
/* -------------------------------------------------------------------------- */

export function SkyBackdrop() {
  const sheen = useMemo(() => makeSheenTexture(), []);

  return (
    <>
      <SkyShell />
      <Stars />

      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} raycast={() => null}>
        <circleGeometry args={[36, 96]} />
        <meshStandardMaterial color="#04070d" roughness={0.48} metalness={0.3} />
      </mesh>

      {/* A cold pool of light on the floor, strongest around the tripod. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, 0]} raycast={() => null}>
        <circleGeometry args={[11, 64]} />
        <meshBasicMaterial
          map={sheen}
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}
