import { useEffect, useState } from "react";
import { useReducedMotion } from "@/lib/useMediaQuery";

const ARRAY_CX = 350;
const ARRAY_Y = 330;
const ARRAY_HALF = 150;
const ELEMENTS = 11;
const BEAM_LEN = 250;

/**
 * Beam steering without moving parts: the same signal, emitted from many
 * elements with a progressive delay, adds up in one direction only.
 */
export function PhasedArray() {
  const reduced = useReducedMotion();
  const [angle, setAngle] = useState(32); // degrees from vertical
  const [auto, setAuto] = useState(!reduced);

  useEffect(() => {
    if (!auto || reduced) return;
    let raf = 0;
    let t0 = performance.now();
    const loop = (now: number) => {
      const s = (now - t0) / 1000;
      setAngle(34 + 22 * Math.sin(s * 0.55));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [auto, reduced]);

  const rad = (angle * Math.PI) / 180;
  const satX = ARRAY_CX - Math.sin(rad) * BEAM_LEN;
  const satY = ARRAY_Y - Math.cos(rad) * BEAM_LEN;

  const phaseDeg = 180 * Math.sin(rad); // degrees of progressive delay (d = λ/2)
  const delayPs = 42 * Math.sin(rad);

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Steering a beam with timing</h3>
          <p className="mt-0.5 text-[11px] text-faint">
            No motors. Just the same signal, delayed by fractions of a nanosecond.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
          <input
            type="checkbox"
            checked={auto}
            onChange={(e) => setAuto(e.target.checked)}
            className="h-3.5 w-3.5 accent-[#3ddbd9]"
          />
          Track satellite
        </label>
      </div>

      <div className="grid gap-px bg-white/[0.07] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="figure-scroll bg-[#060b16]">
          <svg viewBox="0 0 700 420" className="w-full" role="img" aria-label="Diagram of a phased array steering a radio beam towards a satellite">
            <defs>
              <linearGradient id="pa-sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#071021" />
                <stop offset="100%" stopColor="#050b13" />
              </linearGradient>
              <linearGradient id="pa-beam" x1="0.5" y1="1" x2="0.5" y2="0">
                <stop offset="0%" stopColor="#3ddbd9" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#3ddbd9" stopOpacity="0.03" />
              </linearGradient>
              <radialGradient id="pa-hit">
                <stop offset="0%" stopColor="#3ddbd9" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#3ddbd9" stopOpacity="0" />
              </radialGradient>
            </defs>

            <rect width="700" height="420" fill="url(#pa-sky)" />
            <path d="M0 380 Q 350 356 700 380 L700 420 L0 420 Z" fill="#08131d" stroke="#1d3e4f" />

            {/* beam */}
            <polygon
              points={`${ARRAY_CX - 26},${ARRAY_Y - 4} ${satX - 18},${satY + 4} ${satX + 18},${satY + 4} ${ARRAY_CX + 26},${ARRAY_Y - 4}`}
              fill="url(#pa-beam)"
            />
            <line x1={ARRAY_CX} y1={ARRAY_Y - 6} x2={satX} y2={satY + 6} stroke="#3ddbd9" strokeWidth="1.4" strokeDasharray="4 6" />

            {/* wavefronts perpendicular to the beam */}
            {[0.28, 0.46, 0.64, 0.82].map((f) => {
              const cx = ARRAY_CX + (satX - ARRAY_CX) * f;
              const cy = ARRAY_Y + (satY - ARRAY_Y) * f;
              const w = 10 + f * 22;
              const perpX = Math.cos(rad) * w;
              const perpY = Math.sin(rad) * w;
              return (
                <line
                  key={f}
                  x1={cx - perpX}
                  y1={cy - perpY}
                  x2={cx + perpX}
                  y2={cy + perpY}
                  stroke="#7ee7e2"
                  strokeOpacity={0.15 + f * 0.2}
                  strokeWidth="1.2"
                />
              );
            })}

            {/* satellite */}
            <g transform={`translate(${satX} ${satY})`}>
              <circle r="30" fill="url(#pa-hit)" />
              <g transform="scale(0.62)">
                <rect x="-34" y="-8" width="18" height="16" rx="2" fill="#10293a" stroke="#3ddbd9" />
                <rect x="16" y="-8" width="18" height="16" rx="2" fill="#10293a" stroke="#3ddbd9" />
                <rect x="-13" y="-11" width="26" height="22" rx="3" fill="#14394a" stroke="#7ee7e2" strokeWidth="1.4" />
              </g>
            </g>
            <text
              x={satX}
              y={satY - 36}
              textAnchor="middle"
              style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1.2 }}
              fill="#7ee7e2"
            >
              TARGET
            </text>

            {/* array */}
            <g>
              <rect x={ARRAY_CX - 168} y={ARRAY_Y - 14} width="336" height="58" rx="6" fill="#0a1a26" stroke="#2c5a6e" />
              {Array.from({ length: ELEMENTS }).map((_, i) => {
                const x = ARRAY_CX - ARRAY_HALF + (i * (ARRAY_HALF * 2)) / (ELEMENTS - 1);
                const delay = (i / (ELEMENTS - 1)) * Math.abs(phaseDeg);
                const intensity = 0.35 + 0.6 * (1 - Math.abs(angle - 35) / 60);
                return (
                  <g key={i}>
                    <circle
                      cx={x}
                      cy={ARRAY_Y + 6}
                      r="5.2"
                      fill="#3ddbd9"
                      opacity={Math.min(0.95, intensity + 0.2)}
                    />
                    <circle cx={x} cy={ARRAY_Y + 6} r="8.6" fill="none" stroke="#3ddbd9" strokeOpacity="0.18" />
                    <rect
                      x={x - 4}
                      y={ARRAY_Y + 20}
                      width="8"
                      height={Math.max(2, (delay / 180) * 18)}
                      rx="1.5"
                      fill="#7ee7e2"
                      opacity="0.5"
                    />
                  </g>
                );
              })}
              <text
                x={ARRAY_CX}
                y={ARRAY_Y + 56}
                textAnchor="middle"
                style={{ fontSize: 9.4, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1.4 }}
                fill="#68809e"
              >
                PHASED ARRAY · DIFFERENT DELAY PER ELEMENT
              </text>
            </g>

            {/* angle arc */}
            <g>
              <path
                d={`M ${ARRAY_CX} ${ARRAY_Y - 108} A 108 108 0 0 ${angle > 0 ? 1 : 0} ${ARRAY_CX - Math.sin(rad) * 108} ${ARRAY_Y - Math.cos(rad) * 108}`}
                fill="none"
                stroke="#3ddbd9"
                strokeOpacity="0.4"
                strokeDasharray="2 4"
              />
              <line
                x1={ARRAY_CX}
                y1={ARRAY_Y - 8}
                x2={ARRAY_CX}
                y2={ARRAY_Y - 118}
                stroke="#3ddbd9"
                strokeOpacity="0.25"
                strokeDasharray="2 5"
              />
              <text
                x={ARRAY_CX + 10}
                y={ARRAY_Y - 96}
                style={{ fontSize: 11.8, fontFamily: "JetBrains Mono, monospace" }}
                fill="#7ee7e2"
              >
                {Math.round(angle)}°
              </text>
            </g>
          </svg>
        </div>

        <div className="flex flex-col justify-between bg-[#060b16] p-5">
          <div>
            <label className="block">
              <span className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                Beam angle
                <span className="text-signal">{Math.round(angle)}°</span>
              </span>
              <input
                type="range"
                min={4}
                max={62}
                step={0.5}
                value={angle}
                onChange={(e) => {
                  setAngle(Number(e.target.value));
                  setAuto(false);
                }}
                className="mt-3 w-full accent-[#3ddbd9]"
                aria-label="Beam steering angle"
              />
            </label>

            <dl className="mt-5 space-y-2.5">
              <div className="flex items-baseline justify-between gap-3 border-b border-white/[0.06] pb-2">
                <dt className="text-[11px] text-faint">Phase step per element</dt>
                <dd className="font-mono text-xs text-ink">{Math.abs(phaseDeg).toFixed(0)}°</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-b border-white/[0.06] pb-2">
                <dt className="text-[11px] text-faint">Timing step</dt>
                <dd className="font-mono text-xs text-ink">{Math.abs(delayPs).toFixed(1)} ps</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[11px] text-faint">Moving parts</dt>
                <dd className="font-mono text-xs text-signal">none</dd>
              </div>
            </dl>

            <p className="mt-5 text-[12px] leading-relaxed text-muted">
              Every element radiates the same signal. Ripple the timing across the array and the
              wavefronts tilt — so the beam points sideways instead of straight up. Reverse the
              timing and it points the other way, which is why a terminal can track a satellite
              crossing the sky in seconds.
            </p>
          </div>

          <div className="mt-5 rounded-xl border border-signal/20 bg-signal/[0.05] p-3">
            <p className="font-mono text-[10px] leading-relaxed text-signal/90">
              Δφ = 2π · d · sin θ / λ
            </p>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-faint">
              With half-wavelength spacing at 12 GHz, a 30° steer needs roughly 90° of progressive
              phase per element — a delay of about 21 picoseconds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
