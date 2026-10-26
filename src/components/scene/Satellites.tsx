import { useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { SATS, SHELLS, satPosition, satVelocity } from "@/lib/astro";
import { simClock } from "@/lib/simClock";
import { useApp } from "@/store";

/**
 * One merged geometry: body + two solar panels + a dish.
 * Long axis is local Z (aligned with the velocity vector each frame).
 */
function makeSatelliteGeometry(): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(0.005, 0.0045, 0.014);
  const panel = new THREE.BoxGeometry(0.018, 0.0012, 0.009);
  const panelL = panel.clone().translate(-0.014, 0, 0);
  const panelR = panel.clone().translate(0.014, 0, 0);
  const dish = new THREE.CylinderGeometry(0.0028, 0.0028, 0.0012, 12).translate(0, 0.0045, 0);
  const merged = mergeGeometries([body, panelL, panelR, dish]);
  if (!merged) throw new Error("Failed to merge satellite geometry");
  return merged;
}

const SAT_GEOMETRY = makeSatelliteGeometry();
const SAT_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.35,
  metalness: 0.65,
  emissive: 0x155e75,
  emissiveIntensity: 0.5,
});

const BASE_COLORS = SATS.map((s) => new THREE.Color(SHELLS[s.shell].color));
const SELECTED_COLOR = new THREE.Color("#fde047");

const _pos = new THREE.Vector3();
const _vel = new THREE.Vector3();
const _target = new THREE.Vector3();
const _dummy = new THREE.Object3D();

export function Satellites({ interactive = true }: { interactive?: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = simClock.time;
    const sel = useApp.getState().selectedId;
    for (let i = 0; i < SATS.length; i++) {
      const sat = SATS[i];
      satPosition(sat, t, _pos);
      satVelocity(sat, t, _vel);
      _dummy.position.copy(_pos);
      // Orient: local +Z along velocity, local +Y roughly radial (up).
      _dummy.up.set(_pos.x, _pos.y, _pos.z).normalize();
      _target.copy(_pos).add(_vel);
      _dummy.lookAt(_target);
      _dummy.scale.setScalar(sel === sat.id ? 1.9 : 1.0);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
      mesh.setColorAt(i, sel === sat.id ? SELECTED_COLOR : BASE_COLORS[i]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && e.instanceId !== null) {
      useApp.getState().selectSat(SATS[e.instanceId].id);
    }
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[SAT_GEOMETRY, SAT_MATERIAL, SATS.length]}
      frustumCulled={false}
      onClick={interactive ? handleClick : undefined}
      onPointerOver={
        interactive
          ? () => {
              document.body.style.cursor = "pointer";
            }
          : undefined
      }
      onPointerOut={
        interactive
          ? () => {
              document.body.style.cursor = "auto";
            }
          : undefined
      }
    />
  );
}
