import { lazy, Suspense, useEffect, useState } from "react";
import { comparisonConfig, type ComparisonStage } from "./config";
import { useActivity } from "./hooks/useActivity";
import { useComparisonStore } from "./hooks/useComparisonStore";
import { useReducedMotion } from "@/lib/useMediaQuery";
import { useWebGLSupport } from "@/lib/webgl";
import { Controls } from "./ui/Controls";
import { StagePanels } from "./ui/StagePanels";
import { StoryNavigation } from "./ui/StoryNavigation";
import "./styles.css";

const ComparisonCanvas = lazy(() =>
  import("./scenes/ComparisonCanvas").then((module) => ({ default: module.ComparisonCanvas })),
);

function LazySceneFallback() {
  return (
    <div className="sat-comparison__canvas-loading" role="status" aria-live="polite">
      <div>
        <span className="sat-comparison__eyebrow">{comparisonConfig.copy.labels.loading}</span>
        <div className="sat-comparison__loading-bar" aria-hidden>
          <span style={{ width: "28%" }} />
        </div>
        <p className="sat-comparison__micro-label" style={{ marginTop: 10, color: "rgba(220,229,247,.6)" }}>
          {comparisonConfig.copy.labels.loadingDetail}
        </p>
      </div>
    </div>
  );
}

function WebGLFallback() {
  return (
    <div className="sat-comparison__webgl-fallback" role="status">
      <div className="sat-comparison__fallback-card">
        <strong>{comparisonConfig.copy.labels.webglUnavailable}</strong>
        <p>{comparisonConfig.copy.labels.webglMessage}</p>
      </div>
    </div>
  );
}

function TooltipCard() {
  const tooltip = useComparisonStore((state) => state.tooltip);
  if (!tooltip) return null;
  return (
    <aside className="sat-comparison__tooltip" role="status" aria-live="polite">
      <strong>{tooltip.title}</strong>
      <dl>
        <dt>Altitude</dt><dd>{tooltip.altitude}</dd>
        <dt>Speed</dt><dd>{tooltip.speed}</dd>
        <dt>Role</dt><dd>{tooltip.role}</dd>
      </dl>
    </aside>
  );
}

/** One timer drives the 78-second tour; it pauses when the stage is not visible. */
function useTourClock(active: boolean) {
  const tourPlaying = useComparisonStore((state) => state.tourPlaying);
  useEffect(() => {
    if (!tourPlaying) return;
    let previous = typeof performance !== "undefined" ? performance.now() : Date.now();
    const timer = window.setInterval(() => {
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const delta = Math.min(0.4, Math.max(0, (now - previous) / 1000));
      previous = now;
      if (!active || document.visibilityState === "hidden") return;
      const store = useComparisonStore.getState();
      store.updateTour(store.tourElapsedSec + delta);
    }, 200);
    return () => window.clearInterval(timer);
  }, [active, tourPlaying]);
}

/** Throttled real-time stopwatch; visual pulses stay entirely in useFrame. */
function useLatencyStopwatch(active: boolean) {
  const sendNonce = useComparisonStore((state) => state.sendNonce);
  const sendStartedAtMs = useComparisonStore((state) => state.sendStartedAtMs);
  useEffect(() => {
    if (!sendNonce || !sendStartedAtMs) return;
    const update = () => {
      if (!active || document.visibilityState === "hidden") return;
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const elapsed = Math.min(600, Math.max(0, now - sendStartedAtMs));
      useComparisonStore.getState().setElapsedMs(elapsed);
      if (elapsed >= 600) window.clearInterval(timer);
    };
    const timer = window.setInterval(update, 100);
    update();
    return () => window.clearInterval(timer);
  }, [active, sendNonce, sendStartedAtMs]);
}

/** Standalone, reusable six-stage TV satellite vs LEO internet simulation. */
export function SatelliteComparison() {
  const { ref, active } = useActivity();
  const prefersReducedMotion = useReducedMotion();
  const webglAvailable = useWebGLSupport();
  const [controlsOpen, setControlsOpen] = useState(false);
  const stage = useComparisonStore((state) => state.stage);

  useEffect(() => {
    useComparisonStore.getState().setReducedMotion(prefersReducedMotion);
  }, [prefersReducedMotion]);
  useTourClock(active);
  useLatencyStopwatch(active);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "SELECT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.closest("button"))
      ) {
        return;
      }
      const store = useComparisonStore.getState();
      if (event.code === "ArrowRight") {
        event.preventDefault();
        store.nextStage();
      } else if (event.code === "ArrowLeft") {
        event.preventDefault();
        store.previousStage();
      } else if (event.code === "Space") {
        event.preventDefault();
        store.setPlaying(!store.playing);
      } else if (event.key.toLowerCase() === "t") {
        store.tourPlaying ? store.stopTour() : store.startTour();
      } else if (/^[1-6]$/.test(event.key)) {
        store.setStage((Number(event.key) - 1) as ComparisonStage);
      } else if (event.key.toLowerCase() === "o") {
        store.toggleOrbits();
      } else if (event.key.toLowerCase() === "l") {
        store.toggleLinks();
      } else if (event.key.toLowerCase() === "b") {
        store.toggleLabels();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      ref={ref}
      className="sat-comparison"
      role="region"
      aria-label={comparisonConfig.copy.title}
      data-stage={stage + 1}
    >
      <div className="sat-comparison__canvas">
        {webglAvailable === false ? (
          <WebGLFallback />
        ) : webglAvailable === true ? (
          <Suspense fallback={<LazySceneFallback />}>
            <ComparisonCanvas active={active} />
          </Suspense>
        ) : (
          <LazySceneFallback />
        )}
      </div>
      <div className="sat-comparison__vignette" aria-hidden />

      <header className="sat-comparison__topbar">
        <div className="sat-comparison__brand">
          <div className="sat-comparison__eyebrow">{comparisonConfig.copy.eyebrow}</div>
          <div className="sat-comparison__title">{comparisonConfig.copy.title}</div>
        </div>
        <div className="sat-comparison__stage-count" aria-live="polite">
          <strong>{String(stage + 1).padStart(2, "0")}</strong> / {String(comparisonConfig.stageCount).padStart(2, "0")}
        </div>
      </header>

      <StoryNavigation />
      <StagePanels />

      <button
        type="button"
        className="sat-comparison__mobile-control-button"
        aria-expanded={controlsOpen}
        aria-controls="sc-controls"
        onClick={() => setControlsOpen((open) => !open)}
      >
        <span aria-hidden>☷</span>{controlsOpen ? "Hide controls" : "Controls"}
      </button>
      <div id="sc-controls">
        <Controls open={controlsOpen} />
      </div>

      <TooltipCard />
      <div className="sat-comparison__keyboard-hint" aria-label="Keyboard shortcuts">
        ← / → stages · 1–6 jump · T tour · Space pause · O orbits · L links · B labels
      </div>
    </div>
  );
}

export default SatelliteComparison;
