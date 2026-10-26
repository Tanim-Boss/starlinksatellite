import { useMemo } from "react";
import {
  APERTURE_M,
  ARRAY_N,
  CARRIER_FREQ_HZ,
  ELEMENT_SPACING_M,
  IDEAL_DIRECTIVITY_DBI,
  WAVELENGTH_M,
  arrayCutMetrics,
  arrayFactorDb,
  compassPoint,
  phaseStepXDeg,
  phaseStepZDeg,
  phaseToDelayPs,
  steeringFromAngles,
} from "@/lib/phasedArray";
import { ASSUMPTIONS, COMPARISON, CONCEPTS, HONESTY } from "@/lib/antennaContent";
import { ALIGN_TOLERANCE_DEG, liveAlignment, useBeamLab } from "./antennaStore";
import { Row } from "./labUI";
import { Pill, SectionHeading } from "@/components/site/primitives";
import { Link } from "@/lib/router";

function signed(v: number, digits = 1) {
  const rounded = Math.abs(v) < 0.05 ? 0 : v;
  return `${rounded >= 0 ? "+" : "−"}${Math.abs(rounded).toFixed(digits)}`;
}

export function SciencePanel() {
  const azDeg = useBeamLab((s) => s.azDeg);
  const elDeg = useBeamLab((s) => s.elDeg);
  const selectedSat = useBeamLab((s) => s.selectedSat);
  const tracking = useBeamLab((s) => s.tracking);
  useBeamLab((s) => s.skyTick);

  const steer = steeringFromAngles(azDeg, elDeg);
  const metrics = useMemo(() => arrayCutMetrics(steer), [azDeg, elDeg]);
  const stepX = phaseStepXDeg(steer);
  const stepZ = phaseStepZDeg(steer);
  const delayX = phaseToDelayPs(stepX);
  const delayZ = phaseToDelayPs(stepZ);
  const onAxisDb = arrayFactorDb(azDeg, elDeg, steer);
  const nullDb =
    metrics.nullLowerEl !== null || metrics.nullUpperEl !== null
      ? Math.max(
          metrics.nullLowerEl !== null ? metrics.nullLowerDb : -120,
          metrics.nullUpperEl !== null ? metrics.nullUpperDb : -120,
        )
      : null;
  const sideValues = [metrics.sideLowerDb, metrics.sideUpperDb].filter(
    (v): v is number => v !== null,
  );
  const sideDb = sideValues.length ? Math.max(...sideValues) : null;
  const live = selectedSat ? liveAlignment(selectedSat) : null;
  const aligned = Boolean(live && live.errorDeg <= ALIGN_TOLERANCE_DEG);

  return (
    <section id="science" className="relative scroll-mt-24 border-t border-white/[0.06] py-16 md:py-20">
      <div className="page-shell">
        <SectionHeading
          eyebrow="The physics, plainly"
          title="Why the beam moves without moving."
          lede="Electronic beam steering is an interference effect. These panels explain what the simulation is doing, with live numbers from the model you just steered."
        />

        <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {CONCEPTS.map((concept) => (
            <article
              key={concept.id}
              className="flex h-full flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-signal/80">{concept.number}</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>
              <h3 className="mt-2 text-[13.5px] font-medium text-white">{concept.title}</h3>
              <p className="mt-2 text-[12px] leading-[1.75] text-muted">{concept.body}</p>

              {concept.live && (
                <div className="mt-auto pt-3">
                  <div className="rounded-lg border border-signal/15 bg-signal/[0.04] px-2.5 py-2 font-mono text-[9px] leading-relaxed text-signal/85">
                    {concept.live === "phase" && (
                      <>
                        LIVE · Δφ east {signed(stepX)}° ({signed(delayX)} ps delay) · north{" "}
                        {signed(stepZ)}° ({signed(delayZ)} ps delay)
                      </>
                    )}
                    {concept.live === "interference" && (
                      <>
                        LIVE · on-axis {onAxisDb.toFixed(1)} dB · first null{" "}
                        {nullDb === null ? "outside cut" : `${nullDb.toFixed(0)} dB`} · side lobe{" "}
                        {sideDb === null ? "outside cut" : `${sideDb.toFixed(1)} dB`}
                      </>
                    )}
                    {concept.live === "direction" && (
                      <>
                        LIVE · AZ {signed(azDeg)}° {compassPoint(azDeg)} · EL{" "}
                        {elDeg.toFixed(1)}° · scan {Math.abs(90 - elDeg).toFixed(1)}° from zenith
                      </>
                    )}
                    {concept.live === "tracking" && (
                      <>
                        {selectedSat
                          ? `LIVE · ${selectedSat} · error ${live?.errorDeg.toFixed(1)}° · ${
                              tracking ? "auto-track on" : aligned ? "aligned" : "manual aim"
                            }`
                          : "LIVE · no satellite selected — each track moves independently of the beam"}
                      </>
                    )}
                  </div>
                </div>
              )}
            </article>
          ))}

          <article className="flex h-full flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] text-signal/80">08</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <h3 className="mt-2 text-[13.5px] font-medium text-white">The model on one line</h3>
            <div className="mt-2 space-y-2 font-mono text-[10px] leading-relaxed text-muted">
              <p>φ(i,j) = −2π (d/λ) [i ux + j uz]</p>
              <p>ψx = 2π (d/λ) (ux − ux steer)</p>
              <p>AF = |sin(Nψx/2) / (N sin(ψx/2)) × sin(Nψz/2) / (N sin(ψz/2))|</p>
              <p className="text-faint">
                with d = λ/2, N = {ARRAY_N}, ux = cos(el)·sin(az), uz = cos(el)·cos(az).
              </p>
            </div>
            <dl className="mt-3">
              <Row label="Carrier" value={`${(CARRIER_FREQ_HZ / 1e9).toFixed(0)} GHz`} />
              <Row label="Wavelength" value={`${(WAVELENGTH_M * 1000).toFixed(2)} mm`} />
              <Row
                label="Spacing"
                value={`${(ELEMENT_SPACING_M * 1000).toFixed(2)} mm · λ/2`}
              />
              <Row label="Aperture" value={`${(APERTURE_M * 1000).toFixed(0)} mm`} />
              <Row label="Ideal directivity" value={`≈${IDEAL_DIRECTIVITY_DBI.toFixed(1)} dBi`} />
            </dl>
          </article>
        </div>

        {/* Mechanical vs electronic ------------------------------------------ */}
        <div className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <Pill tone="slate">Comparison</Pill>
              <h3 className="mt-3 text-[clamp(1.4rem,2.8vw,2rem)] font-semibold tracking-[-0.02em] text-white">
                Mechanical steering vs electronic steering
              </h3>
            </div>
            <p className="max-w-md text-[12px] leading-relaxed text-muted">
              Both can point a beam. Only one of them has to move the antenna. The table compares the
              mechanisms, not any particular product.
            </p>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08]">
            <div className="hidden grid-cols-[1.1fr_1.1fr_1.1fr] bg-white/[0.03] px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-faint md:grid">
              <span>Aspect</span>
              <span className="text-warn/90">Mechanical steering</span>
              <span className="text-signal">Electronic beam steering</span>
            </div>
            {COMPARISON.map((row, n) => (
              <div
                key={row.aspect}
                className={`grid gap-2 px-4 py-3 md:grid-cols-[1.1fr_1.1fr_1.1fr] md:items-start ${
                  n % 2 ? "bg-white/[0.015]" : ""
                } border-t border-white/[0.06]`}
              >
                <div className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-faint">
                  {row.aspect}
                </div>
                <div>
                  <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-warn/80 md:hidden">
                    Mechanical
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted md:mt-0">
                    {row.mechanical}
                  </p>
                </div>
                <div>
                  <div className="font-mono text-[8px] uppercase tracking-[0.1em] text-signal/80 md:hidden">
                    Electronic
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink/90 md:mt-0">
                    {row.electronic}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-faint">
            Electronic steering is not unlimited: the usable scan range depends on element spacing,
            the element pattern, grating lobes, calibration and hardware. The ±75° and 15°–85° limits
            in this lab are interface choices, not published Starlink specifications.
          </p>
        </div>

        {/* Assumptions ------------------------------------------------------- */}
        <div id="assumptions" className="mt-12 scroll-mt-24">
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <Pill tone="amber">Assumptions &amp; limits</Pill>
              <h3 className="mt-3 text-[clamp(1.4rem,2.8vw,2rem)] font-semibold tracking-[-0.02em] text-white">
                What this simulation is — and is not
              </h3>
              <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
                A teaching model is only honest if its shortcuts are visible. These are the ones that
                matter for interpreting the scene.
              </p>
              <div className="mt-4 space-y-2">
                {HONESTY.map((h) => (
                  <div
                    key={h.title}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3"
                  >
                    <h4 className="text-[11.5px] font-medium text-ink">{h.title}</h4>
                    <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{h.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <ol className="space-y-2">
              {ASSUMPTIONS.map((a, n) => (
                <li
                  key={n}
                  className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.015] px-3 py-2.5"
                >
                  <span className="mt-0.5 font-mono text-[9px] text-warn/70">
                    {String(n + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[11px] leading-relaxed text-muted">{a}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-warn/20 bg-warn/[0.04] px-4 py-3">
            <p className="text-[11px] leading-relaxed text-muted">
              This page is an educational simulator. It is <span className="text-ink">not</span> a
              live Starlink control system, not telemetry, and not proprietary firmware or an exact
              hardware specification.
            </p>
            <Link
              to="/antenna"
              section="lab"
              className="ml-auto font-mono text-[9px] uppercase tracking-[0.12em] text-warn hover:text-white"
            >
              Back to the array ↑
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
