import { useEffect, useMemo, type ReactNode } from "react";
import { type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { comparisonConfig } from "../config";
import { useComparisonStore, type SatelliteTooltip } from "../hooks/useComparisonStore";

const NORMAL_AXIS = new THREE.Vector3(0, 0, 1);
const TV_NORMAL = new THREE.Vector3(0.16, 0.86, 0.48).normalize();
const PANEL_NORMAL = new THREE.Vector3(-0.12, 0.92, 0.37).normalize();

function makeParabolicReflector(): THREE.BufferGeometry {
  const radialSegments = 14;
  const angularSegments = 64;
  const radius = 0.56;
  const depth = 0.2;
  const positions: number[] = [0, 0, 0];
  const uvs: number[] = [0.5, 0.5];
  const indices: number[] = [];

  for (let ring = 1; ring <= radialSegments; ring += 1) {
    const radial = ring / radialSegments;
    for (let segment = 0; segment < angularSegments; segment += 1) {
      const angle = (segment / angularSegments) * Math.PI * 2;
      const x = Math.cos(angle) * radius * radial;
      const y = Math.sin(angle) * radius * radial;
      const z = depth * radial * radial;
      positions.push(x, y, z);
      uvs.push(0.5 + (x / radius) * 0.5, 0.5 + (y / radius) * 0.5);
    }
  }

  for (let segment = 0; segment < angularSegments; segment += 1) {
    const current = 1 + segment;
    const next = 1 + ((segment + 1) % angularSegments);
    indices.push(0, current, next);
  }
  for (let ring = 0; ring < radialSegments - 1; ring += 1) {
    const innerStart = 1 + ring * angularSegments;
    const outerStart = innerStart + angularSegments;
    for (let segment = 0; segment < angularSegments; segment += 1) {
      const next = (segment + 1) % angularSegments;
      const inner = innerStart + segment;
      const innerNext = innerStart + next;
      const outer = outerStart + segment;
      const outerNext = outerStart + next;
      indices.push(inner, outer, innerNext, outer, outerNext, innerNext);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function showTooltip(fact: SatelliteTooltip) {
  useComparisonStore.getState().setTooltip(fact);
}

function DishInteraction({ fact, children }: { fact: SatelliteTooltip; children: ReactNode }) {
  const onPointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    showTooltip(fact);
  };
  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    showTooltip(fact);
  };
  const onPointerOut = () => useComparisonStore.getState().setTooltip(null);

  return (
    <group onPointerOver={onPointerOver} onPointerOut={onPointerOut} onClick={onClick}>
      {children}
    </group>
  );
}

/** Classic parabolic reflector, LNB feed arm and fixed steel mast. */
export function TelevisionDish({ position = [-3.1, 0, 0] }: { position?: [number, number, number] }) {
  const reflector = useMemo(() => makeParabolicReflector(), []);
  const facing = useMemo(() => new THREE.Quaternion().setFromUnitVectors(NORMAL_AXIS, TV_NORMAL), []);
  const fact = comparisonConfig.copy.facts.tvDish;
  useEffect(() => () => reflector.dispose(), [reflector]);

  return (
    <DishInteraction fact={fact}>
      <group position={position}>
        <mesh position={[0, 0.66, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.075, 1.3, 16]} />
          <meshStandardMaterial color="#d6dbe0" metalness={0.58} roughness={0.34} />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.42, 0.48, 0.12, 32]} />
          <meshStandardMaterial color="#9ca7b2" metalness={0.35} roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.44, 0]} quaternion={facing} geometry={reflector} castShadow>
          <meshStandardMaterial color="#f5f4f0" metalness={0.12} roughness={0.38} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 1.44, 0]} quaternion={facing}>
          <torusGeometry args={[0.56, 0.028, 8, 64]} />
          <meshStandardMaterial color="#e8edf2" metalness={0.36} roughness={0.31} />
        </mesh>
        {/* A small feed arm reaches from the reflector's focus to the LNB. */}
        <group position={[0, 1.44, 0]} quaternion={facing}>
          <mesh position={[0, 0, 0.27]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.022, 0.56, 8]} />
            <meshStandardMaterial color="#d5d9dc" metalness={0.42} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.56]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.035, 0.035, 0.18, 12]} />
            <meshStandardMaterial color="#f1f0ed" roughness={0.36} />
          </mesh>
        </group>
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[0.18, 0.12, 0.18]} />
          <meshStandardMaterial color="#818c98" metalness={0.4} roughness={0.46} />
        </mesh>
      </group>
    </DishInteraction>
  );
}

/** Low-profile flat phased-array panel with a compact post and tripod feet. */
export function PhasedArrayDish({ position = [3.1, 0, 0] }: { position?: [number, number, number] }) {
  const facing = useMemo(() => new THREE.Quaternion().setFromUnitVectors(NORMAL_AXIS, PANEL_NORMAL), []);
  const fact = comparisonConfig.copy.facts.starlinkDish;
  const grid = useMemo(() => {
    const lines: ReactNode[] = [];
    for (let index = -3; index <= 3; index += 1) {
      const x = index * 0.095;
      const y = index * 0.075;
      lines.push(
        <mesh key={`v-${index}`} position={[x, 0, 0.048]}>
          <boxGeometry args={[0.006, 0.5, 0.003]} />
          <meshBasicMaterial color="#738696" transparent opacity={0.42} />
        </mesh>,
        <mesh key={`h-${index}`} position={[0, y, 0.049]}>
          <boxGeometry args={[0.68, 0.006, 0.003]} />
          <meshBasicMaterial color="#738696" transparent opacity={0.42} />
        </mesh>,
      );
    }
    return lines;
  }, []);

  return (
    <DishInteraction fact={fact}>
      <group position={position}>
        {/* A three-footed base and short fixed mounting pole. */}
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.34, 0.38, 0.09, 24]} />
          <meshStandardMaterial color="#aab3bc" metalness={0.32} roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.48, 0]}>
          <cylinderGeometry args={[0.045, 0.055, 0.72, 12]} />
          <meshStandardMaterial color="#d2d8df" metalness={0.46} roughness={0.39} />
        </mesh>
        <mesh position={[-0.24, 0.3, 0]} rotation={[0, 0, -0.62]}>
          <cylinderGeometry args={[0.018, 0.024, 0.68, 8]} />
          <meshStandardMaterial color="#b8c2cc" metalness={0.38} roughness={0.42} />
        </mesh>
        <mesh position={[0.24, 0.3, 0]} rotation={[0, 0, 0.62]}>
          <cylinderGeometry args={[0.018, 0.024, 0.68, 8]} />
          <meshStandardMaterial color="#b8c2cc" metalness={0.38} roughness={0.42} />
        </mesh>
        <mesh position={[0, 0.3, -0.24]} rotation={[0.62, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.024, 0.68, 8]} />
          <meshStandardMaterial color="#b8c2cc" metalness={0.38} roughness={0.42} />
        </mesh>
        <group position={[0, 0.92, 0]} quaternion={facing}>
          <mesh castShadow>
            <boxGeometry args={[0.84, 0.63, 0.085]} />
            <meshStandardMaterial color="#f2f4f3" metalness={0.14} roughness={0.32} />
          </mesh>
          <mesh position={[0, 0, 0.044]}>
            <planeGeometry args={[0.72, 0.52]} />
            <meshStandardMaterial color="#23384a" metalness={0.14} roughness={0.46} />
          </mesh>
          {grid}
          <mesh position={[0, 0, 0.052]}>
            <boxGeometry args={[0.035, 0.035, 0.006]} />
            <meshBasicMaterial color="#d4f3ff" toneMapped={false} />
          </mesh>
        </group>
      </group>
    </DishInteraction>
  );
}
