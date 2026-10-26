import { GUIDE_STEPS } from "@/lib/antennaContent";
import { compassPoint } from "@/lib/phasedArray";
import { useBeamLab } from "./antennaStore";
import { controlBase } from "./labUI";
import { cn } from "@/utils/cn";

export function GuidedExperiment() {
  const step = useBeamLab((s) => s.guideStep);
  const view = useBeamLab((s) => s.view);
  const azDeg = useBeamLab((s) => s.azDeg);
  const elDeg = useBeamLab((s) => s.elDeg);
  const selectedSat = useBeamLab((s) => s.selectedSat);
  const tracking = useBeamLab((s) => s.tracking);
  const sweeping = useBeamLab((s) => s.sweeping);
  const goToStep = useBeamLab((s) => s.goToStep);
  const nextStep = useBeamLab((s) => s.nextStep);
  const prevStep = useBeamLab((s) => s.prevStep);
  const resetLab = useBeamLab((s) => s.resetLab);

  const current = GUIDE_STEPS[Math.max(0, Math.min(GUIDE_STEPS.length - 1, step - 1))];

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3.5 md:px-5">
        <div>
          <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-faint">
            Guided experiment
          </p>
          <h3 className="mt-1 text-[13.5px] font-medium text-white">Seven steps through the array</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-signal">
            {String(step).padStart(2, "0")} / 07
          </span>
          <button type="button" onClick={resetLab} className={controlBase}>
            ↺ Reset
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-[190px_minmax(0,1fr)] md:p-5">
        <div className="min-w-0">
          <ol className="grid grid-cols-7 gap-1 md:grid-cols-2">
            {GUIDE_STEPS.map((s) => {
              const active = s.id === step;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => goToStep(s.id)}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "flex w-full items-center gap-1.5 rounded-lg border px-1.5 py-1.5 text-left transition-colors md:px-2",
                      active
                        ? "border-signal/40 bg-signal/[0.08]"
                        : "border-white/[0.07] bg-white/[0.015] hover:border-white/20",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border font-mono text-[7.5px]",
                        active
                          ? "border-signal bg-signal/20 text-signal"
                          : "border-white/20 text-faint",
                      )}
                    >
                      {s.id}
                    </span>
                    <span
                      className={cn(
                        "hidden whitespace-nowrap font-mono text-[8px] uppercase tracking-[0.03em] md:block",
                        active ? "text-signal" : "text-muted",
                      )}
                    >
                      {s.short}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mt-3 hidden rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2 md:block">
            <p className="font-mono text-[7.5px] uppercase tracking-[0.12em] text-faint">Live now</p>
            <p className="mt-1 font-mono text-[9px] leading-relaxed text-muted">
              view {view} · AZ {azDeg.toFixed(0)}° {compassPoint(azDeg)} · EL {elDeg.toFixed(0)}°
            </p>
            <p className="mt-0.5 font-mono text-[9px] leading-relaxed text-muted">
              target {selectedSat ?? "none"} · {tracking ? "auto-track" : sweeping ? "sweep" : "manual"}
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-signal/40 bg-signal/10 font-mono text-[10px] text-signal">
              {current.id}
            </span>
            <span className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-faint">
              {current.kicker}
            </span>
          </div>
          <h4 className="mt-2 text-[15px] font-medium leading-snug text-white">{current.title}</h4>
          <p className="mt-2 text-[12px] leading-[1.75] text-muted">{current.body}</p>
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-signal/20 bg-signal/[0.04] px-3 py-2 text-[11px] leading-relaxed text-signal/90">
            <span className="mt-px font-mono text-[9px]">ACT</span>
            <span>{current.action}</span>
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={prevStep}
              disabled={step <= 1}
              className={controlBase}
            >
              ◀ Previous
            </button>
            <button
              type="button"
              onClick={nextStep}
              disabled={step >= GUIDE_STEPS.length}
              className={cn(
                controlBase,
                step < GUIDE_STEPS.length && "border-signal/40 bg-signal/10 text-signal",
              )}
            >
              Next ▶
            </button>
            <span className="ml-auto font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
              each step applies a starting setup
            </span>
          </div>

          <div className="mt-3 flex gap-1" aria-hidden>
            {GUIDE_STEPS.map((s) => (
              <span
                key={s.id}
                className={cn(
                  "h-0.5 flex-1 rounded-full",
                  s.id <= step ? "bg-signal/70" : "bg-white/10",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
