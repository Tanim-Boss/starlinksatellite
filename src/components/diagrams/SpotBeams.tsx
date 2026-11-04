import { useState } from "react";

const BANDS = [
  { id: 1, color: "#3ddbd9", label: "Band 1" },
  { id: 2, color: "#60a5fa", label: "Band 2" },
  { id: 3, color: "#a78bfa", label: "Band 3" },
  { id: 4, color: "#fbbf24", label: "Band 4" },
];

const ROWS = 4;
const COLS = 8;

function hexPoints(cx: number, cy: number, rx: number, ry: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    return `${cx + Math.cos(a) * rx},${cy + Math.sin(a) * ry}`;
  }).join(" ");
}

/**
 * A satellite paints many small cells on the ground rather than one big
 * footprint. Neighbouring cells use different frequency bands so they don't
 * interfere; the same band is reused across the footprint.
 */
export function SpotBeams() {
  const [hover, setHover] = useState<number | null>(null);

  const cells: { x: number; y: number; rx: number; ry: number; band: number; key: string }[] = [];
  for (let r = 0; r < ROWS; r++) {
    const scale = 0.72 + r * 0.11;
    const rx = 44 * scale;
    const ry = 15 * scale;
    const y = 206 + r * 27;
    for (let c = 0; c < COLS; c++) {
      const x = 320 + (c - (COLS - 1) / 2) * (rx * 1.62) + (r % 2 === 0 ? 0 : rx * 0.81);
      if (x < 26 || x > 614) continue;
      const band = (c + r * 2) % 4;
      cells.push({ x, y, rx, ry, band, key: `${r}-${c}` });
    }
  }

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-white">One satellite, many cells</h3>
          <p className="mt-0.5 text-[11px] text-faint">
            Frequency reuse, exactly like a cellular network — but upside down
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BANDS.map((b) => (
            <span key={b.id} className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.08em] text-faint">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: b.color }} />
              {b.label}
            </span>
          ))}
        </div>
      </div>

      <div className="figure-scroll bg-[#060b16]">
        <svg viewBox="0 0 640 370" className="w-full" role="img" aria-label="Diagram of a satellite projecting many hexagonal spot beams onto the ground, with frequency bands reused across cells">
          <defs>
            <linearGradient id="sb-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#070f1d" />
              <stop offset="100%" stopColor="#04080f" />
            </linearGradient>
            <linearGradient id="sb-ground" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0b1c29" />
              <stop offset="100%" stopColor="#061019" />
            </linearGradient>
            <linearGradient id="sb-beam" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3ddbd9" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#3ddbd9" stopOpacity="0.02" />
            </linearGradient>
            <radialGradient id="sb-satglow">
              <stop offset="0%" stopColor="#3ddbd9" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3ddbd9" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="640" height="370" fill="url(#sb-sky)" />

          {/* ground */}
          <path d="M-20 370 Q 320 236 660 370 Z" fill="url(#sb-ground)" />
          <path d="M-20 370 Q 320 236 660 370" fill="none" stroke="#25506a" strokeWidth="1.1" />

          {/* beam to hovered cell */}
          {hover !== null && cells[hover] && (
            <g>
              <polygon
                points={`320,92 ${cells[hover].x - cells[hover].rx},${cells[hover].y} ${cells[hover].x + cells[hover].rx},${cells[hover].y}`}
                fill="url(#sb-beam)"
              />
              <line
                x1="320"
                y1="92"
                x2={cells[hover].x}
                y2={cells[hover].y}
                stroke="#7ee7e2"
                strokeWidth="1.2"
                strokeDasharray="4 5"
              />
            </g>
          )}

          {/* cells */}
          {cells.map((cell, i) => {
            const b = BANDS[cell.band];
            const on = hover === i;
            return (
              <g
                key={cell.key}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer" }}
              >
                <polygon
                  points={hexPoints(cell.x, cell.y, cell.rx - 1.5, cell.ry - 1)}
                  fill={b.color}
                  fillOpacity={on ? 0.34 : 0.13}
                  stroke={b.color}
                  strokeOpacity={on ? 0.95 : 0.5}
                  strokeWidth={on ? 1.4 : 0.8}
                />
                {on && (
                  <text
                    x={cell.x}
                    y={cell.y - cell.ry - 8}
                    textAnchor="middle"
                    style={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1 }}
                    fill={b.color}
                  >
                    {b.label.toUpperCase()} · SPOT BEAM
                  </text>
                )}
              </g>
            );
          })}

          {/* satellite */}
          <g transform="translate(320 66)">
            <circle r="52" fill="url(#sb-satglow)" />
            <g transform="scale(0.85)">
              <rect x="-40" y="-8" width="20" height="16" rx="2" fill="#10293a" stroke="#3ddbd9" />
              <rect x="20" y="-8" width="20" height="16" rx="2" fill="#10293a" stroke="#3ddbd9" />
              <rect x="-15" y="-12" width="30" height="24" rx="3" fill="#14394a" stroke="#7ee7e2" strokeWidth="1.4" />
              <rect x="-11" y="14" width="22" height="4" rx="1.5" fill="#0d2534" stroke="#3ddbd9" strokeWidth="0.9" />
            </g>
            <text y="-26" textAnchor="middle" style={{ fontSize: 9.4, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1.4 }} fill="#6f8ea8">
              PHASED ARRAY · MULTI-BEAM
            </text>
          </g>

          <text x="320" y="352" textAnchor="middle" style={{ fontSize: 9.4, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1.4 }} fill="#60799a">
            ONE SPOT BEAM ≈ A FEW TENS OF KM ACROSS · SCHEMATIC
          </text>
        </svg>
      </div>

      <div className="border-t border-white/[0.07] p-5">
        <p className="max-w-2xl text-[12px] leading-relaxed text-muted">
          Each beam is a cell. Adjacent cells use different frequency bands so neighbouring traffic
          doesn&apos;t collide; the same four bands are reused again and again across the footprint.
          The catch is capacity: everyone inside one cell shares that cell&apos;s slice of the
          satellite&apos;s throughput. Dense areas run out first.
        </p>
      </div>
    </div>
  );
}
