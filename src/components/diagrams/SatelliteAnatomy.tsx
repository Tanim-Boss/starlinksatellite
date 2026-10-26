import { useState } from "react";
import { cn } from "@/utils/cn";

const PARTS = [
  {
    id: "array",
    num: "01",
    name: "Phased-array antennas",
    color: "#3ddbd9",
    body: "A flat panel of hundreds of small elements steers many narrow Ku-band beams at once, each aimed at a different patch of ground. No moving parts.",
    detailX: 258,
    detailY: 296,
  },
  {
    id: "solar",
    num: "02",
    name: "Solar array",
    color: "#fbbf24",
    body: "A single large wing generates the power for the radios, computers and thrusters. It rotates to face the Sun as the satellite circles Earth.",
    detailX: 161,
    detailY: 156,
  },
  {
    id: "laser",
    num: "03",
    name: "Optical laser terminals",
    color: "#a78bfa",
    body: "Small telescopes on the edges of the spacecraft point at neighbouring satellites, carrying traffic through space at the speed of light.",
    detailX: 300,
    detailY: 84,
  },
  {
    id: "thruster",
    num: "04",
    name: "Ion thruster",
    color: "#7dd3fc",
    body: "An electric propulsion unit — argon or krypton ionised and accelerated — holds the orbit against drag, raises the satellite after launch and deorbits it at end of life.",
    detailX: 558,
    detailY: 248,
  },
  {
    id: "bus",
    num: "05",
    name: "Bus & avionics",
    color: "#94a3b8",
    body: "Radios, computers, batteries and star trackers. The satellite decides where to point its beams and which route traffic should take across the constellation.",
    detailX: 446,
    detailY: 232,
  },
  {
    id: "earth",
    num: "06",
    name: "Earth-facing side",
    color: "#60a5fa",
    body: "The array and gateway antennas face Earth. Because the satellite is in low orbit, it sees a footprint only a few thousand kilometres wide at any moment.",
    detailX: 420,
    detailY: 368,
  },
];

export function SatelliteAnatomy() {
  const [active, setActive] = useState<string | null>(null);
  const isOn = (id: string) => active === id;

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-white">What&apos;s inside the spacecraft</h3>
          <p className="mt-0.5 text-[11px] text-faint">
            Simplified schematic · hover or tap a part to inspect it
          </p>
        </div>
        <span className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
          V2-class satellite
        </span>
      </div>

      <div className="grid gap-px bg-white/[0.07] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="figure-scroll relative bg-[#060b16]">
          <div className="dot-bg pointer-events-none absolute inset-0 opacity-25" aria-hidden />
          <svg viewBox="0 0 720 420" className="relative w-full" role="img" aria-label="Labelled diagram of a Starlink satellite">
            <defs>
              <linearGradient id="sa-body" x1="0" y1="0" x2="0.4" y2="1">
                <stop offset="0%" stopColor="#1d3d55" />
                <stop offset="60%" stopColor="#122a3c" />
                <stop offset="100%" stopColor="#0b1b28" />
              </linearGradient>
              <linearGradient id="sa-array" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#103648" />
                <stop offset="100%" stopColor="#0a2230" />
              </linearGradient>
              <linearGradient id="sa-solar" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1c2a4d" />
                <stop offset="100%" stopColor="#101a33" />
              </linearGradient>
              <pattern id="sa-cells" width="18" height="22" patternUnits="userSpaceOnUse">
                <rect width="18" height="22" fill="none" stroke="rgba(120,160,220,0.25)" strokeWidth="0.7" />
                <line x1="0" y1="11" x2="18" y2="11" stroke="rgba(120,160,220,0.16)" strokeWidth="0.6" />
              </pattern>
              <pattern id="sa-dots" width="13" height="13" patternUnits="userSpaceOnUse">
                <circle cx="6.5" cy="6.5" r="1.5" fill="rgba(61,219,217,0.55)" />
              </pattern>
              <radialGradient id="sa-earth">
                <stop offset="0%" stopColor="#123b4f" />
                <stop offset="100%" stopColor="#061019" />
              </radialGradient>
            </defs>

            {/* Earth arc at bottom */}
            <path d="M-60 470 Q 360 330 780 470 Z" fill="url(#sa-earth)" opacity="0.85" />
            <path d="M-60 470 Q 360 330 780 470" fill="none" stroke="#2b6a80" strokeOpacity="0.6" />
            <text x="360" y="410" textAnchor="middle" style={{ fontSize: 10.6, fontFamily: "JetBrains Mono, monospace", letterSpacing: 2 }} fill="#60799a">
              EARTH
            </text>

            {/* Solar arrays (left + right wings) */}
            <g
              onMouseEnter={() => setActive("solar")}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive("solar")}
              style={{ cursor: "pointer" }}
              opacity={active && !isOn("solar") ? 0.45 : 1}
            >
              <g>
                <rect x="86" y="140" width="150" height="74" rx="3" fill="url(#sa-solar)" stroke="#3f6392" strokeWidth="1.2" />
                <rect x="86" y="140" width="150" height="74" fill="url(#sa-cells)" />
                <line x1="236" y1="168" x2="252" y2="168" stroke="#4b6f9e" strokeWidth="2" />
                <line x1="236" y1="186" x2="252" y2="186" stroke="#4b6f9e" strokeWidth="2" />
              </g>
              <g>
                <rect x="484" y="140" width="150" height="74" rx="3" fill="url(#sa-solar)" stroke="#3f6392" strokeWidth="1.2" />
                <rect x="484" y="140" width="150" height="74" fill="url(#sa-cells)" />
                <line x1="468" y1="168" x2="484" y2="168" stroke="#4b6f9e" strokeWidth="2" />
                <line x1="468" y1="186" x2="484" y2="186" stroke="#4b6f9e" strokeWidth="2" />
              </g>
            </g>

            {/* Bus */}
            <g
              onMouseEnter={() => setActive("bus")}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive("bus")}
              style={{ cursor: "pointer" }}
              opacity={active && !isOn("bus") ? 0.45 : 1}
            >
              <rect x="252" y="128" width="216" height="124" rx="7" fill="url(#sa-body)" stroke="#4e7ea5" strokeWidth="1.5" />
              <rect x="268" y="144" width="184" height="16" rx="3" fill="#0d2130" stroke="#2d5674" strokeWidth="0.8" />
              <rect x="268" y="170" width="86" height="10" rx="2" fill="#123149" />
              <rect x="268" y="188" width="126" height="10" rx="2" fill="#0f2a3e" />
              <circle cx="424" cy="192" r="12" fill="#0c1f2d" stroke="#4e7ea5" strokeWidth="1" />
              <circle cx="424" cy="192" r="4" fill="#3ddbd9" opacity="0.8" />
              <text x="360" y="243" textAnchor="middle" style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1.6 }} fill="#5f7f9c">
                BUS · AVIONICS
              </text>
            </g>

            {/* Phased array (front/lower panel) */}
            <g
              onMouseEnter={() => setActive("array")}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive("array")}
              style={{ cursor: "pointer" }}
              opacity={active && !isOn("array") ? 0.4 : 1}
            >
              <rect
                x="252"
                y="266"
                width="216"
                height="58"
                rx="5"
                fill="url(#sa-array)"
                stroke={isOn("array") ? "#3ddbd9" : "#357487"}
                strokeWidth={isOn("array") ? 2 : 1.3}
              />
              <rect x="252" y="266" width="216" height="58" fill="url(#sa-dots)" />
              <path d="M258 334 L 300 372 M 462 334 L 420 372" stroke="#3ddbd9" strokeOpacity="0.45" strokeDasharray="3 5" />
              <text x="360" y="360" textAnchor="middle" style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1.4 }} fill="#4f8f9c">
                USER-LINK PHASED ARRAY
              </text>
            </g>

            {/* Laser terminals */}
            <g
              onMouseEnter={() => setActive("laser")}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive("laser")}
              style={{ cursor: "pointer" }}
              opacity={active && !isOn("laser") ? 0.45 : 1}
            >
              <g>
                <rect x="272" y="112" width="26" height="16" rx="3" fill="#221a3f" stroke="#a78bfa" strokeWidth="1.2" />
                <circle cx="285" cy="112" r="4" fill="#c4b5fd" opacity="0.9" />
                <line x1="285" y1="108" x2="256" y2="80" stroke="#a78bfa" strokeOpacity="0.7" strokeDasharray="3 4" />
                <line x1="285" y1="108" x2="320" y2="74" stroke="#a78bfa" strokeOpacity="0.5" strokeDasharray="3 4" />
              </g>
              <g>
                <rect x="422" y="112" width="26" height="16" rx="3" fill="#221a3f" stroke="#a78bfa" strokeWidth="1.2" />
                <circle cx="435" cy="112" r="4" fill="#c4b5fd" opacity="0.9" />
                <line x1="435" y1="108" x2="470" y2="78" stroke="#a78bfa" strokeOpacity="0.7" strokeDasharray="3 4" />
              </g>
            </g>

            {/* Thruster */}
            <g
              onMouseEnter={() => setActive("thruster")}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive("thruster")}
              style={{ cursor: "pointer" }}
              opacity={active && !isOn("thruster") ? 0.45 : 1}
            >
              <path d="M468 210 L 500 198 L 512 214 L 500 230 L 468 218 Z" fill="#10222f" stroke="#4e7ea5" strokeWidth="1" />
              <path d="M512 206 L 536 200 M512 214 L 540 214 M512 222 L 536 228" stroke="#7dd3fc" strokeOpacity="0.55" strokeWidth="1.4" />
            </g>

            {/* Earth-facing direction */}
            <g opacity={isOn("earth") ? 1 : 0.7}>
              <line x1="620" y1="290" x2="620" y2="352" stroke="#60a5fa" strokeDasharray="4 5" strokeWidth="1.3" />
              <path d="M620 360 L615 348 L625 348 Z" fill="#60a5fa" />
              <text x="632" y="326" style={{ fontSize: 10.6, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1 }} fill="#60a5fa">
                TO EARTH
              </text>
            </g>

            {/* callout numbers */}
            {PARTS.map((p) => (
              <g
                key={p.id}
                onMouseEnter={() => setActive(p.id)}
                onMouseLeave={() => setActive(null)}
                onClick={() => setActive(p.id)}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={p.detailX}
                  cy={p.detailY}
                  r="11"
                  fill={isOn(p.id) ? p.color : "#08131f"}
                  stroke={p.color}
                  strokeWidth="1.2"
                />
                <text
                  x={p.detailX}
                  y={p.detailY + 3.4}
                  textAnchor="middle"
                  style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}
                  fill={isOn(p.id) ? "#04060d" : p.color}
                >
                  {p.num}
                </text>
              </g>
            ))}

            <text x="24" y="34" style={{ fontSize: 10.6, fontFamily: "JetBrains Mono, monospace", letterSpacing: 2 }} fill="#5f7595">
              STARLINK · SCHEMATIC SECTION
            </text>
            <text x="24" y="50" style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1 }} fill="#4e5c75">
              NOT TO SCALE
            </text>
          </svg>
        </div>

        <div className="bg-[#060b16] p-4 md:p-5">
          <ul className="space-y-1">
            {PARTS.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(p.id)}
                  onMouseLeave={() => setActive(null)}
                  onClick={() => setActive(active === p.id ? null : p.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                    isOn(p.id)
                      ? "border-white/18 bg-white/[0.05]"
                      : "border-transparent hover:bg-white/[0.03]",
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: p.color }}
                    />
                    <span className="text-[13px] font-medium text-ink">{p.name}</span>
                    <span className="ml-auto font-mono text-[9px] text-faint">{p.num}</span>
                  </span>
                  <span
                    className={cn(
                      "mt-1 block overflow-hidden pl-4 text-[11.5px] leading-relaxed text-muted transition-all",
                      isOn(p.id) ? "max-h-32 opacity-100" : "max-h-0 opacity-0",
                    )}
                  >
                    {p.body}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-white/[0.07] pt-3 text-[10.5px] leading-relaxed text-faint">
            Configurations vary by version. Early satellites carried no lasers; newer ones add more
            terminals, more power and far greater throughput.
          </p>
        </div>
      </div>
    </div>
  );
}
