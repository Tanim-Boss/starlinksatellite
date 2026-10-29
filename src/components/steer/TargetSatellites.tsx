import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Html, useCursor } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  TARGETS,
  rangeKm,
  targetPositionAt,
  type TargetDef,
} from "@/lib/steering";
import { makeReticleTexture, makeSolarTexture } from "./steerTextures";
import { makeGlowTexture } from "@/lib/textures";
import { steerClock, useSteerLab } from "./steerStore";

/**
 * The two target spacecraft. They follow slow closed apparent tracks (their
 * motion never depends on the beam) and can be clicked to command a handover.
 */
function TargetLabel({ def }: { def: TargetDef }) {
  useSteerLab((s) => s.uiTick);
  const status = steerClock.status;
  const locked = status === "locked";
  return (
    <Html
      position={[0, 0.95, 0]}
      center
      distanceFactor={14}
      zIndexRange={[12, 0]}
      style={{ pointerEvents: "none" }}
      wrapperClass="pointer-events-none"
    >
      <div
        className="flex items-center gap-1.5 whitespace-nowrap rounded-full border bg-[#040a14]/85 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] backdrop-blur"
        style={{ borderColor: `${def.color}66`, color: def.color }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: def.color }} />
        {def.name}
        <span className="text-[#a9bcd4]">{rangeKm(def).toLocaleString()} km</span>
        {locked && <span className="text-signal">· link</span>}
      </div>
    </Html>
  );
}

function TargetModel({ def }: { def: TargetDef }) {
  const group = useRef<THREE.Group>(null);
  const spin = useRef(Math.random() * Math.PI * 2);
  const [hovered, setHovered] = useState(false);
  const targetId = useSteerLab((s) => s.targetId);
  const showLabels = useSteerLab((s) => s.showLabels);
  const selectTarget = useSteerLab((s) => s.selectTarget);
  const selected = targetId === def.id;

  const solar = useMemo(() => makeSolarTexture(), []);
  const glow = useMemo(() => makeGlowTexture(), []);
  const reticle = useMemo(() => makeReticleTexture(), []);

  const bus = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#c2ccda", roughness: 0.34, metalness: 0.74 }),
    [],
  );
  const frame = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#39424f", roughness: 0.45, metalness: 0.82 }),
    [],
  );
  const cells = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: solar,
        roughness: 0.46,
        metalness: 0.4,
        emissive: "#0a2550",
        emissiveIntensity: 0.55,
        side: THREE.DoubleSide,
      }),
    [solar],
  );
  const foil = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#c39a5c", roughness: 0.5, metalness: 0.85 }),
    [],
  );

  useCursor(hovered);

  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;
    const point = targetPositionAt(def, steerClock.t);
    node.position.set(point[0], point[1], point[2]);
    // A stately roll about the body axis gives the spacecraft life.
    spin.current += delta * 0.18;
    node.rotation.set(0.12, spin.current, 0.08);
    const scale = hovered ? 1.08 : selected ? 1.04 : 1;
    node.scale.setScalar(scale);
  });

  return (
    <group
      ref={group}
      onClick={(event) => {
        event.stopPropagation();
        selectTarget(def.id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Bus */}
      <mesh material={bus}>
        <boxGeometry args={[0.5, 0.62, 0.46]} />
      </mesh>
      <mesh material={foil} position={[0, -0.05, 0.24]}>
        <boxGeometry args={[0.38, 0.3, 0.025]} />
      </mesh>
      {/* A small comms dome so the partner reads as a relay spacecraft. */}
      <mesh position={[0, 0.36, 0]}>
        <sphereGeometry args={[0.12, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#e4ebf4"
          roughness={0.4}
          metalness={0.35}
          emissive={selected ? def.color : "#0b1a28"}
          emissiveIntensity={selected ? 0.55 : 0.25}
        />
      </mesh>

      {/* Solar wings */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.32, 0, 0]} rotation-z={Math.PI / 2} material={frame}>
            <cylinderGeometry args={[0.025, 0.025, 0.16, 8]} />
          </mesh>
          <mesh position={[side * 0.92, 0, 0]} material={frame}>
            <boxGeometry args={[1.2, 0.03, 0.6]} />
          </mesh>
          <mesh position={[side * 0.92, 0, 0]} material={cells}>
            <boxGeometry args={[1.14, 0.018, 0.54]} />
          </mesh>
        </group>
      ))}

      {/* Halo and selection reticle */}
      <sprite scale={[2.6, 2.6, 1]} raycast={() => null}>
        <spriteMaterial
          map={glow}
          color={selected ? def.color : "#8fb7e6"}
          transparent
          opacity={selected ? 0.5 : hovered ? 0.4 : 0.2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
      {selected && (
        <sprite scale={[3.1, 3.1, 1]} raycast={() => null}>
          <spriteMaterial
            map={reticle}
            color={def.color}
            transparent
            opacity={0.75}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      )}

      {showLabels && <TargetLabel def={def} />}
    </group>
  );
}

export function TargetSatellites() {
  return (
    <>
      {TARGETS.map((def) => (
        <TargetModel key={def.id} def={def} />
      ))}
    </>
  );
}
