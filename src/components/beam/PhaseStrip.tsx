import {
  ARRAY_ROWS,
  PHASE_BITS,
  PHASE_STEP_DEG,
  formatSigned,
  phaseStepDeg,
  phaseWords,
  rowStepPs,
  scanAngleFromElevation,
} from "@/lib/dishBeam";
import { beamClock, useBeamLab } from "./beamStore";

/**
 * The row-by-row phase setting, written the same way it is written on the
 * wavefronts. Change the aim and the words shift: this is the table behind the
 * numbers floating up the beam.
 */
export function PhaseStrip() {
  useBeamLab((s) => s.uiTick);

  const scan = scanAngleFromElevation(beamClock.el);
  const step = phaseStepDeg(scan);
  const quantised = (Math.round(step / PHASE_STEP_DEG) * PHASE_STEP_DEG) % 360;
  const words = phaseWords(scan);

  return (
    <section className="border-t border-white/[0.07] bg-[#050a13] px-4 py-3.5 md:px-5">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
            Phase words · one per array row
          </p>
          <p className="mt-1 max-w-2xl text-[10.5px] leading-relaxed text-muted">
            In the scene, each ring is labelled in order with one array row&apos;s phase setting — a
            visual device, because a real wavefront is continuous. Read a word as a binary fraction
            of a full cycle: 0000 is 0°, 1000 is 180°, 1111 is 337.5°. The progression down the rows
            is what tilts the wavefront toward the satellite, and the panel itself never moves.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 font-mono text-[8px] uppercase tracking-[0.08em] text-faint">
          <span className="rounded-full border border-white/10 px-2 py-0.5">
            scan <span className="text-ink">{scan.toFixed(1)}°</span>
          </span>
          <span className="rounded-full border border-white/10 px-2 py-0.5">
            step{" "}
            <span className="text-ink">
              {step.toFixed(1)}° → {quantised.toFixed(1)}°
            </span>
          </span>
          <span className="rounded-full border border-white/10 px-2 py-0.5">
            delay <span className="text-ink">{rowStepPs(scan).toFixed(1)} ps</span>
          </span>
          <span className="rounded-full border border-white/10 px-2 py-0.5">
            az / el{" "}
            <span className="text-ink">
              {formatSigned(beamClock.az)}° / {beamClock.el.toFixed(1)}°
            </span>
          </span>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-4 gap-1 sm:grid-cols-8">
        {words.map((word, row) => (
          <div
            key={row}
            data-phase-row={row}
            className="flex items-center justify-between gap-1 rounded-md border border-white/[0.07] bg-white/[0.02] px-1.5 py-1"
          >
            <span className="font-mono text-[6.5px] uppercase tracking-[0.08em] text-faint">
              R{String(row + 1).padStart(2, "0")}
            </span>
            <span className="font-mono text-[9.5px] tracking-[0.1em] tabular-nums">
              {word.split("").map((bit, index) => (
                <span
                  key={index}
                  className={bit === "1" ? "text-signal" : "text-white/30"}
                >
                  {bit}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-2 font-mono text-[7.5px] uppercase tracking-[0.1em] text-faint">
        {ARRAY_ROWS} rows × {PHASE_BITS}-bit shifters · each word is that row&apos;s quantised phase
      </p>
    </section>
  );
}
