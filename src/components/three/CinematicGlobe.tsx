import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Environment } from "@/components/scene/Environment";
import { EarthAssembly } from "@/components/scene/Earth";
import { Satellites } from "@/components/scene/Satellites";
import { OrbitRings } from "@/components/scene/OrbitRings";
import { SimulationDriver } from "@/components/scene/SimulationDriver";
import { useMediaQuery, useReducedMotion } from "@/lib/useMediaQuery";
import { cn } from "@/utils/cn";

/**
 * Decorative constellation globe used behind the hero. Decoupled from the
 * full explorer: no selection, no panels, slower simulation, gentle drift.
 */
export function CinematicGlobe({ className }: { className?: string }) {
  const compact = useMediaQuery("(max-width: 767px)");
  const reduced = useReducedMotion();

  return (
    <div className={cn("relative", className)}>
      <Canvas
        camera={{ position: [3.0, 1.2, 2.6], fov: compact ? 42 : 32, near: 0.01, far: 400 }}
        dpr={[1, 1.75]}
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
