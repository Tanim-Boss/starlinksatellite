import { Suspense, lazy, useEffect, useState } from "react";
import { supportsWebGL } from "@/components/site/SceneGate";
import { useReducedMotion } from "@/lib/useMediaQuery";
import { useActivity } from "./hooks/useActivity";
import { SimDriver } from "./hooks/useSimDriver";
import { useSimStore } from "./hooks/useSimStore";
import { LoadingScreen } from "./ui/LoadingScreen";
import { Hud } from "./ui/Hud";
import { Controls } from "./ui/Controls";

/**
 * The heavy three.js scene is its own lazy chunk: the page shell (HUD,
 * controls, driver) mounts first, and the Canvas — plus the whole engine —
 * streams in behind the progress screen.
 */
const SimulationCanvas = lazy(() =>
  import("./scenes/SimulationCanvas").then((m) => ({ default: m.SimulationCanvas })),
);

/**
 * SatelliteSimulation — a self-contained, drop-in 3D satellite-internet
 * simulation. Fills its parent container (width/height 100%) and handles
 * resize through the Canvas. Lazy-load it with React.lazy + Suspense.
 *
 *   import { lazy, Suspense } from "react";
 *   const SatelliteSimulation = lazy(() =>
 *     import("@/components/SatelliteSimulation").then((m) => ({ default: m.default })),
 *   );
 *   <section style={{ height: "100vh" }}>
 *     <Suspense fallback={<p>Loading…</p>}>
 *       <SatelliteSimulation />
 *     </Suspense>
 *   </section>
 *
 * Rendering pauses when the component is off-screen (IntersectionObserver)
 * or the tab is hidden, and everything is disposed on unmount. Without
 * WebGL the stage shows a labelled message instead of a broken canvas.
 */
export function SatelliteSimulation() {
  const { ref, active } = useActivity<HTMLDivElement>();
  const [webglOk] = useState(() => supportsWebGL());
  const reduced = useReducedMotion();

  // Keyboard control: space = play/pause, 1/2/3 = camera modes,
  // O/L/B = orbit rings / laser mesh / dish beam.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "SELECT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const s = useSimStore.getState();
      if (e.code === "Space") {
        e.preventDefault();
        s.togglePlay();
      } else if (e.key === "1") {
        s.setCameraMode("orbit");
      } else if (e.key === "2") {
        s.setCameraMode("dish");
      } else if (e.key === "3") {
        s.setCameraMode("laser");
      } else if (e.key === "o" || e.key === "O") {
        s.setToggle("orbits");
      } else if (e.key === "l" || e.key === "L") {
        s.setToggle("laserMesh");
      } else if (e.key === "b" || e.key === "B") {
        s.setToggle("dishBeam");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Respect prefers-reduced-motion: start paused; CameraRig skips auto-rotate.
  useEffect(() => {
    if (reduced) useSimStore.getState().setPlaying(false);
  }, [reduced]);

  return (
    <div
      ref={ref}
      className="relative h-full w-full min-h-[320px] overflow-hidden rounded-[14px] bg-[#02040a]"
    >
      <div className="absolute inset-0 [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full">
        {webglOk ? (
          <Suspense fallback={<LoadingScreen />}>
            <SimulationCanvas active={active} />
          </Suspense>
        ) : (
          <WebGLFallback />
        )}
      </div>

      {webglOk && <SimDriver active={active} />}

      <Hud />
      <Controls />
    </div>
  );
}

/** Graceful message when the browser cannot hand out a WebGL context. */
function WebGLFallback() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-10 bg-[radial-gradient(ellipse_at_50%_40%,#0a1428_0%,#02040a_70%)] p-6 text-center">
      <p className="text-[15px] font-semibold text-[#fbbf24]">WebGL unavailable</p>
      <p className="max-w-[340px] text-[12px] leading-[1.5] text-white/60">
        This browser or device cannot run the 3D simulation. Try a recent browser with
        hardware acceleration enabled — the rest of the guide works without it.
      </p>
    </div>
  );
}

export default SatelliteSimulation;
