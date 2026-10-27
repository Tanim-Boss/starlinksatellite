import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { makeGlowTexture } from "@/lib/textures";

/**
 * Cinematic deep-space backdrop: a navy-black gradient shell, two layers of
 * stars for parallax, and two very faint nebula glows. No ground — every
 * object here is on orbit.
 */

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
    vec3 zenith = vec3(0.008, 0.014, 0.034);
    vec3 mid = vec3(0.016, 0.028, 0.062);
    vec3 nadir = vec3(0.004, 0.007, 0.018);
    vec3 col = mix(nadir, mid, smoothstep(-0.9, 0.15, h));
    col = mix(col, zenith, smoothstep(0.1, 0.95, h));
    // A whisper of warm light in one quadrant keeps the black from flattening.
    float warmth = exp(-pow((vWorld.x - 0.55) * 3.2, 2.0) - pow((vWorld.y - 0.25) * 3.6, 2.0));
    col += vec3(0.028, 0.014, 0.006) * warmth;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function makeStarField(count: number, radius: number, seed: number): THREE.BufferGeometry {
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < count; i++) {
    // Even distribution over the sphere (uniform in solid angle).
    const u = rnd() * 2 - 1;
    const theta = rnd() * Math.PI * 2;
    const r = radius + rnd() * 12;
    const ring = Math.sqrt(Math.max(0, 1 - u * u));
    positions[i * 3] = Math.cos(theta) * ring * r;
    positions[i * 3 + 1] = u * r;
    positions[i * 3 + 2] = Math.sin(theta) * ring * r;
    scales[i] = 0.55 + rnd() * 0.9;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
  return geometry;
}

export function SpaceBackdrop() {
  const group = useRef<THREE.Group>(null);
  const fine = useMemo(() => makeStarField(1500, 42, 29), []);
  const bright = useMemo(() => makeStarField(220, 46, 71), []);
  const sprite = useMemo(() => makeGlowTexture(), []);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.0018;
  });

  return (
    <>
      <mesh scale={[64, 64, 64]} raycast={() => null}>
        <sphereGeometry args={[1, 40, 28]} />
        <shaderMaterial
          vertexShader={skyVertex}
          fragmentShader={skyFragment}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      <group ref={group} raycast={() => null}>
        <points geometry={fine} raycast={() => null}>
          <pointsMaterial
            map={sprite}
            color="#c8dbf5"
            size={0.16}
            sizeAttenuation
            transparent
            opacity={0.6}
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
            size={0.38}
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

      {/* Faint nebula pools, far enough back to never meet the geometry. */}
      <sprite position={[-26, 9, -30]} scale={[34, 34, 1]} raycast={() => null}>
        <spriteMaterial
          map={sprite}
          color="#2a4d8f"
          transparent
          opacity={0.10}
          depthWrite={false}
          fog={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
      <sprite position={[24, -6, -26]} scale={[28, 28, 1]} raycast={() => null}>
        <spriteMaterial
          map={sprite}
          color="#5b2f7a"
          transparent
          opacity={0.08}
          depthWrite={false}
          fog={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
    </>
  );
}
