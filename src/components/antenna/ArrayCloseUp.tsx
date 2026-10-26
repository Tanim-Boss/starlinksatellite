import { useMemo, useRef } from "react";
import {
  ARRAY_N,
  ELEMENT_SPACING_M,
  PHASE_LEGEND_STOPS,
  elementPhaseDeg,
  phaseColorCss,
  phaseStepXDeg,
  phaseStepZDeg,
  phaseToDelayPs,
  steeringFromAngles,
} from "@/lib/phasedArray";
import { scrollToSection } from "@/lib/router";
import { useBeamLab } from "./antennaStore";
import { Row, controlBase } from "./labUI";
import { cn } from "@/utils/cn";

const SPACING_MM = ELEMENT_SPACING_M * 1000;

function signed(v: number, digits = 1) {
  const rounded = Math.abs(v) < 0.05 ? 0 : v;
  return `${rounded >= 0 ? "+" : "−"}${Math.abs(rounded).toFixed(digits)}`;
}

function PhaseStrip({
  values,
  highlight,
  label,
  tone,
}: {
  values: number[];
  highlight: number;
  label: string;
  tone: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
        <span>{label}</span>
        <span className={tone}>{signed(values[highlight])}°</span>
      </div>
      <div className="relative mt-1 flex h-9 items-center gap-[2px] rounded-md border border-white/[0.06] bg-white/[0.015] px-1">
        <span className="pointer-events-none absolute inset-x-1 top-1/2 h-px bg-white/10" />
        {values.map((deg, n) => {
          const height = 6 + (Math.abs(deg) / 180) * 84;
          return (
            <span key={n} className="relative h-full flex-1" title={`${deg.toFixed(0)}°`}>
              <span
                className="absolute inset-x-0 rounded-[1px]"
                style={{
                  background: phaseColorCss(deg),
                  height: `${Math.max(2, height)}%`,
                  ...(deg >= 0 ? { bottom: "50%" } : { top: "50%" }),
                  outline: n === highlight ? "1px solid rgba(255,255,255,0.85)" : undefined,
                  outlineOffset: 1,
                }}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * An accessible, top-down close-up of the fixed lattice. Every cell is a
 * button; the roving tab index lets a keyboard user walk the array with the
 * arrow keys. Colours are the commanded phase modulo 360°.
 */
export function ArrayCloseUp() {
  const azDeg = useBeamLab((s) => s.azDeg);
  const elDeg = useBeamLab((s) => s.elDeg);
  const selected = useBeamLab((s) => s.selectedElement);
  const setSelected = useBeamLab((s) => s.setSelectedElement);
  const setCamera = useBeamLab((s) => s.setCamera);
  const gridRef = useRef<HTMLDivElement>(null);

  const steer = steeringFromAngles(azDeg, elDeg);
  const phases = useMemo(
    () =>
      Array.from({ length: ARRAY_N }, (_, j) =>
        Array.from({ length: ARRAY_N }, (_, i) => elementPhaseDeg(i, j, steer)),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [azDeg, elDeg],
  );

  const selectedPhase = phases[selected.j][selected.i];
  const xMm = (selected.i - (ARRAY_N - 1) / 2) * SPACING_MM;
  const zMm = ((ARRAY_N - 1) / 2 - selected.j) * SPACING_MM;
  const stepX = phaseStepXDeg(steer);
  const stepZ = phaseStepZDeg(steer);

  const rowValues = phases[selected.j];
  const colValues = phases.map((row) => row[selected.i]);

  // How many elements it takes the phase ramp to wrap through a full 360°.
  const wrapEvery = (step: number) =>
    Math.abs(step) < 0.05 ? null : Math.max(2, Math.round(360 / Math.abs(step)));
  const eastWrap = wrapEvery(stepX);
  const northWrap = wrapEvery(stepZ);

  const onKeyDown = (e: React.KeyboardEvent) => {
    let { i, j } = selected;
    switch (e.key) {
      case "ArrowLeft":
        i -= 1;
        break;
      case "ArrowRight":
        i += 1;
        break;
      case "ArrowUp":
        j -= 1;
        break;
      case "ArrowDown":
        j += 1;
        break;
      case "Home":
        i = 0;
        break;
      case "End":
        i = ARRAY_N - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    const ci = Math.max(0, Math.min(ARRAY_N - 1, i));
    const cj = Math.max(0, Math.min(ARRAY_N - 1, j));
    setSelected({ i: ci, j: cj });
    requestAnimationFrame(() => {
      gridRef.current
        ?.querySelector<HTMLButtonElement>(`[data-idx="${cj * ARRAY_N + ci}"]`)
        ?.focus();
    });
  };

  const focusScene = () => {
    setCamera("panel");
    scrollToSection("beam-lab-scene");
  };

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3.5 md:px-5">
        <div>
          <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-faint">
            Array close-up · 16 × 16
          </p>
          <h3 className="mt-1 text-[13.5px] font-medium text-white">
            Fixed elements, relative phase
          </h3>
        </div>
        <button type="button" onClick={focusScene} className={controlBase}>
          ↗ 3D panel view
        </button>
      </div>

      <div className="grid gap-5 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] md:p-5">
        <div className="min-w-0">
          <div className="flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.12em] text-faint">
            <span>Top view</span>
            <span>north ↑ · east →</span>
          </div>

          <div className="relative mt-2 rounded-xl border border-white/[0.08] bg-[#030912] p-2">
            <div
              ref={gridRef}
              role="group"
              aria-label="Phased array elements. Use arrow keys to move between elements and Enter to select."
              onKeyDown={onKeyDown}
              className="relative grid aspect-square w-full grid-cols-[repeat(16,minmax(0,1fr))] gap-[2px]"
            >
              {Array.from({ length: ARRAY_N * ARRAY_N }).map((_, idx) => {
                const i = idx % ARRAY_N;
                const j = Math.floor(idx / ARRAY_N);
                const deg = phases[j][i];
                const isSel = selected.i === i && selected.j === j;
                return (
                  <button
                    key={idx}
                    type="button"
                    data-idx={idx}
                    tabIndex={isSel ? 0 : -1}
                    onClick={() => setSelected({ i, j })}
                    aria-label={`Element column ${i + 1}, row ${j + 1}, relative phase ${deg.toFixed(0)} degrees`}
                    aria-pressed={isSel}
                    title={`φ ${deg.toFixed(0)}°`}
                    className={cn(
                      "relative aspect-square rounded-[2px] transition-[filter] hover:brightness-125",
                      isSel && "z-10 outline outline-1 outline-offset-1 outline-white",
                    )}
                    style={{ backgroundColor: phaseColorCss(deg) }}
                  />
                );
              })}

              {/* Crosshair for the selected element, drawn over the lattice. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 w-px bg-white/25"
                style={{ left: `${((selected.i + 0.5) / ARRAY_N) * 100}%` }}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 h-px bg-white/25"
                style={{ top: `${((selected.j + 0.5) / ARRAY_N) * 100}%` }}
              />
            </div>
          </div>

          <div className="mt-3">
            <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-faint">
              Phase legend
            </div>
            <div
              className="mt-1.5 h-2.5 w-full rounded-full border border-white/10"
              style={{ backgroundImage: `linear-gradient(90deg, ${PHASE_LEGEND_STOPS})` }}
            />
            <div className="mt-1 flex justify-between font-mono text-[8px] text-faint">
              <span>−180°</span>
              <span>−90°</span>
              <span>0°</span>
              <span>+90°</span>
              <span>+180°</span>
            </div>
            <p className="mt-1.5 text-[9px] leading-relaxed text-faint">
              Each element&apos;s commanded phase, modulo 360°. Colours repeat because −180° and
              +180° are the same wave offset.
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-white/[0.08] bg-[#050c16] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
                Reading the pattern
              </p>
              <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-signal/80">
                {eastWrap && northWrap ? "two-axis ramp" : "one-axis ramp"}
              </span>
            </div>
            <ul className="mt-2 space-y-1.5 text-[9.5px] leading-relaxed text-muted">
              <li className="flex gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-signal" />
                <span>
                  East–west colours advance {signed(stepX)}° per column
                  {eastWrap ? ` — a full 360° every ${eastWrap} columns` : " — no eastward ramp"}.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-beam" />
                <span>
                  North–south colours advance {signed(stepZ)}° per row
                  {northWrap ? ` — a full 360° every ${northWrap} rows` : " — no northward ramp"}.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-warn" />
                <span>
                  Straight bands of one colour are one wavefront. A steeper ramp tilts them, and
                  tilts the beam with them.
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="min-w-0">
          <div className="rounded-xl border border-white/[0.08] bg-[#050c16] p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
                Selected element
              </p>
              <span className="font-mono text-[9px] text-signal">
                C{String(selected.i + 1).padStart(2, "0")} · R
                {String(selected.j + 1).padStart(2, "0")}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span
                className="h-9 w-9 shrink-0 rounded-md border border-white/25"
                style={{ backgroundColor: phaseColorCss(selectedPhase) }}
              />
              <div>
                <div className="font-mono text-xl leading-none text-white">
                  {signed(selectedPhase)}°
                </div>
                <div className="mt-1 text-[9px] text-faint">
                  relative delay · {signed(phaseToDelayPs(selectedPhase))} ps
                </div>
              </div>
            </div>

            <dl className="mt-3">
              <Row label="Position from centre" value={`x ${signed(xMm)} mm · z ${signed(zMm)} mm`} />
              <Row label="Neighbour Δφ east" value={`${signed(stepX)}°`} />
              <Row label="Neighbour Δφ north" value={`${signed(stepZ)}°`} />
              <Row label="Unit-cell spacing" value={`${SPACING_MM.toFixed(2)} mm`} />
            </dl>
          </div>

          <div className="mt-3 space-y-2.5">
            <PhaseStrip
              label={`Row ${selected.j + 1} · phase across east axis`}
              values={rowValues}
              highlight={selected.i}
              tone="text-signal"
            />
            <PhaseStrip
              label={`Column ${selected.i + 1} · phase across north axis`}
              values={colValues}
              highlight={selected.j}
              tone="text-beam"
            />
          </div>

          <p className="mt-3 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[10px] leading-relaxed text-muted">
            Neighbouring elements differ by a constant phase step across the array. The step depends
            on the steering direction, not on a motor. Every element&apos;s physical position stays
            fixed; only its electrical phase changes.
          </p>
        </div>
      </div>
    </div>
  );
}
