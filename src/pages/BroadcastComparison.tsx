import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type RefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, OrbitControls, Stars } from "@react-three/drei";
import { Pause, Play, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import * as THREE from "three";
import { SceneGate } from "@/components/site/SceneGate";
import { useReducedMotion } from "@/lib/useMediaQuery";
import { EARTH_RADIUS, LEO_RADIUS, GEO_RADIUS, LEO_INCLINATION, orbitPoint, horizonCoverage } from "@/lib/broadcastOrbit";
import { cn } from "@/utils/cn";

/**
 * Interactive "broadcast TV vs Starlink" view.
 *
 * Everything that touches the three.js renderer — `useThree`, `useFrame`, the
 * OrbitControls instance — lives in a component rendered *inside* `<Canvas>`.
 * React Three Fiber hooks read from a context that only exists below the
 * Canvas, so calling them in the component that renders the Canvas throws
 * "R3F: Hooks can only be used within the Canvas component".
 *
 * Orbit radii are to scale; spacecraft and line widths are enlarged for visibility.
 */

const assetBase = import.meta.env?.BASE_URL || "/";

const HOME_FOV = 40;
/** Where the camera sits relative to the target, before fitting the frame. */
const VIEW_DIRECTION = new THREE.Vector3(0, 0.38, 0.92).normalize();

const FRESNEL_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const FRESNEL_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    // This shell is rendered from the inside (BackSide), so the view ray meets
    // the far hemisphere. |dot| is 1 at the centre of the disc and 0 at the
    // silhouette, which puts the glow where the atmosphere actually is.
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    float rim = pow(1.0 - facing, 3.2);
    float glow = smoothstep(0.0, 0.9, rim) * 0.52;
    gl_FragColor = vec4(uColor * (0.72 + rim), glow);
  }
`;

/* -------------------------------------------------------------------------- */
/* Scene                                                                      */
/* -------------------------------------------------------------------------- */

/** Pixel-width paths stay legible when the camera is zoomed out. */
function OrbitRing({ radius, color, inclination = 0 }: { radius: number; color: string; inclination?: number }) {
  const points = useMemo(() => Array.from({ length: 257 }, (_, i) =>
    orbitPoint(radius, i / 256 * Math.PI * 2, inclination)), [radius, inclination]);
  return <group>
    {/* A faint dashed x-ray trace identifies the far side behind Earth. */}
    <Line points={points} color={color} lineWidth={1} transparent opacity={0.25}
      dashed dashSize={0.07} gapSize={0.05} depthTest={false} depthWrite={false} />
    <Line points={points} color={color} lineWidth={2.5} transparent opacity={0.95} depthWrite={false} />
  </group>;
}

/** Tangent cone and spherical cap: geometric horizon, not a service map. */
function CoverageCone({ satellite, radius, color }: {
  satellite: RefObject<THREE.Group | null>; radius: number; color: string;
}) {
  const ref = useRef<THREE.Group>(null);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const { angle } = horizonCoverage(radius);
  const baseY = EARTH_RADIUS * Math.cos(angle);
  const baseRadius = EARTH_RADIUS * Math.sin(angle);
  const rim = useMemo(() => Array.from({ length: 129 }, (_, i) => {
    const t = i / 128 * Math.PI * 2;
    return [baseRadius * Math.cos(t), baseY, baseRadius * Math.sin(t)] as [number, number, number];
  }), [baseRadius, baseY]);
  useFrame(() => {
    if (ref.current && satellite.current) {
      direction.copy(satellite.current.position).normalize();
      ref.current.quaternion.setFromUnitVectors(up, direction);
    }
  });
  return <group ref={ref}>
    <mesh position={[0, (radius + baseY) / 2, 0]}>
      <coneGeometry args={[baseRadius, radius - baseY, 96, 1, true]} />
      <meshBasicMaterial color={color} transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
    <mesh>
      <sphereGeometry args={[EARTH_RADIUS * 1.015, 96, 32, 0, Math.PI * 2, 0, angle]} />
      <meshBasicMaterial color={color} transparent opacity={0.28} depthWrite={false} />
    </mesh>
    <group scale={1.016}><Line points={rim} color={color} lineWidth={2} transparent opacity={0.9} depthWrite={false} /></group>
    {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map(t =>
      <Line key={t} points={[[0, radius, 0], [baseRadius * Math.cos(t), baseY, baseRadius * Math.sin(t)]]}
        color={color} lineWidth={1} transparent opacity={0.45} depthWrite={false} />)}
  </group>;
}

interface EarthTextures {
  day: THREE.Texture | null;
  night: THREE.Texture | null;
  clouds: THREE.Texture | null;
}

const NO_TEXTURES: EarthTextures = { day: null, night: null, clouds: null };

/**
 * Loads the local Earth maps after mount so a slow (or missing) texture never
 * blanks the scene: the globe renders with flat colours until the maps land.
 * All three are fetched together and committed in one update, which keeps the
 * material from recompiling once per file.
 */
function useEarthTextures(): EarthTextures {
  const [textures, setTextures] = useState<EarthTextures>(NO_TEXTURES);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const loaded: THREE.Texture[] = [];
    let disposed = false;

    const load = async (file: string, srgb: boolean) => {
      try {
        const texture = await loader.loadAsync(`${assetBase}textures/${file}`);
        if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        return texture;
      } catch {
        // A missing map only costs detail; the globe keeps its flat colour.
        return null;
      }
    };

    void Promise.all([
      load("earth-day.jpg", true),
      load("earth-night.jpg", true),
      load("earth-clouds.png", false),
    ]).then(([day, night, clouds]) => {
      if (disposed) {
        for (const texture of [day, night, clouds]) texture?.dispose();
        return;
      }
      for (const texture of [day, night, clouds]) if (texture) loaded.push(texture);
      setTextures({ day, night, clouds });
    });

    return () => {
      disposed = true;
      for (const texture of loaded) texture.dispose();
    };
  }, []);

  return textures;
}

/** Earth: day map, city lights, drifting clouds and a fresnel atmosphere. */
function EarthGlobe() {
  const surfaceRef = useRef<THREE.Group>(null);
  const cloudRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const textures = useEarthTextures();
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color("#63a9ff") } }), []);

  // three.js compiles a material's shader on first use, so attaching a map to
  // an already-rendered material needs an explicit recompile — changing the
  // texture alone leaves USE_MAP out of the program and the globe renders flat.
  useEffect(() => {
    if (materialRef.current) materialRef.current.needsUpdate = true;
  }, [textures.day, textures.night]);

  useFrame((_, delta) => {
    const turn = delta * 0.05; // ~2 minutes per rotation, illustrative only
    if (surfaceRef.current) surfaceRef.current.rotation.y += turn;
    if (cloudRef.current) cloudRef.current.rotation.y += turn * 1.02;
  });

  return (
    <group>
      <group ref={surfaceRef}>
        <mesh>
          <sphereGeometry args={[EARTH_RADIUS, 80, 60]} />
          <meshStandardMaterial
            ref={materialRef}
            map={textures.day ?? undefined}
            color={textures.day ? "#ffffff" : "#123149"}
            emissiveMap={textures.night ?? undefined}
            emissive={textures.night ? "#ffffff" : "#000000"}
            emissiveIntensity={textures.night ? 0.35 : 0}
            roughness={0.88}
            metalness={0}
          />
        </mesh>
      </group>
      {textures.clouds && (
        <group ref={cloudRef}>
          <mesh scale={1.012}>
            <sphereGeometry args={[EARTH_RADIUS, 60, 45]} />
            <meshLambertMaterial
              map={textures.clouds}
              color="#cddbeb"
              transparent
              opacity={0.18}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
      <mesh scale={1.05} raycast={() => null}>
        <sphereGeometry args={[EARTH_RADIUS, 48, 48]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={FRESNEL_VERTEX}
          fragmentShader={FRESNEL_FRAGMENT}
          side={THREE.BackSide}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** Starlink-style LEO spacecraft: bus, two wings and an antenna mast. */
function LeoSatellite({ coverage }: { coverage: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const angle = useRef(0);
  const spin = useRef(new THREE.Euler(0.24, 0.35, -0.14));

  useFrame((_, delta) => {
    angle.current += delta * 1.15; // one lap every ~5.5 seconds, illustrative only
    const group = ref.current;
    if (!group) return;
    group.position.set(...orbitPoint(LEO_RADIUS, angle.current, LEO_INCLINATION));
    group.rotation.set(spin.current.x + delta, spin.current.y + delta * 0.6, spin.current.z);
  });

  return (
    <>
    <group ref={ref} position={orbitPoint(LEO_RADIUS, 0, LEO_INCLINATION)} scale={0.16}>
      <mesh>
        <sphereGeometry args={[0.26, 16, 12]} />
        <meshBasicMaterial color="#64d8ff" transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <mesh>
        <boxGeometry args={[0.16, 0.09, 0.18]} />
        <meshStandardMaterial color="#f4f5f4" metalness={0.42} roughness={0.32} emissive="#5b6674" emissiveIntensity={0.16} />
      </mesh>
      {[-0.28, 0.28].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.4, 0.03, 0.15]} />
          <meshStandardMaterial color="#dbe7f1" metalness={0.34} roughness={0.36} emissive="#8bb8d5" emissiveIntensity={0.1} />
        </mesh>
      ))}
      <mesh position={[0, 0.09, -0.07]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.2, 8]} />
        <meshStandardMaterial color="#fbfbf8" metalness={0.45} roughness={0.35} />
      </mesh>
    </group>
    {coverage && <CoverageCone satellite={ref} radius={LEO_RADIUS} color="#64d8ff" />}
    </>
  );
}

/** Geostationary broadcast-TV satellite: stays over one equatorial point. */
function GeoSatellite({ coverage }: { coverage: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const angle = useRef(0.5);

  useFrame((_, delta) => {
    angle.current += delta * 0.05; // turns with Earth
    const group = ref.current;
    if (!group) return;
    group.position.set(
      GEO_RADIUS * Math.cos(angle.current),
      0,
      GEO_RADIUS * Math.sin(angle.current),
    );
    group.lookAt(0, 0, 0);
  });

  return (
    <>
    <group ref={ref} position={orbitPoint(GEO_RADIUS, 0.5)} scale={0.95}>
      <mesh>
        <boxGeometry args={[0.3, 0.2, 0.32]} />
        <meshStandardMaterial color="#e8edf3" metalness={0.5} roughness={0.25} emissive="#6b7a8c" emissiveIntensity={0.14} />
      </mesh>
      <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.16, 0.4, 20]} />
        <meshStandardMaterial color="#c9d6e2" metalness={0.6} roughness={0.2} />
      </mesh>
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <boxGeometry args={[0.55, 0.04, 0.18]} />
          <meshStandardMaterial color="#dbe7f1" metalness={0.4} roughness={0.3} emissive="#7ea6c8" emissiveIntensity={0.08} />
        </mesh>
      ))}
    </group>
    {coverage && <CoverageCone satellite={ref} radius={GEO_RADIUS} color="#ff7a1a" />}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Camera and controls (must live inside <Canvas>)                            */
/* -------------------------------------------------------------------------- */

/** Imperative camera actions the overlay buttons can call from outside. */
interface SceneCameraApi {
  zoom: (factor: number) => void;
  reset: () => void;
  focusLeo: () => void;
}

function SceneCamera({
  autoRotate,
  api,
}: {
  autoRotate: boolean;
  api: RefObject<SceneCameraApi | null>;
}) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);

  /** Pull the camera back far enough to keep the whole GEO ring on screen. */
  const frameScene = useCallback(() => {
    const orbit = controls.current;
    const aspect = size.width / Math.max(size.height, 1);
    const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : HOME_FOV;
    const halfFov = THREE.MathUtils.degToRad(fov) / 2;
    const radius = GEO_RADIUS * 1.12;
    const distance = Math.max(radius / Math.tan(halfFov), radius / (Math.tan(halfFov) * aspect));
    camera.position.copy(VIEW_DIRECTION).multiplyScalar(distance);
    camera.lookAt(0, 0, 0);
    if (orbit) {
      orbit.target.set(0, 0, 0);
      orbit.update();
    }
  }, [camera, size.height, size.width]);

  const zoom = useCallback(
    (factor: number) => {
      const orbit = controls.current;
      if (!orbit) return;
      const offset = camera.position.clone().sub(orbit.target);
      const distance = THREE.MathUtils.clamp(
        offset.length() * factor,
        orbit.minDistance,
        orbit.maxDistance,
      );
      camera.position.copy(orbit.target).add(offset.setLength(distance));
      orbit.update();
    },
    [camera],
  );

  // Re-fit on mount and whenever the canvas is resized.
  useEffect(() => {
    frameScene();
  }, [frameScene]);

  // Hand the overlay buttons a stable way to drive the camera.
  useEffect(() => {
    api.current = { zoom, reset: frameScene, focusLeo: () => {
      controls.current?.target.set(0, 0, 0);
      camera.position.copy(VIEW_DIRECTION).multiplyScalar(LEO_RADIUS * 3.8);
      camera.lookAt(0, 0, 0);
      controls.current?.update();
    } };
    return () => {
      api.current = null;
    };
  }, [api, frameScene, zoom]);

  useEffect(() => {
    const orbit = controls.current;
    if (orbit) orbit.autoRotate = autoRotate;
  }, [autoRotate]);

  // Keyboard support is bound to the canvas itself, so the page's own
  // keyboard shortcuts keep working when the scene is not focused.
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute(
      "aria-label",
      "Interactive 3D model of Earth, a geostationary broadcast-TV satellite and a moving LEO Starlink satellite. Use the arrow keys to rotate and plus or minus to zoom.",
    );

    const onKeyDown = (event: KeyboardEvent) => {
      const orbit = controls.current;
      if (!orbit) return;
      const step = 0.2;
      if (event.key === "ArrowLeft") orbit.setAzimuthalAngle(orbit.getAzimuthalAngle() - step);
      else if (event.key === "ArrowRight") orbit.setAzimuthalAngle(orbit.getAzimuthalAngle() + step);
      else if (event.key === "ArrowUp") orbit.setPolarAngle(orbit.getPolarAngle() - step);
      else if (event.key === "ArrowDown") orbit.setPolarAngle(orbit.getPolarAngle() + step);
      else if (event.key === "+" || event.key === "=") zoom(0.85);
      else if (event.key === "-" || event.key === "_") zoom(1.18);
      else return;
      event.preventDefault();
    };

    canvas.addEventListener("keydown", onKeyDown);
    return () => canvas.removeEventListener("keydown", onKeyDown);
  }, [gl, zoom]);

  return (
    <OrbitControls
      ref={controls}
      autoRotate={autoRotate}
      autoRotateSpeed={0.7}
      enablePan
      enableZoom
      enableRotate
      enableDamping
      dampingFactor={0.06}
      minDistance={2.4}
      maxDistance={90}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI - 0.12}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Canvas + overlay                                                           */
/* -------------------------------------------------------------------------- */

const overlayButton = cn(
  "pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border border-white/15",
  "bg-[#040a14]/80 px-2.5 py-1.5 text-[11px] font-medium text-white backdrop-blur",
  "transition-colors hover:border-white/35 hover:bg-white/12",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal",
);

function LegendEntry({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      <span className="font-mono text-[10px] text-slate-300">{label}</span>
    </span>
  );
}

/** Canvas, legend and camera controls. Rendered below <SceneGate>. */
function BroadcastScene() {
  const reducedMotion = useReducedMotion();
  const [coverage, setCoverage] = useState(false);
  const [autoRotate, setAutoRotate] = useState(!reducedMotion);
  const api = useRef<SceneCameraApi | null>(null);

  useEffect(() => {
    if (reducedMotion) setAutoRotate(false);
  }, [reducedMotion]);

  return (
    <>
      <Canvas
        camera={{ position: [0, 8, 20], fov: HOME_FOV, near: 0.1, far: 160 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        style={{ touchAction: "none" }}
      >
        <color attach="background" args={["#02040a"]} />
        <ambientLight intensity={0.55} color="#c8dff6" />
        <directionalLight position={[9, 7, 6]} intensity={2.4} color="#f4f7ff" />
        <directionalLight position={[-6, -4, -5]} intensity={0.6} color="#4d8dc0" />
        <Stars radius={110} depth={45} count={3500} factor={3} saturation={0} fade speed={0} />
        <OrbitRing radius={LEO_RADIUS} color="#64d8ff" inclination={LEO_INCLINATION} />
        <OrbitRing radius={GEO_RADIUS} color="#ff7a1a" />
        <EarthGlobe />
        <LeoSatellite coverage={coverage} />
        <GeoSatellite coverage={coverage} />
        <SceneCamera autoRotate={autoRotate} api={api} />
      </Canvas>

      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-1.5">
        <LegendEntry color="#64d8ff" label="LEO — Starlink, ≈550 km" />
        <LegendEntry color="#ff7a1a" label="GEO — broadcast TV, ≈35,786 km" />
      </div>

      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setCoverage(on => !on)} aria-pressed={coverage} className={overlayButton}>
          {coverage ? "Hide coverage" : "Show coverage"}
        </button>
        <button type="button" onClick={() => api.current?.focusLeo()} className={overlayButton}>550 km close-up</button>
        <button type="button" onClick={() => api.current?.zoom(0.75)} aria-label="Zoom in" className={overlayButton}>
          <ZoomIn className="h-3.5 w-3.5" aria-hidden /> Zoom in
        </button>
        <button type="button" onClick={() => api.current?.zoom(1.35)} aria-label="Zoom out" className={overlayButton}>
          <ZoomOut className="h-3.5 w-3.5" aria-hidden /> Zoom out
        </button>
        <button type="button" onClick={() => api.current?.reset()} aria-label="Reset camera view" className={overlayButton}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
        </button>
        <button
          type="button"
          onClick={() => setAutoRotate((on) => !on)}
          aria-pressed={autoRotate}
          aria-label={autoRotate ? "Pause the automatic rotation" : "Start the automatic rotation"}
          className={overlayButton}
        >
          {autoRotate ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
          {autoRotate ? "Pause" : "Rotate"}
        </button>
      </div>

      <p className="pointer-events-none absolute top-3 right-3 z-10 hidden font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500 sm:block">
        Drag to rotate · wheel to zoom · right-drag to pan
      </p>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export function BroadcastComparison() {
  return (
    <section id="comparison" className="relative overflow-hidden pb-16 pt-28 md:pb-24 md:pt-36">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" aria-hidden />
      <div
        className="pointer-events-none absolute -right-24 top-8 h-80 w-80 rounded-full bg-[#ff7a1a]/[0.07] blur-3xl"
        aria-hidden
      />

      <div className="page-shell relative">
        <h1 className="max-w-4xl text-[clamp(2rem,4.8vw,3.4rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-white">
          Broadcast TV Satellite <span className="text-gradient">vs Starlink</span>
        </h1>
        <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-muted md:text-[15.5px]">
          One satellite parked 35,786 km away sends the same signal to an entire region. A
          constellation about 550 km up keeps a two-way conversation going as its satellites move
          overhead. Drag the model to compare the two orbits.
        </p>

        <div className="relative mt-8 h-[72svh] min-h-[380px] max-h-[680px] overflow-hidden rounded-[18px] border border-white/10 bg-[#02040a] shadow-[0_28px_100px_rgba(0,0,0,0.45)]">
          <SceneGate
            caption="Building the orbit view…"
            unavailableTitle="The 3D comparison could not start."
            unavailableBody="This view needs WebGL. The comparison figures and the rest of the guide still work without it."
          >
            <BroadcastScene />
          </SceneGate>
        </div>

        <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
          Educational model · orbit radii to scale · spacecraft enlarged · motion accelerated · dashed paths show the far side
        </p>
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-5 md:p-8" aria-labelledby="coverage-heading">
          <h2 id="coverage-heading" className="text-xl font-semibold text-white">How much of Earth can one satellite see?</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
            Select Show coverage to see the signal spread from each spacecraft toward Earth, like a flashlight.
            Orange marks the TV satellite’s wide footprint; cyan marks Starlink’s smaller, moving footprint.
            At greater altitude, a satellite can see farther around Earth’s curve.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-orange-400/20 p-4"><h3 className="font-semibold text-orange-300">TV satellite · 35,786 km</h3><p className="mt-2 text-sm text-muted">Up to {(horizonCoverage(GEO_RADIUS).fraction * 100).toFixed(1)}% of Earth’s surface in line of sight at once.</p></div>
            <div className="rounded-xl border border-cyan-300/20 p-4"><h3 className="font-semibold text-cyan-300">Starlink · 550 km</h3><p className="mt-2 text-sm text-muted">Up to {(horizonCoverage(LEO_RADIUS).fraction * 100).toFixed(1)}% of Earth’s surface per satellite in line of sight at once.</p></div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted">The cones show the theoretical horizon limit (zero minimum elevation), not actual radio beams or service availability. Real footprints are smaller and depend on antenna beam shape, minimum elevation, terrain and network capacity. Clouds are drawn above the surface for visibility.</p>
        </section>
        <section className="mt-8" aria-labelledby="differences-heading">
          <h2 id="differences-heading" className="text-xl font-semibold text-white">Broadcast TV vs Starlink: key differences</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[540px] text-left text-sm">
              <caption className="sr-only">Comparison of geostationary broadcast TV and Starlink satellite internet</caption>
              <thead className="bg-white/5"><tr><th scope="col" className="p-4">Feature</th><th scope="col" className="p-4 text-orange-300">Broadcast TV satellite</th><th scope="col" className="p-4 text-cyan-300">Starlink satellite</th></tr></thead>
              <tbody>{[
                ["Orbit", "Geostationary: 35,786 km above the equator.", "Low Earth orbit: 550 km in this model, inclined 53°."],
                ["Motion", "One orbit per sidereal day (~23 h 56 min); appears fixed above one location.", "One orbit in about 95 minutes; moves rapidly across the sky."],
                ["Purpose", "One-way delivery of the same TV channels to many receivers.", "Two-way internet: sends requests and receives data."],
                ["Coverage", "Broad, stationary regional footprint; actual beams target selected areas.", "Smaller moving footprints; many satellites and handoffs maintain service."],
                ["Ground antenna", "A dish aimed at a fixed point in the sky.", "An electronically steered phased array tracks passing satellites."],
                ["Signal travel time", "About 119 ms for one vertical ground-to-satellite leg.", "About 1.8 ms for one vertical ground-to-satellite leg; full internet latency is higher."],
              ].map(([feature, tv, starlink]) => <tr key={feature} className="border-t border-white/10"><th scope="row" className="p-4 align-top font-medium text-white">{feature}</th><td className="p-4 align-top leading-relaxed text-muted">{tv}</td><td className="p-4 align-top leading-relaxed text-muted">{starlink}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}

export default BroadcastComparison;
