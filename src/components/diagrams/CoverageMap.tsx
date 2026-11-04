import { useMemo, useState, type MouseEvent } from "react";
import * as THREE from "three";
import { KM_PER_UNIT, SATS, SHELLS, latLonToEarthFixed, satPosition } from "@/lib/astro";
import { simClock } from "@/lib/simClock";
import { WORLD_LAND_PATH, WORLD_VIEWBOX } from "@/lib/worldPath";
import { formatLat, formatLon } from "@/lib/format";
import { cn } from "@/utils/cn";

const GATEWAY_POINTS = [
  { lat: 33.92, lon: -118.33 },
  { lat: 47.45, lon: -122.3 },
  { lat: 39.62, lon: -104.92 },
  { lat: 32.88, lon: -96.85 },
  { lat: 41.95, lon: -87.72 },
  { lat: 33.85, lon: -84.4 },
  { lat: 25.77, lon: -80.32 },
  { lat: 40.73, lon: -73.94 },
  { lat: 51.5, lon: -0.13 },
  { lat: 35.62, lon: 139.78 },
  { lat: -33.87, lon: 151.21 },
  { lat: 1.35, lon: 103.82 },
  { lat: 19.08, lon: 72.88 },
  { lat: -23.55, lon: -46.63 },
  { lat: 52.52, lon: 13.4 },
  { lat: -1.29, lon: 36.82 },
];

const toXY = (lat: number, lon: number) => ({
  x: ((lon + 180) / 360) * 1000,
  y: ((90 - lat) / 180) * 500,
});

const _sat = new THREE.Vector3();
const _probe = new THREE.Vector3();

export function CoverageMap({ className }: { className?: string }) {
  const [probe, setProbe] = useState<{ lat: number; lon: number } | null>({
    lat: 23.8,
    lon: 90.4,
  });
  const [showFootprints, setShowFootprints] = useState(true);
  const [showBands, setShowBands] = useState(false);

  /** Count simulated satellites whose footprint contains the probe. */
  const coverage = useMemo(() => {
    if (!probe) return null;
    latLonToEarthFixed(probe.lat, probe.lon, _probe);
    const byShell = SHELLS.map((sh) => {
      const lambda = Math.acos(1 / (1 + sh.altitudeKm / KM_PER_UNIT));
      return (2 * lambda * 180) / Math.PI;
    });
    const counts = SHELLS.map(() => 0);
    let total = 0;
    for (const sat of SATS) {
      satPosition(sat, simClock.time, _sat);
      const ang = Math.acos(THREE.MathUtils.clamp(_sat.normalize().dot(_probe), -1, 1));
      if (ang <= (byShell[sat.shell] * Math.PI) / 180) {
        counts[sat.shell]++;
        total++;
      }
    }
    return { total, counts };
  }, [probe]);

  // Footprint circles for the 550 km shell, on a coarse grid.
  const footprints = useMemo(() => {
    const R = 6371;
    const h = 550;
    const lambda = (Math.acos(R / (R + h)) * 180) / Math.PI;
    const rx = (lambda / 360) * 1000;
    const pts: { x: number; y: number; rx: number; ry: number }[] = [];
    let row = 0;
    for (let lat = -60; lat <= 60; lat += 20) {
      const stagger = row % 2 === 0 ? 0 : 12.5;
      for (let lon = -172.5; lon <= 172.5; lon += 25) {
        const { x, y } = toXY(lat, lon + stagger);
        // An equirectangular projection stretches east–west near the poles.
        const stretch = Math.min(1.9, 1 / Math.max(0.4, Math.cos((lat * Math.PI) / 180)));
        pts.push({ x, y, rx: Math.min(120, rx * stretch), ry: (lambda / 180) * 500 });
      }
      row++;
    }
    return pts;
  }, []);

  const handleClick = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 1000;
    const y = ((e.clientY - rect.top) / rect.height) * 500;
    const lon = (x / 1000) * 360 - 180;
    const lat = 90 - (y / 500) * 180;
    setProbe({ lat, lon });
  };

  const probeXY = probe ? toXY(probe.lat, probe.lon) : null;

  return (
    <div className={cn("panel overflow-hidden", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Global coverage, projected flat</h3>
          <p className="mt-0.5 text-[11px] text-faint">
            Click the map to test a point against the simulated constellation
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setShowFootprints((v) => !v)}
            className={cn(
              "rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors",
              showFootprints
                ? "border-signal/40 bg-signal/10 text-signal"
                : "border-white/10 text-faint hover:text-muted",
            )}
          >
            Footprints
          </button>
          <button
            type="button"
            onClick={() => setShowBands((v) => !v)}
            className={cn(
              "rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors",
              showBands
                ? "border-laser/40 bg-laser/10 text-laser"
                : "border-white/10 text-faint hover:text-muted",
            )}
          >
            Inclination limits
          </button>
        </div>
      </div>

      <div className="figure-scroll bg-[#060b16]">
        <svg
          viewBox={WORLD_VIEWBOX}
          className="w-full cursor-crosshair"
          onClick={handleClick}
          role="img"
          aria-label="World map showing Starlink coverage footprints, gateways and inclination limits. Click to probe coverage at a location."
        >
          <defs>
            <linearGradient id="cm-ocean" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#071423" />
              <stop offset="100%" stopColor="#050c16" />
            </linearGradient>
            <radialGradient id="cm-probe">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </radialGradient>
            <pattern id="cm-graticule" width="83.333" height="41.666" patternUnits="userSpaceOnUse">
              <path d="M83.333 0H0V41.666" fill="none" stroke="rgba(140,170,220,0.08)" strokeWidth="0.8" />
            </pattern>
          </defs>

          <rect width="1000" height="500" fill="url(#cm-ocean)" />
          <rect width="1000" height="500" fill="url(#cm-graticule)" />

          {/* inclination bands */}
          {showBands && (
            <g>
              {SHELLS.slice(0, 2).map((sh, i) => {
                const yTop = toXY(sh.inclinationDeg, 0).y;
                const yBottom = toXY(-sh.inclinationDeg, 0).y;
                return (
                  <rect
                    key={sh.key}
                    x="0"
                    y={yTop + i * 0}
                    width="1000"
                    height={yBottom - yTop}
                    fill={sh.color}
                    fillOpacity={i === 0 ? 0.06 : 0.035}
                    stroke={sh.color}
                    strokeOpacity="0.35"
                    strokeDasharray="4 6"
                  />
                );
              })}
              <text x="14" y={toXY(53, 0).y - 6} style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1 }} fill="#22d3ee">
                53° SHELL LIMIT
              </text>
              <text x="14" y={toXY(-53, 0).y + 12} style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1 }} fill="#22d3ee">
                53° SHELL LIMIT
              </text>
            </g>
          )}

          {/* land */}
          <path d={WORLD_LAND_PATH} fill="rgba(74,120,142,0.26)" stroke="rgba(126,231,226,0.34)" strokeWidth="0.8" />

          {/* equator */}
          <line x1="0" x2="1000" y1="250" y2="250" stroke="rgba(148,176,224,0.18)" strokeDasharray="2 8" />

          {/* footprints */}
          {showFootprints && (
            <g>
              {footprints.map((f, i) => (
                <ellipse
                  key={i}
                  cx={f.x}
                  cy={f.y}
                  rx={f.rx}
                  ry={f.ry}
                  fill="rgba(61,219,217,0.05)"
                  stroke="rgba(61,219,217,0.22)"
                  strokeWidth="0.6"
                />
              ))}
            </g>
          )}

          {/* gateways */}
          {GATEWAY_POINTS.map((g, i) => {
            const { x, y } = toXY(g.lat, g.lon);
            return <circle key={i} cx={x} cy={y} r="2.4" fill="#a3e635" opacity="0.9" />;
          })}

          {/* probe */}
          {probeXY && probe && (
            <g>
              <circle cx={probeXY.x} cy={probeXY.y} r="34" fill="url(#cm-probe)" />
              <circle cx={probeXY.x} cy={probeXY.y} r="6" fill="none" stroke="#fbbf24" strokeOpacity="0.6" />
              <circle cx={probeXY.x} cy={probeXY.y} r="2.6" fill="#fbbf24" />
              <line x1={probeXY.x} y1={probeXY.y} x2={probeXY.x} y2={probeXY.y - 26} stroke="#fbbf24" strokeWidth="1" />
              <text
                x={probeXY.x + 6}
                y={probeXY.y - 30}
                style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace", letterSpacing: 0.8 }}
                fill="#fbbf24"
              >
                {formatLat(probe.lat)} {formatLon(probe.lon)}
              </text>
            </g>
          )}

          {/* legend */}
          <g transform="translate(14 466)">
            <circle cx="4" cy="-3" r="2.4" fill="#a3e635" />
            <text x="12" y="0" style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1 }} fill="#6b7f98">
              GATEWAY
            </text>
            <circle cx="86" cy="-3" r="2.6" fill="#fbbf24" />
            <text x="94" y="0" style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1 }} fill="#6b7f98">
              PROBE
            </text>
            <text x="150" y="0" style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1 }} fill="#5f7595">
              EQUIRECTANGULAR · NOT ALL SATELLITES SHOWN
            </text>
          </g>
        </svg>
      </div>

      <div className="grid gap-px border-t border-white/[0.07] bg-white/[0.07] sm:grid-cols-[1fr_auto]">
        <div className="bg-[#060b16] p-5">
          {probe && coverage ? (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <span className="text-3xl font-semibold leading-none text-warn">{coverage.total}</span>
                <span className="pb-0.5 text-xs text-muted">
                  simulated satellites currently see this point
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {SHELLS.map((sh, i) => (
                  <span
                    key={sh.key}
                    className="rounded-full border px-2 py-0.5 font-mono text-[9px]"
                    style={{ borderColor: `${sh.color}66`, color: sh.color }}
                  >
                    {sh.short}: {coverage.counts[i]}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[10.5px] leading-relaxed text-faint">
                Footprint = geometric horizon (0° elevation) for each shell. The real constellation
                has ≈11,000 satellites rather than the {SATS.length} drawn in this model, so a real
                point usually sees far more. Usable links require a higher elevation angle.
              </p>
            </>
          ) : (
            <p className="text-xs text-muted">Click anywhere on the map to probe coverage.</p>
          )}
        </div>
        <div className="bg-[#060b16] p-5 sm:w-56">
          <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            Footprint maths
          </h4>
          <p className="mt-2 font-mono text-[11px] leading-relaxed text-ink/80">
            λ = arccos(R / (R + h))
          </p>
          <p className="mt-1 text-[10.5px] leading-relaxed text-faint">
            At 550 km the cap subtends ≈23°, giving a circle roughly 5,000 km across — a little wider
            than the United States.
          </p>
        </div>
      </div>
    </div>
  );
}
