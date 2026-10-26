import { useEffect } from "react";
import { VIEW_COPY } from "@/lib/antennaContent";
import { compassPoint } from "@/lib/phasedArray";
import { useMediaQuery, useReducedMotion } from "@/lib/useMediaQuery";
import { cn } from "@/utils/cn";
import { AntennaScene } from "./AntennaScene";
import { ArrayCloseUp } from "./ArrayCloseUp";
import { BeamDriver } from "./BeamDriver";
import { GuidedExperiment } from "./GuidedExperiment";
import { RadiationCut } from "./RadiationCut";
import { SteeringControls } from "./SteeringControls";
import { SceneAlignmentChip, TargetPanel } from "./TargetPanel";
import { SPEEDS, useBeamLab } from "./antennaStore";
import { controlBase } from "./labUI";
import { Link } from "@/lib/router";

function signed(v: number, digits = 1) {
  const rounded = Math.abs(v) < 0.05 ? 0 : v;
  return `${rounded >= 0 ? "+" : "−"}${Math.abs(rounded).toFixed(digits)}`;
}

function ModeTabs() {
  const view = useBeamLab((s) => s.view);
  const setView = useBeamLab((s) => s.setView);
  return (
    <div
      role="tablist"
      aria-label="Visualisation mode"
      className="grid w-full grid-cols-3 gap-1 rounded-xl border border-white/10 bg-[#040a14] p-1 sm:flex sm:w-auto sm:flex-wrap sm:rounded-full"
    >
      {VIEW_COPY.map((v) => {
        const active = v.id === view;
        return (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setView(v.id)}
            className={cn(
              "whitespace-nowrap rounded-lg px-1 py-1.5 font-mono text-[8px] uppercase tracking-[0.06em] transition-colors sm:rounded-full sm:px-3 sm:text-[9.5px] sm:tracking-[0.08em]",
              active ? "bg-signal/15 text-signal" : "text-faint hover:text-white",
            )}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}

const LEGEND: Record<string, { dot: string; text: string }[]> = {
  wave: [
    { dot: "bg-signal", text: "constructive · fields add" },
    { dot: "bg-warn", text: "destructive · fields cancel" },
  ],
  beam: [
    { dot: "bg-signal", text: "main lobe · model-derived direction" },
    { dot: "bg-white/40", text: "envelope exaggerated, not a hard edge" },
  ],
  pattern: [
    { dot: "bg-signal", text: "main lobe · 0 dB" },
    { dot: "bg-warn", text: "side lobes · nulls between" },
  ],
};

function SceneOverlay() {
  const azDeg = useBeamLab((s) => s.azDeg);
  const elDeg = useBeamLab((s) => s.elDeg);
  const view = useBeamLab((s) => s.view);
  const camera = useBeamLab((s) => s.camera);
  const setCamera = useBeamLab((s) => s.setCamera);

  return (
    <>
      <div className="pointer-events-none absolute left-2.5 top-2.5 z-20 flex flex-col items-start gap-1.5 sm:left-4 sm:top-4">
        <div className="flex items-stretch gap-2.5 rounded-xl border border-white/12 bg-[#040a14]/95 px-3 py-2 backdrop-blur">
          <div>
            <div className="font-mono text-[7.5px] uppercase tracking-[0.16em] text-faint">AZ</div>
            <div className="font-mono text-[13px] leading-none text-white tabular-nums">
              {signed(azDeg)}°
            </div>
            <div className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.08em] text-signal/80">
              {compassPoint(azDeg)}
            </div>
          </div>
          <span className="w-px bg-white/10" />
          <div>
            <div className="font-mono text-[7.5px] uppercase tracking-[0.16em] text-faint">EL</div>
            <div className="font-mono text-[13px] leading-none text-white tabular-nums">
              {elDeg.toFixed(1)}°
            </div>
            <div className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.08em] text-faint">
              above horizon
            </div>
          </div>
        </div>
        <div className="hidden rounded-full border border-signal/25 bg-[#04121a]/95 px-2 py-0.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-signal/85 backdrop-blur sm:block">
          Panel fixed · 0 moving parts
        </div>
      </div>

      <div className="pointer-events-none absolute right-2.5 top-2.5 z-20 flex flex-col items-end gap-1.5 sm:right-4 sm:top-4">
        <SceneAlignmentChip />
        <div className="hidden rounded-full border border-warn/30 bg-[#120d04]/95 px-2 py-0.5 font-mono text-[7px] uppercase tracking-[0.12em] text-warn/90 backdrop-blur sm:block">
          Educational simulation
        </div>
      </div>

      {/* One flex row so the legend and the camera pills can never overlap. */}
      <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 z-20 flex items-end justify-between gap-2 sm:inset-x-4 sm:bottom-4">
        <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#040a14]/95 px-2.5 py-1.5 backdrop-blur">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {LEGEND[view].map((item) => (
              <span key={item.text} className="flex items-center gap-1.5">
                <span className={cn("h-1 w-1 shrink-0 rounded-full", item.dot)} />
                <span className="font-mono text-[7px] uppercase leading-tight tracking-[0.06em] text-[#a8bad2]">
                  {item.text}
                </span>
              </span>
            ))}
          </div>
          <p className="mt-1 font-mono text-[6.5px] uppercase leading-tight tracking-[0.1em] text-signal/80 sm:hidden">
            Panel fixed · 0 moving parts
          </p>
          <p className="mt-1 hidden font-mono text-[6.5px] uppercase tracking-[0.1em] text-faint sm:block">
            Not live telemetry · not Starlink firmware · model limits below
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="hidden font-mono text-[7px] uppercase tracking-[0.1em] text-faint md:inline">
            drag to orbit · scroll to zoom
          </span>
          <div className="pointer-events-auto flex gap-1 rounded-full border border-white/12 bg-[#040a14]/95 p-1 backdrop-blur">
            {[
              { id: "sky" as const, label: "Sky" },
              { id: "panel" as const, label: "Panel" },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCamera(c.id)}
                aria-pressed={camera === c.id}
                className={cn(
                  "rounded-full px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] transition-colors",
                  camera === c.id ? "bg-signal/20 text-signal" : "text-faint hover:text-white",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * The full lab: scene, controls, close-up, pattern cut and guided experiment.
 * All interactive state lives in `useBeamLab`; the driver is the only writer of
 * the shared clock, so every readout follows the same simulation.
 */
export function PhasedArrayLab() {
  const compact = useMediaQuery("(max-width: 767px)");
  const reduced = useReducedMotion();
  const playing = useBeamLab((s) => s.playing);
  const speed = useBeamLab((s) => s.speed);
  const view = useBeamLab((s) => s.view);
  const showLabels = useBeamLab((s) => s.showLabels);
  const showTracks = useBeamLab((s) => s.showTracks);
  const togglePlay = useBeamLab((s) => s.togglePlay);
  const setSpeed = useBeamLab((s) => s.setSpeed);
  const resetLab = useBeamLab((s) => s.resetLab);
  const toggleLabels = useBeamLab((s) => s.toggleLabels);
  const toggleTracks = useBeamLab((s) => s.toggleTracks);

  useEffect(() => {
    if (reduced) useBeamLab.setState({ playing: false });
  }, [reduced]);

  const blurb = VIEW_COPY.find((v) => v.id === view)?.blurb ?? "";

  return (
    <section id="lab" className="relative scroll-mt-24 py-8 md:py-10">
      <div className="page-shell">
        <div className="panel overflow-hidden">
          <BeamDriver />

          {/* Header and global controls */}
          <div className="border-b border-white/[0.07] bg-[#060b16] px-4 py-4 md:px-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-faint">
                    Phased-array antenna simulator
                  </p>
                  <span className="rounded-full border border-warn/30 bg-warn/[0.06] px-2 py-0.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-warn">
                    educational model
                  </span>
                </div>
                <h2 className="mt-1.5 text-[clamp(1.25rem,2.6vw,1.6rem)] font-semibold tracking-[-0.02em] text-white">
                  Steering a radio beam across the sky
                </h2>
                <p className="mt-1.5 max-w-xl text-[11.5px] leading-relaxed text-muted">
                  256 fixed elements, one flat panel, and a beam made of interference. Move the
                  sliders — the panel never turns.
                </p>
              </div>

              <div className="flex flex-col items-start gap-2 sm:items-end">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={togglePlay}
                    aria-label={playing ? "Pause the simulation" : "Play the simulation"}
                    className={cn(controlBase, "min-w-[74px]", playing && "border-signal/45 text-white")}
                  >
                    {playing ? "❚❚ Pause" : "▶ Play"}
                  </button>
                  <button type="button" onClick={resetLab} className={controlBase}>
                    ↺ Reset
                  </button>
                </div>
                <div className="flex items-center gap-0.5 rounded-full border border-white/10 p-1">
                  <span className="px-1.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-faint">
                    Speed
                  </span>
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSpeed(s)}
                      aria-pressed={speed === s}
                      className={cn(
                        "rounded-full px-2 py-1 font-mono text-[9px] transition-colors",
                        speed === s ? "bg-signal/20 text-signal" : "text-faint hover:text-white",
                      )}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
                {reduced && (
                  <span className="font-mono text-[7.5px] uppercase tracking-[0.08em] text-warn/80">
                    reduced motion · starts paused
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
              <ModeTabs />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleLabels}
                  aria-pressed={showLabels}
                  className={cn(
                    controlBase,
                    "px-2.5 py-1 text-[8.5px]",
                    showLabels && "border-signal/40 bg-signal/[0.08] text-signal",
                  )}
                >
                  Labels
                </button>
                <button
                  type="button"
                  onClick={toggleTracks}
                  aria-pressed={showTracks}
                  className={cn(
                    controlBase,
                    "px-2.5 py-1 text-[8.5px]",
                    showTracks && "border-signal/40 bg-signal/[0.08] text-signal",
                  )}
                >
                  Orbit tracks
                </button>
              </div>
            </div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-faint">{blurb}</p>
          </div>

          {/* Scene */}
          <div
            id="beam-lab-scene"
            className="relative h-[380px] scroll-mt-24 overflow-hidden bg-[#02050c] sm:h-[460px] lg:h-[560px]"
          >
            <AntennaScene compact={compact} className="absolute inset-0" />
            <SceneOverlay />
          </div>

          {/* Controls */}
          <div className="grid divide-y divide-white/[0.07] border-t border-white/[0.07] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            <SteeringControls />
            <TargetPanel />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] bg-[#040a13] px-4 py-2.5 md:px-5">
            <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
              Array factor · 12 GHz · d = λ/2 · satellites are illustrative apparent tracks
            </p>
            <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
              Not live Starlink telemetry or control
            </p>
          </div>
        </div>

        {/* Instruments + guide */}
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <ArrayCloseUp />
          <RadiationCut />
        </div>
        <div className="mt-4">
          <GuidedExperiment />
        </div>

        <p className="mt-3 px-1 text-[10px] leading-relaxed text-faint">
          Model: a uniform 16 × 16 lattice of ideal isotropic elements with half-wavelength spacing
          at 12 GHz. Far-field array factor only; the near-field sheet is schematic. Production
          Starlink terminals differ by generation, and their element counts, spacing, beamforming
          hardware and scan limits are not published. See{" "}
          <Link
            to="/antenna"
            section="assumptions"
            className="text-muted underline decoration-white/20 hover:text-signal"
          >
            assumptions &amp; limits
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
