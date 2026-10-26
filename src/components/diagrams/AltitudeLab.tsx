import { useMemo, useState } from "react";
import { EARTH_RADIUS_KM, MU_KM3_S2, coverageInfo } from "@/lib/astro";
import { cn } from "@/utils/cn";

const MIN_H = 300;
const MAX_H = 2000;

function Readout({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-mono text-lg font-semibold text-ink">{value}</span>
        {unit && <span className="font-mono text-[10px] text-signal">{unit}</span>}
      </div>
      {hint && <p className="mt-1 text-[10px] leading-snug text-faint">{hint}</p>}
    </div>
  );
}

/**
 * A two-body circular-orbit sandbox: move the altitude slider and watch speed,
 * period, footprint and latency change together.
 */
export function AltitudeLab() {
  const [alt, setAlt] = useState(550);

  const m = useMemo(() => {
    const a = EARTH_RADIUS_KM + alt;
    const v = Math.sqrt(MU_KM3_S2 / a);
    const periodSec = 2 * Math.PI * Math.sqrt(a ** 3 / MU_KM3_S2);
    const cov = coverageInfo(alt);
    const lambdaDeg = (cov.lambdaRad * 180) / Math.PI;
    const satsForCoverage = 2 / (1 - Math.cos(cov.lambdaRad));
    return { v, periodSec, cov, lambdaDeg, satsForCoverage };
  }, [alt]);

  // Drawing geometry
  const CX = 340;
  const CY = 560;
  const R = 260;
  // Altitude is exaggerated 6x so the geometry stays legible; the footprint
  // angle λ is still computed from the true radius and altitude.
  const hs = (alt / EARTH_RADIUS_KM) * R * 6;
  const lambda = m.cov.lambdaRad;
  const horizonL = { x: CX - Math.sin(lambda) * R, y: CY - Math.cos(lambda) * R };
  const horizonR = { x: CX + Math.sin(lambda) * R, y: CY - Math.cos(lambda) * R };
  const satY = CY - R - hs;
  const arcL = { x: CX - Math.sin(lambda) * R, y: CY - Math.cos(lambda) * R };
  const arcR = { x: CX + Math.sin(lambda) * R, y: CY - Math.cos(lambda) * R };

  const pct = ((alt - MIN_H) / (MAX_H - MIN_H)) * 100;

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Orbit sandbox</h3>
          <p className="mt-0.5 text-[11px] text-faint">
            Move the satellite. Everything else follows from two-body physics.
          </p>
        </div>
        <span className="rounded-full border border-signal/30 bg-signal/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-signal">
          {alt} km altitude
        </span>
      </div>

      <div className="grid gap-px bg-white/[0.07] lg:grid-cols-[1fr_1fr]">
        <div className="figure-scroll bg-[#060b16]">
          <svg viewBox="0 0 700 420" className="block w-full" role="img" aria-label="Cross-section geometry of a satellite footprint at the chosen altitude">
            <defs>
              <linearGradient id="al-sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#070f1d" />
                <stop offset="100%" stopColor="#040810" />
              </linearGradient>
              <radialGradient id="al-earth" cx="50%" cy="20%" r="80%">
                <stop offset="0%" stopColor="#164a5c" />
                <stop offset="55%" stopColor="#0c2a3a" />
                <stop offset="100%" stopColor="#061320" />
              </radialGradient>
              <linearGradient id="al-beam" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3ddbd9" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#3ddbd9" stopOpacity="0.35" />
              </linearGradient>
            </defs>

            <rect width="700" height="420" fill="url(#al-sky)" />

            {/* Earth */}
            <circle cx={CX} cy={CY} r={R} fill="url(#al-earth)" />
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="#2f7f8c" strokeWidth="1.3" />
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="#3ddbd9" strokeOpacity="0.25" strokeWidth="0.7" />

            {/* footprint arc */}
            <path
              d={`M ${arcL.x} ${arcL.y} A ${R} ${R} 0 0 1 ${arcR.x} ${arcR.y}`}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="5"
              strokeOpacity="0.5"
              strokeLinecap="round"
            />

            {/* beam cone */}
            <polygon
              points={`${CX},${satY} ${horizonL.x},${horizonL.y} ${horizonR.x},${horizonR.y}`}
              fill="url(#al-beam)"
            />
            <line x1={CX} y1={satY} x2={horizonL.x} y2={horizonL.y} stroke="#3ddbd9" strokeOpacity="0.65" strokeWidth="1.2" />
            <line x1={CX} y1={satY} x2={horizonR.x} y2={horizonR.y} stroke="#3ddbd9" strokeOpacity="0.65" strokeWidth="1.2" />
            <line x1={CX} y1={satY} x2={CX} y2={CY - R} stroke="#7ee7e2" strokeOpacity="0.45" strokeDasharray="4 5" />

            {/* satellite */}
            <g transform={`translate(${CX} ${satY})`}>
              <circle r="16" fill="#3ddbd9" opacity="0.12" />
              <rect x="-9" y="-5" width="18" height="10" rx="2" fill="#14394a" stroke="#7ee7e2" strokeWidth="1.3" />
              <rect x="-22" y="-4" width="11" height="8" fill="#10293a" stroke="#3ddbd9" />
              <rect x="11" y="-4" width="11" height="8" fill="#10293a" stroke="#3ddbd9" />
            </g>

            {/* altitude label */}
            <line x1={CX + 118} y1={satY} x2={CX + 118} y2={CY - R} stroke="#8b9bb9" strokeOpacity="0.4" />
            <line x1={CX + 112} y1={satY} x2={CX + 124} y2={satY} stroke="#8b9bb9" strokeOpacity="0.5" />
            <line x1={CX + 112} y1={CY - R} x2={CX + 124} y2={CY - R} stroke="#8b9bb9" strokeOpacity="0.5" />
            <text x={CX + 128} y={(satY + CY - R) / 2} style={{ fontSize: 11.8, fontFamily: "JetBrains Mono, monospace" }} fill="#cfe9ff">
              {alt} km
            </text>

            {/* radius label */}
            <text x={CX - 130} y={400} style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace" }} fill="#6b8ba3">
              R = 6,371 km
            </text>

            {/* lambda */}
            <text x={CX + 20} y={CY - R + 40} style={{ fontSize: 10.5, fontFamily: "JetBrains Mono, monospace" }} fill="#fbbf24">
              λ = {m.lambdaDeg.toFixed(1)}°
            </text>
            <text x={CX} y={satY - 26} textAnchor="middle" style={{ fontSize: 9.5, fontFamily: "JetBrains Mono, monospace", letterSpacing: 0.9 }} fill="#68809e">
              SATELLITE
            </text>

            <text x="20" y="30" style={{ fontSize: 9.5, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1.6 }} fill="#5f7595">
              GEOMETRIC HORIZON · 0° ELEVATION
            </text>
            <text x="20" y="46" style={{ fontSize: 8.5, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1.2 }} fill="#465873">
              ALTITUDE EXAGGERATED 6× · RADIUS TO SCALE
            </text>
          </svg>
        </div>

        <div className="bg-[#060b16] p-5">
          <label className="block">
            <span className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
              Altitude
              <span className="text-signal">{alt} km</span>
            </span>
            <input
              type="range"
              min={MIN_H}
              max={MAX_H}
              step={10}
              value={alt}
              onChange={(e) => setAlt(Number(e.target.value))}
              className="mt-3 w-full accent-[#3ddbd9]"
              aria-label="Orbit altitude in kilometres"
            />
            <div className="mt-1 flex justify-between font-mono text-[9px] text-faint">
              <span>300 km</span>
              <span>2,000 km</span>
            </div>
          </label>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              { label: "Starlink", h: 550 },
              { label: "480 km (new)", h: 480 },
              { label: "ISS", h: 410 },
              { label: "Polar shell", h: 560 },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setAlt(p.h)}
                className={cn(
                  "rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors",
                  alt === p.h
                    ? "border-signal/50 bg-signal/10 text-signal"
                    : "border-white/10 text-faint hover:border-white/25 hover:text-muted",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <Readout label="Orbital speed" value={m.v.toFixed(2)} unit="km/s" hint={`${Math.round(m.v * 3600).toLocaleString("en-US")} km/h`} />
            <Readout label="Orbit period" value={(m.periodSec / 60).toFixed(1)} unit="min" hint={`${(m.periodSec / 3600).toFixed(2)} hours per lap`} />
            <Readout label="Footprint width" value={Math.round(m.cov.capDiameterKm).toLocaleString("en-US")} unit="km" hint="at the geometric horizon" />
            <Readout label="One-way light time" value={m.cov.minLatencyMs.toFixed(1)} unit="ms" hint={`${m.cov.maxLatencyMs.toFixed(1)} ms at the footprint edge`} />
          </div>

          <div className="mt-3 rounded-xl border border-laser/20 bg-laser/[0.05] p-3">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-laser/80">
                Satellites for full coverage
              </span>
              <span className="font-mono text-sm text-laser">
                ≈{Math.ceil(m.satsForCoverage).toLocaleString("en-US")}
              </span>
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-faint">
              The theoretical floor for single-fold geometric coverage of a sphere — no margin for
              overlap, capacity or polar geometry. Real constellations run hundreds of times higher;
              lower orbits push the number up.
            </p>
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-gradient-to-r from-signal/60 to-laser/70" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-faint">
            Drag through the range: altitude is a trade. Lower is lower latency and easier disposal;
            higher is wider coverage per satellite and slower orbital decay.
          </p>
        </div>
      </div>
    </div>
  );
}
