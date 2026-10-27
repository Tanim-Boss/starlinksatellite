import { FullscreenButton } from "@/components/site/FullscreenStage";
import {
  angularSeparation,
  beamwidthDeg,
  compassPoint,
  formatSigned,
  getSatellite,
  satelliteAt,
  scanAngleFromElevation,
} from "@/lib/dishBeam";
import { cn } from "@/utils/cn";
import { beamClock, useBeamLab } from "./beamStore";

/**
 * Readouts pinned over the canvas.
 *
 * Subscribes to `uiTick` (about 8 Hz), not to the frame clock, so the 3D scene
 * keeps its own 60 fps loop and the DOM is not asked to render per frame.
 */
export function SceneOverlay({
  fullscreen,
  onFullscreen,
}: {
  fullscreen: boolean;
  onFullscreen: () => void;
}) {
  useBeamLab((s) => s.uiTick);
  const targetId = useBeamLab((s) => s.targetId);
  const mode = useBeamLab((s) => s.mode);
  const playing = useBeamLab((s) => s.playing);
  const showCodes = useBeamLab((s) => s.showCodes);

  const def = getSatellite(targetId);
  const sat = satelliteAt(def, beamClock.t);
  const scan = scanAngleFromElevation(beamClock.el);
  const width = beamwidthDeg(scan);
  const error = angularSeparation({ az: beamClock.az, el: beamClock.el }, sat);

  return (
    <>
      {/* Pointing readout */}
      <div className="pointer-events-none absolute left-2.5 top-2.5 z-20 sm:left-4 sm:top-4">
        <div className="rounded-xl border border-white/12 bg-[#040a14]/92 px-3 py-2 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <span className="font-mono text-[7.5px] uppercase tracking-[0.16em] text-faint">
              {mode === "aim" ? "manual aim" : "tracking"}
            </span>
            <span
              className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.08em]"
              style={{ color: def.color }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: def.color }} />
              {def.name}
            </span>
          </div>

          <div className="mt-1 flex items-end gap-3.5">
            {[
              { label: "AZ", value: `${formatSigned(beamClock.az)}°` },
              { label: "EL", value: `${beamClock.el.toFixed(1)}°` },
              { label: "SCAN", value: `${scan.toFixed(1)}°` },
            ].map((item) => (
              <div key={item.label}>
                <div className="font-mono text-[7px] uppercase tracking-[0.14em] text-faint">
                  {item.label}
                </div>
                <div className="font-mono text-[12.5px] leading-tight text-white tabular-nums">
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono text-[7px] uppercase tracking-[0.08em] text-faint">
            <span>{compassPoint(beamClock.az)}</span>
            <span>· beam {width.toFixed(1)}°</span>
            <span
              className="tabular-nums"
              style={{ color: error < 0.6 ? "#3ddbd9" : "#fbbf24" }}
            >
              · {error < 0.6 ? "on target" : `off ${error.toFixed(1)}°`}
            </span>
          </div>
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
          <span className="hidden rounded-full border border-signal/25 bg-[#04121a]/92 px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.12em] text-signal/85 backdrop-blur sm:block">
            Dish fixed · 0 moving parts
          </span>
        </div>
        <div className="hidden rounded-full border border-warn/30 bg-[#120d04]/92 px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.12em] text-warn/90 backdrop-blur sm:block">
          Educational simulation
        </div>
        <FullscreenButton onClick={onFullscreen} active={fullscreen} />
      </div>

      {/* Legend + camera hint */}
      <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 z-20 flex items-end justify-between gap-2 sm:inset-x-4 sm:bottom-4">
        <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#040a14]/92 px-2.5 py-1.5 backdrop-blur">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span className="flex items-center gap-1.5">
              <span className="h-[2px] w-4 rounded-full bg-[#ff6a14] shadow-[0_0_6px_#ff6a14]" />
              <span className="font-mono text-[7px] uppercase leading-tight tracking-[0.06em] text-[#a8bad2]">
                constant-phase wavefronts
              </span>
            </span>
            {showCodes && (
              <span className="flex items-center gap-1.5">
                <span className="font-mono text-[8px] tracking-[0.08em] text-[#ffd2a1]">0100</span>
                <span className="font-mono text-[7px] uppercase leading-tight tracking-[0.06em] text-[#a8bad2]">
                  4-bit phase word
                </span>
              </span>
            )}
            <span className="hidden items-center gap-1.5 sm:flex">
              <span className="h-px w-4 border-t border-dashed border-[#3ddbd9]" />
              <span className="font-mono text-[7px] uppercase leading-tight tracking-[0.06em] text-[#a8bad2]">
                line of sight
              </span>
            </span>
          </div>
          <p className="mt-1 font-mono text-[6.5px] uppercase tracking-[0.1em] text-signal/80 sm:hidden">
            Panel fixed · beam steered electronically
          </p>
          <p className="mt-1 hidden font-mono text-[6.5px] uppercase tracking-[0.1em] text-faint sm:block">
            Wavefront spacing, ring size and the sky distance are all exaggerated
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="hidden font-mono text-[7px] uppercase tracking-[0.1em] text-faint md:inline">
            drag to orbit · scroll to zoom
          </span>
          <div
            className={cn(
              "rounded-full border border-white/12 bg-[#040a14]/92 px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.1em] backdrop-blur",
              "text-muted",
            )}
          >
            12 GHz
          </div>
        </div>
      </div>
    </>
  );
}
