import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { comparisonConfig, earthSceneRadius, trueLeoOrbitRadius } from "../config";
import { comparisonClock, useComparisonStore } from "../hooks/useComparisonStore";
import { leoVisualRadius, ORBIT_ELEMENTS, positionInSceneUnits, segmentClearsEarth } from "../utils/orbit";

const MAX_SATELLITES = comparisonConfig.constellation.count;
const PLANES = comparisonConfig.constellation.planes;
const PER_PLANE = comparisonConfig.constellation.satellitesPerPlane;
const MAX_LINK_SEGMENTS = MAX_SATELLITES * 2;

/**
 * 600 circular-orbit satellites and a shared dynamic LineSegments buffer.
 * Positions, instance matrices and link vertices are mutated in place in
 * useFrame; React only re-renders when a control or stage changes.
 */
export function Constellation() {
  const instances = useRef<THREE.InstancedMesh>(null);
  const stage = useComparisonStore((state) => state.stage);
  const showLinks = useComparisonStore((state) => state.showLinks);
  const scaleMode = useComparisonStore((state) => state.scaleMode);
  const lowQuality = useComparisonStore((state) => state.lowQuality);
  const visualScale = useRef(1);
  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_LINK_SEGMENTS * 2 * 3);
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setDrawRange(0, 0);
    return geometry;
  }, []);
  const positionBuffer = useMemo(() => new Float32Array(MAX_SATELLITES * 3), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const orbitPosition = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);
  const visibleCount = lowQuality ? comparisonConfig.constellation.reducedCount : MAX_SATELLITES;

  useEffect(() => {
    const mesh = instances.current;
    if (mesh) mesh.frustumCulled = false;
    lineGeometry.computeBoundingSphere();
  }, [lineGeometry]);

  useFrame((_, delta) => {
    const mesh = instances.current;
    if (!mesh) return;

    const targetScale = scaleMode === "exaggerated" ? leoVisualRadius(true) / trueLeoOrbitRadius : 1;
    visualScale.current = THREE.MathUtils.damp(visualScale.current, targetScale, 5, delta);
    const time = comparisonClock.simTime;
    const renderCount = visibleCount;
    for (let index = 0; index < MAX_SATELLITES; index += 1) {
      const element = ORBIT_ELEMENTS[index];
      if (!element) continue;
      positionInSceneUnits(element, time, orbitPosition);
      const offset = index * 3;
      positionBuffer[offset] = orbitPosition.x * visualScale.current;
      positionBuffer[offset + 1] = orbitPosition.y * visualScale.current;
      positionBuffer[offset + 2] = orbitPosition.z * visualScale.current;
    }

    for (let rendered = 0; rendered < renderCount; rendered += 1) {
      const sourceIndex = renderCount === MAX_SATELLITES
        ? rendered
        : Math.floor((rendered * MAX_SATELLITES) / renderCount);
      const element = ORBIT_ELEMENTS[sourceIndex];
      if (!element) continue;
      const offset = sourceIndex * 3;
      dummy.position.set(positionBuffer[offset] ?? 0, positionBuffer[offset + 1] ?? 0, positionBuffer[offset + 2] ?? 0);
      dummy.rotation.set(element.inclination * 0.35, element.meanMotion * time + element.meanAnomalyAtEpoch, element.raan * 0.1);
      dummy.scale.setScalar(0.036);
      dummy.updateMatrix();
      mesh.setMatrixAt(rendered, dummy.matrix);
    }
    mesh.count = renderCount;
    mesh.instanceMatrix.needsUpdate = true;

    const attribute = lineGeometry.getAttribute("position") as THREE.BufferAttribute;
    const linePositions = attribute.array as Float32Array;
    let lineVertex = 0;
    if (showLinks) {
      for (let index = 0; index < MAX_SATELLITES; index += 1) {
        const plane = Math.floor(index / PER_PLANE);
        const slot = index % PER_PLANE;
        const ahead = plane * PER_PLANE + ((slot + 1) % PER_PLANE);
        const right = ((plane + 1) % PLANES) * PER_PLANE + slot;
        const candidates = [ahead, right];
        for (let neighbourIndex = 0; neighbourIndex < candidates.length; neighbourIndex += 1) {
          const neighbour = candidates[neighbourIndex] ?? 0;
          const offsetA = index * 3;
          const offsetB = neighbour * 3;
          const ax = positionBuffer[offsetA] ?? 0;
          const ay = positionBuffer[offsetA + 1] ?? 0;
          const az = positionBuffer[offsetA + 2] ?? 0;
          const bx = positionBuffer[offsetB] ?? 0;
          const by = positionBuffer[offsetB + 1] ?? 0;
          const bz = positionBuffer[offsetB + 2] ?? 0;
          if (!segmentClearsEarth(ax, ay, az, bx, by, bz, earthSceneRadius * 1.02)) continue;
          linePositions[lineVertex++] = ax;
          linePositions[lineVertex++] = ay;
          linePositions[lineVertex++] = az;
          linePositions[lineVertex++] = bx;
          linePositions[lineVertex++] = by;
          linePositions[lineVertex++] = bz;
        }
      }
    }
    attribute.needsUpdate = true;
    lineGeometry.setDrawRange(0, lineVertex / 3);
  });

  const showSatelliteTooltip = (event: ThreeEvent<PointerEvent | MouseEvent>) => {
    event.stopPropagation();
    const instanceId = event.instanceId ?? 0;
    const id = Math.min(
      MAX_SATELLITES - 1,
      visibleCount === MAX_SATELLITES
        ? instanceId
        : Math.floor((instanceId * MAX_SATELLITES) / visibleCount),
    );
    useComparisonStore.getState().setTooltip({
      title: `LEO satellite #${String(id + 1).padStart(3, "0")}`,
      altitude: `~${comparisonConfig.leoAltitudeKm.toLocaleString()} km`,
      speed: `~${comparisonConfig.leoSpeedKmS} km/s · ~95 min orbit`,
      role: "Two-way broadband relay; laser mesh neighbour",
    });
  };

  return (
    <group visible={stage === 4}>
      <instancedMesh
        ref={instances}
        args={[undefined, undefined, MAX_SATELLITES]}
        castShadow
        frustumCulled={false}
        onPointerOver={showSatelliteTooltip}
        onClick={showSatelliteTooltip}
        onPointerOut={() => useComparisonStore.getState().setTooltip(null)}
      >
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={comparisonConfig.colors.satellite}
          emissive="#d5e8ff"
          emissiveIntensity={0.35}
          metalness={0.18}
          roughness={0.35}
          toneMapped={false}
        />
      </instancedMesh>
      <lineSegments geometry={lineGeometry} frustumCulled={false} visible={showLinks}>
        <lineBasicMaterial
          color={comparisonConfig.colors.laser}
          transparent
          opacity={lowQuality ? 0.22 : 0.38}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  );
}
