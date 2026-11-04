import { Suspense, lazy, useCallback, useEffect } from "react";
import { useWebGLSupport } from "@/lib/webgl";
import { fsStageClass, useFullscreen } from "@/components/site/FullscreenStage";
import { useReducedMotion } from "@/lib/useMediaQuery";
import { useActivity } from "./hooks/useActivity";
import { SimDriver } from "./hooks/useSimDriver";
import { useSimStore } from "./hooks/useSimStore";
import { LoadingScreen } from "./ui/LoadingScreen";
import { Hud } from "./ui/Hud";
import { Controls } from "./ui/Controls";
import { CameraPicker } from "./ui/CameraPicker";
import { ViewControls } from "./ui/ViewControls";

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
  const { ref: activityRef, active } = useActivity<HTMLDivElement>();
  const fs = useFullscreen<HTMLDivElement>();
  const webgl = useWebGLSupport();
  const reduced = useReducedMotion();

  // The stage element is shared by the activity tracker (render pausing)
  // and the fullscreen hook; one callback ref feeds both.
  const setStageRef = useCallback(
    (el: HTMLDivElement | null) => {
      activityRef.current = el;
      fs.ref.current = el;
    },
    [activityRef, fs.ref],
  );

  // Keyboard control: space = play/pause, 1/2/3 = camera modes,
  // O/L/B = orbit rings / laser mesh / dish beam, +/− = zoom, 0 = reset
  // view, F = full view (fullscreen).
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
      } else if (e.key === "+" || e.key === "=") {
        s.zoomIn();
      } else if (e.key === "-" || e.key === "_") {
        s.zoomOut();
      } else if (e.key === "0") {
        s.resetView();
      } else if (e.key === "f" || e.key === "F") {
        fs.toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fs.toggle]);

  // Respect prefers-reduced-motion: start paused; CameraRig skips auto-rotate.
  useEffect(() => {
    if (reduced) useSimStore.getState().setPlaying(false);
  }, [reduced]);

  return (
    <div
      ref={setStageRef}
      className={fsStageClass(
        fs.isFullscreen,
        fs.hasNative,
        "relative h-full w-full min-h-[320px] overflow-hidden rounded-[14px] bg-[#02040a]",
      )}
    >
      <div className="fs-fill absolute inset-0 [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full">
        {webgl === false ? (
          <WebGLFallback />
        ) : webgl === true ? (
          <Suspense fallback={<LoadingScreen />}>
            <SimulationCanvas active={active} />
          </Suspense>
        ) : (
          <LoadingScreen />
        )}
      </div>

      {webgl === true && <SimDriver active={active} />}

      <Hud />
      <ViewControls isFullscreen={fs.isFullscreen} onToggleFullscreen={fs.toggle} />
      <CameraPicker />
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
