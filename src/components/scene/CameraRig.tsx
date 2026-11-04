import { useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { SATS, satPosition, satVelocity } from "@/lib/astro";
import { simClock } from "@/lib/simClock";
import { useApp } from "@/store";

interface ControlsLike {
  target: THREE.Vector3;
  update: () => void;
}

/** Smoothly flies the camera to the satellite chosen via "Focus camera". */
export function CameraRig() {
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;
  const camera = useThree((s) => s.camera);
  const focusId = useApp((s) => s.cameraFocusId);

  const posRef = useRef(new THREE.Vector3());
  const velRef = useRef(new THREE.Vector3());
  const desiredRef = useRef(new THREE.Vector3());
  const radialRef = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    if (focusId == null || !controls) return;
    const sat = SATS[focusId];
    if (!sat) {
      useApp.getState().focusCamera(null);
      return;
    }
    satPosition(sat, simClock.time, posRef.current);
    satVelocity(sat, simClock.time, velRef.current);
    radialRef.current.copy(posRef.current).normalize();
    desiredRef.current
      .copy(posRef.current)
      .addScaledVector(radialRef.current, 0.32)
      .addScaledVector(velRef.current, 0.1);

    const k = 1 - Math.exp(-5 * dt);
    controls.target.lerp(posRef.current, k);
    camera.position.lerp(desiredRef.current, k);
    controls.update();

    if (camera.position.distanceTo(desiredRef.current) < 0.01) {
      useApp.getState().focusCamera(null);
    }
  });

  return null;
}
