import { useMemo } from "react";
import {
  APERTURE_M,
  IDEAL_DIRECTIVITY_DBI,
  UNIFORM_SIDELOBE_DB,
  arrayCutMetrics,
  compassPoint,
  elevationCut,
  satelliteAt,
  satelliteById,
  steeringFromAngles,
  wrap180,
} from "@/lib/phasedArray";
import { antennaClock, useBeamLab } from "./antennaStore";
import { Row } from "./labUI";

const W = 324;
const H = 172;
const PAD = { left: 34, right: 10, top: 12, bottom: 28 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const SAMPLES = 145;

const xFor = (el: number) => PAD.left + (el / 90) * PLOT_W;
const yFor = (db: number) => PAD.top + (Math.max(-40, Math.min(0, db)) / -40) * PLOT_H;

function signed(v: number, digits = 1) {
  return `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(digits)}`;
}

/**
 * A live elevation cut of the array factor along the current beam azimuth.
 * This is the standard antenna-pattern view: the main lobe at 0 dB, side lobes
 * near −13 dB for uniform illumination, and nulls between them.
 */
export function RadiationCut() {
  const azDeg = useBeamLab((s) => s.azDeg);
  const elDeg = useBeamLab((s) => s.elDeg);
  const selectedSat = useBeamLab((s) => s.selectedSat);
  useBeamLab((s) => s.skyTick);

  const steer = steeringFromAngles(azDeg, elDeg);
  const cut = useMemo(() => elevationCut(steer, SAMPLES), [azDeg, elDeg]);
  const metrics = useMemo(() => arrayCutMetrics(steer), [azDeg, elDeg]);
  const nullMarkers = [metrics.nullLowerEl, metrics.nullUpperEl].filter(
    (el): el is number => el !== null && el > 0 && el < 90,
  );
  const sideValues = [metrics.sideLowerDb, metrics.sideUpperDb].filter(
    (v): v is number => v !== null,
  );
  const strongestSide = sideValues.length ? Math.max(...sideValues) : null;
  const strongestSideEl =
    metrics.sideUpperDb !== null &&
    (metrics.sideLowerDb === null || metrics.sideUpperDb >= metrics.sideLowerDb)
      ? metrics.sideUpperEl
      : metrics.sideLowerEl;

  const sat = selectedSat ? satelliteAt(satelliteById(selectedSat), antennaClock.skyTime) : null;
  const satAzDelta = sat ? wrap180(sat.azDeg - azDeg) : 0;
  const satInCut = Boolean(sat && Math.abs(satAzDelta) <= 5);
  const satCutIndex = sat
    ? Math.max(0, Math.min(SAMPLES - 1, Math.round((sat.elDeg / 90) * (SAMPLES - 1))))
    : 0;
  const satDb = satInCut ? cut[satCutIndex].db : 0;

  const path = cut
    .map((p, n) => `${n === 0 ? "M" : "L"}${xFor(p.elDeg).toFixed(2)},${yFor(p.db).toFixed(2)}`)
    .join(" ");

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3.5 md:px-5">
        <div>
          <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-faint">
            Radiation pattern · elevation cut
          </p>
          <h3 className="mt-1 text-[13.5px] font-medium text-white">Main lobe, side lobes, nulls</h3>
        </div>
        <span className="rounded-full border border-white/10 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
          φ = {signed(azDeg)}° {compassPoint(azDeg)}
        </span>
      </div>

      <div className="p-4 md:p-5">
        <div>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            role="img"
            aria-label={`Elevation cut of the array factor at azimuth ${azDeg.toFixed(1)} degrees, beam elevation ${elDeg.toFixed(1)} degrees`}
          >
            <rect
              x={PAD.left}
              y={PAD.top}
              width={PLOT_W}
              height={PLOT_H}
              rx="3"
              fill="#040b14"
              stroke="#173247"
              strokeWidth="0.6"
            />

            {/* dB grid */}
            {[0, -10, -20, -30, -40].map((db) => (
              <g key={db}>
                <line
                  x1={PAD.left}
                  y1={yFor(db)}
                  x2={PAD.left + PLOT_W}
                  y2={yFor(db)}
                  stroke={db === 0 ? "#23465a" : "#112434"}
                  strokeWidth="0.6"
                  strokeDasharray={db === 0 ? undefined : "2 4"}
                />
                <text
                  x={PAD.left - 5}
                  y={yFor(db) + 2}
                  textAnchor="end"
                  fontSize="5.8"
                  fontFamily="JetBrains Mono, monospace"
                  fill="#5d7691"
                >
                  {db}
                </text>
              </g>
            ))}
            <text
              x={PAD.left - 5}
              y={PAD.top - 4}
              textAnchor="end"
              fontSize="5.8"
              fontFamily="JetBrains Mono, monospace"
              fill="#5d7691"
            >
              dB
            </text>

            {/* Elevation grid */}
            {[0, 15, 30, 45, 60, 75, 90].map((el) => (
              <g key={el}>
                <line
                  x1={xFor(el)}
                  y1={PAD.top}
                  x2={xFor(el)}
                  y2={PAD.top + PLOT_H}
                  stroke="#112434"
                  strokeWidth="0.6"
                  strokeDasharray="2 4"
                />
                <text
                  x={xFor(el)}
                  y={PAD.top + PLOT_H + 9}
                  textAnchor="middle"
                  fontSize="5.8"
                  fontFamily="JetBrains Mono, monospace"
                  fill="#5d7691"
                >
                  {el}°
                </text>
              </g>
            ))}
            <text
              x={PAD.left + PLOT_W}
              y={H - 5}
              textAnchor="end"
              fontSize="5.6"
              fontFamily="JetBrains Mono, monospace"
              fill="#4c637a"
            >
              ELEVATION
            </text>

            {/* Side-lobe reference */}
            <line
              x1={PAD.left}
              y1={yFor(UNIFORM_SIDELOBE_DB)}
              x2={PAD.left + PLOT_W}
              y2={yFor(UNIFORM_SIDELOBE_DB)}
              stroke="#fbbf24"
              strokeWidth="0.6"
              strokeDasharray="3 3"
              opacity="0.55"
            />
            <text
              x={PAD.left + 4}
              y={yFor(UNIFORM_SIDELOBE_DB) - 2.5}
              fontSize="5.4"
              fontFamily="JetBrains Mono, monospace"
              fill="#d9a63c"
            >
              uniform side lobe −13.2 dB
            </text>

            {/* Nulls */}
            {nullMarkers.map((el, n) => (
              <g key={`null-${n}`}>
                <line
                  x1={xFor(el)}
                  y1={PAD.top}
                  x2={xFor(el)}
                  y2={PAD.top + PLOT_H}
                  stroke="#f87171"
                  strokeWidth="0.65"
                  strokeDasharray="2 3"
                  opacity="0.6"
                />
                <text
                  x={xFor(el)}
                  y={PAD.top + PLOT_H - 3}
                  textAnchor="middle"
                  fontSize="5.2"
                  fontFamily="JetBrains Mono, monospace"
                  fill="#c77b7b"
                  stroke="#040b14"
                  strokeWidth="1.4"
                  paintOrder="stroke"
                >
                  null {el.toFixed(0)}°
                </text>
              </g>
            ))}

            {/* Beam azimuth / peak */}
            <line
              x1={xFor(elDeg)}
              y1={PAD.top}
              x2={xFor(elDeg)}
              y2={PAD.top + PLOT_H}
              stroke="#3ddbd9"
              strokeWidth="0.6"
              opacity="0.35"
            />

            {/* Pattern */}
            <path d={path} fill="none" stroke="#3ddbd9" strokeWidth="1.5" strokeLinejoin="round" />
            <circle cx={xFor(elDeg)} cy={yFor(0)} r="2.4" fill="#c9fffb" />
            <text
              x={Math.min(PAD.left + PLOT_W - 6, xFor(elDeg) + 5)}
              y={PAD.top + 9}
              textAnchor={xFor(elDeg) > PAD.left + PLOT_W - 50 ? "end" : "start"}
              fontSize="5.8"
              fontFamily="JetBrains Mono, monospace"
              fill="#8ff5ef"
              stroke="#040b14"
              strokeWidth="1.6"
              paintOrder="stroke"
            >
              main lobe
            </text>

            {/* Target marker, when it shares this cut */}
            {sat && satInCut && (
              <g>
                <circle
                  cx={xFor(sat.elDeg)}
                  cy={yFor(satDb)}
                  r="2.2"
                  fill="#fbbf24"
                  stroke="#120d04"
                  strokeWidth="0.6"
                />
                <text
                  x={xFor(sat.elDeg)}
                  y={Math.max(PAD.top + 6, yFor(satDb) - 5)}
                  textAnchor="middle"
                  fontSize="5.4"
                  fontFamily="JetBrains Mono, monospace"
                  fill="#fbbf24"
                >
                  {sat.name}
                </text>
              </g>
            )}
          </svg>
        </div>

        {sat && !satInCut && (
          <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.08em] text-faint">
            {sat.name} is {Math.abs(satAzDelta).toFixed(0)}° off this cut — the pattern narrows to
            its main lobe only in the beam&apos;s azimuth plane.
          </p>
        )}

        <dl className="mt-3">
          <Row label="Visible half-power width" value={`${metrics.hpbwDeg.toFixed(1)}°`} />
          <Row
            label="First nulls"
            value={
              metrics.nullLowerEl === null && metrics.nullUpperEl === null
                ? "outside 0–90°"
                : `${metrics.nullLowerEl === null ? "—" : `${metrics.nullLowerEl.toFixed(1)}°`} / ${
                    metrics.nullUpperEl === null ? "—" : `${metrics.nullUpperEl.toFixed(1)}°`
                  }`
            }
          />
          <Row
            label="First side lobe (this cut)"
            value={
              strongestSide === null
                ? "outside 0–90°"
                : `${strongestSide.toFixed(1)} dB${
                    strongestSideEl === null ? "" : ` @ ${strongestSideEl.toFixed(0)}°`
                  }`
            }
          />
          <Row label="Uniform 1-D theory" value={`${UNIFORM_SIDELOBE_DB} dB`} />
          <Row label="Ideal directivity" value={`≈${IDEAL_DIRECTIVITY_DBI.toFixed(1)} dBi`} />
          <Row label="Uniform aperture" value={`${(APERTURE_M * 1000).toFixed(0)} mm · 8λ`} />
        </dl>

        <p className="mt-2.5 text-[9.5px] leading-relaxed text-faint">
          Array factor only: uniform illumination, ideal isotropic elements, no taper, losses or
          element pattern. Real terminals use weighting and different hardware, so their side lobes
          and beamwidths differ.
        </p>
      </div>
    </div>
  );
}
