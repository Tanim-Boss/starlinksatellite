import { useMemo } from "react";
import * as THREE from "three";
import { DISH_RADIUS, DISH_Y } from "@/lib/dishBeam";
import { makeGlowTexture } from "@/lib/textures";
import { makeShadowTexture } from "./beamTextures";

/**
 * The terminal: a shallow white panel on a black tripod.
 *
 * It stays completely still. Every change of direction in the scene comes from
 * the wavefronts above it, which is the whole point of the page.
 */

/** Closed profile (radius, height) revolved around the vertical axis. */
const PROFILE: [number, number][] = [
  [0, -0.15],
  [0.18, -0.153],
  [0.36, -0.128],
  [0.5, -0.085],
  [0.585, -0.034],
  [0.617, 0.004],
  [0.62, 0.028],
  [0.602, 0.042],
  [0.55, 0.034],
  [0.4, 0.03],
  [0.2, 0.032],
  [0, 0.034],
];

const RIM_Y = 0.03;

function Strut({
  from,
  to,
  radius,
  color,
}: {
  from: [number, number, number];
  to: [number, number, number];
  radius: number;
  color: string;
}) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const delta = b.clone().sub(a);
    const len = delta.length();
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.clone().normalize(),
    );
    return { position: mid, quaternion: q, length: len };
  }, [from, to]);

  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 10]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.65} />
    </mesh>
  );
}

export function Dish() {
  const profile = useMemo(() => PROFILE.map(([x, y]) => new THREE.Vector2(x, y)), []);
  const shadow = useMemo(() => makeShadowTexture(), []);
  const glow = useMemo(() => makeGlowTexture(), []);

  const cableCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.04, -0.6, 0.03),
        new THREE.Vector3(-0.12, -0.82, 0.12),
        new THREE.Vector3(-0.02, -0.99, 0.3),
        new THREE.Vector3(0.42, -1.03, 0.5),
        new THREE.Vector3(1.05, -1.04, 0.72),
      ]),
    [],
  );

  return (
    <group position={[0, DISH_Y, 0]}>
      {/* Contact shadow on the ground. */}
      <mesh rotation-x={-Math.PI / 2} position={[0.16, -DISH_Y + 0.007, 0.2]}>
        <planeGeometry args={[2.6, 2.0]} />
        <meshBasicMaterial map={shadow} transparent opacity={0.75} depthWrite={false} />
      </mesh>

      {/* Radome: a shallow dish with a soft lip. */}
      <mesh>
        <latheGeometry args={[profile, 96]} />
        <meshStandardMaterial
          color="#d8dfe9"
          roughness={0.44}
          metalness={0.16}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, RIM_Y, 0]}>
        <torusGeometry args={[DISH_RADIUS - 0.008, 0.009, 8, 96]} />
        <meshStandardMaterial color="#9aa6b6" roughness={0.35} metalness={0.55} />
      </mesh>

      {/* A faint seam suggests the array of elements under the surface. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.037, 0]}>
        <ringGeometry args={[DISH_RADIUS - 0.16, DISH_RADIUS - 0.15, 96]} />
        <meshBasicMaterial color="#aab6c6" transparent opacity={0.25} depthWrite={false} />
      </mesh>

      {/* Mount, pole, tripod. */}
      <mesh position={[0, -0.19, 0]}>
        <cylinderGeometry args={[0.1, 0.13, 0.1, 18]} />
        <meshStandardMaterial color="#1b212a" roughness={0.5} metalness={0.6} />
      </mesh>
      <mesh position={[0, -0.43, 0]}>
        <cylinderGeometry args={[0.036, 0.042, 0.42, 14]} />
        <meshStandardMaterial color="#20262f" roughness={0.42} metalness={0.7} />
      </mesh>
      <mesh position={[0, -0.66, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.1, 16]} />
        <meshStandardMaterial color="#171c24" roughness={0.45} metalness={0.65} />
      </mesh>

      {[0, 120, 240].map((deg) => {
        const a = (deg * Math.PI) / 180;
        const hub: [number, number, number] = [Math.cos(a) * 0.045, -0.68, Math.sin(a) * 0.045];
        const foot: [number, number, number] = [Math.cos(a) * 0.54, -DISH_Y + 0.03, Math.sin(a) * 0.54];
        return (
          <group key={deg}>
            <Strut from={hub} to={foot} radius={0.022} color="#1d232c" />
            <mesh position={[foot[0], -DISH_Y + 0.014, foot[2]]}>
              <cylinderGeometry args={[0.06, 0.07, 0.028, 14]} />
              <meshStandardMaterial color="#242a33" roughness={0.55} metalness={0.5} />
            </mesh>
          </group>
        );
      })}

      {/* Power lead, and the only light on the whole terminal. */}
      <mesh>
        <tubeGeometry args={[cableCurve, 40, 0.009, 6, false]} />
        <meshStandardMaterial color="#11161d" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0.05, -0.26, 0.05]}>
        <sphereGeometry args={[0.014, 10, 8]} />
        <meshStandardMaterial color="#d9fff7" emissive="#7ffbe6" emissiveIntensity={2.4} />
      </mesh>

      {/* The radiating face catches the wavefronts. */}
      <sprite position={[0, 0.1, 0]} scale={[1.9, 1.9, 1]}>
        <spriteMaterial
          map={glow}
          color="#ff8a2e"
          transparent
          opacity={0.24}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  );
}
