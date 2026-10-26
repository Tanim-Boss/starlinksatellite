import { SATELLITES, compassPoint, satelliteAt, wrap180 } from "@/lib/phasedArray";
import {
  ALIGN_TOLERANCE_DEG,
  antennaClock,
  liveAlignment,
  useBeamLab,
} from "./antennaStore";
import { Row, Switch, controlBase } from "./labUI";
import { cn } from "@/utils/cn";

/* -------------------------------------------------------------------------- */
/* Sky map                                                                    */
/* -------------------------------------------------------------------------- */

const MAP = { left: 24, top: 10, width: 202, height: 96 };
const xFor = (az: number) => MAP.left + ((az + 75) / 150) * MAP.width;
const yFor = (el: number) => MAP.top + ((85 - el) / 70) * MAP.height;

function SkyMap() {
  const selectedSat = useBeamLab((s) => s.selectedSat);
  const azDeg = useBeamLab((s) => s.azDeg);
  const elDeg = useBeamLab((s) => s.elDeg);
  useBeamLab((s) => s.skyTick);

  const sats = SATELLITES.map((def) => satelliteAt(def, antennaClock.skyTime));
  const target = selectedSat ? sats.find((s) => s.id === selectedSat) : null;

  return (
    <svg
      viewBox="0 0 240 130"
      className="w-full"
      role="img"
      aria-label="Sky map of azimuth against elevation, with the beam direction and three satellites"
    >
      <rect x="0" y="0" width="240" height="130" rx="8" fill="#040a13" />
      <rect
        x={MAP.left}
        y={MAP.top}
        width={MAP.width}
        height={MAP.height}
        rx="3"
        fill="#06111d"
        stroke="#1d394e"
        strokeWidth="0.6"
      />

      {[-75, -45, 0, 45, 75].map((az) => (
        <g key={az}>
          <line
            x1={xFor(az)}
            y1={MAP.top}
            x2={xFor(az)}
            y2={MAP.top + MAP.height}
            stroke={az === 0 ? "#244a5f" : "#12283a"}
            strokeWidth="0.6"
            strokeDasharray={az === 0 ? undefined : "2 4"}
          />
          <text
            x={xFor(az)}
            y={MAP.top + MAP.height + 9}
            textAnchor="middle"
            fontSize="5.6"
            fontFamily="JetBrains Mono, monospace"
            fill="#5d7691"
          >
            {az === 0 ? "N" : `${az > 0 ? "+" : ""}${az}°`}
          </text>
        </g>
      ))}
      {[30, 45, 60, 75].map((el) => (
        <g key={el}>
          <line
            x1={MAP.left}
            y1={yFor(el)}
            x2={MAP.left + MAP.width}
            y2={yFor(el)}
            stroke="#12283a"
            strokeWidth="0.6"
            strokeDasharray="2 4"
          />
          <text
            x={MAP.left - 4}
            y={yFor(el) + 2}
            textAnchor="end"
            fontSize="5.6"
            fontFamily="JetBrains Mono, monospace"
            fill="#5d7691"
          >
            {el}°
          </text>
        </g>
      ))}

      {/* Beam direction */}
      <g>
        <line
          x1={xFor(azDeg) - 7}
          y1={yFor(elDeg)}
          x2={xFor(azDeg) + 7}
          y2={yFor(elDeg)}
          stroke="#3ddbd9"
          strokeWidth="0.8"
        />
        <line
          x1={xFor(azDeg)}
          y1={yFor(elDeg) - 7}
          x2={xFor(azDeg)}
          y2={yFor(elDeg) + 7}
          stroke="#3ddbd9"
          strokeWidth="0.8"
        />
        <circle
          cx={xFor(azDeg)}
          cy={yFor(elDeg)}
          r="4.5"
          fill="none"
          stroke="#3ddbd9"
          strokeWidth="0.9"
          opacity="0.9"
        />
      </g>

      {target && (
        <line
          x1={xFor(azDeg)}
          y1={yFor(elDeg)}
          x2={xFor(target.azDeg)}
          y2={yFor(target.elDeg)}
          stroke="#fbbf24"
          strokeWidth="0.8"
          strokeDasharray="2.5 2.5"
          opacity="0.8"
        />
      )}

      {sats.map((sat) => {
        const active = selectedSat === sat.id;
        return (
          <g key={sat.id}>
            {active && (
              <circle
                cx={xFor(sat.azDeg)}
                cy={yFor(sat.elDeg)}
                r="7.5"
                fill="none"
                stroke={sat.color}
                strokeWidth="0.7"
                opacity="0.6"
              />
            )}
            <circle cx={xFor(sat.azDeg)} cy={yFor(sat.elDeg)} r={active ? 3.1 : 2.3} fill={sat.color} />
            <text
              x={xFor(sat.azDeg) + 5}
              y={yFor(sat.elDeg) + 1.8}
              fontSize="5.8"
              fontFamily="JetBrains Mono, monospace"
              fill={active ? sat.color : "#8ea4bd"}
            >
              {sat.name.replace("SAT-", "")}
            </text>
          </g>
        );
      })}

      <g transform="translate(12 10)">
        <circle cx="2" cy="0" r="2" fill="none" stroke="#3ddbd9" strokeWidth="0.8" />
        <text x="7" y="2" fontSize="5.6" fontFamily="JetBrains Mono, monospace" fill="#6f8aa1">
          BEAM
        </text>
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Target panel                                                               */
/* -------------------------------------------------------------------------- */

export function TargetPanel() {
  const selectedSat = useBeamLab((s) => s.selectedSat);
  const tracking = useBeamLab((s) => s.tracking);
  const selectSat = useBeamLab((s) => s.selectSat);
  const setTracking = useBeamLab((s) => s.setTracking);
  const pointAtTarget = useBeamLab((s) => s.pointAtTarget);
  useBeamLab((s) => s.azDeg);
  useBeamLab((s) => s.elDeg);
  useBeamLab((s) => s.skyTick);

  const live = selectedSat ? liveAlignment(selectedSat) : null;
  const aligned = Boolean(live && live.errorDeg <= ALIGN_TOLERANCE_DEG);
  const deltaAz = live ? wrap180(live.sat.azDeg - live.beamAzDeg) : 0;
  const deltaEl = live ? live.sat.elDeg - live.beamElDeg : 0;

  return (
    <div className="bg-[#060b16] p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-faint">
            Moving target
          </p>
          <h3 className="mt-1 text-[13.5px] font-medium text-white">Select a satellite to aim at</h3>
        </div>
        {selectedSat ? (
          <button
            type="button"
            onClick={() => selectSat(null)}
            className="rounded-full border border-white/12 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-faint transition-colors hover:border-white/30 hover:text-white"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.08]">
        <SkyMap />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {SATELLITES.map((def) => {
          const active = selectedSat === def.id;
          const p = satelliteAt(def, antennaClock.skyTime);
          return (
            <button
              key={def.id}
              type="button"
              onClick={() => selectSat(def.id)}
              aria-pressed={active}
              className={cn(
                "flex flex-1 items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors",
                active
                  ? "border-signal/40 bg-signal/[0.08]"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/20",
              )}
            >
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: def.color }} />
                <span className={cn("font-mono text-[10px]", active ? "text-white" : "text-muted")}>
                  {def.name}
                </span>
              </span>
              <span className="font-mono text-[9px] text-faint">{p.elDeg.toFixed(0)}°</span>
            </button>
          );
        })}
      </div>

      {live ? (
        <>
          <div
            className={cn(
              "mt-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-2",
              aligned
                ? "border-signal/45 bg-signal/[0.08]"
                : "border-warn/30 bg-warn/[0.05]",
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  aligned ? "bg-signal" : "bg-warn",
                )}
              />
              <span
                className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.12em]",
                  aligned ? "text-signal" : "text-warn",
                )}
              >
                {aligned ? "Beam aligned" : "Off target"}
              </span>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-ink">
              {live.errorDeg.toFixed(1)}° error
            </span>
          </div>

          <div className="mt-2">
            <div className="flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
              <span>Alignment</span>
              <span>tolerance {ALIGN_TOLERANCE_DEG}°</span>
            </div>
            <div className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="absolute inset-y-0 left-0 w-[8.3%] bg-signal/35" />
              <span
                className={cn(
                  "absolute top-1/2 h-2.5 w-px -translate-y-1/2",
                  aligned ? "bg-signal" : "bg-warn",
                )}
                style={{ left: `${Math.min(100, (live.errorDeg / 30) * 100)}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[8px] text-faint">
              <span>0°</span>
              <span>15°</span>
              <span>30°+</span>
            </div>
          </div>

          <dl className="mt-2.5">
            <Row label="Target" value={`${live.sat.name} · ${live.sat.altitudeKm} km`} />
            <Row label="Apparent azimuth" value={`${live.sat.azDeg.toFixed(1)}° ${compassPoint(live.sat.azDeg)}`} />
            <Row label="Apparent elevation" value={`${live.sat.elDeg.toFixed(1)}°`} tone="text-signal" />
            <Row label="Slant range" value={`${live.sat.rangeKm.toFixed(0)} km`} />
            <Row label="One-way light time" value={`${live.sat.lightTimeMs.toFixed(2)} ms`} />
            <Row
              label="Steering hint"
              value={
                aligned
                  ? "on target"
                  : `AZ ${deltaAz >= 0 ? "+" : "−"}${Math.abs(deltaAz).toFixed(1)}° · EL ${
                      deltaEl >= 0 ? "+" : "−"
                    }${Math.abs(deltaEl).toFixed(1)}°`
              }
              tone={aligned ? "text-signal" : "text-warn"}
            />
          </dl>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">
            <div className="min-w-0">
              <p className="text-[10.5px] font-medium text-ink">Auto-track selected satellite</p>
              <p className="mt-0.5 text-[9px] leading-relaxed text-faint">
                Recomputes the phase ramp as it moves. The panel stays fixed.
              </p>
            </div>
            <Switch
              checked={tracking}
              onChange={setTracking}
              label="Auto-track the selected satellite"
            />
          </div>

          <button
            type="button"
            onClick={pointAtTarget}
            className={cn(controlBase, "mt-2 w-full")}
          >
            Point the beam at {live.sat.name} now
          </button>

          <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
            Apparent tracks are illustrative · motion time-compressed
          </p>
        </>
      ) : (
        <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <p className="text-[10.5px] leading-relaxed text-muted">
            Pick SAT-A, SAT-B or SAT-C. The amber dashed line in the scene is the true line of
            sight; the cyan cone is your beam. Steer with the sliders until they coincide.
          </p>
        </div>
      )}

      <ol className="mt-3 space-y-1.5">
        {[
          "Each satellite follows its own closed apparent track on the shared sky clock.",
          "Selecting one draws the line of sight and the live azimuth, elevation and range.",
          "Auto-track re-solves the phase ramp — the panel itself never moves.",
        ].map((line, n) => (
          <li key={n} className="flex gap-2 text-[9.5px] leading-relaxed text-faint">
            <span className="mt-0.5 font-mono text-[8px] text-signal/70">{`0${n + 1}`}</span>
            <span>{line}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Small overlay chip for the 3D scene. */
export function SceneAlignmentChip() {
  const selectedSat = useBeamLab((s) => s.selectedSat);
  const tracking = useBeamLab((s) => s.tracking);
  useBeamLab((s) => s.azDeg);
  useBeamLab((s) => s.elDeg);
  useBeamLab((s) => s.skyTick);

  if (!selectedSat) {
    return (
      <div className="rounded-full border border-white/12 bg-[#040a14]/85 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-faint backdrop-blur">
        No target selected
      </div>
    );
  }

  const live = liveAlignment(selectedSat);
  const aligned = live.errorDeg <= ALIGN_TOLERANCE_DEG;
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.1em] backdrop-blur",
        aligned
          ? "border-signal/50 bg-signal/15 text-signal"
          : "border-warn/35 bg-[#120d04]/85 text-warn",
      )}
    >
      <span className={cn("h-1 w-1 rounded-full", aligned ? "bg-signal" : "bg-warn")} />
      {aligned ? "Beam aligned" : `Off target ${live.errorDeg.toFixed(0)}°`}
      {tracking && <span className="text-signal/70">· auto</span>}
    </div>
  );
}

