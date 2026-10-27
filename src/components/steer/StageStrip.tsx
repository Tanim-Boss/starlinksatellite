import { STAGE_COPY, stageCopyFor } from "./steerContent";
import { steerClock, useSteerLab, type StageId } from "./steerStore";
import { cn } from "@/utils/cn";

const STAGE_ORDER: Record<StageId, number> = {
  "link-a": 1,
  selected: 2,
  steering: 3,
  "link-b": 4,
  manual: 3,
};

/**
 * The five-stage narrative rail. Stages 1–4 light themselves from the live
 * simulation state; stage 5 opens the mechanism close-up camera.
 */
export function StageStrip() {
  useSteerLab((s) => s.uiTick);
  const view = useSteerLab((s) => s.view);
  const setView = useSteerLab((s) => s.setView);
  const stage = steerClock.stage;
  const activeIndex = view === "mechanism" ? 5 : STAGE_ORDER[stage];
  const copy = stageCopyFor(stage, view);

  return (
    <div className="border-b border-white/[0.07] bg-[#050a14] px-4 py-3.5 md:px-5">
      <ol className="grid grid-cols-5 gap-1.5 sm:gap-2.5" aria-label="Simulation stages">
        {STAGE_COPY.map((item) => {
          const index = item.index;
          const active = index === activeIndex;
          const done = index < activeIndex;
          const isMechanism = index === 5;
          return (
            <li key={item.id} className="min-w-0">
              <button
                type="button"
                aria-current={active}
                onClick={() => setView(isMechanism ? "mechanism" : "overview")}
                className={cn(
                  "flex w-full flex-col items-start gap-1 rounded-lg border px-2 py-1.5 text-left transition-colors sm:px-2.5",
                  active
                    ? "border-signal/45 bg-signal/[0.08]"
                    : done
                      ? "border-white/15 bg-white/[0.03]"
                      : "border-white/[0.07] bg-white/[0.015] hover:border-white/20",
                )}
              >
                <span
                  className={cn(
                    "font-mono text-[8px] tabular-nums",
                    active ? "text-signal" : done ? "text-muted" : "text-faint",
                  )}
                >
                  {String(index).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "hidden font-mono text-[7.5px] uppercase leading-tight tracking-[0.08em] sm:block",
                    active ? "text-white" : "text-faint",
                  )}
                >
                  {item.label}
                </span>
                <span
                  className={cn(
                    "font-mono text-[7px] uppercase leading-tight tracking-[0.06em] sm:hidden",
                    active ? "text-white" : "text-faint",
                  )}
                >
                  {index === 1 ? "Link" : index === 2 ? "Select" : index === 3 ? "Steer" : index === 4 ? "Lock" : "Mech"}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5">
        <span className="mt-0.5 font-mono text-[10px] tabular-nums text-signal">
          {String(activeIndex).padStart(2, "0")}
        </span>
        <div className="min-w-0">
          <h3 className="text-[12.5px] font-medium text-white">{copy.title}</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{copy.body}</p>
        </div>
      </div>
    </div>
  );
}
