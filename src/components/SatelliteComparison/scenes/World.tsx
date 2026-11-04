import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { comparisonClock, useComparisonStore } from "../hooks/useComparisonStore";
import { findBestSatellite } from "../utils/orbit";
import { CameraRig } from "./CameraRig";
import { EarthScene } from "./EarthScene";
import { GroundScene } from "./GroundScene";

function SceneDriver() {
  const lastBestSatellite = useRef(-1);

  useFrame((_, delta) => {
    const state = useComparisonStore.getState();
    comparisonClock.wallTime += delta;
    if (state.playing) comparisonClock.simTime += delta * state.timeSpeed;

    if (state.stage < 2 || comparisonClock.wallTime - comparisonClock.lastSatelliteScanAt < 0.45) return;
    comparisonClock.lastSatelliteScanAt = comparisonClock.wallTime;
    const result = findBestSatellite(state.location, comparisonClock.simTime);
    if (result.id !== lastBestSatellite.current || result.id !== state.bestSatelliteId) {
      lastBestSatellite.current = result.id;
      state.setBestSatellite(result.id, result.elevationDeg);
    } else if (Math.abs(result.elevationDeg - state.bestElevationDeg) > 0.8) {
      state.setBestSatellite(result.id, result.elevationDeg);
    }
  });

  return null;
}

function GroundHorizonFog() {
  const scene = useThree((state) => state.scene);
  const fog = useMemo(() => new THREE.Fog("#080b13", 13, 33), []);
  const lastGroundState = useRef<boolean | null>(null);

  useFrame(() => {
    const isGroundStage = useComparisonStore.getState().stage < 2;
    if (lastGroundState.current === isGroundStage) return;
    lastGroundState.current = isGroundStage;
    scene.fog = isGroundStage ? fog : null;
  });

  useEffect(
    () => () => {
      if (scene.fog === fog) scene.fog = null;
    },
    [fog, scene],
  );
  return null;
}

/** Canvas contents for all six story stages. */
export function World() {
  const reducedMotion = useComparisonStore((state) => state.reducedMotion);
  return (
    <>
      <color attach="background" args={["#03050a"]} />
      <ambientLight intensity={0.34} color="#d5e1f1" />
      <directionalLight position={[9, 7, 7]} intensity={1.35} color="#fff4df" />
      <directionalLight position={[-7, -2, -6]} intensity={0.4} color="#5985af" />
      <Stars
        radius={85}
        depth={52}
        count={1500}
        factor={2.4}
        saturation={0}
        fade
        speed={reducedMotion ? 0 : 0.12}
      />
      <SceneDriver />
      <GroundHorizonFog />
      <GroundScene />
      <EarthScene />
      <CameraRig />
    </>
  );
}
