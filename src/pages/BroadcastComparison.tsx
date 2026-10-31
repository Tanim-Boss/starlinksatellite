import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { supportsWebGL } from "@/components/SatelliteComparison/utils/supportsWebGL";

const assetBase = (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) || "/";
const VIDEO_SRC = `${assetBase}videos/broadcast-vs-starlink.mp4`;

/** Scene sizes are exaggerated so both orbits fit on one screen. */
const EARTH_RADIUS_KM = 6371;
const EARTH_RADIUS = 1.28;
const LEO_RADIUS = EARTH_RADIUS + 550 / EARTH_RADIUS_KM;   // Starlink shell, ≈550 km
const GEO_RADIUS = EARTH_RADIUS + 35786 / EARTH_RADIUS_KM;  // broadcast TV, ≈35,786 km

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
    float facing = max(dot(normalize(vNormal), normalize(vView)), 0.0);
    float rim = pow(1.0 - facing, 3.2);
    float glow = smoothstep(0.0, 0.9, rim) * 0.52;
    gl_FragColor = vec4(uColor * (0.72 + rim), glow);
  }
`;

/** A thin path marking each shell's radius. */
function OrbitRing({ radius, color }: { radius: number; color: string }) {
  return (
    <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <ringGeometry args={[radius - 0.012, radius + 0.012, 160]} />
      <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** Earth: day map, city lights, drifting clouds and a fresnel atmosphere. */
function EarthGlobe() {
  const surfaceRef = useRef<THREE.Group>(null);
  const cloudRef = useRef<THREE.Group>(null);
  const [textures, setTextures] = useState<{ day: THREE.Texture | null; night: THREE.Texture | null; clouds: THREE.Texture | null }>({ day: null, night: null, clouds: null });
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color("#63a9ff") } }), []);

  useEffect(() => {
    let alive = true;
    const owned: THREE.Texture[] = [];
    const loader = new THREE.TextureLoader();

    const load = (url: string, key: "day" | "night" | "clouds", colorSpace?: THREE.ColorSpace) => {
      loader.load(
        url,
        (texture) => {
          if (!alive) {
            texture.dispose();
            return;
          }
          if (colorSpace) texture.colorSpace = colorSpace;
          texture.anisotropy = 8;
          owned.push(texture);
          setTextures((current) => ({ ...current, [key]: texture }));
        },
        undefined,
        () => {},
      );
    };

    load(`${assetBase}textures/earth-day.jpg`, "day", THREE.SRGBColorSpace);
    load(`${assetBase}textures/earth-night.jpg`, "night", THREE.SRGBColorSpace);
    load(`${assetBase}textures/earth-clouds.png`, "clouds");
    return () => {
      alive = false;
      owned.forEach((texture) => texture.dispose());
    };
  }, []);

  useFrame((_, delta) => {
    const turn = delta * 0.05; // one turn every ~2 minutes, illustrative only
    if (surfaceRef.current) surfaceRef.current.rotation.y += turn;
    if (cloudRef.current) cloudRef.current.rotation.y += turn * 1.02;
  });

  return (
    <group>
      <group ref={surfaceRef}>
        <mesh>
          <sphereGeometry args={[EARTH_RADIUS, 80, 60]} />
          <meshStandardMaterial
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
function LeoSatellite() {
  const ref = useRef<THREE.Group>(null);
  const angle = useRef(0);
  const spin = useRef(new THREE.Euler(0.24, 0.35, -0.14));

  useFrame((_, delta) => {
    angle.current += delta * 1.15; // one lap every ~5.5 seconds, illustrative only
    const inc = (53 * Math.PI) / 180;
    const x = LEO_RADIUS * Math.cos(angle.current);
    const y = -LEO_RADIUS * Math.sin(angle.current) * Math.sin(inc);
    const z = LEO_RADIUS * Math.sin(angle.current) * Math.cos(inc);
    if (ref.current) {
      ref.current.position.set(x, y, z);
      ref.current.rotation.set(spin.current.x + delta, spin.current.y + delta * 0.6, spin.current.z);
    }
  });

  return (
    <group ref={ref}>
      <mesh>
        <boxGeometry args={[0.16, 0.09, 0.18]} />
        <meshStandardMaterial color="#f4f5f4" metalness={0.42} roughness={0.32} emissive="#5b6674" emissiveIntensity={0.16} />
      </mesh>
      <mesh position={[-0.28, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.4, 0.03, 0.15]} />
        <meshStandardMaterial color="#dbe7f1" metalness={0.34} roughness={0.36} emissive="#8bb8d5" emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[0.28, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.4, 0.03, 0.15]} />
        <meshStandardMaterial color="#dbe7f1" metalness={0.34} roughness={0.36} emissive="#8bb8d5" emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[0, 0.09, -0.07]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.2, 8]} />
        <meshStandardMaterial color="#fbfbf8" metalness={0.45} roughness={0.35} />
      </mesh>
    </group>
  );
}

/** Geostationary broadcast-TV satellite: stays over one equatorial point. */
function GeoSatellite() {
  const ref = useRef<THREE.Group>(null);
  const angle = useRef(0.5);

  useFrame((_, delta) => {
    angle.current += delta * 0.05; // turns with Earth
    const x = GEO_RADIUS * Math.cos(angle.current);
    const y = 0;
    const z = GEO_RADIUS * Math.sin(angle.current);
    if (ref.current) {
      ref.current.position.set(x, y, z);
      ref.current.lookAt(0, 0, 0);
    }
  });

  return (
    <group ref={ref} scale={0.95}>
      <mesh>
        <boxGeometry args={[0.3, 0.2, 0.32]} />
        <meshStandardMaterial color="#e8edf3" metalness={0.5} roughness={0.25} emissive="#6b7a8c" emissiveIntensity={0.14} />
      </mesh>
      <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.16, 0.4, 20]} />
        <meshStandardMaterial color="#c9d6e2" metalness={0.6} roughness={0.2} />
      </mesh>
      <mesh position={[-0.42, 0, 0]}>
        <boxGeometry args={[0.55, 0.04, 0.18]} />
        <meshStandardMaterial color="#dbe7f1" metalness={0.4} roughness={0.3} emissive="#7ea6c8" emissiveIntensity={0.08} />
      </mesh>
      <mesh position={[0.42, 0, 0]}>
        <boxGeometry args={[0.55, 0.04, 0.18]} />
        <meshStandardMaterial color="#dbe7f1" metalness={0.4} roughness={0.3} emissive="#7ea6c8" emissiveIntensity={0.08} />
      </mesh>
    </group>
  );
}

function WebGLFallback() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
      <p className="text-sm text-slate-300 mb-4">
        WebGL isn't available on this device, so the 3D view can't run here.
      </p>
      <a
        href={VIDEO_SRC}
        download
        className="rounded-full border border-white/20 bg-white/[0.06] px-4 py-2 text-[12px] text-white hover:bg-white/[0.12]"
      >
        Download the video (MP4)
      </a>
    </div>
  );
}

/** Interactive 3D replacement for the broadcast vs. Starlink video. */
function BroadcastScene() {
  const prefersReduced =
    typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [autoRotate, setAutoRotate] = useState(!prefersReduced);

  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const { gl } = useThree();

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute(
      "aria-label",
      "Interactive 3D model of Earth, a geostationary broadcast-TV satellite and a moving LEO Starlink satellite. Drag to rotate, wheel to zoom.",
    );
  }, [gl]);

  // Keep the auto-rotate flag in sync with the OrbitControls instance.
  useEffect(() => {
    const orbit = controlsRef.current;
    if (orbit) orbit.autoRotate = autoRotate;
  }, [autoRotate]);

  const resetView = useCallback(() => {
    const orbit = controlsRef.current;
    const camera = cameraRef.current;
    if (!orbit || !camera) return;
    camera.position.set(0, 3.2, 9);
    orbit.target.set(0, 0, 0);
    orbit.update();
  }, []);

  const dolly = useCallback(
    (factor: number) => {
      const orbit = controlsRef.current;
      const camera = cameraRef.current;
      if (!orbit || !camera) return;
      const offset = camera.position.clone().sub(orbit.target);
      offset.setLength(
        THREE.MathUtils.clamp(offset.length() * factor, orbit.minDistance, orbit.maxDistance),
      );
      camera.position.copy(orbit.target).add(offset);
      orbit.update();
    },
    [],
  );

  useEffect(() => {
    const canvas = gl.domElement;
    const onKeyDown = (event: KeyboardEvent) => {
      const orbit = controlsRef.current;
      const camera = cameraRef.current;
      if (!orbit || !camera) return;
      const step = 0.2;
      let handled = false;
      if (event.key === "ArrowLeft") {
        orbit.setAzimuthalAngle(orbit.getAzimuthalAngle() - step);
        handled = true;
      } else if (event.key === "ArrowRight") {
        orbit.setAzimuthalAngle(orbit.getAzimuthalAngle() + step);
        handled = true;
      } else if (event.key === "ArrowUp") {
        orbit.setPolarAngle(orbit.getPolarAngle() - step);
        handled = true;
      } else if (event.key === "ArrowDown") {
        orbit.setPolarAngle(orbit.getPolarAngle() + step);
        handled = true;
      } else if (["+", "=", "-", "_"].includes(event.key)) {
        dolly(event.key === "+" || event.key === "=" ? 0.85 : 1.18);
        handled = true;
      }
      if (handled) event.preventDefault();
    };
    canvas.addEventListener("keydown", onKeyDown);
    return () => canvas.removeEventListener("keydown", onKeyDown);
  }, [gl, dolly]);

  return (
    <>
      <Canvas
        camera={{ position: [0, 3.2, 9], fov: 36, near: 0.1, far: 60 }}
        dpr={[1, 2]}
        frameloop="always"
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <ambientLight intensity={0.55} color="#c8dff6" />
        <directionalLight position={[9, 7, 6]} intensity={2.4} color="#f4f7ff" />
        <directionalLight position={[-6, -4, -5]} intensity={0.6} color="#4d8dc0" />
        <Stars radius={110} depth={45} count={3500} factor={3} saturation={0} fade speed={0} />
        <OrbitRing radius={LEO_RADIUS} color="#64d8ff" />
        <OrbitRing radius={GEO_RADIUS} color="#ff7a1a" />
        <EarthGlobe />
        <LeoSatellite />
        <GeoSatellite />
        <OrbitControls
          ref={controlsRef}
          enablePan
          enableZoom
          enableRotate
          autoRotate={autoRotate}
          autoRotateSpeed={0.7}
          enableDamping
          dampingFactor={0.06}
          minDistance={1.9}
          maxDistance={40}
          minPolarAngle={0.12}
          maxPolarAngle={Math.PI - 0.12}
        />
      </Canvas>

      <div className="absolute left-3 bottom-3 flex flex-col gap-2 z-[20]">
        <button
          type="button"
          onClick={() => dolly(0.75)}
          aria-label="Zoom in"
          className="pointer-events-auto flex items-center gap-1.5 rounded border border-white/20 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-white/[0.12] backdrop-blur"
        >
          <span aria-hidden="true">🔍</span> Zoom in
        </button>
        <button
          type="button"
          onClick={() => dolly(1.35)}
          aria-label="Zoom out"
          className="pointer-events-auto flex items-center gap-1.5 rounded border border-white/20 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-white/[0.12] backdrop-blur"
        >
          <span aria-hidden="true">🔍</span> Zoom out
        </button>
        <button
          type="button"
          onClick={resetView}
          aria-label="Reset camera view"
          className="pointer-events-auto flex items-center gap-1.5 rounded border border-white/20 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-white/[0.12] backdrop-blur"
        >
          ↱ Reset view
        </button>
        <button
          type="button"
          onClick={() => setAutoRotate((on) => !on)}
          aria-pressed={autoRotate}
          className="pointer-events-auto flex items-center gap-1.5 rounded border border-white/20 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-white/[0.12] backdrop-blur"
        >
          {autoRotate ? "⏸ Stop rotation" : "▶ Rotate view"}
        </button>
      </div>

      <div className="absolute left-3 top-3 flex flex-col gap-1.5 z-[20] pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#64d8ff]/90" />
          <span className="text-[10px] font-mono text-slate-300">LEO — Starlink, ≈550 km</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#ff7a1a]/90" />
          <span className="text-[10px] font-mono text-slate-300">GEO — broadcast TV, ≈35,786 km</span>
        </div>
      </div>

      <div className="absolute right-3 bottom-3 z-[20] text-[10px] tracking-tight text-slate-500/80">
        Drag to rotate • Wheel to zoom • Right-drag to pan
      </div>
    </>
  );
}

export function BroadcastComparison() {
  const [webgl] = useState(() => supportsWebGL());

  return (
    <section id="comparison" className="relative overflow-hidden pb-16 pt-28 md:pb-24 md:pt-36">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" aria-hidden />
      <div
        className="pointer-events-none absolute -right-24 top-8 h-80 w-80 rounded-full bg-[#ff7a1a]/[0.07] blur-3xl"
        aria-hidden
      />

      <div className="page-shell relative">
        <h1 className="max-w-4xl text-[clamp(2rem,4.8vw,3.4rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-white">
          Broadcast TV Satellite{" "}
          <span className="text-gradient">vs Starlink</span>
        </h1>

        <div className="mt-8 relative overflow-hidden rounded-[18px] border border-white/10 bg-[#02040a] shadow-[0_28px_100px_rgba(0,0,0,0.45)]">
          {webgl ? <BroadcastScene /> : <WebGLFallback />}
        </div>
      </div>
    </section>
  );
}
