import { useMemo } from "react";
import { satLookAngles, type SkyState } from "@/lib/constellation";
import { ELEVATION_MASK_DEG } from "@/lib/handover";

/**
 * A "look up" chart: the whole sky above the dish, flattened.
 *
 * Centre = straight up (90°), edge = the horizon (0°), north at the top. Every
 * satellite above the horizon is plotted at its true azimuth and elevation, so
 * the field of dots drifting across the disc is the actual constellation moving,
 * not a decoration. The thick line is the beam; the dashed ring is the 25°
 * elevation mask below which the terminal will not hold a link.
 */

const SIZE = 200;
const C = SIZE / 2;
const R = 86;

interface SkyPoint {
  x: number;
  y: number;
}

function project(elDeg: number, azDeg: number): SkyPoint {
  const r = ((90 - Math.max(0, elDeg)) / 90) * R;
  const az = (azDeg * Math.PI) / 180;
  return { x: C + r * Math.sin(az), y: C - r * Math.cos(az) };
}

/** A pass arc for one satellite: where it came from and where it is going. */
function passArc(id: number, tSec: number, spanSec = 70, stepSec = 5) {
  const pts: [number, number][] = [];
  for (let dt = -spanSec; dt <= spanSec; dt += stepSec) {
    const { elDeg, azDeg } = satLookAngles(id, tSec + dt);
    if (elDeg <= 0.5) continue;
    const p = project(elDeg, azDeg);
    pts.push([p.x, p.y]);
  }
  return pts;
}

function arcPath(pts: [number, number][]) {
  if (pts.length < 2) return "";
  return pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

export function SkyRadar({ state }: { state: SkyState }) {
  const servingId = state.serving?.id ?? -1;
  const candidateId = state.candidate?.id ?? -1;

  const arcs = useMemo(
    () => ({
      serving: servingId >= 0 ? passArc(servingId, state.timeSec) : [],
      candidate: candidateId >= 0 && candidateId !== servingId ? passArc(candidateId, state.timeSec) : [],
    }),
    [servingId, candidateId, state.timeSec],
  );

  const servingPoint = state.serving ? project(state.serving.elDeg, state.serving.azDeg) : null;
  const candidatePoint = state.candidate ? project(state.candidate.elDeg, state.candidate.azDeg) : null;
  const transferFrom =
    state.phase === "transfer" && state.currentEvent
      ? state.sats.find((s) => s.id === state.currentEvent!.to) ?? null
      : null;
  const transferPoint = transferFrom ? project(transferFrom.elDeg, transferFrom.azDeg) : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-auto w-full" role="img" aria-label="Sky map: satellites above the dish">
        <defs>
          <radialGradient id="sky-disc" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0a1a26" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#04080f" stopOpacity="0.95" />
          </radialGradient>
        </defs>

        <circle cx={C} cy={C} r={R} fill="url(#sky-disc)" stroke="#ffffff" strokeOpacity="0.09" />

        {/* Elevation rings */}
        {[30, 60].map((el) => (
          <circle
            key={el}
            cx={C}
            cy={C}
            r={((90 - el) / 90) * R}
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.07"
            strokeDasharray="2 4"
          />
        ))}
        {/* 25° elevation mask */}
        <circle
          cx={C}
          cy={C}
          r={((90 - ELEVATION_MASK_DEG) / 90) * R}
          fill="none"
          stroke="#f87171"
          strokeOpacity="0.45"
          strokeDasharray="4 3"
        />
        <circle cx={C} cy={C} r={R} fill="none" stroke="#3ddbd9" strokeOpacity="0.14" />

        {/* Cross hairs */}
        <line x1={C} y1={C - R} x2={C} y2={C + R} stroke="#ffffff" strokeOpacity="0.05" />
        <line x1={C - R} y1={C} x2={C + R} y2={C} stroke="#ffffff" strokeOpacity="0.05" />

        {["N", "E", "S", "W"].map((d, i) => {
          const a = (i * Math.PI) / 2;
          return (
            <text
              key={d}
              x={C + (R + 9) * Math.sin(a)}
              y={C - (R + 9) * Math.cos(a) + 3}
              textAnchor="middle"
              className="fill-[#7f93ad] font-mono"
              style={{ fontSize: 8, letterSpacing: "0.1em" }}
            >
              {d}
            </text>
          );
        })}

        {/* Pass arcs */}
        <path d={arcPath(arcs.candidate)} fill="none" stroke="#fbbf24" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 3" />
        <path d={arcPath(arcs.serving)} fill="none" stroke="#3ddbd9" strokeOpacity="0.5" strokeWidth="1.2" />

        {/* Every satellite above the horizon */}
        {state.sats.map((sat) => {
          const p = project(sat.elDeg, sat.azDeg);
          if (sat.role === "serving") return null;
          const isCandidate = sat.role === "candidate";
          const masked = !sat.visible;
          return (
            <circle
              key={sat.id}
              cx={p.x}
              cy={p.y}
              r={isCandidate ? 2.8 : masked ? 1.1 : 1.7}
              fill={isCandidate ? "#fbbf24" : masked ? "#5b6b85" : "#cfe3f7"}
              fillOpacity={masked ? 0.55 : 0.9}
            />
          );
        })}

        {/* The beam */}
        {servingPoint && (
          <line
            x1={C}
            y1={C}
            x2={servingPoint.x}
            y2={servingPoint.y}
            stroke="#3ddbd9"
            strokeOpacity={state.phase === "transfer" ? 0.35 : 0.8}
            strokeWidth="1.4"
          />
        )}
        {candidatePoint && state.phase !== "tracking" && (
          <line
            x1={C}
            y1={C}
            x2={candidatePoint.x}
            y2={candidatePoint.y}
            stroke="#fbbf24"
            strokeOpacity={state.phase === "preparing" ? 0.55 : 0.25}
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {/* Serving satellite */}
        {servingPoint && (
          <>
            <circle cx={servingPoint.x} cy={servingPoint.y} r={7} fill="#3ddbd9" fillOpacity={0.16} />
            <circle cx={servingPoint.x} cy={servingPoint.y} r={3.2} fill="#3ddbd9" />
          </>
        )}
        {transferPoint && <circle cx={transferPoint.x} cy={transferPoint.y} r={2.6} fill="#fbbf24" fillOpacity={0.7} />}

        {/* Dish at the centre */}
        <circle cx={C} cy={C} r={3.4} fill="#04121a" stroke="#3ddbd9" strokeWidth="1.2" />
        <circle cx={C} cy={C} r={1.1} fill="#3ddbd9" />
      </svg>

      <span className="pointer-events-none absolute left-1 top-1 font-mono text-[7.5px] uppercase tracking-[0.12em] text-faint">
        zenith
      </span>
      <span className="pointer-events-none absolute bottom-1 right-1 font-mono text-[7.5px] uppercase tracking-[0.1em] text-[#f87171]/70">
        25° mask
      </span>
    </div>
  );
}
