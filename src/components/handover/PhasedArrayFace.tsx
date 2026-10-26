import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { handoverClock } from "./handoverStore";
import { beamTarget } from "./handoverFrame";

/**
 * Schematic of the dish's phased-array face: a lattice of small patch elements
 * whose brightness shows the phase offset applied to each one. The main beam
 * direction is set purely by those phases — the panel itself never moves.
 *
 * Dishy really has 1,280 elements in a hexagonal lattice driving ~a 100° field
 * of view. This 16 × 12 lattice is a readable stand-in, not the real layout.
 */

const COLS = 16;
const ROWS = 10;
const PITCH_X = 0.00333;
const PITCH_Z = 0.00333;
/** Centre of the inset face plate on the tilted panel (local frame). */
const FACE_Y = 0.0056;
const FACE_Z = -0.0205;
const COUNT = COLS * ROWS;

interface Element {
  ix: number;
  iz: number;
  x: number;
  z: number;
}

const BASE = new THREE.Color("#0a2630");
const ACCENT = new THREE.Color("#3ddbd9");
const HOT = new THREE.Color("#eaffff");

export function PhasedArrayFace() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const scratch = useMemo(() => new THREE.Color(), []);
  const inverse = useMemo(() => new THREE.Matrix4(), []);
  const localDir = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  const elements = useMemo<Element[]>(() => {
    const out: Element[] = [];
    for (let iz = 0; iz < ROWS; iz++) {
      for (let ix = 0; ix < COLS; ix++) {
        out.push({
          ix: ix - (COLS - 1) / 2,
          iz: iz - (ROWS - 1) / 2,
          x: (ix - (COLS - 1) / 2) * PITCH_X,
          z: FACE_Z + (iz - (ROWS - 1) / 2) * PITCH_Z,
        });
      }
    }
    return out;
  }, []);

  // Seat every element once; colours are refreshed every frame below.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < elements.length; i++) {
      dummy.position.set(elements[i].x, FACE_Y, elements[i].z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, BASE);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [elements, dummy]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Direction to the current satellite, expressed in the panel's own frame.
    let ux = 0;
    let uz = 0;
    const tgt = beamTarget(target);
    if (tgt && mesh.parent) {
      mesh.parent.updateWorldMatrix(true, false);
      inverse.copy(mesh.parent.matrixWorld).invert();
      localDir.copy(tgt).applyMatrix4(inverse);
      if (localDir.lengthSq() > 1e-10) localDir.normalize();
      ux = localDir.x;
      uz = localDir.z;
    }

    // λ/2 spacing: adjacent elements are offset by π·sin(θ) in phase.
    const wave = handoverClock.time * 2.6;
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const phase = Math.PI * (el.ix * ux + el.iz * uz);
      const v = 0.5 + 0.5 * Math.cos(phase - wave);
      scratch.copy(BASE).lerp(ACCENT, 0.25 + 0.75 * v);
      if (v > 0.82) scratch.lerp(HOT, (v - 0.82) * 3.2);
      mesh.setColorAt(i, scratch);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, COUNT]}
      frustumCulled={false}
      raycast={() => null}
    >
      <boxGeometry args={[0.0022, 0.0008, 0.0024]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
