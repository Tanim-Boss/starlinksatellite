import { useState } from "react";
import { cn } from "@/utils/cn";

const ROWS = [
  {
    id: "leo",
    name: "Low Earth orbit",
    sub: "Starlink · ~550 km",
    oneWay: "≈2 ms",
    rtt: "≈25–40 ms",
    color: "#3ddbd9",
    note: "Signal crosses the sky in a couple of milliseconds. Coverage comes from many satellites passing overhead.",
  },
  {
    id: "geo",
    name: "Geostationary orbit",
    sub: "Traditional satellite internet · 35,786 km",
    oneWay: "≈239 ms",
    rtt: "≈550–650 ms",
    color: "#fbbf24",
    note: "One satellite covers a third of the planet, but the round trip alone costs over half a second.",
  },
] as const;

/**
 * Schematic altitude comparison. The vertical scale is deliberately
 * compressed — at true scale, geostationary orbit would be 66 Earth radii up.
 */
export function OrbitScale() {
  const [hover, setHover] = useState<"leo" | "geo" | null>(null);
  const highlight = (id: "leo" | "geo") => hover === id;

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Altitude, and what it costs</h3>
          <p className="mt-0.5 text-[11px] text-faint">Vertical distances compressed for legibility</p>
        </div>
        <span className="hidden rounded-full border border-white/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-faint sm:block">
          two-way light time
        </span>
      </div>

      <div className="figure-scroll">
      <svg viewBox="0 0 900 470" className="w-full" role="img" aria-label="Comparison of low Earth orbit at 550 kilometres and geostationary orbit at 35,786 kilometres">
        <defs>
          <linearGradient id="sky-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#070d1a" />
            <stop offset="100%" stopColor="#04070f" />
          </linearGradient>
          <linearGradient id="leo-beam" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#3ddbd9" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#3ddbd9" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="geo-beam" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id="planet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#123a4d" />
            <stop offset="100%" stopColor="#06121c" />
          </linearGradient>
        </defs>

        <rect width="900" height="470" fill="url(#sky-fill)" />

        {/* altitude guide lines */}
        {[
          [56, "GEO · 35,786 km"],
          [128, "12,000 km"],
          [196, "550 km"],
        ].map(([y, label]) => (
          <g key={label as string}>
            <line
              x1="96"
              x2="804"
              y1={y as number}
              y2={y as number}
              stroke="rgba(148,176,224,0.12)"
              strokeDasharray="3 7"
            />
            <text
              x="96"
              y={(y as number) - 7}
              style={{ fontSize: 10.6, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1.1 }}
              fill="#5b6a86"
            >
              {label}
            </text>
          </g>
        ))}

        {/* Earth */}
        <path d="M-90 470 A 610 610 0 0 1 990 470 Z" fill="url(#planet)" />
        <path d="M-90 470 A 610 610 0 0 1 990 470" fill="none" stroke="#2f6f80" strokeWidth="1.6" />
        <path
          d="M-90 470 A 610 610 0 0 1 990 470"
          fill="none"
          stroke="#3ddbd9"
          strokeOpacity="0.35"
          strokeWidth="0.8"
        />
        <text x="450" y="404" textAnchor="middle" style={{ fontSize: 11.8, fontFamily: "JetBrains Mono, monospace", letterSpacing: 2 }} fill="#68809e">
          EARTH · 6,371 km RADIUS
        </text>

        {/* ---- GEO satellite & path ---- */}
        <g
          onMouseEnter={() => setHover("geo")}
          onMouseLeave={() => setHover(null)}
          style={{ cursor: "default" }}
        >
          <rect x="654" y="18" width="196" height="52" rx="10" fill="rgba(251,191,36,0.06)" stroke="rgba(251,191,36,0.22)" />
          <text x="670" y="38" style={{ fontSize: 13, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1 }} fill="#fbbf24">
            GEOSTATIONARY
          </text>
          <text x="670" y="56" style={{ fontSize: 10.6, fontFamily: "JetBrains Mono, monospace" }} fill="#8b9bb9">
            1 satellite covers 1/3 of Earth
          </text>
          {/* satellite glyph */}
          <g transform="translate(566 122)">
            <rect x="-22" y="-9" width="14" height="18" rx="2" fill="#2a2a20" stroke="#7c6a33" />
            <rect x="8" y="-9" width="14" height="18" rx="2" fill="#2a2a20" stroke="#7c6a33" />
            <rect x="-9" y="-12" width="18" height="24" rx="3" fill="#3a3424" stroke="#c9a227" strokeWidth="1.2" />
          </g>
          <text x="566" y="96" textAnchor="middle" style={{ fontSize: 10.6, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1 }} fill="#c9a227">
            GEO
          </text>
          {/* path down and up */}
          <path
            d="M552 134 L 438 384"
            stroke={highlight("geo") ? "#fbbf24" : "#7a6a33"}
            strokeWidth={highlight("geo") ? 2.4 : 1.4}
            fill="none"
            className="animate-dash-slow"
          />
          <path
            d="M462 384 L 578 134"
            stroke={highlight("geo") ? "#fbbf24" : "#7a6a33"}
            strokeWidth={highlight("geo") ? 2.4 : 1.4}
            fill="none"
            className="animate-dash-slow"
            opacity="0.65"
          />
          <circle cx="450" cy="372" r="5" fill="#fbbf24" />
          <circle cx="450" cy="372" r="12" fill="none" stroke="#fbbf24" strokeOpacity="0.4" />
          <text x="468" y="376" style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", letterSpacing: 0.8 }} fill="#c9a227">
            YOUR DISH · SAME SPOT, TWO DIFFERENT SKIES
          </text>


          <g transform="translate(700 330)">
            <text textAnchor="middle" style={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1 }} fill="#8a7430">
              TWO-WAY LIGHT TIME ≥ 477 ms
            </text>
          </g>
        </g>

        {/* ---- LEO satellites & paths ---- */}
        <g
          onMouseEnter={() => setHover("leo")}
          onMouseLeave={() => setHover(null)}
          style={{ cursor: "default" }}
        >
          <g transform="translate(196 196)">
            <rect x="-26" y="-9" width="16" height="18" rx="2" fill="#11313d" stroke="#2f7d82" />
            <rect x="10" y="-9" width="16" height="18" rx="2" fill="#11313d" stroke="#2f7d82" />
            <rect x="-10" y="-11" width="20" height="22" rx="3" fill="#16414f" stroke="#3ddbd9" strokeWidth="1.3" />
            <circle cx="0" cy="15" r="1.6" fill="#3ddbd9" />
          </g>
          <g transform="translate(352 188) scale(0.85)">
            <rect x="-26" y="-9" width="16" height="18" rx="2" fill="#11313d" stroke="#2f7d82" />
            <rect x="10" y="-9" width="16" height="18" rx="2" fill="#11313d" stroke="#2f7d82" />
            <rect x="-10" y="-11" width="20" height="22" rx="3" fill="#16414f" stroke="#3ddbd9" strokeWidth="1.3" />
          </g>
          <g transform="translate(512 192) scale(0.7)">
            <rect x="-26" y="-9" width="16" height="18" rx="2" fill="#11313d" stroke="#2f7d82" />
            <rect x="10" y="-9" width="16" height="18" rx="2" fill="#11313d" stroke="#2f7d82" />
            <rect x="-10" y="-11" width="20" height="22" rx="3" fill="#16414f" stroke="#3ddbd9" strokeWidth="1.3" />
          </g>

          {/* short beams */}
          <path d="M198 210 L 372 364" stroke={highlight("leo") ? "#3ddbd9" : "#2c7b7e"} strokeWidth={highlight("leo") ? 2.2 : 1.3} className="animate-dash" />
          <path d="M214 206 L 462 370" stroke={highlight("leo") ? "#3ddbd9" : "#2c7b7e"} strokeWidth={highlight("leo") ? 2.2 : 1.3} className="animate-dash" />
          <path d="M366 202 L 470 366" stroke={highlight("leo") ? "#3ddbd9" : "#2c7b7e"} strokeWidth={highlight("leo") ? 1.8 : 1} strokeDasharray="3 5" opacity="0.7" />
          <circle cx="380" cy="360" r="5" fill="#3ddbd9" />
          <circle cx="380" cy="360" r="12" fill="none" stroke="#3ddbd9" strokeOpacity="0.35" />
          <circle cx="196" cy="196" r="20" fill="none" stroke="#3ddbd9" strokeOpacity={highlight("leo") ? 0.5 : 0.18} />

          <g transform="translate(262 152)">
            <text textAnchor="middle" style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1.2 }} fill="#7ee7e2">
              STARLINK
            </text>
            <text y="14" textAnchor="middle" style={{ fontSize: 8.5, fontFamily: "JetBrains Mono, monospace", letterSpacing: 0.6 }} fill="#5f7595">
              SHORT HOPS · 2 ms EACH WAY
            </text>
          </g>

          {/* satellite trail */}
          <path d="M120 214 Q 300 156 560 196" fill="none" stroke="#3ddbd9" strokeOpacity="0.25" strokeDasharray="2 8" />
        </g>

        {/* scale disclaimer */}
        <text x="450" y="458" textAnchor="middle" style={{ fontSize: 10.6, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1 }} fill="#5f7595">
          NOT TO SCALE · GEO IS 65× FURTHER FROM EARTH'S SURFACE THAN STARLINK
        </text>
      </svg>
      </div>

      <div className="grid gap-px bg-white/[0.07] sm:grid-cols-2">
        {ROWS.map((r) => (
          <div
            key={r.id}
            onMouseEnter={() => setHover(r.id)}
            onMouseLeave={() => setHover(null)}
            className={cn(
              "bg-[#060b16] p-5 transition-colors",
              highlight(r.id) && "bg-[#08121f]",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
              <span className="text-sm font-semibold text-white">{r.name}</span>
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">{r.sub}</div>
            <div className="mt-3 flex gap-6">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-faint">One way</div>
                <div className="mt-0.5 text-lg font-semibold" style={{ color: r.color }}>
                  {r.oneWay}
                </div>
              </div>
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-faint">Round trip</div>
                <div className="mt-0.5 text-lg font-semibold text-ink">{r.rtt}</div>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">{r.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
