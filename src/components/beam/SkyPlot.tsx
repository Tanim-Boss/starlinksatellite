import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import {
  SATELLITES,
  beamwidthDeg,
  formatSigned,
  satelliteAt,
  scanAngleFromElevation,
} from "@/lib/dishBeam";
import { cn } from "@/utils/cn";
import { beamClock, useBeamLab } from "./beamStore";

/**
 * A polar sky plot: the view from under the dish looking straight up.
 *
 * It doubles as the manual steering control — drag anywhere in the disc — and
 * keeps working when WebGL does not, so the core interaction is never locked
 * behind a graphics context.
 */

const SIZE = 320;
const CX = SIZE / 2;
const CY = SIZE / 2 + 2;
const R = SIZE / 2 - 34;

function project(az: number, el: number): [number, number] {
  const radius = R * (1 - Math.max(0, Math.min(90, el)) / 90);
  const angle = (az * Math.PI) / 180;
  return [CX + radius * Math.sin(angle), CY - radius * Math.cos(angle)];
}

const CARDINALS = [
  { label: "N", az: 0 },
  { label: "E", az: 90 },
  { label: "S", az: 180 },
  { label: "W", az: -90 },
];

export function SkyPlot() {
  useBeamLab((s) => s.uiTick);
  const mode = useBeamLab((s) => s.mode);
  const targetId = useBeamLab((s) => s.targetId);
  const aimAt = useBeamLab((s) => s.aimAt);
  const dragging = useRef(false);

  const [bx, by] = project(beamClock.az, beamClock.el);
  const scan = scanAngleFromElevation(beamClock.el);
  const footprint = Math.max(5, (beamwidthDeg(scan) / 90) * R);

  const steer = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((event.clientX - rect.left) / rect.width) * SIZE;
    const y = ((event.clientY - rect.top) / rect.height) * SIZE;
    const dx = x - CX;
    const dy = y - CY;
    const radius = Math.min(R, Math.hypot(dx, dy));
    const el = 90 * (1 - radius / R);
    const az = (Math.atan2(dx, -dy) * 180) / Math.PI;
    aimAt(az, Math.max(6, Math.min(85, el)));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 2;
    const az = mode === "aim" ? useBeamLab.getState().aimAz : beamClock.az;
    const el = mode === "aim" ? useBeamLab.getState().aimEl : beamClock.el;
    if (event.key === "ArrowLeft") aimAt(az - step, el);
    else if (event.key === "ArrowRight") aimAt(az + step, el);
    else if (event.key === "ArrowUp") aimAt(az, el + step);
    else if (event.key === "ArrowDown") aimAt(az, el - step);
    else return;
    event.preventDefault();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">Sky plot</h3>
        <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
          looking up · centre = zenith
        </span>
      </div>

      <div
        role="application"
        aria-label="Sky plot — drag, or use the arrow keys, to aim the beam"
        tabIndex={0}
        onKeyDown={onKeyDown}
        className={cn(
          "mt-2 flex flex-1 items-center justify-center rounded-xl border border-white/[0.07] bg-[#040a14] p-1.5",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal",
        )}
      >
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="aspect-square w-full max-w-[330px] cursor-crosshair touch-none select-none"
          aria-hidden
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragging.current = true;
            steer(event);
          }}
          onPointerMove={(event) => {
            if (dragging.current) steer(event);
          }}
          onPointerUp={(event) => {
            dragging.current = false;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            dragging.current = false;
          }}
        >
          <defs>
            <radialGradient id="sky-disc" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0b1c33" />
              <stop offset="72%" stopColor="#071223" />
              <stop offset="100%" stopColor="#050b16" />
            </radialGradient>
          </defs>

          <circle cx={CX} cy={CY} r={R} fill="url(#sky-disc)" stroke="#233b5c" strokeWidth="1" />

          {/* Elevation rings, 30° and 60°. */}
          {[30, 60].map((el) => (
            <circle
              key={el}
              cx={CX}
              cy={CY}
              r={R * (1 - el / 90)}
              fill="none"
              stroke="#1b2f4c"
              strokeWidth="0.8"
              strokeDasharray="2 3"
            />
          ))}
          <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke="#162741" strokeWidth="0.7" />
          <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} stroke="#162741" strokeWidth="0.7" />

          {CARDINALS.map((c) => {
            const [x, y] = project(c.az, 0);
            const inward = 13;
            const lx = CX + (x - CX) * (1 - inward / R);
            const ly = CY + (y - CY) * (1 - inward / R);
            return (
              <text
                key={c.label}
                x={lx}
                y={ly + 3}
                textAnchor="middle"
                fill="#5c7695"
                fontSize="9"
                fontFamily="var(--font-mono)"
                letterSpacing="1"
              >
                {c.label}
              </text>
            );
          })}

          {[30, 60].map((el) => (
            <text
              key={`ring-${el}`}
              x={CX + 4}
              y={CY - R * (1 - el / 90) + 10}
              fill="#3d5674"
              fontSize="6.5"
              fontFamily="var(--font-mono)"
            >
              {el}°
            </text>
          ))}

          {/* Satellites */}
          {SATELLITES.map((def) => {
            const { az, el } = satelliteAt(def, beamClock.t);
            const [x, y] = project(az, el);
            const selected = def.id === targetId;
            return (
              <g key={def.id}>
                <circle cx={x} cy={y} r={7} fill={def.color} fillOpacity={selected ? 0.22 : 0.1} />
                <circle
                  cx={x}
                  cy={y}
                  r={3.1}
                  fill={def.color}
                  stroke={selected ? "#ffffff" : "none"}
                  strokeWidth={selected ? 1 : 0}
                />
                <text
                  x={x + 7}
                  y={y + 2.6}
                  fill={def.color}
                  fontSize="7"
                  fontFamily="var(--font-mono)"
                  opacity={selected ? 1 : 0.75}
                >
                  {def.name}
                </text>
              </g>
            );
          })}

          {/* Beam marker */}
          <g>
            <circle
              cx={bx}
              cy={by}
              r={footprint}
              fill="#ff6a14"
              fillOpacity={0.08}
              stroke="#ff8a2e"
              strokeOpacity={0.5}
              strokeWidth="0.8"
            />
            <circle cx={bx} cy={by} r={6.5} fill="none" stroke="#ff8a2e" strokeWidth="1.1" />
            <circle cx={bx} cy={by} r={1.8} fill="#ffb066" />
            <line x1={bx - 12} y1={by} x2={bx + 12} y2={by} stroke="#ff8a2e" strokeWidth="0.7" strokeOpacity="0.7" />
            <line x1={bx} y1={by - 12} x2={bx} y2={by + 12} stroke="#ff8a2e" strokeWidth="0.7" strokeOpacity="0.7" />
          </g>
        </svg>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-faint">
        Drag the disc to aim, or focus it and use the arrow keys. The orange marker is the beam; the
        faint ring around it is the model beamwidth ({beamwidthDeg(scan).toFixed(1)}°).
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[8px] uppercase tracking-[0.08em] text-faint">
        <span>
          aim{" "}
          <span className="text-ink">
            {formatSigned(beamClock.az)}° / {beamClock.el.toFixed(1)}°
          </span>
        </span>
        <span className="text-signal/70">
          {mode === "aim" ? "manual steering" : "auto-track locked"}
        </span>
      </div>
    </div>
  );
}
