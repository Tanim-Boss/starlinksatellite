import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { camera as cameraCfg, performance } from "../config";
import { simState, smoothFps, useSimStore } from "../hooks/useSimStore";
import { EarthAssembly } from "./Earth";
import { DishModel, DishBeam } from "./DishStation";
import { GatewayStation } from "./GatewayStation";
import { OrbitRings } from "./OrbitRings";
import { Satellites } from "./Satellites";
import { SatTooltip } from "./SatTooltip";
import { LaserLinks } from "./LaserLinks";
import { RouteOverlay } from "./RouteOverlay";
import { CameraRig } from "./CameraRig";

/**
 * Pauses the render loop while the simulation is off-screen or the tab is
 * hidden: frameloop drops to "demand" and only resumes on "always".
 */
function FrameloopPause({ active }: { active: boolean }) {
  const setFrameloop = useThree((s) => s.setFrameloop);
  useEffect(() => {
    setFrameloop(active ? "always" : "demand");
  }, [active, setFrameloop]);
  return null;
}

/**
 * Automatic quality fallback: samples the frame rate in the render loop and,
 * after a sustained period below the floor, drops one tier (fewer satellites).
 * It never upgrades again, so the display cannot oscillate.
 */
function QualityGuard() {
  const tierRef = useRef(0);
  const slowRef = useRef(0);
  const framesRef = useRef(0);
  const accRef = useRef(0);

  useFrame((_, dt) => {
    if (tierRef.current >= 1) return;
    framesRef.current += 1;
    accRef.current += dt;
    if (accRef.current < 0.5) return;
    const fps = framesRef.current / accRef.current;
    simState.fps = smoothFps(simState.fps, fps);
    framesRef.current = 0;
    accRef.current = 0;
    if (simState.fps < performance.fpsFloor) {
      slowRef.current += 1;
    } else {
      slowRef.current = Math.max(0, slowRef.current - 1);
    }
    if (slowRef.current >= performance.slowSamples) {
      tierRef.current = 1;
      simState.qualityTier = 1;
      useSimStore.getState().setQualityTier(1);
    }
  });

  return null;
}

/**
 * The whole 3D scene: Earth + satellites + dish + laser mesh + camera rig,
 * a steady starfield, and the render-loop pause / quality guards.
 * The local Earth maps load asynchronously without blanking the scene.
 */
export function SimulationCanvas({ active }: { active: boolean }) {
  const scrollMode = useSimStore((s) => s.scrollMode);

  return (
    <Canvas
      camera={{ position: [0, 1.05, cameraCfg.orbitDistance], fov: 50, near: 0.001, far: 200 }}
      dpr={performance.dpr}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      // In page-scroll mode a touch drag scrolls the page instead of
      // rotating the globe; in zoom mode the canvas owns the gesture.
      style={{ touchAction: scrollMode === "page" ? "pan-y" : "none" }}
    >
      <color attach="background" args={["#02040a"]} />
      <Suspense fallback={null}>
        <FrameloopPause active={active} />
        <QualityGuard />

        <ambientLight intensity={0.7} color="#e5eef6" />
        <directionalLight position={[6, 4, 5]} intensity={1.25} />

        <Stars radius={90} depth={50} count={3500} factor={2.2} saturation={0} fade speed={0} />

        <EarthAssembly>
          <DishModel />
          <GatewayStation />
        </EarthAssembly>

        <OrbitRings />
        <Satellites />
        <SatTooltip />

        <DishBeam />
        <LaserLinks />
        <RouteOverlay />

        <CameraRig />
      </Suspense>
    </Canvas>
  );
}
