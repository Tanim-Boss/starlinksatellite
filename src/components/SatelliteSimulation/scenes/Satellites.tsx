import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { performance } from "../config";
import { SATS } from "../hooks/useSimDriver";
import { simState, useSimStore } from "../hooks/useSimStore";
import { satPosition, satVelocity, shouldRenderSatellite } from "../utils/orbit";
import { useSatelliteMaterials } from "./SatelliteModel";

const _pos = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _basis = new THREE.Matrix4();
const HIGHLIGHT_COLOR = new THREE.Color("#ffe2b5");
const BASE_COLOR = new THREE.Color("#ffffff");

/**
 * Every instance uses the same analytic orbit as its ring. Its antenna faces
 * Earth and its panel follows the velocity tangent; there is no artificial
 * high-speed roll that makes the fleet flicker as time is accelerated.
 */
export function Satellites() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const markerRef = useRef<THREE.Mesh>(null);
  const viewCamera = useThree((s) => s.camera);
  const { geometry, material } = useSatelliteMaterials();
  const selected = useSimStore((s) => s.selectedSat);
  const mode = useSimStore((s) => s.cameraMode);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = simState.time;
    const limit = simState.qualityTier === 0 ? SATS.length : performance.reducedSatellites;
    const connected = simState.connectedSat;

    for (let i = 0; i < SATS.length; i++) {
      const sat = SATS[i];
      satPosition(sat, t, _pos);
      _dummy.position.copy(_pos);
      _z.copy(_pos).normalize().negate(); // antenna (+Z) toward Earth
      satVelocity(sat, t, _x).normalize(); // panel (+X) along the orbit
      _y.crossVectors(_z, _x).normalize();
      _x.crossVectors(_y, _z).normalize();
      _basis.makeBasis(_x, _y, _z);
      _dummy.quaternion.setFromRotationMatrix(_basis);

      const highlight = i === connected || i === selected;
      const visible = highlight || shouldRenderSatellite(i, SATS.length, limit);
      // In the close ground camera, keep the rest of the fleet unobtrusive
      // so the reticle and the dish's current link remain easy to follow.
      const scale = mode === "dish" ? (highlight ? 1 : 0.6) : (highlight ? 1.3 : 1);
      _dummy.scale.setScalar(visible ? scale : 0);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
      mesh.setColorAt(i, highlight ? HIGHLIGHT_COLOR : BASE_COLOR);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    const marker = markerRef.current;
    if (marker) {
      marker.visible = mode === "dish" && connected !== null;
      if (marker.visible && connected !== null) {
        satPosition(SATS[connected], t, marker.position);
        marker.quaternion.copy(viewCamera.quaternion);
      }
    }
  });

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
    <>
      <instancedMesh
        ref={meshRef}
        args={[geometry, material, SATS.length]}
        frustumCulled={false}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />
      {/* A steady amber reticle identifies the linked satellite in the sky. */}
      <mesh ref={markerRef} visible={false} raycast={() => null}>
        <ringGeometry args={[0.014, 0.0147, 48]} />
        <meshBasicMaterial color="#ff9e4a" transparent opacity={0.9} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}
