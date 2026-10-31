import { useRef } from "react";
import * as THREE from "three";
import { Html, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { comparisonConfig } from "../config";
import { comparisonClock, useComparisonStore } from "../hooks/useComparisonStore";
import { PhasedArrayDish, TelevisionDish } from "./DishStation";
import { SatelliteModel } from "./SatelliteModel";
import { SignalBeam } from "./SignalEffects";

/** The first two story beats: paired ground terminals, then their link directions. */
export function GroundScene() {
  const stage = useComparisonStore((state) => state.stage);
  const showLabels = useComparisonStore((state) => state.showLabels);
  const tvSatellite = useRef<THREE.Group>(null);
  const leoSatellite = useRef<THREE.Group>(null);
  const tvDishAnchor = useRef<THREE.Group>(null);
  const leoDishAnchor = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!leoSatellite.current) return;
    const time = comparisonClock.simTime;
    leoSatellite.current.position.set(
      3.1 + Math.sin(time * 0.075) * 1.1,
      5.35 + Math.sin(time * 0.13) * 0.24,
      -0.4 + Math.cos(time * 0.08) * 0.42,
    );
  });

  return (
    <group visible={stage < 2}>
      <ambientLight intensity={0.28} color="#d5e1f1" />
      <directionalLight position={[-4, 9, 6]} intensity={2.2} color="#fff3df" castShadow />
      <directionalLight position={[6, 4, -8]} intensity={0.55} color="#4e78a4" />
      <mesh position={[0, -0.16, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[160, 160, 1, 1]} />
        <meshStandardMaterial color="#10141d" roughness={0.29} metalness={0.38} />
      </mesh>
      <mesh position={[0, -0.145, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[3.8, 18, 128]} />
        <meshBasicMaterial color="#92a9c9" transparent opacity={0.035} side={THREE.DoubleSide} />
      </mesh>

      <TelevisionDish position={[-3.1, 0, 0]} />
      <PhasedArrayDish position={[3.1, 0, 0]} />
      <group ref={tvDishAnchor} position={[-3.1, 1.44, 0]} />
      <group ref={leoDishAnchor} position={[3.1, 1.08, 0]} />

      <group ref={tvSatellite} position={[-3.1, 5.75, -0.35]} visible={stage === 1}>
        <SatelliteModel fact={comparisonConfig.copy.facts.geo} scale={1.12} />
      </group>
      <group ref={leoSatellite} position={[3.1, 5.35, -0.4]} visible={stage === 1}>
        <SatelliteModel fact={comparisonConfig.copy.facts.leo} scale={1.05} />
      </group>

      {stage === 1 && (
        <SignalBeam
          sourceRef={tvDishAnchor}
          targetRef={tvSatellite}
          showReceive
          showTransmit={false}
        />
      )}
      {stage === 1 && (
        <SignalBeam
          sourceRef={leoDishAnchor}
          targetRef={leoSatellite}
          showReceive
          showTransmit
          showBinary
        />
      )}

      {showLabels && (
        <>
          <Html position={[-3.1, 0.2, 0.65]} center distanceFactor={8}>
            <span className="sc-world-label">{comparisonConfig.copy.labels.tvDish}</span>
          </Html>
          <Html position={[3.1, 0.2, 0.65]} center distanceFactor={8}>
            <span className="sc-world-label">{comparisonConfig.copy.labels.starlinkDish}</span>
          </Html>
          {stage === 1 && (
            <>
              <Html position={[-3.1, 6.55, -0.35]} center distanceFactor={8}>
                <span className="sc-world-label sc-world-label--warm">GEO · 35,786 km</span>
              </Html>
              <Html position={[3.1, 6.25, -0.4]} center distanceFactor={8}>
                <span className="sc-world-label sc-world-label--cyan">LEO · ~550 km</span>
              </Html>
            </>
          )}
        </>
      )}

      {/* A quiet horizon line adds depth without turning the floor into a grid. */}
      <Line
        points={[
          [-12, -0.14, -9],
          [-7, -0.14, -15],
          [0, -0.14, -17],
          [7, -0.14, -15],
          [12, -0.14, -9],
        ]}
        color="#65748b"
        transparent
        opacity={0.15}
        lineWidth={1}
      />
    </group>
  );
}
