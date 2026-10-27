import { TECH_SPECS, getTarget, targetAzElAt, type TechMode } from "@/lib/steering";
import { controlBase } from "@/components/beam/beamUI";
import { cn } from "@/utils/cn";
import { SPEEDS, steerClock, useSteerLab, type CameraView } from "./steerStore";

const VIEWS: { id: CameraView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "mechanism", label: "Mechanism" },
  { id: "beam", label: "Beam view" },
];

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">{children}</h3>
  );
}

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        controlBase,
        "px-2.5 py-1 text-[8.5px]",
        active && "border-signal/40 bg-signal/[0.08] text-signal",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Every control in the lab. All of them write the same store the RAF driver
 * reads, so each input updates the 3D scene on the next frame.
 */
export function SteerControls() {
  useSteerLab((s) => s.uiTick);
  const tech = useSteerLab((s) => s.tech);
  const setTech = useSteerLab((s) => s.setTech);
  const targetId = useSteerLab((s) => s.targetId);
  const selectTarget = useSteerLab((s) => s.selectTarget);
  const autoTrack = useSteerLab((s) => s.autoTrack);
  const setAutoTrack = useSteerLab((s) => s.setAutoTrack);
  const aimAt = useSteerLab((s) => s.aimAt);
  const aimAz = useSteerLab((s) => s.aimAz);
  const aimEl = useSteerLab((s) => s.aimEl);
  const playing = useSteerLab((s) => s.playing);
  const togglePlay = useSteerLab((s) => s.togglePlay);
  const speed = useSteerLab((s) => s.speed);
  const setSpeed = useSteerLab((s) => s.setSpeed);
  const reset = useSteerLab((s) => s.reset);
  const showWavefronts = useSteerLab((s) => s.showWavefronts);
  const showTrackingLine = useSteerLab((s) => s.showTrackingLine);
  const showLabels = useSteerLab((s) => s.showLabels);
  const toggleWavefronts = useSteerLab((s) => s.toggleWavefronts);
  const toggleTrackingLine = useSteerLab((s) => s.toggleTrackingLine);
  const toggleLabels = useSteerLab((s) => s.toggleLabels);
  const view = useSteerLab((s) => s.view);
  const setView = useSteerLab((s) => s.setView);
  const resetCamera = useSteerLab((s) => s.resetCamera);

  // While auto-tracking, the sliders mirror the live gimbal so the numbers
  // never disagree with the scene; touching one takes over manually.
  const azValue = autoTrack ? Math.round(steerClock.az * 2) / 2 : aimAz;
  const elValue = autoTrack ? Math.round(steerClock.el * 2) / 2 : aimEl;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-5">
      {/* Technology */}
      <div>
        <SectionTitle>Link technology</SectionTitle>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {(Object.keys(TECH_SPECS) as TechMode[]).map((id) => {
            const active = tech === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => setTech(id)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-left transition-colors",
                  active
                    ? "border-signal/45 bg-signal/[0.07]"
                    : "border-white/[0.08] bg-white/[0.015] hover:border-white/20",
                )}
              >
                <span
                  className={cn(
                    "block font-mono text-[9.5px] uppercase tracking-[0.1em]",
                    active ? "text-signal" : "text-ink",
                  )}
                >
                  {id === "rf" ? "RF dish" : "Optical laser"}
                </span>
                <span className="mt-0.5 block text-[9px] leading-snug text-faint">
                  {id === "rf" ? "Gimbaled reflector · Ka-band" : "Laser telescope · PAT"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Target */}
      <div>
        <SectionTitle>Target satellite</SectionTitle>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {(["A", "B"] as const).map((id) => {
            const def = getTarget(id);
            const point = targetAzElAt(def, steerClock.t);
            const active = targetId === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => selectTarget(id)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-left transition-colors",
                  active
                    ? "border-white/25 bg-white/[0.05]"
                    : "border-white/[0.07] bg-white/[0.015] hover:border-white/20",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: def.color }} />
                  <span
                    className="font-mono text-[9px] uppercase tracking-[0.08em]"
                    style={{ color: active ? def.color : "#8b9bb9" }}
                  >
                    {def.name}
                  </span>
                </span>
                <span className="mt-1 block font-mono text-[9px] tabular-nums text-white">
                  {point.el.toFixed(0)}° el
                  <span className="text-faint"> · {point.az.toFixed(0)}° az</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Steering */}
      <div>
        <div className="flex items-center justify-between">
          <SectionTitle>Beam steering</SectionTitle>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-faint">
              Automatic tracking
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={autoTrack}
              aria-label="Toggle automatic target tracking"
              onClick={() => setAutoTrack(!autoTrack)}
              className={cn(
                "relative h-[18px] w-[34px] rounded-full border transition-colors",
                autoTrack ? "border-signal/50 bg-signal/25" : "border-white/15 bg-white/5",
              )}
            >
              <span
                className={cn(
                  "absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full transition-all",
                  autoTrack ? "left-[17px] bg-signal" : "left-[3px] bg-muted",
                )}
              />
            </button>
          </div>
        </div>

        <div className={cn("mt-2 grid gap-2.5 sm:grid-cols-2", !autoTrack && "rounded-lg")}>
          <label className={cn("block", autoTrack && "opacity-55")}>
            <span className="flex items-baseline justify-between font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
              <span>Azimuth</span>
              <span className="text-[10px] tabular-nums text-ink">
                {azValue >= 0 ? "+" : "−"}
                {Math.abs(azValue).toFixed(1)}°
              </span>
            </span>
            <input
              type="range"
              min={-180}
              max={180}
              step={0.5}
              value={azValue}
              disabled={autoTrack}
              aria-label="Antenna azimuth in degrees"
              onChange={(event) => aimAt(Number(event.target.value), elValue)}
              className="mt-1 w-full accent-[#3ddbd9] disabled:cursor-not-allowed"
            />
          </label>
          <label className={cn("block", autoTrack && "opacity-55")}>
            <span className="flex items-baseline justify-between font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
              <span>Elevation</span>
              <span className="text-[10px] tabular-nums text-ink">
                {elValue >= 0 ? "+" : "−"}
                {Math.abs(elValue).toFixed(1)}°
              </span>
            </span>
            <input
              type="range"
              min={-45}
              max={60}
              step={0.5}
              value={elValue}
              disabled={autoTrack}
              aria-label="Antenna elevation in degrees"
              onChange={(event) => aimAt(azValue, Number(event.target.value))}
              className="mt-1 w-full accent-[#3ddbd9] disabled:cursor-not-allowed"
            />
          </label>
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-faint">
          {autoTrack
            ? "The gimbal slews to keep the beam on the selected target. Switch targets to watch the handover."
            : "Manual mode: the sliders command the gimbal directly and automatic tracking is suspended."}
        </p>
      </div>

      {/* Transport */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause the simulation" : "Play the simulation"}
            className={cn(controlBase, "min-w-[76px]", playing && "border-signal/45 text-white")}
          >
            {playing ? "❚❚ Pause" : "▶ Play"}
          </button>
          <button type="button" onClick={reset} className={controlBase}>
            ↺ Reset
          </button>
        </div>
        <div className="flex items-center gap-0.5 rounded-full border border-white/10 p-1" role="group" aria-label="Animation speed">
          {SPEEDS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={speed === item.id}
              onClick={() => setSpeed(item.id)}
              className={cn(
                "rounded-full px-2.5 py-1 font-mono text-[8.5px] uppercase transition-colors",
                speed === item.id ? "bg-signal/20 text-signal" : "text-faint hover:text-white",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Camera */}
      <div>
        <SectionTitle>Camera</SectionTitle>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <div role="group" aria-label="Camera view" className="flex rounded-full border border-white/10 bg-[#040a14] p-1">
            {VIEWS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={view === item.id}
                onClick={() => setView(item.id)}
                className={cn(
                  "rounded-full px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-[0.08em] transition-colors",
                  view === item.id ? "bg-signal/15 text-signal" : "text-faint hover:text-white",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={resetCamera} className={controlBase}>
            Reset view
          </button>
          <span className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-faint">
            drag to rotate · scroll to zoom
          </span>
        </div>
      </div>

      {/* Display toggles */}
      <div>
        <SectionTitle>Display</SectionTitle>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <ToggleChip active={showWavefronts} onClick={toggleWavefronts}>
            {tech === "rf" ? "Wavefronts" : "Laser pulses"}
          </ToggleChip>
          <ToggleChip active={showTrackingLine} onClick={toggleTrackingLine}>
            Tracking line
          </ToggleChip>
          <ToggleChip active={showLabels} onClick={toggleLabels}>
            Labels
          </ToggleChip>
        </div>
      </div>
    </div>
  );
}
