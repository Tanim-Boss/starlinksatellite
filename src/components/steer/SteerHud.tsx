import { FullscreenButton } from "@/components/site/FullscreenStage";
import { TECH_SPECS, formatSigned, getTarget, rangeKm } from "@/lib/steering";
import { cn } from "@/utils/cn";
import { steerClock, useSteerLab } from "./steerStore";

/**
 * Telemetry pinned over the canvas. Subscribes to `uiTick` (~8 Hz), not the
 * frame clock, so the 3D scene keeps its own 60 fps loop and the DOM never
 * renders per frame. Every value is labelled as simulated.
 */
const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  locked: { label: "LINK LOCKED", className: "text-signal border-signal/40 bg-signal/10" },
  slewing: { label: "SLEWING", className: "text-warn border-warn/40 bg-warn/10" },
  acquiring: { label: "ACQUIRING · PAT", className: "text-warn border-warn/40 bg-warn/10" },
  manual: { label: "MANUAL AIM", className: "text-muted border-white/20 bg-white/5" },
};

export function SteerHud({
  fullscreen,
  onFullscreen,
}: {
  fullscreen: boolean;
  onFullscreen: () => void;
}) {
  useSteerLab((s) => s.uiTick);
  const targetId = useSteerLab((s) => s.targetId);
  const tech = useSteerLab((s) => s.tech);
  const autoTrack = useSteerLab((s) => s.autoTrack);
  const playing = useSteerLab((s) => s.playing);
  const showWavefronts = useSteerLab((s) => s.showWavefronts);

  const target = getTarget(targetId);
  const spec = TECH_SPECS[tech];
  const status = STATUS_STYLE[steerClock.status];
  const digits = tech === "optical" ? 2 : 1;

  return (
    <>
      {/* Telemetry card */}
      <div className="pointer-events-none absolute left-2.5 top-2.5 z-20 sm:left-4 sm:top-4">
        <div className="w-[218px] rounded-xl border border-white/12 bg-[#040a14]/92 px-3 py-2.5 backdrop-blur sm:w-[248px]">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[7.5px] uppercase tracking-[0.16em] text-faint">
              {autoTrack ? "auto tracking" : "manual steering"}
            </span>
            <span
              className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.08em]"
              style={{ color: target.color }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: target.color }} />
              {target.name}
            </span>
          </div>

          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {[
              { label: "AZIMUTH", value: `${formatSigned(steerClock.az)}°` },
              { label: "ELEVATION", value: `${formatSigned(steerClock.el)}°` },
              {
                label: "PTG ERROR",
                value: `${steerClock.errorDeg.toFixed(digits)}°`,
                warn: steerClock.errorDeg > spec.lockDeg,
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="font-mono text-[6.5px] uppercase tracking-[0.12em] text-faint">
                  {item.label}
                </div>
                <div
                  className={cn(
                    "font-mono text-[12.5px] leading-tight tabular-nums",
                    item.warn ? "text-warn" : "text-white",
                  )}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/[0.07] pt-2">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 font-mono text-[7.5px] uppercase tracking-[0.12em]",
                status.className,
              )}
            >
              {status.label}
            </span>
            <span className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-faint tabular-nums">
              {rangeKm(target).toLocaleString()} km
            </span>
          </div>
          <p className="mt-1.5 font-mono text-[6.5px] uppercase tracking-[0.1em] text-faint">
            Simulated telemetry · illustrative values
          </p>
        </div>
      </div>

      {/* Status chips */}
      <div className="absolute right-2.5 top-2.5 z-20 flex flex-col items-end gap-1.5 sm:right-4 sm:top-4">
        <div className="flex items-center gap-1.5">
          {!playing && (
            <span className="rounded-full border border-warn/40 bg-[#120d04]/92 px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.12em] text-warn backdrop-blur">
              paused
            </span>
          )}
          <span className="hidden rounded-full border border-white/15 bg-[#040a14]/92 px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.12em] text-muted backdrop-blur sm:block">
            {spec.band}
          </span>
        </div>
        <span className="hidden rounded-full border border-warn/30 bg-[#120d04]/92 px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.12em] text-warn/90 backdrop-blur md:block">
          Educational simulation
        </span>
        <FullscreenButton onClick={onFullscreen} active={fullscreen} />
      </div>

      {/* Legend */}
      <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 z-20 flex items-end justify-between gap-2 sm:inset-x-4 sm:bottom-4">
        <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#040a14]/92 px-2.5 py-1.5 backdrop-blur">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {tech === "rf" ? (
              <span className="flex items-center gap-1.5">
                <span className="h-[2px] w-4 rounded-full bg-[#ff7a1a] shadow-[0_0_6px_#ff7a1a]" />
                <span className="font-mono text-[7px] uppercase tracking-[0.06em] text-[#a8bad2]">
                  RF wavefronts{showWavefronts ? "" : " · hidden"}
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="h-[2px] w-4 rounded-full bg-[#a78bfa] shadow-[0_0_6px_#a78bfa]" />
                <span className="font-mono text-[7px] uppercase tracking-[0.06em] text-[#a8bad2]">
                  1550 nm laser beam
                </span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="h-px w-4 border-t border-dashed border-[#3ddbd9]" />
              <span className="font-mono text-[7px] uppercase tracking-[0.06em] text-[#a8bad2]">
                target line of sight
              </span>
            </span>
            <span className="hidden items-center gap-1.5 sm:flex">
              <span className="h-1.5 w-1.5 rounded-sm bg-[#ffb066] shadow-[0_0_6px_#ff8a3c]" />
              <span className="font-mono text-[7px] uppercase tracking-[0.06em] text-[#a8bad2]">
                data packets
              </span>
            </span>
          </div>
          <p className="mt-1 font-mono text-[6.5px] uppercase tracking-[0.1em] text-faint">
            Wavefronts are explanatory surfaces, not photons · not an EM solver
          </p>
        </div>
        <span className="hidden shrink-0 font-mono text-[7px] uppercase tracking-[0.1em] text-faint md:inline">
          drag to orbit · scroll to zoom
        </span>
      </div>
    </>
  );
}
