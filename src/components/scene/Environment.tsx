import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { simClock } from "@/lib/simClock";
import { makeGlowTexture } from "@/lib/textures";

const GLOW = makeGlowTexture();

/** Starfield, sun glow (aligned with the directional light) and a small moon. */
export function Environment() {
  const moonRef = useRef<THREE.Group>(null);
  const starsRef = useRef<THREE.Points>(null);

  // Star points must never intercept pointer events (they would swallow
  // click-to-deselect everywhere outside Earth).
  useEffect(() => {
    if (starsRef.current) starsRef.current.raycast = () => null;
  }, []);

  useFrame(() => {
    if (!moonRef.current) return;
    const a = simClock.time * ((Math.PI * 2) / 3000) + 1.2;
    moonRef.current.position.set(Math.cos(a) * 16, 1.5, Math.sin(a) * 16);
  });

  return (
    <group>
      <Stars
        ref={starsRef}
        radius={140}
        depth={80}
        count={7000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />
      {/* Sun glow in the same direction as the scene's directional light */}
      <sprite position={[42, 20, 30]} scale={[24, 24, 1]} raycast={() => null}>
        <spriteMaterial map={GLOW} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.8} />
      </sprite>
      <sprite position={[42, 20, 30]} scale={[3.5, 3.5, 1]} raycast={() => null}>
        <spriteMaterial map={GLOW} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={1} />
      </sprite>
      {/* Moon */}
      <group ref={moonRef}>
        <mesh>
          <sphereGeometry args={[0.22, 32, 32]} />
          <meshStandardMaterial color="#8f8f96" roughness={0.95} metalness={0.05} />
        </mesh>
      </group>
    </group>
  );
}
