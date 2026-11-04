import { useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { ComparisonStage } from "../config";
import { comparisonClock, useComparisonStore } from "../hooks/useComparisonStore";

const CAMERA_PRESETS: Record<ComparisonStage, { position: [number, number, number]; target: [number, number, number] }> = {
  0: { position: [0.15, 3.6, 11.4], target: [0, 1.35, 0] },
  1: { position: [-0.2, 4.15, 12.1], target: [0, 2.65, 0] },
  2: { position: [0, 1.4, 17.2], target: [0, 0, 0] },
  3: { position: [0.4, 1.6, 15.3], target: [0, 0.15, 0] },
  4: { position: [0, 1.8, 9.4], target: [0, 0, 0] },
  5: { position: [-0.4, 1.4, 7.2], target: [0, 0, 0] },
};

const TRANSITION_SECONDS = 1.5;
const EASE_OUT_CUBIC = (value: number) => 1 - (1 - value) ** 3;

/** Smooth, eased 1.5 s camera moves between story beats. */
export function CameraRig() {
  const camera = useThree((state) => state.camera);
  const stageRef = useRef<ComparisonStage>(useComparisonStore.getState().stage);
  const elapsedRef = useRef(TRANSITION_SECONDS);
  const fromPosition = useRef(new THREE.Vector3(...CAMERA_PRESETS[0].position));
  const toPosition = useRef(new THREE.Vector3(...CAMERA_PRESETS[0].position));
  const fromTarget = useRef(new THREE.Vector3(...CAMERA_PRESETS[0].target));
  const toTarget = useRef(new THREE.Vector3(...CAMERA_PRESETS[0].target));
  const lookTarget = useRef(new THREE.Vector3(...CAMERA_PRESETS[0].target));
  const fovRef = useRef(39);

  useFrame((_, delta) => {
    const store = useComparisonStore.getState();
    const stage = store.stage;
    const cameraPreset = CAMERA_PRESETS[stage];

    if (stage !== stageRef.current) {
      stageRef.current = stage;
      fromPosition.current.copy(camera.position);
      toPosition.current.set(...cameraPreset.position);
      fromTarget.current.copy(lookTarget.current);
      toTarget.current.set(...cameraPreset.target);
      elapsedRef.current = store.reducedMotion ? TRANSITION_SECONDS : 0;
    }

    elapsedRef.current = Math.min(TRANSITION_SECONDS, elapsedRef.current + delta);
    const linear = store.reducedMotion ? 1 : elapsedRef.current / TRANSITION_SECONDS;
    const eased = EASE_OUT_CUBIC(linear);
    const targetPosition = toPosition.current;
    if (elapsedRef.current >= TRANSITION_SECONDS && stage === 0 && !store.reducedMotion) {
      const angle = Math.sin(comparisonClock.wallTime * 0.075) * 0.055;
      const radius = Math.hypot(cameraPreset.position[0], cameraPreset.position[2]);
      targetPosition.set(
        cameraPreset.position[0] + Math.sin(angle) * radius,
        cameraPreset.position[1],
        cameraPreset.position[2] + (Math.cos(angle) - 1) * radius,
      );
    }

    camera.position.lerpVectors(fromPosition.current, targetPosition, eased);
    lookTarget.current.lerpVectors(fromTarget.current, toTarget.current, eased);
    camera.lookAt(lookTarget.current);
    if (camera instanceof THREE.PerspectiveCamera) {
      const nextFov = stage <= 1 ? 39 : stage === 2 ? 47 : 43;
      if (fovRef.current !== nextFov) {
        fovRef.current = nextFov;
        camera.fov = nextFov;
        camera.updateProjectionMatrix();
      }
    }
  });

  return null;
}
