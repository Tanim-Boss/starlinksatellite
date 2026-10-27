import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Html, useCursor } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  DISH_Y,
  SATELLITES,
  satelliteAt,
  satellitePosition,
  type SatelliteDef,
} from "@/lib/dishBeam";
import { makeGlowTexture } from "@/lib/textures";
import { beamClock, useBeamLab } from "./beamStore";
import { makeReticleTexture, makeSolarTexture } from "./beamTextures";

const UP = new THREE.Vector3(0, 1, 0);

/* -------------------------------------------------------------------------- */
/* Label                                                                      */
/* -------------------------------------------------------------------------- */

function SatLabel({ def }: { def: SatelliteDef }) {
  // Re-renders eight times a second while the pass moves; the text is tiny.
  useBeamLab((s) => s.uiTick);
  const { el } = satelliteAt(def, beamClock.t);
  return (
    <Html
      position={[0, 0.82, 0]}
      center
      distanceFactor={13}
      zIndexRange={[12, 0]}
      style={{ pointerEvents: "none" }}
      wrapperClass="pointer-events-none"
    >
      <div
        className="flex items-center gap-1.5 whitespace-nowrap rounded-full border bg-[#040a14]/85 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] backdrop-blur"
        style={{ borderColor: `${def.color}66`, color: def.color }}
      >
        <span className="h-1 w-1 rounded-full" style={{ background: def.color }} />
        {def.name}
        <span className="text-[#a9bcd4]">{el.toFixed(0)}°</span>
      </div>
    </Html>
  );
}

/* -------------------------------------------------------------------------- */
/* Spacecraft                                                                 */
/* -------------------------------------------------------------------------- */

function SatelliteModel({
  def,
  selected,
  showLabel,
}: {
  def: SatelliteDef;
  selected: boolean;
  showLabel: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const spin = useRef(0);
  const [hovered, setHovered] = useState(false);
  const selectTarget = useBeamLab((s) => s.selectTarget);
  const solar = useMemo(() => makeSolarTexture(), []);
  const glow = useMemo(() => makeGlowTexture(), []);
  const reticle = useMemo(() => makeReticleTexture(), []);
  const phase = useMemo(() => SATELLITES.findIndex((s) => s.id === def.id) * 1.7, [def.id]);
  const base = useMemo(() => new THREE.Quaternion(), []);
  const spinQuat = useMemo(() => new THREE.Quaternion(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);

  useCursor(hovered);

  const bus = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#b9c4d2",
        roughness: 0.34,
        metalness: 0.72,
      }),
    [],
  );
  const frame = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#39424f",
        roughness: 0.45,
        metalness: 0.8,
      }),
    [],
  );
  const cells = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: solar,
        roughness: 0.46,
        metalness: 0.4,
        emissive: "#0a2550",
        emissiveIntensity: 0.6,
        side: THREE.DoubleSide,
      }),
    [solar],
  );
  const foil = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#c39a5c",
        roughness: 0.5,
        metalness: 0.85,
      }),
    [],
  );
  const wingMaterials = useMemo(
    () => [frame, frame, cells, cells, frame, frame],
    [frame, cells],
  );

  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;

    const point = satellitePosition(def, beamClock.t);
    node.position.set(point[0], point[1], point[2]);

    // The bus points at the terminal; the arrays slowly turn about the link.
    direction.set(point[0], point[1] - (DISH_Y + 0.05), point[2]).normalize();
    base.setFromUnitVectors(UP, direction);
    spin.current += delta * 0.12;
    spinQuat.setFromAxisAngle(UP, spin.current + phase);
    node.quaternion.copy(base).multiply(spinQuat);
  });

  return (
    <group
      ref={group}
      scale={1}
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
        <boxGeometry args={[0.36, 0.5, 0.34]} />
      </mesh>
      <mesh material={frame} position={[0, 0.06, 0]}>
        <boxGeometry args={[0.4, 0.08, 0.38]} />
      </mesh>
      <mesh material={foil} position={[0, -0.15, 0.18]}>
        <boxGeometry args={[0.3, 0.18, 0.02]} />
      </mesh>

      {/* The phased array that talks to the ground. */}
      <mesh position={[0, -0.255, 0]} rotation-x={Math.PI / 2}>
        <circleGeometry args={[0.165, 24]} />
        <meshStandardMaterial
          color="#e4ebf4"
          roughness={0.4}
          metalness={0.35}
          emissive={selected ? "#1a6f74" : "#0b1a28"}
          emissiveIntensity={selected ? 0.7 : 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Solar wings, thin boxes with the cells only on the large faces. */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.24, 0, 0]} rotation-z={Math.PI / 2} material={frame}>
            <cylinderGeometry args={[0.03, 0.03, 0.16, 8]} />
          </mesh>
          <mesh position={[side * 0.74, 0, 0]} material={wingMaterials}>
            <boxGeometry args={[1.0, 0.022, 0.56]} />
          </mesh>
        </group>
      ))}

      {/* Halo + selection reticle */}
      <sprite scale={[2.4, 2.4, 1]} raycast={() => null}>
        <spriteMaterial
          map={glow}
          color={selected ? def.color : "#8fb7e6"}
          transparent
          opacity={selected ? 0.45 : 0.22}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
      {selected && (
        <sprite scale={[3.0, 3.0, 1]} raycast={() => null}>
          <spriteMaterial
            map={reticle}
            color={def.color}
            transparent
            opacity={0.7}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      )}

      {showLabel && <SatLabel def={def} />}
    </group>
  );
}

export function SkySatellites() {
  const targetId = useBeamLab((s) => s.targetId);
  const showLabels = useBeamLab((s) => s.showLabels);

  return (
    <>
      {SATELLITES.map((def) => (
        <SatelliteModel
          key={def.id}
          def={def}
          selected={def.id === targetId}
          showLabel={showLabels}
        />
      ))}
    </>
  );
}
