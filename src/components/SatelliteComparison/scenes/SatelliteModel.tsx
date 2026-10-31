import { useMemo } from "react";
import { type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { comparisonConfig } from "../config";
import { useComparisonStore, type SatelliteTooltip } from "../hooks/useComparisonStore";

interface SatelliteModelProps {
  fact?: SatelliteTooltip;
  scale?: number;
}

const DEFAULT_FACT: SatelliteTooltip = comparisonConfig.copy.facts.leo;

/** Small, unbranded spacecraft silhouette used for the story satellites. */
export function SatelliteModel({ fact = DEFAULT_FACT, scale = 1 }: SatelliteModelProps) {
  const rotation = useMemo(() => new THREE.Euler(0.24, 0.35, -0.14), []);
  const onPointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    useComparisonStore.getState().setTooltip(fact);
  };
  const onPointerOut = () => useComparisonStore.getState().setTooltip(null);
  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    useComparisonStore.getState().setTooltip(fact);
  };

  return (
    <group
      scale={scale}
      rotation={rotation}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      {/* Central bus and antenna face. */}
      <mesh castShadow>
        <boxGeometry args={[0.24, 0.13, 0.25]} />
        <meshStandardMaterial color="#f4f5f4" metalness={0.42} roughness={0.32} emissive="#5b6674" emissiveIntensity={0.16} />
      </mesh>
      <mesh position={[0, 0, 0.145]}>
        <circleGeometry args={[0.075, 20]} />
        <meshStandardMaterial color="#dce6ee" metalness={0.52} roughness={0.25} />
      </mesh>
      {/* Two photovoltaic wings. */}
      <mesh position={[-0.38, 0, 0]}>
        <boxGeometry args={[0.48, 0.035, 0.2]} />
        <meshStandardMaterial color="#dbe7f1" metalness={0.34} roughness={0.36} emissive="#8bb8d5" emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[0.38, 0, 0]}>
        <boxGeometry args={[0.48, 0.035, 0.2]} />
        <meshStandardMaterial color="#dbe7f1" metalness={0.34} roughness={0.36} emissive="#8bb8d5" emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[0, 0.105, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.26, 8]} />
        <meshStandardMaterial color="#fbfbf8" metalness={0.45} roughness={0.35} />
      </mesh>
    </group>
  );
}
