import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Environment } from "@/components/scene/Environment";
import { EarthAssembly } from "@/components/scene/Earth";
import { Satellites } from "@/components/scene/Satellites";
import { OrbitRings } from "@/components/scene/OrbitRings";
import { SimulationDriver } from "@/components/scene/SimulationDriver";
import { SceneGate } from "@/components/site/SceneGate";
import { useMediaQuery, useReducedMotion } from "@/lib/useMediaQuery";
import { cn } from "@/utils/cn";

/** Static stand-in for the globe, painted before the engine arrives. */
function GlobePoster() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(52% 52% at 55% 48%, rgba(61,219,217,0.10) 0%, rgba(96,165,250,0.08) 46%, rgba(4,6,13,0) 70%)",
      }}
      aria-hidden
    >
      <svg
        viewBox="0 0 200 200"
        className="absolute left-1/2 top-1/2 h-[74%] w-[74%] -translate-x-1/2 -translate-y-1/2 opacity-40"
        fill="none"
        aria-hidden
      >
        <circle cx="100" cy="100" r="46" stroke="#1d3a5c" strokeWidth="1" />
        <ellipse cx="100" cy="100" rx="72" ry="26" stroke="#24486e" strokeWidth="0.8" transform="rotate(-18 100 100)" />
        <ellipse cx="100" cy="100" rx="72" ry="26" stroke="#1b3450" strokeWidth="0.8" transform="rotate(34 100 100)" />
        <circle cx="157" cy="67" r="2.6" fill="#3ddbd9" fillOpacity="0.8" />
      </svg>
    </div>
  );
}

/**
 * Decorative constellation globe used behind the hero. Decoupled from the
 * full explorer: no selection, no panels, slower simulation, gentle drift.
 */
export function CinematicGlobe({ className }: { className?: string }) {
  const compact = useMediaQuery("(max-width: 767px)");
  const reduced = useReducedMotion();

  return (
    <div className={cn("relative", className)}>
      <SceneGate
        caption="Loading the constellation…"
        poster={<GlobePoster />}
        unavailableTitle="The 3D globe could not start on this device."
        unavailableBody="It needs WebGL. The rest of the guide — the chapters, figures and numbers — does not."
      >
        <Canvas
          camera={{ position: [3.0, 1.2, 2.6], fov: compact ? 42 : 32, near: 0.01, far: 400 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          style={{ touchAction: "pan-y" }}
        >
          <Suspense fallback={null}>
            <color attach="background" args={["#04060d"]} />
            <ambientLight intensity={0.1} />
            <directionalLight position={[14, 6, 9]} intensity={1.45} />
            <SimulationDriver speedOverride={reduced ? 0 : 34} />
            <Environment />
            <EarthAssembly />
            <Satellites interactive={false} />
            <OrbitRings force opacity={0.16} />
            <OrbitControls
              makeDefault
              enablePan={false}
              enableZoom={false}
              enableRotate={!compact}
              autoRotate={!reduced}
              autoRotateSpeed={0.3}
              minDistance={1.2}
              maxDistance={20}
            />
          </Suspense>
        </Canvas>
      </SceneGate>

      {/* Edge fades so the globe melts into the page */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(115% 88% at 60% 50%, rgba(4,6,13,0) 46%, rgba(4,6,13,0.5) 74%, #04060d 96%)",
        }}
        aria-hidden
      />
    </div>
  );
}
