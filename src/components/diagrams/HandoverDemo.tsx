import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/useMediaQuery";

const W = 900;
const DISH_X = 450;
const SAT_Y = 150;
const GROUND_Y = 296;
const SPEED = 46; // px per second
const IN_VIEW = 250;

/**
 * Shows why a moving constellation still feels like a fixed connection:
 * satellites slide across the sky, the terminal tracks whichever is best,
 * and the link is handed over before the current one sets.
 */
export function HandoverDemo() {
  const reduced = useReducedMotion();
  const [t, setT] = useState(0);
  const [log, setLog] = useState<{ id: number; at: number }[]>([]);
  const lastTarget = useRef<number | null>(null);
  const tRef = useRef(0);

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      tRef.current += dt * SPEED;
      acc += dt;
      if (acc > 0.06) {
        acc = 0;
        setT(tRef.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  // Satellites loop across the view, staggered.
  const sats = [-0.55, 0.02, 0.58].map((offset, i) => {
    const raw = ((t * 0.001 + offset) % 1 + 1) % 1;
    const x = -140 + raw * (W + 280);
    return { id: 4471 + i * 17, x, y: SAT_Y + (i === 1 ? 14 : 0) };
  });

  // Choose the satellite closest to overhead and in view.
  const candidates = sats.filter((s) => Math.abs(s.x - DISH_X) < IN_VIEW);
  candidates.sort((a, b) => Math.abs(a.x - DISH_X) - Math.abs(b.x - DISH_X));
  const target = candidates[0] ?? null;

  useEffect(() => {
    if (!target) return;
    if (lastTarget.current !== target.id) {
      lastTarget.current = target.id;
      setLog((l) => [{ id: target.id, at: Date.now() }, ...l].slice(0, 3));
    }
  }, [target?.id]);

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Handover, illustrated</h3>
          <p className="mt-0.5 text-[11px] text-faint">One link at a time — until the next satellite takes over</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-signal/30 bg-signal/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-signal">
          <span className="h-1.5 w-1.5 rounded-full bg-signal animate-blink" />
          {target ? `linked · sat ${target.id}` : "re-acquiring"}
        </span>
      </div>

      <div className="figure-scroll">
      <svg viewBox={`0 0 ${W} 320`} className="w-full" role="img" aria-label="Animation of satellites moving across the sky while a ground terminal hands off its link from one satellite to the next">
        <defs>
          <linearGradient id="ho-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#071020" />
            <stop offset="100%" stopColor="#050a14" />
          </linearGradient>
          <linearGradient id="ho-beam" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#3ddbd9" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3ddbd9" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="ho-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0c1c28" />
            <stop offset="100%" stopColor="#050c14" />
          </linearGradient>
          <radialGradient id="ho-glow">
            <stop offset="0%" stopColor="#3ddbd9" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3ddbd9" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width={W} height="320" fill="url(#ho-sky)" />

        {/* altitude / sky grid */}
        {[116, 150, 184, 218, 252].map((y) => (
          <line key={y} x1="0" x2={W} y1={y} y2={y} stroke="rgba(148,176,224,0.06)" strokeDasharray="2 10" />
        ))}
        <line x1="0" x2={W} y1={SAT_Y + 42} y2={SAT_Y + 42} stroke="rgba(61,219,217,0.2)" strokeDasharray="3 8" />
        <text x="14" y={SAT_Y + 2} style={{ fontSize: 10.6, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1.2 }} fill="#60799a">
          550 km · LEO
        </text>

        {/* footprint bands */}
        {sats.map((s) => {
          const r = 150;
          const isTarget = target?.id === s.id;
          return (
            <g key={`f${s.id}`}>
              <ellipse
                cx={s.x}
                cy="292"
                rx={r}
                ry="14"
                fill={isTarget ? "rgba(61,219,217,0.13)" : "rgba(61,219,217,0.045)"}
                stroke={isTarget ? "rgba(61,219,217,0.45)" : "rgba(61,219,217,0.14)"}
              />
            </g>
          );
        })}

        {/* ground */}
        <path d={`M0 ${GROUND_Y} H900 V320 H0 Z`} fill="url(#ho-ground)" />
        <line x1="0" x2="900" y1={GROUND_Y} y2={GROUND_Y} stroke="#2b5871" strokeWidth="1.2" />

        {/* house + dish */}
        <g transform={`translate(${DISH_X} ${GROUND_Y}) scale(1.25)`}>
          <path d="M-32 0 L-32 -26 L32 -26 L32 0 Z" fill="#0e2030" stroke="#33526f" />
          <path d="M-40 -26 L0 -50 L40 -26" fill="none" stroke="#3b5f7d" strokeWidth="2" strokeLinejoin="round" />
          <rect x="-9" y="-16" width="18" height="10" rx="1.5" fill="#132a3c" stroke="#2d5875" strokeWidth="0.8" />
          <g transform="translate(-22 -52)">
            <rect x="-9" y="-4" width="18" height="4" rx="2" fill="#123244" stroke="#3ddbd9" strokeWidth="1" />
            <rect x="-1" y="0" width="2" height="5" fill="#2c4a63" />
          </g>
        </g>

        {/* satellites */}
        {sats.map((s) => {
          const isTarget = target?.id === s.id;
          return (
            <g key={s.id} transform={`translate(${s.x} ${s.y})`}>
              {isTarget && <circle r="42" fill="url(#ho-glow)" />}
              <g transform="scale(0.62)">
                <rect x="-40" y="-8" width="20" height="16" rx="2" fill="#10293a" stroke={isTarget ? "#3ddbd9" : "#2c6a75"} />
                <rect x="20" y="-8" width="20" height="16" rx="2" fill="#10293a" stroke={isTarget ? "#3ddbd9" : "#2c6a75"} />
                <rect x="-14" y="-12" width="28" height="24" rx="3" fill="#14394a" stroke={isTarget ? "#7ee7e2" : "#39778a"} strokeWidth="1.4" />
                <rect x="-9" y="14" width="18" height="4" rx="2" fill="#0e2634" stroke={isTarget ? "#3ddbd9" : "#2c6a75"} />
              </g>
              <text
                y="-30"
                textAnchor="middle"
                style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", letterSpacing: 0.8 }}
                fill={isTarget ? "#7ee7e2" : "#455a72"}
              >
                {s.id}
              </text>
            </g>
          );
        })}

        {/* active beam */}
        {target && (
          <g>
            <path
              d={`M${DISH_X - 22} ${GROUND_Y - 54} L ${target.x} ${target.y + 16} L ${DISH_X + 22} ${GROUND_Y - 54}`}
              fill="url(#ho-beam)"
              opacity="0.45"
            />
            <line
              x1={DISH_X - 22}
              y1={GROUND_Y - 54}
              x2={target.x}
              y2={target.y + 14}
              stroke="#3ddbd9"
              strokeWidth="1.6"
              className="animate-dash"
            />
            <circle cx={target.x} cy={target.y + 14} r="2.6" fill="#e8fffe" />
          </g>
        )}

        <text x="450" y="315" textAnchor="middle" style={{ fontSize: 9.5, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1.4 }} fill="#5f7595">
          THE FOOTPRINTS MOVE WITH THE SATELLITES
        </text>
      </svg>
      </div>

      <div className="grid gap-px border-t border-white/[0.07] bg-white/[0.07] sm:grid-cols-[1fr_auto]">
        <div className="bg-[#060b16] p-5">
          <h4 className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
            What you don&apos;t notice
          </h4>
          <ol className="mt-3 space-y-2 text-[13px] leading-relaxed text-muted">
            <li className="flex gap-2.5">
              <span className="font-mono text-[11px] text-signal">01</span>
              <span>A satellite sinks toward the horizon as another rises behind it.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="font-mono text-[11px] text-signal">02</span>
              <span>
                The network schedules the next link <span className="text-ink">before</span> the old
                one drops — make-before-break.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="font-mono text-[11px] text-signal">03</span>
              <span>Your traffic moves to the new satellite; the old link is released.</span>
            </li>
          </ol>
        </div>
        <div className="bg-[#060b16] p-5 sm:w-56">
          <h4 className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
            Link log
          </h4>
          <ul className="mt-3 space-y-2">
            {log.length === 0 && (
              <li className="font-mono text-[11px] text-faint">waiting for first lock…</li>
            )}
            {log.map((entry, i) => (
              <li
                key={`${entry.id}-${entry.at}`}
                className="flex items-center justify-between gap-2 font-mono text-[11px]"
              >
                <span className={i === 0 ? "text-signal" : "text-faint"}>SAT {entry.id}</span>
                <span className={i === 0 ? "text-ink" : "text-faint/70"}>
                  {i === 0 ? "linked" : "released"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] leading-relaxed text-faint">
            Illustrative timing. Real handovers are scheduled by the network from precise orbit
            predictions and terminal telemetry.
          </p>
        </div>
      </div>
    </div>
  );
}
