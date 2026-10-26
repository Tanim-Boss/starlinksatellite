import { useState } from "react";
import { cn } from "@/utils/cn";

/**
 * Side elevation of a fixed phased-array panel with an electronically steered
 * beam. The panel is drawn flat and does not move; only the element phases and
 * the resulting beam direction change, which is the whole point of the figure.
 */

const CX = 268;
const CY = 196;
const BEAM_LEN = 138;
const ELEMENTS = 14;
const PITCH = 13;
const START_X = CX - ((ELEMENTS - 1) * PITCH) / 2;

const PRESETS = [
  { id: "A", label: "SAT-A", el: 44, note: "low-ish, rising" },
  { id: "B", label: "SAT-B", el: 62, note: "high, close to zenith" },
  { id: "C", label: "SAT-C", el: 33, note: "low, near the mask" },
];

export function AntennaDiagram() {
  const [elevation, setElevation] = useState(44);
  const [active, setActive] = useState("A");

  const theta = 90 - elevation; // degrees away from straight up
  const rad = (theta * Math.PI) / 180;
  const endX = CX + BEAM_LEN * Math.sin(rad);
  const endY = CY - BEAM_LEN * Math.cos(rad);
  const phaseStep = Math.PI * Math.sin(rad);

  const choose = (id: string, el: number) => {
    setActive(id);
    setElevation(el);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#050b16]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] px-4 py-2.5">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
          Fixed panel · steered beam
        </p>
        <div className="flex flex-wrap items-center gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => choose(p.id, p.el)}
              aria-pressed={active === p.id}
              className={cn(
                "rounded-full border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] transition-colors",
                active === p.id
                  ? "border-signal/45 bg-signal/10 text-signal"
                  : "border-white/10 text-faint hover:border-white/25 hover:text-white",
              )}
            >
              {p.label} · {p.el}°
            </button>
          ))}
        </div>
      </div>

      <div className="figure-scroll">
        <svg viewBox="0 0 560 268" className="block h-auto w-full" role="img" aria-label="Phased array beam steering diagram">
          <defs>
            <linearGradient id="ho-beam" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#3ddbd9" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#3ddbd9" stopOpacity="0.05" />
            </linearGradient>
            <radialGradient id="ho-sat" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor="#3ddbd9" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#3ddbd9" stopOpacity="0" />
            </radialGradient>
            <pattern id="ho-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M28 0H0V28" fill="none" stroke="rgba(140,170,220,0.09)" strokeWidth="1" />
            </pattern>
          </defs>

          <rect width="560" height="268" fill="url(#ho-grid)" />
          {/* horizon */}
          <line x1="16" y1="222" x2="544" y2="222" stroke="rgba(148,176,224,0.22)" strokeDasharray="3 5" />
          <text x="16" y="236" className="fill-[#697b98]" style={{ font: "9px ui-monospace, monospace", letterSpacing: "0.12em" }}>
            HORIZON
          </text>

          {/* zenith reference */}
          <line x1={CX} y1={CY} x2={CX} y2={CY - 150} stroke="rgba(148,176,224,0.18)" strokeDasharray="2 6" />
          <text x={CX + 4} y={CY - 152} className="fill-[#697b98]" style={{ font: "9px ui-monospace, monospace" }}>
            zenith
          </text>

          {/* beam (rotates with the steering angle) */}
          <g
            style={{
              transform: `rotate(${theta}deg)`,
              transformOrigin: `${CX}px ${CY}px`,
              transformBox: "view-box",
              transition: "transform 620ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <path
              d={`M ${CX - 26} ${CY} L ${CX - 8} ${CY - BEAM_LEN} L ${CX + 8} ${CY - BEAM_LEN} L ${CX + 26} ${CY} Z`}
              fill="url(#ho-beam)"
              opacity="0.55"
            />
            <line x1={CX} y1={CY} x2={CX} y2={CY - BEAM_LEN} stroke="#7ee7e2" strokeWidth="1.4" />
            {[0.3, 0.55, 0.8].map((f) => (
              <line
                key={f}
                x1={CX - 16}
                y1={CY - BEAM_LEN * f}
                x2={CX + 16}
                y2={CY - BEAM_LEN * f}
                stroke="#3ddbd9"
                strokeOpacity="0.5"
                strokeWidth="1.1"
              />
            ))}
          </g>

          {/* satellite at the beam tip */}
          <g
            style={{
              transform: `translate(${endX - CX}px, ${endY - 100}px)`,
              transformBox: "view-box",
              transition: "transform 620ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <circle cx={CX} cy={100} r="18" fill="url(#ho-sat)" opacity="0.9" />
            <circle cx={CX} cy={100} r="3.4" fill="#eaffff" />
            <text x={CX + 12} y={103} className="fill-[#3ddbd9]" style={{ font: "10px ui-monospace, monospace", letterSpacing: "0.08em" }}>
              SAT-{active}
            </text>
          </g>

          <text x={CX + 34} y={CY - 34} className="fill-[#8b9bb9]" style={{ font: "10px ui-monospace, monospace" }}>
            θ = {theta.toFixed(0)}°
          </text>

          {/* element lattice + phase offsets */}
          {Array.from({ length: ELEMENTS }).map((_, i) => {
            const x = START_X + i * PITCH;
            const phase = phaseStep * i;
            const level = 0.5 + 0.5 * Math.cos(phase);
            return (
              <g key={i}>
                <rect
                  x={x - 3}
                  y={CY - 26 - level * 12}
                  width="6"
                  height={12 + level * 12}
                  rx="1.2"
                  fill="#3ddbd9"
                  opacity={0.25 + level * 0.7}
                  style={{ transition: "all 620ms cubic-bezier(0.22,1,0.36,1)" }}
                />
                <rect x={x - 4.5} y={CY} width="9" height="8" rx="1.2" fill="#1c3a46" stroke="#2f6b74" strokeWidth="0.8" />
              </g>
            );
          })}

          {/* panel body */}
          <rect x={START_X - 14} y={CY + 8} width={(ELEMENTS - 1) * PITCH + 28} height="12" rx="3" fill="#0c1b26" stroke="rgba(148,176,224,0.25)" />
          <text
            x={START_X - 14}
            y={CY + 36}
            className="fill-[#697b98]"
            style={{ font: "9px ui-monospace, monospace", letterSpacing: "0.1em" }}
          >
            PHASED ARRAY · FIXED PANEL
          </text>
          <text
            x={START_X - 14}
            y={CY + 50}
            className="fill-[#697b98]"
            style={{ font: "9px ui-monospace, monospace", letterSpacing: "0.1em" }}
          >
            PHASE STEP ≈ {(phaseStep * (180 / Math.PI)).toFixed(0)}° / ELEMENT
          </text>

          {/* elevation readout */}
          <text x="16" y="30" className="fill-[#e9effc]" style={{ font: "11px ui-monospace, monospace" }}>
            ELEVATION {elevation}°
          </text>
          <text x="16" y="48" className="fill-[#697b98]" style={{ font: "9px ui-monospace, monospace" }}>
            bars show each element&apos;s phase offset
          </text>
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.07] px-4 py-2.5">
        <label className="flex flex-1 items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-faint">
          Elevation
          <input
            type="range"
            min={26}
            max={88}
            value={elevation}
            onChange={(e) => {
              setElevation(Number(e.target.value));
              setActive("—");
            }}
            className="h-1 flex-1 accent-[#3ddbd9]"
            aria-label="Beam elevation angle"
          />
          <span className="w-9 text-right tabular-nums text-ink">{elevation}°</span>
        </label>
        <p className="font-mono text-[9px] text-faint">
          beam steer {theta.toFixed(0)}° off zenith
        </p>
      </div>
    </div>
  );
}
