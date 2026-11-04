import { Suspense, useEffect, useMemo, useRef, type ComponentRef, type RefObject } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Line, OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { TelevisionDish, PhasedArrayDish } from "@/components/SatelliteComparison/scenes/DishStation";
import { segmentClearsEarth } from "@/components/SatelliteComparison/utils/orbit";
import { EARTH_RADIUS, LEO_RADIUS, GEO_RADIUS, SATELLITE_COUNT, earthRotationAt, groundNormalAt, geostationaryPositionAt, updateFleetPositions } from "./simulation";
import type { LabMode, LabSceneProps } from "./types";

// The drawing compresses GEO and expands LEO so both can be seen at once.
// Positions still follow circular orbit periods and a rotating Earth; it is not live telemetry.
const BASE = import.meta.env?.BASE_URL || "/";

const FRESNEL_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;
const FRESNEL_FRAGMENT = `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    // Rendered from inside the shell (BackSide): |dot| is 1 through the centre
    // of the disc and 0 at the silhouette, which is where the rim glow belongs.
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    float rim = pow(1.0 - facing, 3.2);
    gl_FragColor = vec4(vec3(0.22, 0.57, 0.95) * (0.5 + rim), rim * 0.28);
  }
`;

type SimClock = RefObject<number>;

function Globe({ clock }: { clock: SimClock }) {
  const [day, night, cloudTexture] = useLoader(THREE.TextureLoader, [`${BASE}textures/earth-day.jpg`, `${BASE}textures/earth-night.jpg`, `${BASE}textures/earth-clouds.png`]);
  const surface = useRef<THREE.Group>(null);
  const clouds = useRef<THREE.Group>(null);
  useMemo(() => {
    day.colorSpace = THREE.SRGBColorSpace;
    night.colorSpace = THREE.SRGBColorSpace;
    cloudTexture.colorSpace = THREE.SRGBColorSpace;
    day.anisotropy = 8;
    night.anisotropy = 8;
  }, [day, night, cloudTexture]);
  useFrame(() => {
    if (surface.current) surface.current.rotation.y = earthRotationAt(clock.current) - 0.35;
    if (clouds.current) clouds.current.rotation.y = earthRotationAt(clock.current) - 0.31;
  });

  return (
    <group>
      <group ref={surface}>
        <mesh>
          <sphereGeometry args={[EARTH_RADIUS, 96, 64]} />
          <meshStandardMaterial map={day} emissiveMap={night} emissive="#dce8ff" emissiveIntensity={0.2} roughness={0.96} />
        </mesh>
      </group>
      {cloudTexture && (
        <group ref={clouds}>
          <mesh scale={1.007}>
            <sphereGeometry args={[EARTH_RADIUS, 64, 48]} />
            <meshLambertMaterial map={cloudTexture} transparent opacity={0.58} depthWrite={false} />
          </mesh>
        </group>
      )}
      <mesh scale={1.035} raycast={() => null}>
        <sphereGeometry args={[EARTH_RADIUS, 64, 48]} />
        <shaderMaterial vertexShader={FRESNEL_VERTEX} fragmentShader={FRESNEL_FRAGMENT} side={THREE.BackSide} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
}

function orbitPoints(radius: number, inclination = 0, ascendingNode = 0) {
  const points: [number, number, number][] = [];
  const inc = THREE.MathUtils.degToRad(inclination);
  const cosI = Math.cos(inc);
  const sinI = Math.sin(inc);
  const cosN = Math.cos(ascendingNode);
  const sinN = Math.sin(ascendingNode);
  for (let i = 0; i <= 256; i += 1) {
    const a = i / 256 * Math.PI * 2;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    points.push([
      radius * (cosN * cos - sinN * sin * cosI),
      radius * sin * sinI,
      radius * (sinN * cos + cosN * sin * cosI),
    ]);
  }
  return points;
}

function OrbitPaths({ mode, show }: { mode: LabMode; show: boolean }) {
  const geo = useMemo(() => orbitPoints(GEO_RADIUS), []);
  const leoA = useMemo(() => orbitPoints(LEO_RADIUS, 53, 0), []);
  const leoB = useMemo(() => orbitPoints(LEO_RADIUS, 53, Math.PI / 2), []);
  const leoC = useMemo(() => orbitPoints(LEO_RADIUS, 53, 4 * Math.PI / 5), []);
  if (!show) return null;
  return (
    <group>
      {mode !== "starlink" && <Line points={geo} color="#f2ae78" transparent opacity={0.72} lineWidth={1.2} />}
      {mode !== "broadcast" && (
        <>
          <Line points={leoA} color="#75d7ed" transparent opacity={0.58} lineWidth={1.1} />
          <Line points={leoB} color="#75d7ed" transparent opacity={0.3} lineWidth={0.8} />
          {mode === "starlink" && <Line points={leoC} color="#75d7ed" transparent opacity={0.3} lineWidth={0.8} />}
        </>
      )}
    </group>
  );
}

function BroadcastSatellite() {
  return (
    <group rotation={[0.27, -0.28, -0.24]} scale={0.8}>
      <mesh>
        <boxGeometry args={[0.32, 0.3, 0.3]} />
        <meshStandardMaterial color="#e5e8e8" metalness={0.62} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.19, 0]}>
        <boxGeometry args={[0.2, 0.06, 0.2]} />
        <meshStandardMaterial color="#b9c8d0" metalness={0.6} roughness={0.36} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.57, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.79, 0.05, 0.32]} />
            <meshStandardMaterial color="#547a96" metalness={0.55} roughness={0.35} emissive="#1a3b56" emissiveIntensity={0.35} />
          </mesh>
          {[-0.27, -0.09, 0.09, 0.27].map((x) => (
            <mesh key={x} position={[x, 0.028, 0]}>
              <boxGeometry args={[0.012, 0.008, 0.3]} />
              <meshBasicMaterial color="#b4c9d4" />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 0, 0.21]}>
        <sphereGeometry args={[0.12, 16, 10]} />
        <meshStandardMaterial color="#ecf0ee" metalness={0.4} roughness={0.38} />
      </mesh>
    </group>
  );
}

function StarlinkSatellite() {
  return (
    <group rotation={[0.25, 0.2, -0.28]} scale={0.68}>
      <mesh>
        <boxGeometry args={[0.36, 0.1, 0.24]} />
        <meshStandardMaterial color="#eef5f7" emissive="#84d3e4" emissiveIntensity={0.15} metalness={0.45} roughness={0.35} />
      </mesh>
      <mesh position={[0.5, 0, 0]}>
        <boxGeometry args={[0.64, 0.035, 0.2]} />
        <meshStandardMaterial color="#547f9d" emissive="#1c526c" emissiveIntensity={0.5} metalness={0.55} roughness={0.3} />
      </mesh>
      {[-0.18, 0, 0.18].map((x) => (
        <mesh key={x} position={[0.5 + x, 0.021, 0]}>
          <boxGeometry args={[0.012, 0.004, 0.19]} />
          <meshBasicMaterial color="#b5d6e5" />
        </mesh>
      ))}
    </group>
  );
}

/** Animated circular orbit positions, a GEO ground track, and a simplified signal path. */
function OrbitalDynamics({ clock, mode, showSignals, showMesh }: { clock: SimClock; mode: LabMode; showSignals: boolean; showMesh: boolean }) {
  const geo = useRef<THREE.Group>(null);
  const leo = useRef<THREE.Group>(null);
  const site = useRef<THREE.Group>(null);
  const fleet = useRef<THREE.InstancedMesh>(null);
  const geoPulse = useRef<THREE.Mesh>(null);
  const leoUpPulse = useRef<THREE.Mesh>(null);
  const leoDownPulse = useRef<THREE.Mesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const position = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);
  const groundNormal = useMemo(() => ({ x: 0, y: 0, z: 0 }), []);
  const sitePosition = useMemo(() => new THREE.Vector3(), []);
  const geoPosition = useMemo(() => new THREE.Vector3(), []);
  const leoPosition = useMemo(() => new THREE.Vector3(), []);
  const satellitePositions = useMemo(() => new Float32Array(SATELLITE_COUNT * 3), []);
  const visualPositions = useMemo(() => new Float32Array(SATELLITE_COUNT * 3), []);
  const paths = useMemo(() => {
    const makeLine = () => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3).setUsage(THREE.DynamicDrawUsage));
      return geometry;
    };
    const mesh = new THREE.BufferGeometry();
    mesh.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SATELLITE_COUNT * 2 * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    mesh.setDrawRange(0, 0);
    return { geo: makeLine(), leo: makeLine(), mesh };
  }, []);
  useEffect(() => () => { paths.geo.dispose(); paths.leo.dispose(); paths.mesh.dispose(); }, [paths]);

  useFrame(() => {
    const time = clock.current;
    groundNormalAt(time, groundNormal);
    sitePosition.set(groundNormal.x, groundNormal.y, groundNormal.z).multiplyScalar(EARTH_RADIUS * 1.013);
    geostationaryPositionAt(time, geoPosition);
    if (site.current) site.current.position.copy(sitePosition);
    if (geo.current) geo.current.position.copy(geoPosition);

    const bestIndex = updateFleetPositions(time, groundNormal, satellitePositions, visualPositions, position);
    const index = bestIndex * 3;
    leoPosition.set(visualPositions[index] ?? 0, visualPositions[index + 1] ?? 0, visualPositions[index + 2] ?? 0);
    if (leo.current) leo.current.position.copy(leoPosition);

    if (fleet.current) {
      const count = mode === "starlink" || showMesh ? SATELLITE_COUNT : 120;
      for (let i = 0; i < count; i += 1) {
        const source = Math.floor(i * SATELLITE_COUNT / count) * 3;
        dummy.position.set(visualPositions[source] ?? 0, visualPositions[source + 1] ?? 0, visualPositions[source + 2] ?? 0);
        dummy.scale.setScalar(mode === "starlink" ? 0.021 : 0.026);
        dummy.updateMatrix();
        fleet.current.setMatrixAt(i, dummy.matrix);
      }
      fleet.current.count = count;
      fleet.current.instanceMatrix.needsUpdate = true;
    }

    const setLine = (geometry: THREE.BufferGeometry, a: THREE.Vector3, b: THREE.Vector3) => {
      const attribute = geometry.getAttribute("position") as THREE.BufferAttribute;
      attribute.setXYZ(0, a.x, a.y, a.z);
      attribute.setXYZ(1, b.x, b.y, b.z);
      attribute.needsUpdate = true;
    };
    setLine(paths.geo, sitePosition, geoPosition);
    setLine(paths.leo, sitePosition, leoPosition);
    const phase = (time / 210) % 1;
    geoPulse.current?.position.lerpVectors(geoPosition, sitePosition, phase);
    leoUpPulse.current?.position.lerpVectors(sitePosition, leoPosition, phase);
    leoDownPulse.current?.position.lerpVectors(leoPosition, sitePosition, (phase + 0.5) % 1);

    const attribute = paths.mesh.getAttribute("position") as THREE.BufferAttribute;
    const lineData = attribute.array as Float32Array;
    let cursor = 0;
    if (showMesh && mode !== "broadcast") {
      for (let i = 0; i < SATELLITE_COUNT; i += 1) {
        const plane = Math.floor(i / 30);
        const slot = i % 30;
        for (let neighbourIndex = 0; neighbourIndex < 2; neighbourIndex += 1) {
          const neighbour = neighbourIndex === 0 ? plane * 30 + (slot + 1) % 30 : ((plane + 1) % 20) * 30 + slot;
          const a = i * 3;
          const b = neighbour * 3;
          if (!segmentClearsEarth(
            satellitePositions[a] ?? 0, satellitePositions[a + 1] ?? 0, satellitePositions[a + 2] ?? 0,
            satellitePositions[b] ?? 0, satellitePositions[b + 1] ?? 0, satellitePositions[b + 2] ?? 0, 1.01,
          )) continue;
          lineData[cursor++] = visualPositions[a] ?? 0;
          lineData[cursor++] = visualPositions[a + 1] ?? 0;
          lineData[cursor++] = visualPositions[a + 2] ?? 0;
          lineData[cursor++] = visualPositions[b] ?? 0;
          lineData[cursor++] = visualPositions[b + 1] ?? 0;
          lineData[cursor++] = visualPositions[b + 2] ?? 0;
        }
      }
    }
    attribute.needsUpdate = true;
    paths.mesh.setDrawRange(0, cursor / 3);
  });

  const showGeo = mode !== "starlink";
  const showLeo = mode !== "broadcast";
  return (
    <group>
      <group ref={geo} visible={showGeo}><BroadcastSatellite /></group>
      <group ref={leo} visible={showLeo}><StarlinkSatellite /></group>
      <group ref={site}>
        <mesh><sphereGeometry args={[0.055, 16, 12]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
        <mesh><sphereGeometry args={[0.11, 16, 12]} /><meshBasicMaterial color="#9de8ff" transparent opacity={0.18} depthWrite={false} /></mesh>
      </group>
      <instancedMesh ref={fleet} args={[undefined, undefined, SATELLITE_COUNT]} visible={showLeo} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial color="#c9efff" toneMapped={false} />
      </instancedMesh>
      <lineSegments geometry={paths.mesh} visible={showMesh && showLeo} frustumCulled={false}>
        <lineBasicMaterial color="#70d6ed" transparent opacity={0.28} depthWrite={false} />
      </lineSegments>
      <lineSegments geometry={paths.geo} visible={showSignals && showGeo} frustumCulled={false}>
        <lineBasicMaterial color="#ffbb8a" transparent opacity={0.75} depthWrite={false} />
      </lineSegments>
      <lineSegments geometry={paths.leo} visible={showSignals && showLeo} frustumCulled={false}>
        <lineBasicMaterial color="#80e6fa" transparent opacity={0.85} depthWrite={false} />
      </lineSegments>
      <mesh ref={geoPulse} visible={showSignals && showGeo}><sphereGeometry args={[0.055, 12, 8]} /><meshBasicMaterial color="#fff2dd" toneMapped={false} /></mesh>
      <mesh ref={leoUpPulse} visible={showSignals && showLeo}><sphereGeometry args={[0.045, 12, 8]} /><meshBasicMaterial color="#eaffff" toneMapped={false} /></mesh>
      <mesh ref={leoDownPulse} visible={showSignals && showLeo}><sphereGeometry args={[0.035, 12, 8]} /><meshBasicMaterial color="#96eaff" toneMapped={false} /></mesh>
    </group>
  );
}

function DishSignals({ clock }: { clock: SimClock }) {
  const tvPulse = useRef<THREE.Mesh>(null);
  const leoUp = useRef<THREE.Mesh>(null);
  const leoDown = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const phase = (clock.current / 180) % 1;
    if (tvPulse.current) tvPulse.current.position.y = 4.5 - phase * 2.75;
    if (leoUp.current) leoUp.current.position.y = 1.25 + phase * 3.25;
    if (leoDown.current) leoDown.current.position.y = 4.5 - ((phase + 0.5) % 1) * 3.25;
  });
  return (
    <group>
      <Line points={[[-2.3, 1.55, 0], [-2.3, 4.6, 0]]} color="#f6ab73" transparent opacity={0.55} lineWidth={1.2} />
      <Line points={[[2.3, 1.2, 0], [2.3, 4.6, 0]]} color="#7cddf4" transparent opacity={0.6} lineWidth={1.2} />
      <mesh ref={tvPulse} position={[-2.3, 4.5, 0]}><sphereGeometry args={[0.055, 12, 8]} /><meshBasicMaterial color="#fff1dd" /></mesh>
      <mesh ref={leoUp} position={[2.3, 1.25, 0]}><sphereGeometry args={[0.055, 12, 8]} /><meshBasicMaterial color="#d4fbff" /></mesh>
      <mesh ref={leoDown} position={[2.3, 4.5, 0]}><sphereGeometry args={[0.045, 12, 8]} /><meshBasicMaterial color="#78d9f5" /></mesh>
    </group>
  );
}

function Dishes({ clock, showSignals }: { clock: SimClock; showSignals: boolean }) {
  return (
    <group>
      <ambientLight intensity={0.55} />
      <directionalLight position={[-4, 8, 6]} intensity={2.4} color="#e6f3ff" />
      <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#111c2b" roughness={0.78} metalness={0.15} />
      </mesh>
      <TelevisionDish position={[-2.3, 0, 0]} />
      <PhasedArrayDish position={[2.3, 0, 0]} />
      {showSignals && <DishSignals clock={clock} />}
    </group>
  );
}

function Camera({ mode, resetKey }: { mode: LabMode; resetKey: number }) {
  const camera = useThree((state) => state.camera);
  const aspect = useThree((state) => state.size.width / Math.max(state.size.height, 1));
  const gl = useThree((state) => state.gl);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute("aria-label", "Interactive 3D satellite model. Use arrow keys to rotate and plus or minus to zoom.");
    const onKeyDown = (event: KeyboardEvent) => {
      const orbit = controls.current;
      if (!orbit) return;
      const step = 0.2;
      if (event.key === "ArrowLeft") orbit.setAzimuthalAngle(orbit.getAzimuthalAngle() - step);
      else if (event.key === "ArrowRight") orbit.setAzimuthalAngle(orbit.getAzimuthalAngle() + step);
      else if (event.key === "ArrowUp") orbit.setPolarAngle(orbit.getPolarAngle() - step);
      else if (event.key === "ArrowDown") orbit.setPolarAngle(orbit.getPolarAngle() + step);
      else if (["+", "=", "-", "_"].includes(event.key)) {
        const offset = camera.position.clone().sub(orbit.target);
        const factor = event.key === "+" || event.key === "=" ? 0.85 : 1.18;
        offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, orbit.minDistance, orbit.maxDistance));
        camera.position.copy(orbit.target).add(offset);
        orbit.update();
      } else return;
      event.preventDefault();
    };
    canvas.addEventListener("keydown", onKeyDown);
    return () => canvas.removeEventListener("keydown", onKeyDown);
  }, [camera, gl]);
  useEffect(() => {
    const isDishes = mode === "dishes";
    // Flush any remaining drag momentum so a reset lands exactly on the preset.
    const orbit = controls.current;
    const wasDamping = orbit?.enableDamping;
    if (orbit) { orbit.enableDamping = false; orbit.update(); }
    // A narrow canvas needs a wider view to keep the outer orbit and both dishes on screen.
    const distanceFactor = Math.max(1, Math.min(1.8, (isDishes ? 1.2 : 1.48) / aspect));
    if (isDishes) camera.position.set(0, 1.35 + 1.45 * distanceFactor, 9.8 * distanceFactor);
    else camera.position.set(0, 4 * distanceFactor, 9.6 * distanceFactor);
    orbit?.target.set(0, isDishes ? 1.35 : 0, 0);
    camera.lookAt(0, isDishes ? 1.35 : 0, 0);
    orbit?.update();
    if (orbit && wasDamping !== undefined) orbit.enableDamping = wasDamping;
  }, [aspect, camera, mode, resetKey]);
  return <OrbitControls ref={controls} enablePan={false} enableDamping dampingFactor={0.08} minDistance={6} maxDistance={24} minPolarAngle={0.15} maxPolarAngle={mode === "dishes" ? Math.PI / 2.05 : Math.PI - 0.15} />;
}

function World({ mode, playing, speed, showOrbits, showSignals, showMesh, resetKey, onReady }: Omit<LabSceneProps, "active">) {
  const clock = useRef(0);
  useFrame((_, delta) => { if (playing) clock.current += Math.min(delta, 0.1) * speed; }, -2);
  useEffect(() => { onReady(); }, [onReady]);
  return (
    <>
      <ambientLight intensity={0.5} color="#c8dff6" />
      <directionalLight position={[-5, 5, 8]} intensity={2.0} color="#f4f7ff" />
      <directionalLight position={[6, -2, -5]} intensity={0.5} color="#4d8dc0" />
      <Stars radius={65} depth={35} count={950} factor={2.2} saturation={0} fade speed={0} />
      {mode === "dishes" ? <Dishes clock={clock} showSignals={showSignals} /> : (
        <>
          <Globe clock={clock} />
          <OrbitPaths mode={mode} show={showOrbits} />
          <OrbitalDynamics clock={clock} mode={mode} showSignals={showSignals} showMesh={showMesh} />
        </>
      )}
      <Camera mode={mode} resetKey={resetKey} />
    </>
  );
}

export default function LabScene({ active, ...props }: LabSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 4, 9.6], fov: 32, near: 0.1, far: 150 }}
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "demand"}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ touchAction: "none" }}
    >
      <Suspense fallback={null}><World {...props} /></Suspense>
    </Canvas>
  );
}
