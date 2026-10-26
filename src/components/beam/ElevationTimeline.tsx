import { useMemo, useRef } from "react";
import {
  BEAM_MASK_DEG,
  BEAM_PREPARE_SEC,
  formatClock,
  sampleTrack,
  type BeamTimeline,
  type BeamTrack,
} from "@/lib/beam";

const W = 760;
const H = 240;
const PL = 40;
const PR = 16;
const PT = 18;
const PB = 30;
const WINDOW = 480;
const FONT = '"JetBrains Mono", monospace';

function satHue(id: number) {
  return 176 + ((id * 37) % 70);
}

interface Props {
  timeline: BeamTimeline;
  time: number;
  target: BeamTrack | null;
  next: BeamTrack | null;
  onSeek: (t: number) => void;
}

export function ElevationTimeline({ timeline, time, target, next, onSeek }: Props) {
  const t0 = Math.min(Math.max(0, time - WINDOW / 2), timeline.durationSec - WINDOW);
  const t1 = t0 + WINDOW;
  const x = (t: number) => PL + ((t - t0) / (t1 - t0)) * (W - PL - PR);
  const y = (el: number) => PT + ((90 - Math.max(0, Math.min(90, el))) / 90) * (H - PT - PB);
  const dragging = useRef(false);

  const visibleTracks = useMemo(
    () =>
      timeline.tracks.filter((track) => {
        for (let t = t0; t <= t1; t += 8) {
          if (sampleTrack(track, t).el > 2) return true;
        }
        return false;
      }),
    [timeline, t0, t1],
  );

  const spans = useMemo(() => {
    const out: { id: number; start: number; end: number }[] = [];
    let prev = -1;
    let start = 0;
    for (let i = 0; i < timeline.serving.length; i++) {
      const id = timeline.serving[i];
      if (id !== prev) {
        if (prev >= 0) out.push({ id: prev, start, end: (i - 1) * timeline.stepSec });
        prev = id;
        start = i * timeline.stepSec;
      }
    }
    if (prev >= 0) out.push({ id: prev, start, end: (timeline.serving.length - 1) * timeline.stepSec });
    return out;
  }, [timeline]);

  const curve = (track: BeamTrack) => {
    const parts: string[] = [];
    let pen = false;
    let lastX = 0;
    let lastY = 0;
    for (let t = t0; t <= t1; t += 4) {
      const look = sampleTrack(track, t);
      if (look.el < 0) {
        pen = false;
        continue;
      }
      const px = x(t);
      const py = y(look.el);
      const jump = pen && Math.hypot(px - lastX, py - lastY) > 90;
      parts.push(`${!pen || jump ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`);
      pen = true;
      lastX = px;
      lastY = py;
    }
    return parts.join(" ");
  };

  const seek = (clientX: number, el: SVGSVGElement) => {
    const rect = el.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const svgX = frac * W;
    const t = t0 + ((svgX - PL) / (W - PL - PR)) * (t1 - t0);
    onSeek(Math.max(0, Math.min(timeline.durationSec, t)));
  };

  const targetLook = target ? sampleTrack(target, time) : null;
  const handoversInWindow = timeline.handovers.filter((h) => h.tSec >= t0 && h.tSec <= t1);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-none"
        role="img"
        aria-label={`Elevation over time for satellites in view between ${formatClock(t0)} and ${formatClock(t1)}. The serving satellite ${target ? target.name : "none"} is highlighted. Click to move through the session.`}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          seek(e.clientX, e.currentTarget);
        }}
        onPointerMove={(e) => {
          if (dragging.current) seek(e.clientX, e.currentTarget);
        }}
        onPointerUp={(e) => {
          dragging.current = false;
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
        style={{ cursor: "crosshair" }}
      >
        <rect width={W} height={H} fill="#050a13" />

        {/* Unusable band */}
        <rect x={PL} y={y(BEAM_MASK_DEG)} width={W - PL - PR} height={H - PB - y(BEAM_MASK_DEG)} fill="rgba(248,113,113,0.05)" />
        <line x1={PL} x2={W - PR} y1={y(BEAM_MASK_DEG)} y2={y(BEAM_MASK_DEG)} stroke="#f87171" strokeOpacity="0.45" strokeDasharray="3 5" />
        <text x={W - PR - 2} y={y(BEAM_MASK_DEG) - 5} textAnchor="end" fill="#f87171" style={{ fontFamily: FONT, fontSize: 7.6, letterSpacing: 0.8 }}>
          MASK {BEAM_MASK_DEG}°
        </text>

        {/* Prep windows */}
        {handoversInWindow.map((h) => {
          const a = Math.max(t0, h.tSec - BEAM_PREPARE_SEC);
          if (a >= h.tSec || h.fromId === null) return null;
          return (
            <rect
              key={`prep-${h.tSec}`}
              x={x(a)}
              y={PT}
              width={Math.max(1, x(h.tSec) - x(a))}
              height={H - PT - PB}
              fill="rgba(251,191,36,0.05)"
              stroke="rgba(251,191,36,0.16)"
            />
          );
        })}

        {/* Grid */}
        {[0, 30, 60, 90].map((el) => (
          <g key={el}>
            <line x1={PL} x2={W - PR} y1={y(el)} y2={y(el)} stroke="rgba(148,176,224,0.08)" />
            <text x={PL - 7} y={y(el) + 3} textAnchor="end" fill="#5f7595" style={{ fontFamily: FONT, fontSize: 7.8 }}>
              {el}°
            </text>
          </g>
        ))}
        {[t0, (t0 + t1) / 2, t1].map((t) => (
          <text key={t} x={x(t)} y={H - 8} textAnchor={t === t0 ? "start" : t === t1 ? "end" : "middle"} fill="#5f7595" style={{ fontFamily: FONT, fontSize: 7.8 }}>
            {formatClock(t)}
          </text>
        ))}

        {/* All visible satellites */}
        {visibleTracks.map((track) => {
          if (target?.satId === track.satId || next?.satId === track.satId) return null;
          const d = curve(track);
          if (!d) return null;
          return (
            <path
              key={track.satId}
              d={d}
              fill="none"
              stroke={`hsla(${satHue(track.satId)}, 55%, 62%, 0.24)`}
              strokeWidth="1"
            />
          );
        })}

        {/* Next satellite */}
        {next && (
          <path d={curve(next)} fill="none" stroke="#fbbf24" strokeOpacity="0.75" strokeWidth="1.5" strokeDasharray="4 4" />
        )}

        {/* Serving satellite */}
        {target && <path d={curve(target)} fill="none" stroke="#3ddbd9" strokeWidth="2.1" />}

        {/* Handovers */}
        {handoversInWindow.map((h) => (
          <g key={`ho-${h.tSec}`}>
            <line x1={x(h.tSec)} x2={x(h.tSec)} y1={PT} y2={H - PB} stroke="#fbbf24" strokeOpacity="0.35" strokeDasharray="2 4" />
            <path
              d={`M ${x(h.tSec)} ${H - PB - 5} l 3.4 -3.4 l 3.4 3.4 l -3.4 3.4 Z`}
              fill="#fbbf24"
              fillOpacity="0.9"
            />
          </g>
        ))}

        {/* Playhead */}
        <line x1={x(time)} x2={x(time)} y1={PT} y2={H - PB} stroke="#e9effc" strokeOpacity="0.75" strokeWidth="1" />
        {targetLook && targetLook.el > 0 && (
          <circle cx={x(time)} cy={y(targetLook.el)} r="3.4" fill="#7ee7e2" stroke="#04121a" strokeWidth="1" />
        )}

        <text x={PL} y={11} fill="#8a9cb4" style={{ fontFamily: FONT, fontSize: 8, letterSpacing: 1 }}>
          ELEVATION OF EVERY SATELLITE IN VIEW · 8 MIN WINDOW
        </text>
        <text x={W - PR} y={11} textAnchor="end" fill="#5f7595" style={{ fontFamily: FONT, fontSize: 8 }}>
          DRAG TO SCRUB
        </text>
      </svg>

      {/* Session strip */}
      <div className="border-t border-white/[0.07] px-4 pb-2 pt-2.5">
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-faint">
            The session · each block is one satellite in service
          </p>
          <p className="font-mono text-[8.5px] text-faint">
            {timeline.handovers.filter((h) => h.fromId !== null).length} handovers / 30 min ·{" "}
            <span className="text-signal">{target ? target.name : "no link"}</span>
          </p>
        </div>
        <svg
          viewBox="0 0 760 34"
          className="block h-auto w-full touch-none"
          role="img"
          aria-label="Timeline of which satellite served the terminal across the 30 minute session."
          onPointerDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            onSeek(frac * timeline.durationSec);
          }}
          style={{ cursor: "pointer" }}
        >
          <rect width="760" height="34" fill="#050a13" rx="5" />
          {spans.map((span) => {
            const sx = (span.start / timeline.durationSec) * 760;
            const sw = Math.max(1, ((span.end - span.start) / timeline.durationSec) * 760);
            const isNow = time >= span.start && time < span.end;
            return (
              <rect
                key={`${span.id}-${span.start}`}
                x={sx + 0.5}
                y="8"
                width={Math.max(1, sw - 1)}
                height="18"
                rx="2"
                fill={`hsla(${satHue(span.id)}, 55%, 58%, ${isNow ? 0.75 : 0.28})`}
              >
                <title>{`SAT ${span.id} · ${formatClock(span.start)} → ${formatClock(span.end)}`}</title>
              </rect>
            );
          })}
          <line
            x1={(time / timeline.durationSec) * 760}
            x2={(time / timeline.durationSec) * 760}
            y1="3"
            y2="31"
            stroke="#e9effc"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </div>
  );
}
