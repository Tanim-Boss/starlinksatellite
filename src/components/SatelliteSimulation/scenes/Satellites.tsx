import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { performance } from "../config";
import { SATS } from "../hooks/useSimDriver";
import { simState, useSimStore } from "../hooks/useSimStore";
import { satPosition } from "../utils/orbit";
import { useSatelliteMaterials } from "./SatelliteModel";

const _pos = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _rollAxis = new THREE.Vector3();
const _rollQuat = new THREE.Quaternion();
const HIGHLIGHT_COLOR = new THREE.Color("#ffe9c9");
const BASE_COLOR = new THREE.Color("#ffffff");

/**
 * The constellation: one InstancedMesh, matrices updated in useFrame with
 * preallocated scratch objects — no per-frame allocations, no React
 * re-renders. Each satellite points its antenna (+Z) at Earth and rolls
 * slowly around the Earth-pointing axis. The dish-connected satellite and
 * the hovered one are scaled up and tinted.
 */
export function Satellites() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { geometry, material } = useSatelliteMaterials();
  const selected = useSimStore((s) => s.selectedSat);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = simState.time;
    const tier = simState.qualityTier;
    const renderCount =
      tier === 0 ? SATS.length : Math.min(SATS.length, performance.reducedSatellites);
    const connected = simState.connectedSat;

    for (let i = 0; i < SATS.length; i++) {
      const sat = SATS[i];
      satPosition(sat, t, _pos);
      _dummy.position.copy(_pos);
      // Antenna (+Z) toward Earth's centre.
      _dummy.lookAt(0, 0, 0);
      // Slow tumbling roll around the Earth-pointing axis — the antenna
      // keeps pointing at Earth because the roll axis passes through it.
      _rollAxis.copy(_pos).normalize();
      _rollQuat.setFromAxisAngle(_rollAxis, sat.id * 0.37 + t * 0.035);
      _dummy.quaternion.premultiply(_rollQuat);

      const highlight = i === connected || i === selected;
      _dummy.scale.setScalar(i < renderCount ? (highlight ? 1.7 : 1) : 0);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
      mesh.setColorAt(i, highlight ? HIGHLIGHT_COLOR : BASE_COLOR);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  // Mirror the reactive selection into simState for non-React readers.
  useEffect(() => {
    simState.selectedSat = selected;
  }, [selected]);

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && e.instanceId !== null) {
      useSimStore.getState().setSelectedSat(SATS[e.instanceId].id);
      document.body.style.cursor = "pointer";
    }
  };

  const handlePointerOut = () => {
    useSimStore.getState().setSelectedSat(null);
    document.body.style.cursor = "auto";
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, SATS.length]}
      frustumCulled={false}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    />
  );
}
