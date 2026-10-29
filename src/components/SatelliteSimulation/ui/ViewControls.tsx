import { FullscreenButton } from "@/components/site/FullscreenStage";
import { camera as cameraCfg } from "../config";
import {
  distanceToZoomPct,
  simState,
  useSimStore,
  zoomPctToDistance,
  type ScrollMode,
} from "../hooks/useSimStore";

const btnClass =
  "inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-full border border-white/14 bg-white/[0.04] px-2 font-mono text-[13px] leading-none text-white/80 transition duration-150 hover:border-[rgba(61,219,217,0.55)] hover:text-white focus-visible:outline-2 focus-visible:outline-[#3ddbd9] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-white/14";

/**
 * The 3D view toolbar, floating at the top-right of the stage:
 *
 *  - zoom out / zoom slider / zoom in, with a live percentage readout that
 *    also follows mouse-wheel and pinch zooms (CameraRig publishes the
 *    camera distance; the effective value prefers an in-flight target);
 *  - "Reset view" — frames the whole Earth again from any state;
 *  - "Full view" — the stage fullscreen toggle (native Fullscreen API,
 *    fixed-overlay fallback where unavailable);
 *  - a scroll-mode switch deciding whether the wheel zooms the 3D scene
 *    or scrolls the page past it.
 *
 * Zooming from the Dish/Laser follow cameras returns to Orbit view, where
 * zoom is meaningful; the hint line under the toolbar says so.
 */
export function ViewControls({
  isFullscreen,
  onToggleFullscreen,
}: {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  useSimStore((s) => s.uiTick); // re-render ~8x/s so the readout tracks the camera
  useSimStore((s) => s.viewNonce); // ...and instantly on any zoom/reset click
  const cameraMode = useSimStore((s) => s.cameraMode);
  const scrollMode = useSimStore((s) => s.scrollMode);
  const setScrollMode = useSimStore((s) => s.setScrollMode);
  const zoomIn = useSimStore((s) => s.zoomIn);
  const zoomOut = useSimStore((s) => s.zoomOut);
  const zoomTo = useSimStore((s) => s.zoomTo);
  const resetView = useSimStore((s) => s.resetView);

  const distance = simState.zoomTarget ?? simState.cameraDistance;
  const pct = distanceToZoomPct(distance);
  const atMin = distance <= cameraCfg.orbitMin + 0.01;
  const atMax = distance >= cameraCfg.orbitMax - 0.01;

  return (
    <div className="absolute right-3.5 top-3.5 z-[7] flex max-w-[calc(100%-24px)] flex-col items-end gap-1.5">
      {/* Zoom cluster */}
      <div
        className="flex items-center gap-1.5 rounded-full border border-white/12 bg-[rgba(4,10,20,0.88)] p-1 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-[10px]"
        role="group"
        aria-label="3D zoom controls"
      >
        <button
          type="button"
          className={btnClass}
          onClick={zoomOut}
          disabled={atMax}
          aria-label="Zoom out"
          title="Zoom out (− key)"
        >
          −
        </button>
        <label className="sr-only" htmlFor="sim-zoom-slider">
          Zoom level
        </label>
        <input
          id="sim-zoom-slider"
          type="range"
          min={0}
          max={100}
          step={1}
          value={pct}
          onChange={(e) => zoomTo(zoomPctToDistance(Number(e.target.value)))}
          className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/15 accent-[#3ddbd9] sm:w-28 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3ddbd9]"
        />
        <button
          type="button"
          className={btnClass}
          onClick={zoomIn}
          disabled={atMin}
          aria-label="Zoom in"
          title="Zoom in (+ key)"
        >
          +
        </button>
        <span
          className="w-[52px] pr-1 text-right font-mono text-[10px] tabular-nums text-[#7ff0ec]"
          aria-live="off"
          title={`Camera distance ${distance.toFixed(2)} Earth radii`}
        >
          {pct}%
        </span>
      </div>

      {/* Full view + scroll behaviour */}
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={resetView}
          title="Reset view — frame the whole Earth (0 key)"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-[#040a14]/70 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted backdrop-blur transition-colors hover:border-white/30 hover:text-white"
        >
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" aria-hidden>
            <circle cx="6" cy="6" r="3.4" stroke="currentColor" strokeWidth="1.2" />
            <path
              d="M6 1v1.4M6 9.6V11M1 6h1.4M9.6 6H11"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          Reset view
        </button>

        <FullscreenButton onClick={onToggleFullscreen} active={isFullscreen} />

        <div
          className="flex items-center rounded-full border border-white/12 bg-[#040a14]/70 p-0.5 backdrop-blur"
          role="group"
          aria-label="Mouse wheel behaviour over the 3D view"
        >
          {(
            [
              { id: "zoom", label: "Scroll zooms" },
              { id: "page", label: "Scroll page" },
            ] as { id: ScrollMode; label: string }[]
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={scrollMode === m.id}
              onClick={() => setScrollMode(m.id)}
              title={
                m.id === "zoom"
                  ? "Mouse wheel / trackpad scroll zooms the 3D view"
                  : "Mouse wheel scrolls the page past the simulation"
              }
              className={`cursor-pointer rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] transition-colors ${
                scrollMode === m.id
                  ? "bg-[rgba(61,219,217,0.16)] text-[#7ff0ec]"
                  : "text-muted hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <p className="hidden rounded-full border border-white/[0.08] bg-black/40 px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-faint backdrop-blur-md sm:block">
        {cameraMode === "orbit"
          ? scrollMode === "zoom"
            ? "Drag to orbit · Scroll to zoom · Pinch on touch"
            : "Drag to orbit · Use + / − to zoom · Scroll moves the page"
          : "Follow camera · Zoom returns to full Earth view"}
      </p>
    </div>
  );
}
