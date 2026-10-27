import { useEffect } from "react";
import { fsStageClass, useFullscreen } from "@/components/site/FullscreenStage";
import { Link } from "@/lib/router";
import { useMediaQuery, useReducedMotion } from "@/lib/useMediaQuery";
import { cn } from "@/utils/cn";
import { BeamControls } from "./BeamControls";
import { BeamDriver } from "./BeamDriver";
import { SceneOverlay } from "./BeamHud";
import { DishScene } from "./DishScene";
import { PhaseStrip } from "./PhaseStrip";
import { SkyPlot } from "./SkyPlot";
import { SPEEDS, useBeamLab, type BeamView } from "./beamStore";
import { controlBase } from "./beamUI";

const VIEWS: { id: BeamView; label: string }[] = [
  { id: "dish", label: "Dish" },
  { id: "sky", label: "Sky" },
  { id: "orbit", label: "Orbit" },
];

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
 * The dish simulation: a cinematic 3D scene, a working sky plot and the phase
 * table, all driven by one clock in `BeamDriver`.
 */
export function DishLab() {
  const compact = useMediaQuery("(max-width: 767px)");
  const reduced = useReducedMotion();
  const fs = useFullscreen<HTMLDivElement>();

  const view = useBeamLab((s) => s.view);
  const setView = useBeamLab((s) => s.setView);
  const playing = useBeamLab((s) => s.playing);
  const togglePlay = useBeamLab((s) => s.togglePlay);
  const speed = useBeamLab((s) => s.speed);
  const setSpeed = useBeamLab((s) => s.setSpeed);
  const reset = useBeamLab((s) => s.reset);
  const showCodes = useBeamLab((s) => s.showCodes);
  const showLabels = useBeamLab((s) => s.showLabels);
  const showSightLine = useBeamLab((s) => s.showSightLine);
  const toggleCodes = useBeamLab((s) => s.toggleCodes);
  const toggleLabels = useBeamLab((s) => s.toggleLabels);
  const toggleSightLine = useBeamLab((s) => s.toggleSightLine);

  // Reduced-motion visitors still get the whole model; it just starts still.
  useEffect(() => {
    if (reduced) useBeamLab.setState({ playing: false });
  }, [reduced]);

  return (
    <section id="simulation" className="relative scroll-mt-24 py-8 md:py-10">
      <div className="page-shell">
        <div className="panel overflow-hidden">
          <BeamDriver />

          {/* Header and global controls */}
          <div className="border-b border-white/[0.07] bg-[#060b16] px-4 py-4 md:px-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-faint">
                    Dish beam simulator
                  </p>
                  <span className="rounded-full border border-warn/30 bg-warn/[0.06] px-2 py-0.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-warn">
                    educational model
                  </span>
                </div>
                <h2 className="mt-1.5 text-[clamp(1.25rem,2.6vw,1.6rem)] font-semibold tracking-[-0.02em] text-white">
                  Wavefronts from a dish that never moves
                </h2>
                <p className="mt-1.5 max-w-xl text-[11.5px] leading-relaxed text-muted">
                  A flat panel, one tripod, no motors. The beam still crosses the sky because the
                  waves from its elements are timed differently — and you can see the difference in
                  every orange wavefront.
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
                  <button type="button" onClick={reset} className={controlBase}>
                    ↺ Reset
                  </button>
                </div>
                <div className="flex items-center gap-0.5 rounded-full border border-white/10 p-1">
                  <span className="px-1.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-faint">
                    Speed
                  </span>
                  {SPEEDS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSpeed(value)}
                      aria-pressed={speed === value}
                      className={cn(
                        "rounded-full px-2 py-1 font-mono text-[9px] transition-colors",
                        speed === value ? "bg-signal/20 text-signal" : "text-faint hover:text-white",
                      )}
                    >
                      {value}×
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
              <div
                role="tablist"
                aria-label="Camera view"
                className="flex w-full gap-1 rounded-xl border border-white/10 bg-[#040a14] p-1 sm:w-auto sm:rounded-full"
              >
                {VIEWS.map((item) => {
                  const active = item.id === view;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setView(item.id)}
                      className={cn(
                        "flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] transition-colors sm:flex-none sm:rounded-full",
                        active ? "bg-signal/15 text-signal" : "text-faint hover:text-white",
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <ToggleChip active={showCodes} onClick={toggleCodes}>
                  Phase codes
                </ToggleChip>
                <ToggleChip active={showLabels} onClick={toggleLabels}>
                  Labels
                </ToggleChip>
                <ToggleChip active={showSightLine} onClick={toggleSightLine}>
                  Sight line
                </ToggleChip>
              </div>
            </div>
          </div>

          {/* Scene */}
          <div
            id="beam-lab-scene"
            ref={fs.ref}
            className={fsStageClass(
              fs.isFullscreen,
              fs.hasNative,
              "relative h-[430px] scroll-mt-24 overflow-hidden bg-[#02050c] sm:h-[520px] lg:h-[600px]",
            )}
          >
            <DishScene compact={compact} className="absolute inset-0 fs-fill" />
            <SceneOverlay fullscreen={fs.isFullscreen} onFullscreen={fs.toggle} />
          </div>

          {/* Instruments */}
          <div className="grid divide-y divide-white/[0.07] border-t border-white/[0.07] lg:grid-cols-[1.02fr_1fr] lg:divide-x lg:divide-y-0">
            <div className="p-4 md:p-5">
              <SkyPlot />
            </div>
            <BeamControls />
          </div>

          <PhaseStrip />

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] bg-[#040a13] px-4 py-2.5 md:px-5">
            <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
              Uniform 16 × 16 lattice · 12 GHz · d = λ/2 · satellites are illustrative tracks
            </p>
            <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
              Not live Starlink telemetry or control
            </p>
          </div>
        </div>

        <p className="mt-3 px-1 text-[10px] leading-relaxed text-faint">
          Model: a uniform 16 × 16 lattice of ideal isotropic elements with half-wavelength spacing
          at 12 GHz. The wavefronts are drawn as spaced rings to make the phase visible; the real
          spacing is 25 mm and the satellite is hundreds of kilometres away, not twelve scene units.
          See{" "}
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
