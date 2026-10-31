import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { comparisonConfig, earthSceneRadius, trueLeoOrbitRadius } from "../config";
import { comparisonClock, useComparisonStore } from "../hooks/useComparisonStore";
import { geoPositionInSceneUnits, leoVisualRadius, locationInSceneUnits, ORBIT_ELEMENTS, positionInSceneUnits } from "../utils/orbit";
import { Constellation } from "./Constellation";
import { EarthGlobe } from "./Earth";
import { OrbitRings } from "./OrbitRings";
import { SatelliteModel } from "./SatelliteModel";

const UP = new THREE.Vector3(0, 1, 0);

interface CoverageConeProps {
  satelliteRef: RefObject<THREE.Object3D | null>;
  groundRef: RefObject<THREE.Object3D | null>;
  radius: number;
  opacity: number;
  visible: boolean;
}

function CoverageCone({ satelliteRef, groundRef, radius, opacity, visible }: CoverageConeProps) {
  const coneRef = useRef<THREE.Group>(null);
  const satellitePosition = useMemo(() => new THREE.Vector3(), []);
  const groundPosition = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const midpoint = useMemo(() => new THREE.Vector3(), []);
  const rotation = useMemo(() => new THREE.Quaternion(), []);

  useFrame(() => {
    if (!coneRef.current || !visible || !satelliteRef.current || !groundRef.current) return;
    satelliteRef.current.getWorldPosition(satellitePosition);
    groundRef.current.getWorldPosition(groundPosition);
    direction.subVectors(satellitePosition, groundPosition);
    const distance = direction.length();
    if (distance < 0.01) return;
    direction.multiplyScalar(1 / distance);
    midpoint.addVectors(satellitePosition, groundPosition).multiplyScalar(0.5);
    coneRef.current.position.copy(midpoint);
    rotation.setFromUnitVectors(UP, direction);
    coneRef.current.quaternion.copy(rotation);
    coneRef.current.scale.set(1, distance, 1);
  });

  return (
    <group ref={coneRef} visible={visible}>
      <mesh>
        <coneGeometry args={[radius, 1, 32, 1, true]} />
        <meshBasicMaterial
          color={comparisonConfig.colors.radio}
          transparent
          opacity={opacity}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

interface ConnectionProps {
  sourceRef: RefObject<THREE.Object3D | null>;
  targetRef: RefObject<THREE.Object3D | null>;
  color: string;
  visible: boolean;
  pulseDuration?: number;
  pulseSize?: number;
  fade?: "in" | "out";
}

/** Dynamic geocentric line; optional pulse travels up and back on Send. */
function DynamicConnection({
  sourceRef,
  targetRef,
  color,
  visible,
  pulseDuration = 0,
  pulseSize = 0.055,
  fade,
}: ConnectionProps) {
  const pulseRef = useRef<THREE.Mesh>(null);
  const lineMaterial = useRef<THREE.LineBasicMaterial>(null);
  const geometry = useMemo(() => {
    const line = new THREE.BufferGeometry();
    line.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3).setUsage(THREE.DynamicDrawUsage));
    return line;
  }, []);
  const source = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const pulsePosition = useMemo(() => new THREE.Vector3(), []);
  const stage = useComparisonStore((state) => state.stage);
  const sendNonce = useComparisonStore((state) => state.sendNonce);
  const sendStartedAtMs = useComparisonStore((state) => state.sendStartedAtMs);

  useFrame(() => {
    const sourceObject = sourceRef.current;
    const targetObject = targetRef.current;
    const line = geometry.getAttribute("position") as THREE.BufferAttribute;
    const values = line.array as Float32Array;
    if (!sourceObject || !targetObject) return;
    sourceObject.getWorldPosition(source);
    targetObject.getWorldPosition(target);
    values[0] = source.x;
    values[1] = source.y;
    values[2] = source.z;
    values[3] = target.x;
    values[4] = target.y;
    values[5] = target.z;
    line.needsUpdate = true;
    geometry.setDrawRange(0, visible ? 2 : 0);
    const transition = Math.max(0, Math.min(1, (comparisonClock.wallTime - comparisonClock.handoffStartedWall) / 1.1));
    const lineOpacity = fade === "in" ? transition * 0.72 : fade === "out" ? (1 - transition) * 0.62 : 0.62;
    if (lineMaterial.current) lineMaterial.current.opacity = visible ? lineOpacity : 0;

    if (!pulseRef.current || pulseDuration <= 0 || !sendStartedAtMs || !sendNonce) return;
    const elapsedSeconds = ((typeof performance !== "undefined" ? performance.now() : Date.now()) - sendStartedAtMs) / 1000;
    const phase = elapsedSeconds / pulseDuration;
    const pulseVisible = visible && stage === 3 && phase >= 0 && phase <= 1;
    pulseRef.current.visible = pulseVisible;
    if (pulseVisible) {
      const progress = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
      pulsePosition.lerpVectors(source, target, progress);
      pulseRef.current.position.copy(pulsePosition);
    }
  });

  return (
    <>
      <lineSegments geometry={geometry} frustumCulled={false}>
        <lineBasicMaterial ref={lineMaterial} color={color} transparent opacity={0.62} depthWrite={false} toneMapped={false} />
      </lineSegments>
      {pulseDuration > 0 && (
        <mesh ref={pulseRef} visible={false} scale={pulseSize}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshBasicMaterial color="#fff3d9" toneMapped={false} />
        </mesh>
      )}
    </>
  );
}

/** Earth, real-scale orbit relationships, location handoff and latency routes. */
export function EarthScene() {
  const stage = useComparisonStore((state) => state.stage);
  const location = useComparisonStore((state) => state.location);
  const bestSatelliteId = useComparisonStore((state) => state.bestSatelliteId);
  const previousSatelliteId = useComparisonStore((state) => state.previousSatelliteId);
  const showLabels = useComparisonStore((state) => state.showLabels);
  const scaleMode = useComparisonStore((state) => state.scaleMode);
  const leoVisualScale = useRef(1);
  const geoSatellite = useRef<THREE.Group>(null);
  const leoSatellite = useRef<THREE.Group>(null);
  const oldLeoSatellite = useRef<THREE.Group>(null);
  const groundMarker = useRef<THREE.Group>(null);
  const currentLeo = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);
  const oldLeo = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);
  const geoPoint = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);
  const sitePoint = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);
  const surfaceNormal = useMemo(() => new THREE.Vector3(), []);
  const showCoverage = stage === 2 || stage === 4 || stage === 5;

  useFrame((_, delta) => {
    const targetScale = scaleMode === "exaggerated" ? leoVisualRadius(true) / trueLeoOrbitRadius : 1;
    leoVisualScale.current = THREE.MathUtils.damp(leoVisualScale.current, targetScale, 5, delta);
    const time = comparisonClock.simTime;
    geoPositionInSceneUnits(location.lon, time, geoPoint);
    locationInSceneUnits(location, time, sitePoint);
    if (geoSatellite.current) geoSatellite.current.position.set(geoPoint.x, geoPoint.y, geoPoint.z);
    if (groundMarker.current) {
      groundMarker.current.position.set(sitePoint.x, sitePoint.y, sitePoint.z);
      surfaceNormal.set(sitePoint.x, sitePoint.y, sitePoint.z).normalize();
      groundMarker.current.quaternion.setFromUnitVectors(UP, surfaceNormal);
    }

    const activeId = bestSatelliteId >= 0 ? bestSatelliteId : 0;
    const currentElement = ORBIT_ELEMENTS[activeId];
    if (currentElement) {
      positionInSceneUnits(currentElement, time, currentLeo);
      currentLeo.x *= leoVisualScale.current;
      currentLeo.y *= leoVisualScale.current;
      currentLeo.z *= leoVisualScale.current;
      if (leoSatellite.current) leoSatellite.current.position.set(currentLeo.x, currentLeo.y, currentLeo.z);
    }
    const oldElement = ORBIT_ELEMENTS[previousSatelliteId >= 0 ? previousSatelliteId : activeId];
    if (oldElement) {
      positionInSceneUnits(oldElement, time, oldLeo);
      oldLeo.x *= leoVisualScale.current;
      oldLeo.y *= leoVisualScale.current;
      oldLeo.z *= leoVisualScale.current;
      if (oldLeoSatellite.current) oldLeoSatellite.current.position.set(oldLeo.x, oldLeo.y, oldLeo.z);
    }
  });

  return (
    <group visible={stage >= 2}>
      <EarthGlobe />
      <OrbitRings />
      <group ref={geoSatellite}>
        <SatelliteModel fact={comparisonConfig.copy.facts.geo} scale={stage >= 4 ? 0.42 : 0.64} />
      </group>
      <group ref={leoSatellite}>
        <SatelliteModel fact={comparisonConfig.copy.facts.leo} scale={stage >= 4 ? 0.32 : 0.5} />
      </group>
      {stage === 4 && <Constellation />}
      {stage !== 4 && (
        <group ref={oldLeoSatellite} visible={stage === 5 && previousSatelliteId >= 0}>
          <SatelliteModel fact={comparisonConfig.copy.facts.leo} scale={0.28} />
        </group>
      )}

      {/* The broad GEO footprint and narrow LEO spot are explanatory cones, not beam widths to scale. */}
      <CoverageCone
        satelliteRef={geoSatellite}
        groundRef={groundMarker}
        radius={1.7}
        opacity={stage === 2 ? 0.055 : 0.04}
        visible={showCoverage}
      />
      <CoverageCone
        satelliteRef={leoSatellite}
        groundRef={groundMarker}
        radius={0.26}
        opacity={stage === 2 ? 0.15 : 0.08}
        visible={showCoverage && stage !== 4}
      />

      <group ref={groundMarker}>
        <mesh>
          <sphereGeometry args={[0.045, 16, 12]} />
          <meshBasicMaterial color={comparisonConfig.colors.radio} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.009, 0.009, 0.22, 8]} />
          <meshBasicMaterial color="#ffd2ac" />
        </mesh>
        {/* Tiny side-by-side terminal silhouettes pin the selected location to Earth. */}
        <mesh position={[-0.075, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.052, 18]} />
          <meshStandardMaterial color="#f1f0ec" metalness={0.2} roughness={0.44} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-0.075, 0.13, 0.008]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.035, 18]} />
          <meshBasicMaterial color="#253b4c" />
        </mesh>
        <mesh position={[0.075, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.095, 0.07, 0.025]} />
          <meshStandardMaterial color="#f4f5f2" metalness={0.15} roughness={0.38} />
        </mesh>
        {showLabels && (
          <Html position={[0, 0.18, 0]} center distanceFactor={12}>
            <span className="sc-world-label sc-world-label--cyan">{location.name}</span>
          </Html>
        )}
      </group>

      <DynamicConnection
        sourceRef={groundMarker}
        targetRef={geoSatellite}
        color={comparisonConfig.colors.radio}
        visible={stage >= 3 && stage !== 4}
        pulseDuration={stage === 3 ? 0.88 : 0}
        pulseSize={0.07}
      />
      <DynamicConnection
        sourceRef={groundMarker}
        targetRef={leoSatellite}
        color={comparisonConfig.colors.radio}
        visible={stage >= 3 && stage !== 4 && (bestSatelliteId >= 0 || stage === 3)}
        pulseDuration={stage === 3 ? 0.24 : 0}
        pulseSize={0.045}
        fade={stage === 5 ? "in" : undefined}
      />
      {stage === 5 && previousSatelliteId >= 0 && (
        <DynamicConnection
          sourceRef={groundMarker}
          targetRef={oldLeoSatellite}
          color={comparisonConfig.colors.radio}
          visible
          fade="out"
        />
      )}

      {stage >= 2 && showLabels && (
        <>
          <Html position={[0, -earthSceneRadius - 0.25, 0]} center distanceFactor={16}>
            <span className="sc-world-label sc-world-label--warm">Broadcast · wide regional footprint</span>
          </Html>
          <Html position={[earthSceneRadius + 0.5, 0.55, 0]} center distanceFactor={10}>
            <span className="sc-world-measure">25° minimum elevation</span>
          </Html>
        </>
      )}

    </group>
  );
}
