import { useState } from "react";
import { cn } from "@/utils/cn";

type Mode = "ground" | "laser";

const SATS = [
  { x: 190, y: 168 },
  { x: 330, y: 118 },
  { x: 480, y: 104 },
  { x: 630, y: 118 },
  { x: 762, y: 160 },
];

const GROUND = [
  { x: 132, y: 306, label: "NEW YORK" },
  { x: 800, y: 300, label: "LONDON" },
];

export function LaserMesh() {
  const [mode, setMode] = useState<Mode>("laser");
  const laser = mode === "laser";

  const meshPath = [
    `M${GROUND[0].x} 300`,
    `L${SATS[0].x} ${SATS[0].y + 22}`,
    `L${SATS[1].x} ${SATS[1].y + 18}`,
    `L${SATS[2].x} ${SATS[2].y + 18}`,
    `L${SATS[3].x} ${SATS[3].y + 18}`,
    `L${SATS[4].x} ${SATS[4].y + 20}`,
    `L${GROUND[1].x} ${GROUND[1].y - 6}`,
  ].join(" ");

  const groundPath = [
    `M${GROUND[0].x} 300`,
    `L${SATS[0].x} ${SATS[0].y + 22}`,
    `L${SATS[0].x} 292`,
    `Q 460 232 ${GROUND[1].x} 292`,
    `L${SATS[4].x} ${SATS[4].y + 20}`,
    `L${GROUND[1].x} ${GROUND[1].y - 6}`,
  ].join(" ");

  const path = laser ? meshPath : groundPath;

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-white">New York → London, two ways</h3>
          <p className="mt-0.5 text-[11px] text-faint">
            Illustrative light-time for a 5,570 km great-circle hop
          </p>
        </div>
        <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-0.5">
          {(
            [
              { id: "ground", label: "Via fibre" },
              { id: "laser", label: "Via laser mesh" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={cn(
                "rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                mode === m.id
                  ? m.id === "laser"
                    ? "bg-laser/15 text-laser"
                    : "bg-warn/15 text-warn"
                  : "text-faint hover:text-muted",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="figure-scroll">
      <svg viewBox="0 0 900 380" className="w-full" role="img" aria-label="Comparison of a signal routed through ground fibre versus optical laser links between satellites">
        <defs>
          <linearGradient id="lm-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#070c18" />
            <stop offset="100%" stopColor="#04070e" />
          </linearGradient>
          <linearGradient id="lm-earth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0e2a3d" />
            <stop offset="100%" stopColor="#061019" />
          </linearGradient>
          <radialGradient id="lm-glow">
            <stop offset="0%" stopColor="#3ddbd9" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#3ddbd9" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="lm-glow-v">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="900" height="380" fill="url(#lm-sky)" />

        {/* Earth curve */}
        <path d="M-80 380 Q 450 268 980 380 Z" fill="url(#lm-earth)" />
        <path d="M-80 380 Q 450 268 980 380" fill="none" stroke="#255069" />
        <path d="M-80 380 Q 450 268 980 380" fill="none" stroke="#3ddbd9" strokeOpacity="0.3" strokeWidth="0.8" />

        {/* orbital track */}
        <path d="M60 220 Q 450 66 860 210" fill="none" stroke="rgba(148,176,224,0.16)" strokeDasharray="2 9" />

        {/* ground stations */}
        {GROUND.map((g) => (
          <g key={g.label} transform={`translate(${g.x} ${g.y})`}>
            <circle r="24" fill="url(#lm-glow)" opacity="0.55" />
            <rect x="-16" y="-12" width="32" height="20" rx="3" fill="#0d2131" stroke="#3ddbd9" strokeWidth="1.2" />
            <path d="M-10 -12 L-10 -20 M10 -12 L10 -20" stroke="#3ddbd9" strokeWidth="1.2" />
            <circle cx="0" cy="-4" r="2.2" fill="#7ee7e2" />
            <text
              y="26"
              textAnchor="middle"
              style={{ fontSize: 10.6, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1.4 }}
              fill="#8b9bb9"
            >
              {g.label}
            </text>
            <text
              y="40"
              textAnchor="middle"
              style={{ fontSize: 9.4, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1 }}
              fill="#647a9c"
            >
              GATEWAY
            </text>
          </g>
        ))}

        {/* satellites */}
        {SATS.map((s, i) => (
          <g key={i} transform={`translate(${s.x} ${s.y})`}>
            {laser && <circle r="26" fill="url(#lm-glow-v)" opacity="0.5" />}
            <g transform="scale(0.6)">
              <rect x="-36" y="-8" width="18" height="16" rx="2" fill="#10293a" stroke="#2f6a78" />
              <rect x="18" y="-8" width="18" height="16" rx="2" fill="#10293a" stroke="#2f6a78" />
              <rect x="-13" y="-11" width="26" height="22" rx="3" fill="#14394a" stroke={laser ? "#a78bfa" : "#396d80"} strokeWidth="1.4" />
              <circle cx="0" cy="13" r="1.8" fill={laser ? "#c4b5fd" : "#3ddbd9"} />
            </g>
          </g>
        ))}

        {/* laser links between satellites */}
        {laser && (
          <g>
            {SATS.slice(0, -1).map((s, i) => {
              const n = SATS[i + 1];
              return (
                <line
                  key={i}
                  x1={s.x}
                  y1={s.y + 18}
                  x2={n.x}
                  y2={n.y + 18}
                  stroke="#a78bfa"
                  strokeWidth="1.2"
                  strokeOpacity="0.65"
                  strokeDasharray="3 6"
                />
              );
            })}
            <line
              x1={SATS[0].x - 6}
              y1={SATS[0].y + 18}
              x2={GROUND[0].x + 6}
              y2={GROUND[0].y - 10}
              stroke="#3ddbd9"
              strokeWidth="1.6"
            />
            <line
              x1={SATS[4].x + 6}
              y1={SATS[4].y + 18}
              x2={GROUND[1].x - 6}
              y2={GROUND[1].y - 10}
              stroke="#3ddbd9"
              strokeWidth="1.6"
            />
          </g>
        )}

        {/* active route */}
        <path d={path} fill="none" stroke={laser ? "#a78bfa" : "#fbbf24"} strokeWidth="2" strokeOpacity="0.85" />
        <circle r="3.6" fill="#ffffff">
          <animateMotion dur={laser ? "3.4s" : "5.4s"} repeatCount="indefinite" path={path} />
        </circle>

        {!laser && (
          <g>
            <path
              d={`M${GROUND[0].x} 292 Q 460 232 ${GROUND[1].x} 292`}
              fill="none"
              stroke="#fbbf24"
              strokeOpacity="0.28"
              strokeDasharray="2 8"
            />
            <text x="466" y="248" textAnchor="middle" style={{ fontSize: 10.6, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1 }} fill="#8a7430">
              6,500 km OF FIBRE
            </text>
          </g>
        )}
        {laser && (
          <g>
            <text x="480" y="74" textAnchor="middle" style={{ fontSize: 10.6, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1.4 }} fill="#a78bfa">
              4 OPTICAL LINKS · LIGHT SPEED IN VACUUM
            </text>
          </g>
        )}

        <text x="450" y="352" textAnchor="middle" style={{ fontSize: 10.6, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1 }} fill="#5f7595">
          SCHEMATIC · SATELLITES ~550 km UP
        </text>
      </svg>
      </div>

      <div className="grid gap-px border-t border-white/[0.07] bg-white/[0.07] sm:grid-cols-2">
        <div className="bg-[#060b16] p-5">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
              Round-trip light time
            </span>
            <span className={cn("text-2xl font-semibold", laser ? "text-laser" : "text-warn")}>
              {laser ? "≈44 ms" : "≈65 ms"}
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            {laser
              ? "The beam crosses space in a near-straight line. Light in vacuum is about 47% faster than light in glass, so the extra distance up to 550 km is more than paid back on long hops."
              : "Two gateway hops plus thousands of kilometres of glass. Fibre is superb, but refraction slows light to about two-thirds of c, and cable routes rarely follow a straight line."}
          </p>
        </div>
        <div className="bg-[#060b16] p-5">
          <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            The honest caveat
          </h4>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Lasers don&apos;t make short trips faster. For a city-to-city hop of a few hundred
            kilometres, fibre&apos;s shorter path wins. The mesh becomes an advantage over{" "}
            <span className="text-ink">thousands</span> of kilometres — and where there is no fibre
            at all.
          </p>
        </div>
      </div>
    </div>
  );
}
