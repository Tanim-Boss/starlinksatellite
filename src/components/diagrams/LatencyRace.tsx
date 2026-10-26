import { useMemo, useState } from "react";
import { cn } from "@/utils/cn";

const C = 300000; // km/s in vacuum
const C_FIBRE = 200000; // km/s in glass, n ≈ 1.47
const STARLINK_ROUND_TRIP_OVERHEAD = 12; // ms, processing + network
const FIBRE_ROUND_TRIP_OVERHEAD = 4; // ms, switching + congestion
const DETOUR = 1.5; // fibre routes are rarely straight lines
const UP_DOWN_KM = 1100; // 2 × 550 km

const MAX_D = 20000;

function fibreRtt(d: number) {
  return (2 * ((d * DETOUR) / C_FIBRE)) * 1000 + FIBRE_ROUND_TRIP_OVERHEAD;
}
function starlinkRtt(d: number) {
  return (2 * ((d + UP_DOWN_KM) / C)) * 1000 + STARLINK_ROUND_TRIP_OVERHEAD;
}

// Distance where the two simplified models cross.
function crossoverKm() {
  const numerator = STARLINK_ROUND_TRIP_OVERHEAD - FIBRE_ROUND_TRIP_OVERHEAD + 2 * (UP_DOWN_KM / C) * 1000;
  const denom = 2 * ((DETOUR / C_FIBRE - 1 / C) * 1000);
  return numerator / denom;
}

export function LatencyRace() {
  const [d, setD] = useState(9000);
  const cross = useMemo(crossoverKm, []);
  const fibre = fibreRtt(d);
  const star = starlinkRtt(d);
  const faster = star < fibre ? "starlink" : "fibre";

  const W = 720;
  const H = 300;
  const PL = 54;
  const PR = 24;
  const PT = 22;
  const PB = 42;
  const maxY = 320;
  const x = (km: number) => PL + (km / MAX_D) * (W - PL - PR);
  const y = (ms: number) => H - PB - (Math.min(ms, maxY) / maxY) * (H - PT - PB);

  const samples = Array.from({ length: 61 }, (_, i) => (i / 60) * MAX_D);
  const fibrePath = samples.map((s) => `${x(s)},${y(fibreRtt(s))}`).join(" ");
  const starPath = samples.map((s) => `${x(s)},${y(starlinkRtt(s))}`).join(" ");

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Fibre vs. sky: the crossover</h3>
          <p className="mt-0.5 text-[11px] text-faint">
            Simplified light-time model — straight-line paths, fixed network overhead
          </p>
        </div>
        <span className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
          {Math.round(cross).toLocaleString("en-US")} km crossover
        </span>
      </div>

      <div className="figure-scroll bg-[#060b16] p-4 pb-0">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Chart comparing round-trip latency over fibre and through a Starlink laser mesh as distance increases">
          <defs>
            <linearGradient id="lr-fibre-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="lr-star-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3ddbd9" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#3ddbd9" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* grid */}
          {[0, 80, 160, 240, 320].map((v) => (
            <g key={v}>
              <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} stroke="rgba(148,176,224,0.09)" />
              <text x={PL - 10} y={y(v) + 3} textAnchor="end" style={{ fontSize: 10.6, fontFamily: "JetBrains Mono, monospace" }} fill="#687d9e">
                {v}
              </text>
            </g>
          ))}
          {[0, 5000, 10000, 15000, 20000].map((v) => (
            <g key={v}>
              <line x1={x(v)} x2={x(v)} y1={PT} y2={H - PB} stroke="rgba(148,176,224,0.05)" />
              <text x={x(v)} y={H - PB + 16} textAnchor="middle" style={{ fontSize: 10.6, fontFamily: "JetBrains Mono, monospace" }} fill="#687d9e">
                {v === 0 ? "0" : `${v / 1000}k`}
              </text>
            </g>
          ))}
          <text x={PL - 38} y={PT + 4} style={{ fontSize: 10.6, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1 }} fill="#687d9e">
            ms
          </text>
          <text x={W - PR} y={H - 8} textAnchor="end" style={{ fontSize: 10.6, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1 }} fill="#687d9e">
            SEPARATION (km)
          </text>

          {/* areas */}
          <polygon points={`${x(0)},${H - PB} ${fibrePath} ${x(MAX_D)},${H - PB}`} fill="url(#lr-fibre-area)" />
          <polygon points={`${x(0)},${H - PB} ${starPath} ${x(MAX_D)},${H - PB}`} fill="url(#lr-star-area)" />

          {/* curves */}
          <polyline points={fibrePath} fill="none" stroke="#fbbf24" strokeWidth="2" strokeOpacity="0.85" />
          <polyline points={starPath} fill="none" stroke="#3ddbd9" strokeWidth="2" />

          {/* crossover */}
          <line x1={x(cross)} x2={x(cross)} y1={PT} y2={H - PB} stroke="#a78bfa" strokeDasharray="3 5" strokeOpacity="0.7" />
          <circle cx={x(cross)} cy={y(fibreRtt(cross))} r="4" fill="#a78bfa" />
          <text x={x(cross) + 7} y={PT + 12} style={{ fontSize: 10.6, fontFamily: "JetBrains Mono, monospace" }} fill="#c4b5fd">
            crossover
          </text>

          {/* marker */}
          <line x1={x(d)} x2={x(d)} y1={PT} y2={H - PB} stroke="rgba(255,255,255,0.35)" strokeDasharray="2 4" />
          <circle cx={x(d)} cy={y(fibre)} r="4.5" fill="#fbbf24" stroke="#060b16" strokeWidth="2" />
          <circle cx={x(d)} cy={y(star)} r="4.5" fill="#3ddbd9" stroke="#060b16" strokeWidth="2" />

          {/* legend */}
          <g transform={`translate(${PL + 6} ${PT + 8})`}>
            <line x1="0" x2="16" y1="0" y2="0" stroke="#fbbf24" strokeWidth="2" />
            <text x="22" y="3" style={{ fontSize: 10.6, fontFamily: "JetBrains Mono, monospace" }} fill="#8b9bb9">
              FIBRE · 200,000 km/s
            </text>
            <line x1="150" x2="166" y1="0" y2="0" stroke="#3ddbd9" strokeWidth="2" />
            <text x="172" y="3" style={{ fontSize: 10.6, fontFamily: "JetBrains Mono, monospace" }} fill="#8b9bb9">
              STARLINK MESH · 300,000 km/s
            </text>
          </g>
        </svg>
      </div>

      <div className="border-t border-white/[0.07] p-5">
        <label className="block">
          <span className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            Distance between the two points
            <span className="text-ink">{d.toLocaleString("en-US")} km</span>
          </span>
          <input
            type="range"
            min={250}
            max={MAX_D}
            step={250}
            value={d}
            onChange={(e) => setD(Number(e.target.value))}
            className="mt-3 w-full accent-[#3ddbd9]"
            aria-label="Distance between the two points in kilometres"
          />
        </label>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          <div
            className={cn(
              "rounded-xl border p-3.5 transition-colors",
              faster === "fibre" ? "border-warn/40 bg-warn/[0.06]" : "border-white/[0.08] bg-white/[0.02]",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-warn">Fibre</span>
              {faster === "fibre" && (
                <span className="rounded-full bg-warn/15 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-warn">
                  faster
                </span>
              )}
            </div>
            <div className="mt-1 font-mono text-2xl font-semibold text-ink">
              {Math.round(fibre)}
              <span className="ml-1 text-xs text-faint">ms</span>
            </div>
            <p className="mt-1 text-[10px] text-faint">
              {Math.round(d * DETOUR).toLocaleString("en-US")} km of cable at two-thirds of c
            </p>
          </div>

          <div
            className={cn(
              "rounded-xl border p-3.5 transition-colors",
              faster === "starlink" ? "border-signal/40 bg-signal/[0.06]" : "border-white/[0.08] bg-white/[0.02]",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-signal">Starlink mesh</span>
              {faster === "starlink" && (
                <span className="rounded-full bg-signal/15 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-signal">
                  faster
                </span>
              )}
            </div>
            <div className="mt-1 font-mono text-2xl font-semibold text-ink">
              {Math.round(star)}
              <span className="ml-1 text-xs text-faint">ms</span>
            </div>
            <p className="mt-1 text-[10px] text-faint">
              {Math.round(d + UP_DOWN_KM).toLocaleString("en-US")} km through vacuum at c
            </p>
          </div>
        </div>

        <p className="mt-3 text-[10.5px] leading-relaxed text-faint">
          Model assumptions: fibre follows a 1.5× detour at 200,000 km/s with 4 ms of network
          overhead; the satellite route adds 1,100 km of vertical travel at c with 12 ms of
          processing and routing. It ignores capacity, congestion, peering and the fact that both
          systems are usually glassy for the last few hundred kilometres. Use it to build intuition,
          not to predict a speed test.
        </p>
      </div>
    </div>
  );
}
