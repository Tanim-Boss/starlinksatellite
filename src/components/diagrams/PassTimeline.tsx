import { useMemo } from "react";

const MIN_ELEV = 25;
const DURATION = 12; // minutes
const PEEL_A = { start: 0.8, end: 8.4, peak: 4.6 };
const PEEL_B = { start: 4.4, end: 12, peak: 8.2 };

function elevation(t: number, p: { start: number; end: number; peak: number }) {
  if (t <= p.start || t >= p.end) return 0;
  const half = (p.end - p.start) / 2;
  const mid = (p.start + p.end) / 2;
  const v = Math.cos(((t - mid) / half) * (Math.PI / 2));
  return Math.max(0, 88 * v);
}

/** Elevation of two successive satellites, with the handover marked. */
export function PassTimeline() {
  const W = 660;
  const H = 300;
  const PL = 46;
  const PR = 20;
  const PT = 24;
  const PB = 46;

  const x = (t: number) => PL + (t / DURATION) * (W - PL - PR);
  const y = (e: number) => H - PB - (e / 90) * (H - PT - PB);

  const samples = useMemo(
    () => Array.from({ length: 181 }, (_, i) => (i / 180) * DURATION),
    [],
  );

  const pathA = samples.map((t) => `${x(t).toFixed(1)},${y(elevation(t, PEEL_A)).toFixed(1)}`).join(" ");
  const pathB = samples.map((t) => `${x(t).toFixed(1)},${y(elevation(t, PEEL_B)).toFixed(1)}`).join(" ");

  const handoverT = useMemo(() => {
    for (let t = PEEL_A.peak; t < PEEL_A.end; t += 0.01) {
      if (elevation(t, PEEL_B) > elevation(t, PEEL_A) && elevation(t, PEEL_B) > MIN_ELEV) return t;
    }
    return 6.2;
  }, []);

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Two passes, one connection</h3>
          <p className="mt-0.5 text-[11px] text-faint">
            Elevation of the satellite above your horizon over 12 minutes
          </p>
        </div>
        <span className="rounded-full border border-signal/30 bg-signal/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-signal">
          handover at ≈{handoverT.toFixed(1)} min
        </span>
      </div>

      <div className="figure-scroll bg-[#060b16] px-2 pb-0 pt-3 md:px-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Chart of elevation angle for two successive satellites, showing the moment the terminal hands over">
          <defs>
            <linearGradient id="pt-a" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3ddbd9" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3ddbd9" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* grid */}
          {[0, 30, 60, 90].map((e) => (
            <g key={e}>
              <line x1={PL} x2={W - PR} y1={y(e)} y2={y(e)} stroke="rgba(148,176,224,0.09)" />
              <text x={PL - 8} y={y(e) + 3} textAnchor="end" style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace" }} fill="#687d9e">
                {e}°
              </text>
            </g>
          ))}
          {[0, 2, 4, 6, 8, 10, 12].map((t) => (
            <text key={t} x={x(t)} y={H - PB + 18} textAnchor="middle" style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace" }} fill="#687d9e">
              {t}m
            </text>
          ))}

          {/* below-horizon / unusable */}
          <rect x={PL} y={y(MIN_ELEV)} width={W - PL - PR} height={H - PB - y(MIN_ELEV)} fill="rgba(248,113,113,0.05)" />
          <line x1={PL} x2={W - PR} y1={y(MIN_ELEV)} y2={y(MIN_ELEV)} stroke="#f87171" strokeOpacity="0.5" strokeDasharray="3 5" />
          <text x={W - PR - 4} y={y(MIN_ELEV) - 6} textAnchor="end" style={{ fontSize: 9.4, fontFamily: "JetBrains Mono, monospace", letterSpacing: 0.8 }} fill="#f87171">
            BELOW {MIN_ELEV}° · UNUSABLE
          </text>

          {/* areas + curves */}
          <polygon points={`${x(0)},${H - PB} ${pathA} ${x(DURATION)},${H - PB}`} fill="url(#pt-a)" />
          <polyline points={pathA} fill="none" stroke="#3ddbd9" strokeWidth="2" />
          <polyline points={pathB} fill="none" stroke="#a78bfa" strokeWidth="2" strokeOpacity="0.9" />

          {/* handover */}
          <line x1={x(handoverT)} x2={x(handoverT)} y1={PT} y2={H - PB} stroke="#fbbf24" strokeDasharray="3 4" strokeOpacity="0.8" />
          <circle cx={x(handoverT)} cy={y(elevation(handoverT, PEEL_A))} r="4" fill="#fbbf24" />
          <rect x={x(handoverT) + 6} y={PT + 2} width="106" height="34" rx="6" fill="#0b1524" stroke="rgba(251,191,36,0.35)" />
          <text x={x(handoverT) + 12} y={PT + 15} style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", letterSpacing: 0.8 }} fill="#fbbf24">
            HANDOVER
          </text>
          <text x={x(handoverT) + 12} y={PT + 27} style={{ fontSize: 8.8, fontFamily: "JetBrains Mono, monospace" }} fill="#8b9bb9">
            new link up, then old
          </text>

          {/* labels */}
          <text x={x(PEEL_A.peak)} y={y(elevation(PEEL_A.peak, PEEL_A)) - 10} textAnchor="middle" style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1 }} fill="#7ee7e2">
            SATELLITE A
          </text>
          <text x={x(PEEL_B.peak)} y={y(elevation(PEEL_B.peak, PEEL_B)) - 10} textAnchor="middle" style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1 }} fill="#c4b5fd">
            SATELLITE B
          </text>

          <text x={PL} y={H - 8} style={{ fontSize: 9.4, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1.2 }} fill="#5f7595">
            TIME SINCE FIRST ACQUISITION · ILLUSTRATIVE PASS GEOMETRY
          </text>
        </svg>
      </div>

      <div className="grid gap-px border-t border-white/[0.07] bg-white/[0.07] sm:grid-cols-3">
        {[
          { t: "Acquire", d: "The terminal finds a satellite above its minimum elevation and locks a beam." },
          { t: "Hand over", d: "Before A drops below the threshold, B is already high enough to take over." },
          { t: "Repeat", d: "Every few minutes, for as long as you use the link. Usually invisible." },
        ].map((s) => (
          <div key={s.t} className="bg-[#060b16] p-4">
            <h4 className="font-mono text-[9px] uppercase tracking-[0.14em] text-signal/80">{s.t}</h4>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{s.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
