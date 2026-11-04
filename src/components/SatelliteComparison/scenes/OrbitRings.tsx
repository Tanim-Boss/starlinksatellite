import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Html, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { comparisonConfig, earthSceneRadius, geoOrbitRadius, trueLeoOrbitRadius } from "../config";
import { useComparisonStore } from "../hooks/useComparisonStore";
import { leoVisualRadius, makeOrbitPoints } from "../utils/orbit";

/** True-scale GEO and LEO paths, with a smooth visual-only LEO scale switch. */
export function OrbitRings() {
  const scaleMode = useComparisonStore((state) => state.scaleMode);
  const showOrbits = useComparisonStore((state) => state.showOrbits);
  const showLabels = useComparisonStore((state) => state.showLabels);
  const leoOrbit = useRef<THREE.Group>(null);
  const currentLeoScale = useRef(1);
  const geoPoints = useMemo(() => makeOrbitPoints(geoOrbitRadius), []);
  const leoPoints = useMemo(
    () => makeOrbitPoints(trueLeoOrbitRadius, comparisonConfig.leoInclinationDeg),
    [],
  );

  useFrame((_, delta) => {
    const targetScale = scaleMode === "exaggerated" ? leoVisualRadius(true) / trueLeoOrbitRadius : 1;
    currentLeoScale.current = THREE.MathUtils.damp(currentLeoScale.current, targetScale, 5, delta);
    leoOrbit.current?.scale.setScalar(currentLeoScale.current);
  });

  if (!showOrbits) return null;

  return (
    <group>
      <Line points={geoPoints} color={comparisonConfig.colors.orbit} transparent opacity={0.48} lineWidth={1} />
      <group ref={leoOrbit}>
        <Line points={leoPoints} color={comparisonConfig.colors.orbit} transparent opacity={0.75} lineWidth={1.15} />
        {showLabels && (
          <Html position={[trueLeoOrbitRadius, 0.28, 0]} center distanceFactor={18}>
            <span className="sc-world-label sc-world-label--warm">LEO · ~550 km</span>
          </Html>
        )}
      </group>

      {/* The short bracket shows the real altitude; only the LEO drawing moves. */}
      <Line
        points={[[earthSceneRadius, 0.04, 0], [trueLeoOrbitRadius, 0.04, 0]]}
        color="#ffbd85"
        transparent
        opacity={0.65}
        lineWidth={1}
      />
      <Line
        points={[[earthSceneRadius, -0.04, 0], [geoOrbitRadius, -0.04, 0]]}
        color="#ffbd85"
        transparent
        opacity={0.32}
        lineWidth={1}
      />
      {showLabels && (
        <>
          <Html position={[geoOrbitRadius, 0.35, 0]} center distanceFactor={22}>
            <span className="sc-world-label sc-world-label--warm">GEO · 35,786 km</span>
          </Html>
          <Html position={[(earthSceneRadius + trueLeoOrbitRadius) * 0.5, 0.16, 0]} center distanceFactor={17}>
            <span className="sc-world-measure">550 km · true</span>
          </Html>
          <Html position={[geoOrbitRadius * 0.65, -0.28, 0]} center distanceFactor={21}>
            <span className="sc-world-measure">35,786 km</span>
          </Html>
        </>
      )}
    </group>
  );
}
