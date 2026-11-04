import { SHELLS } from "@/lib/astro";

const RINGS = [
  { shell: 0, rx: 138, ry: 54, rot: -22 },
  { shell: 2, rx: 146, ry: 58, rot: 34 },
  { shell: 3, rx: 152, ry: 62, rot: 70 },
];

/** Small schematic: shared-altitude shells with different inclinations. */
export function ShellDiagram() {
  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-white/[0.07] px-5 py-4">
        <h3 className="text-sm font-semibold text-white">Same altitude, different tilt</h3>
        <p className="mt-0.5 text-[11px] text-faint">
          Inclination decides which latitudes a shell can serve
        </p>
      </div>
      <div className="bg-[#060b16]">
        <svg viewBox="0 0 360 300" className="w-full" role="img" aria-label="Earth with three orbital planes at different inclinations">
          <defs>
            <radialGradient id="sd-earth" cx="40%" cy="34%">
              <stop offset="0%" stopColor="#1a5b70" />
              <stop offset="65%" stopColor="#0b2738" />
              <stop offset="100%" stopColor="#061320" />
            </radialGradient>
            <radialGradient id="sd-glow">
              <stop offset="0%" stopColor="#3ddbd9" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#3ddbd9" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle cx="180" cy="150" r="140" fill="url(#sd-glow)" />
          <circle cx="180" cy="150" r="66" fill="url(#sd-earth)" stroke="#2f7f8c" strokeWidth="1.1" />
          <ellipse cx="180" cy="150" rx="66" ry="66" fill="none" stroke="rgba(148,176,224,0.16)" />
          <path d="M180 84a66 66 0 0 0 0 132" fill="none" stroke="rgba(148,176,224,0.12)" />
          <path d="M114 150h132" stroke="rgba(148,176,224,0.12)" />

          {RINGS.map((r) => {
            const color = SHELLS[r.shell].color;
            return (
              <g key={r.shell} transform={`rotate(${r.rot} 180 150)`}>
                <ellipse
                  cx="180"
                  cy="150"
                  rx={r.rx}
                  ry={r.ry}
                  fill="none"
                  stroke={color}
                  strokeOpacity="0.55"
                  strokeWidth="1.2"
                  strokeDasharray={r.shell === 2 ? "5 4" : undefined}
                />
                {[0.2, 0.55, 0.85].map((f, i) => {
                  const a = f * Math.PI * 2;
                  return (
                    <g key={i}>
                      <circle cx={180 + Math.cos(a) * r.rx} cy={150 + Math.sin(a) * r.ry} r="6" fill={color} opacity="0.12" />
                      <circle cx={180 + Math.cos(a) * r.rx} cy={150 + Math.sin(a) * r.ry} r="2.3" fill={color} />
                    </g>
                  );
                })}
              </g>
            );
          })}

          <text x="180" y="286" textAnchor="middle" style={{ fontSize: 9.4, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1.6 }} fill="#60799a">
            ORBITAL PLANES · SCHEMATIC
          </text>
        </svg>
      </div>
      <div className="space-y-2 border-t border-white/[0.07] p-4">
        {SHELLS.map((sh) => (
          <div key={sh.key} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-[11.5px] text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: sh.color }} />
              {sh.short}
            </span>
            <span className="font-mono text-[10px] text-faint">
              {sh.altitudeKm} km · {sh.inclinationDeg}°
            </span>
          </div>
        ))}
        <p className="pt-1 text-[10px] leading-relaxed text-faint">
          A 53° orbit peaks at 53° latitude. Reaching the poles takes a near-polar orbit — and those
          planes crowd together near the top of the sphere, which is why polar coverage needs far
          fewer satellites.
        </p>
      </div>
    </div>
  );
}
