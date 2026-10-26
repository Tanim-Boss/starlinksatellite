import { memo, useMemo } from "react";
import {
  BEAM_FLOOR_DEG,
  BEAM_MASK_DEG,
  BEAM_PREPARE_SEC,
  compassPoint,
  lastHandover,
  sampleTrack,
  type BeamTimeline,
  type BeamTrack,
  type Pointing,
} from "@/lib/beam";

/* Geometry of the sky map ------------------------------------------------- */

const W = 720;
const H = 600;
const CX = W / 2;
const CY = 300;
const R = 246;
const DEG = Math.PI / 180;
const MASK_R = R * ((90 - BEAM_MASK_DEG) / 90);
const FONT = '"JetBrains Mono", monospace';

/** Azimuthal projection: zenith at the centre, horizon at the rim, north up. */
function mapPoint(el: number, az: number) {
  const r = (R * (90 - el)) / 90;
  const a = (az - 90) * DEG;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STARS = (() => {
  const rnd = mulberry32(20261026);
  return Array.from({ length: 170 }, () => {
    const a = rnd() * Math.PI * 2;
    const r = (0.16 + Math.sqrt(rnd()) * 0.83) * R;
    return {
      x: CX + Math.cos(a) * r,
      y: CY + Math.sin(a) * r,
      r: 0.45 + rnd() * 1.05,
      o: 0.14 + rnd() * 0.5,
    };
  });
})();

const RINGS = [30, 60, 75];
const CARDINALS = [
  { az: 0, label: "N" },
  { az: 90, label: "E" },
  { az: 180, label: "S" },
  { az: 270, label: "W" },
];
const INTERCARDINALS = [
  { az: 45, label: "NE" },
  { az: 135, label: "SE" },
  { az: 225, label: "SW" },
  { az: 315, label: "NW" },
];

const HALO = {
  stroke: "#050a13",
  strokeWidth: 3,
  paintOrder: "stroke" as const,
  strokeLinejoin: "round" as const,
};

/* Static backdrop --------------------------------------------------------- */

const Backdrop = memo(function Backdrop() {
  return (
    <>
      <circle cx={CX} cy={CY} r={R} fill="url(#bm-sky)" />
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(148,176,224,0.22)" strokeWidth="1.4" />
      <g clipPath="url(#bm-clip)">
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#cfe3ff" opacity={s.o} />
        ))}
        {Array.from({ length: 12 }, (_, i) => i * 30).map((az) => {
          const outer = mapPoint(0, az);
          const cardinal = az % 90 === 0;
          return (
            <line
              key={az}
              x1={CX}
              y1={CY}
              x2={outer.x}
              y2={outer.y}
              stroke={cardinal ? "rgba(148,176,224,0.15)" : "rgba(148,176,224,0.06)"}
              strokeDasharray={cardinal ? undefined : "2 8"}
            />
          );
        })}
        {RINGS.map((el) => {
          const rr = (R * (90 - el)) / 90;
          return (
            <g key={el}>
              <circle cx={CX} cy={CY} r={rr} fill="none" stroke="rgba(148,176,224,0.12)" strokeDasharray="2 6" />
              <text
                x={CX + rr * 0.075 + 4}
                y={CY - rr * 0.985}
                fill="#5f7595"
                style={{ fontFamily: FONT, fontSize: 8.4, letterSpacing: 0.8 }}
              >
                {el}°
              </text>
            </g>
          );
        })}
        <circle cx={CX} cy={CY} r={MASK_R} fill="none" stroke="rgba(248,113,113,0.4)" strokeDasharray="4 5" />
        <path
          d={`M ${CX - MASK_R} ${CY} A ${MASK_R} ${MASK_R} 0 1 0 ${CX + MASK_R} ${CY} A ${MASK_R} ${MASK_R} 0 1 0 ${CX - MASK_R} ${CY} Z M ${CX - R} ${CY} A ${R} ${R} 0 1 1 ${CX + R} ${CY} A ${R} ${R} 0 1 1 ${CX - R} ${CY} Z`}
          fill="rgba(248,113,113,0.045)"
          fillRule="evenodd"
        />
        <text
          x={CX + ((MASK_R + R) / 2) * 0.706}
          y={CY + ((MASK_R + R) / 2) * 0.706 + 3}
          textAnchor="middle"
          fill="#f87171"
          fillOpacity="0.6"
          style={{ fontFamily: FONT, fontSize: 7.6, letterSpacing: 1.1 }}
        >
          BELOW {BEAM_MASK_DEG}°
        </text>
      </g>
    </>
  );
});

const Rim = memo(function Rim() {
  return (
    <g>
      {CARDINALS.map(({ az, label }) => {
        const p = mapPoint(0, az);
        const dx = p.x - CX;
        const dy = p.y - CY;
        const len = Math.hypot(dx, dy) || 1;
        return (
          <text
            key={label}
            x={CX + (dx / len) * (R + 17)}
            y={CY + (dy / len) * (R + 17) + 4}
            textAnchor="middle"
            fill="#c6d8ef"
            style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, letterSpacing: 1 }}
          >
            {label}
          </text>
        );
      })}
      {INTERCARDINALS.map(({ az, label }) => {
        const p = mapPoint(0, az);
        const dx = p.x - CX;
        const dy = p.y - CY;
        const len = Math.hypot(dx, dy) || 1;
        return (
          <text
            key={label}
            x={CX + (dx / len) * (R + 19)}
            y={CY + (dy / len) * (R + 19) + 3}
            textAnchor="middle"
            fill="#5f7595"
            style={{ fontFamily: FONT, fontSize: 8, letterSpacing: 0.6 }}
          >
            {label}
          </text>
        );
      })}
    </g>
  );
});

/* Trails ------------------------------------------------------------------ */

function trailPath(track: BeamTrack, from: number, to: number, step = 5) {
  const parts: string[] = [];
  let pen = false;
  let lastX = 0;
  let lastY = 0;
  for (let t = from; t <= to; t += step) {
    const look = sampleTrack(track, t);
    if (look.el < 0.5) {
      pen = false;
      continue;
    }
    const p = mapPoint(look.el, look.az);
    const jump = pen && Math.hypot(p.x - lastX, p.y - lastY) > 110;
    parts.push(`${!pen || jump ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
    pen = true;
    lastX = p.x;
    lastY = p.y;
  }
  return parts.join(" ");
}

function isUpInWindow(track: BeamTrack, from: number, to: number) {
  for (let t = from; t <= to; t += 15) {
    if (sampleTrack(track, t).el >= 0.5) return true;
  }
  return false;
}

interface Marker {
  track: BeamTrack;
  el: number;
  az: number;
  x: number;
  y: number;
  nudged: boolean;
}

/**
 * Satellites served by the same spot beam can land on almost the same pixel of
 * this projection. Relax the markers a few pixels apart so every one stays
 * visible and clickable — the trails keep the exact geometry.
 */
function relaxMarkers(items: { track: BeamTrack; el: number; az: number; x: number; y: number }[]): Marker[] {
  const markers = items.map((m) => ({ ...m, nudged: false }));
  const MIN = 15;
  for (let pass = 0; pass < 6; pass++) {
    let moved = false;
    for (let i = 0; i < markers.length; i++) {
      for (let j = i + 1; j < markers.length; j++) {
        const a = markers[i];
        const b = markers[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d >= MIN) continue;
        if (d < 0.001) {
          dx = 0.7;
          dy = 0.7;
          d = 0.99;
        }
        const push = (MIN - d) / 2;
        const ux = dx / d;
        const uy = dy / d;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
        a.nudged = true;
        b.nudged = true;
        moved = true;
      }
    }
    for (const m of markers) {
      const dx = m.x - CX;
      const dy = m.y - CY;
      const d = Math.hypot(dx, dy);
      const limit = R - 8;
      if (d > limit) {
        m.x = CX + (dx / d) * limit;
        m.y = CY + (dy / d) * limit;
      }
    }
    if (!moved) break;
  }
  return markers;
}

/* Component --------------------------------------------------------------- */

export interface SkyMapProps {
  timeline: BeamTimeline;
  time: number;
  target: BeamTrack | null;
  pointing: Pointing | null;
  next: { track: BeamTrack; inSec: number } | null;
  hoverId: number | null;
  manualId: number | null;
  playing: boolean;
  onHover: (id: number | null) => void;
  onLock: (id: number) => void;
}

export function SkyMap({
  timeline,
  time,
  target,
  pointing,
  next,
  hoverId,
  manualId,
  playing,
  onHover,
  onLock,
}: SkyMapProps) {
  const last = timeline.count - 1;

  const trails = useMemo(() => {
    const from = Math.max(0, time - 50);
    const to = Math.min(last, time + 130);
    return timeline.tracks
      .filter((track) => isUpInWindow(track, from, to))
      .map((track) => ({
        track,
        past: trailPath(track, from, Math.min(time, to)),
        future: trailPath(track, Math.max(from, time), to),
      }));
  }, [timeline, time, last]);

  const markers = useMemo(() => {
    const items: { track: BeamTrack; el: number; az: number; x: number; y: number }[] = [];
    for (const { track } of trails) {
      const look = sampleTrack(track, time);
      if (look.el < 0.5) continue;
      const p = mapPoint(look.el, look.az);
      items.push({ track, el: look.el, az: look.az, x: p.x, y: p.y });
    }
    return relaxMarkers(items);
  }, [trails, time]);

  const markerById = useMemo(() => new Map(markers.map((m) => [m.track.satId, m])), [markers]);

  const handover = lastHandover(timeline, time);
  const pingAge = handover ? time - handover.tSec : Infinity;
  const preparing = Boolean(next && next.inSec <= BEAM_PREPARE_SEC);
  const tip = pointing ? mapPoint(pointing.el, pointing.az) : null;
  const hovered = hoverId !== null ? markerById.get(hoverId) ?? null : null;

  const beamLen = tip ? Math.hypot(tip.x - CX, tip.y - CY) || 1 : 1;
  const ux = tip ? (tip.x - CX) / beamLen : 0;
  const uy = tip ? (tip.y - CY) / beamLen : 0;
  const px = -uy;
  const py = ux;
  const wedgeTip = 16 + beamLen * 0.05;

  const labelFor = (m: Marker) => {
    const dx = m.x - CX;
    const dy = m.y - CY;
    const len = Math.hypot(dx, dy) || 1;
    let side: "start" | "end" | "middle" = dx / len > 0.3 ? "start" : dx / len < -0.3 ? "end" : "middle";
    let lx = m.x + (dx / len) * 20;
    let ly = Math.min(H - 34, Math.max(30, m.y + (dy / len) * 20));
    if (lx > W - 26 && side === "start") {
      side = "end";
      lx = m.x - 18;
    } else if (lx < 26 && side === "end") {
      side = "start";
      lx = m.x + 18;
    }
    const dxUnit = dx / len;
    const dyUnit = dy / len;
    // Keep the text outside the halo of the marker it belongs to.
    const pad = side === "middle" ? 14 : 6;
    return {
      x: lx + dxUnit * pad,
      y: ly + dyUnit * pad + (side === "middle" ? (dyUnit <= 0 ? -2 : 10) : 3),
      anchor: side,
    };
  };

  const renderLabel = (m: Marker, tone: "active" | "next" | "hover") => {
    const g = labelFor(m);
    const color = tone === "active" ? "#7ee7e2" : tone === "next" ? "#fbbf24" : "#ffffff";
    return (
      <g key={`lbl-${m.track.satId}`} pointerEvents="none">
        <line x1={m.x} y1={m.y} x2={g.x} y2={g.y} stroke={color} strokeOpacity="0.35" strokeWidth="1" />
        <text x={g.x} y={g.y} textAnchor={g.anchor} fill={color} {...HALO} style={{ fontFamily: FONT, fontSize: 10.5, letterSpacing: 0.4 }}>
          {m.track.name}
        </text>
        <text
          x={g.x}
          y={g.y + 12}
          textAnchor={g.anchor}
          fill={color}
          fillOpacity="0.75"
          {...HALO}
          style={{ fontFamily: FONT, fontSize: 8.6 }}
        >
          {m.el.toFixed(1)}° · {m.az.toFixed(0)}° az
        </text>
      </g>
    );
  };

  const targetMarker = target ? markerById.get(target.satId) ?? null : null;
  const nextMarker = preparing && next ? markerById.get(next.track.satId) ?? null : null;
  const beamTone = manualId !== null ? "#a78bfa" : "#3ddbd9";
  const others = markers.filter(
    (m) => m.track.satId !== target?.satId && m.track.satId !== (preparing ? next?.track.satId : -1),
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block h-auto w-full"
      role="img"
      aria-label={
        target
          ? `Sky map looking up from the terminal. The beam is locked on ${target.name}, ${pointing ? pointing.el.toFixed(0) : "?"} degrees elevation, azimuth ${pointing ? pointing.az.toFixed(0) : "?"}. ${preparing ? "The next satellite is being prepared." : "The beam follows the moving satellite."}`
          : "Sky map looking up from the terminal. No satellite is above the elevation mask."
      }
    >
      <defs>
        <radialGradient id="bm-sky" cx="50%" cy="46%" r="62%">
          <stop offset="0%" stopColor="#0b1a2c" />
          <stop offset="62%" stopColor="#070f1c" />
          <stop offset="100%" stopColor="#04080f" />
        </radialGradient>
        <radialGradient id="bm-halo">
          <stop offset="0%" stopColor="#3ddbd9" stopOpacity="0.5" />
          <stop offset="55%" stopColor="#3ddbd9" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#3ddbd9" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bm-dish">
          <stop offset="0%" stopColor="#3ddbd9" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#3ddbd9" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id="bm-beam"
          gradientUnits="userSpaceOnUse"
          x1={CX}
          y1={CY}
          x2={tip?.x ?? CX}
          y2={tip?.y ?? CY - 10}
        >
          <stop offset="0%" stopColor={beamTone} stopOpacity="0.4" />
          <stop offset="100%" stopColor={beamTone} stopOpacity="0.02" />
        </linearGradient>
        <clipPath id="bm-clip">
          <circle cx={CX} cy={CY} r={R - 0.5} />
        </clipPath>
      </defs>

      <Backdrop />

      <g clipPath="url(#bm-clip)">
        {/* Trails: every satellite that is up in this window */}
        {trails.map(({ track, past, future }) => {
          const isTarget = target?.satId === track.satId;
          const isNext = preparing && next?.track.satId === track.satId;
          const isHover = hoverId === track.satId;
          const color = isTarget ? "#3ddbd9" : isNext ? "#fbbf24" : isHover ? "#e9effc" : "#7c9cc4";
          return (
            <g key={`tr-${track.satId}`}>
              <path
                d={past}
                fill="none"
                stroke={color}
                strokeOpacity={isTarget ? 0.7 : isNext ? 0.5 : isHover ? 0.5 : 0.26}
                strokeWidth={isTarget ? 2.2 : isHover ? 1.6 : 1.1}
                strokeLinecap="round"
              />
              <path
                d={future}
                fill="none"
                stroke={color}
                strokeOpacity={isTarget ? 0.3 : isNext ? 0.35 : 0.16}
                strokeWidth={isTarget ? 1.8 : 1}
                strokeDasharray="4 6"
                strokeLinecap="round"
              />
            </g>
          );
        })}

        {/* The reserved link to the next satellite */}
        {preparing && nextMarker && (
          <g pointerEvents="none">
            <line
              x1={CX}
              y1={CY}
              x2={nextMarker.x}
              y2={nextMarker.y}
              stroke="#fbbf24"
              strokeOpacity="0.45"
              strokeWidth="1.2"
              strokeDasharray="3 7"
            />
            <circle
              cx={nextMarker.x}
              cy={nextMarker.y}
              r="12"
              fill="none"
              stroke="#fbbf24"
              strokeOpacity="0.55"
              strokeDasharray="3 4"
            />
          </g>
        )}

        {/* Hand-off trace: the path the beam just travelled */}
        {handover && handover.fromId !== null && pingAge >= 0 && pingAge < 24 && tip && (() => {
          const from = timeline.byId.get(handover.fromId);
          if (!from) return null;
          const look = sampleTrack(from, handover.tSec);
          const a = mapPoint(look.el, look.az);
          const mx = (a.x + tip.x) / 2;
          const my = (a.y + tip.y) / 2;
          const cxq = CX + (mx - CX) * 0.45;
          const cyq = CY + (my - CY) * 0.45;
          const fade = Math.max(0, 1 - pingAge / 24);
          return (
            <g pointerEvents="none" opacity={fade}>
              <path
                d={`M ${a.x} ${a.y} Q ${cxq} ${cyq} ${tip.x} ${tip.y}`}
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1.5"
                strokeDasharray="2 5"
                strokeOpacity="0.75"
              />
              <circle
                key={handover.tSec}
                className="beam-ping"
                cx={tip.x}
                cy={tip.y}
                r="10"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1.6"
              />
            </g>
          );
        })()}

        {/* While the beam is on its way, show where it is heading */}
        {pointing?.slewing && targetMarker && tip && (
          <g pointerEvents="none">
            <line
              x1={CX}
              y1={CY}
              x2={targetMarker.x}
              y2={targetMarker.y}
              stroke={beamTone}
              strokeOpacity="0.3"
              strokeWidth="1"
              strokeDasharray="2 8"
            />
            <circle cx={targetMarker.x} cy={targetMarker.y} r="15" fill="none" stroke={beamTone} strokeOpacity="0.35" />
          </g>
        )}

        {/* The beam itself */}
        {tip && (
          <g pointerEvents="none">
            <polygon
              points={`${CX + px * 7},${CY + py * 7} ${tip.x + px * wedgeTip},${tip.y + py * wedgeTip} ${tip.x - px * wedgeTip},${tip.y - py * wedgeTip} ${CX - px * 7},${CY - py * 7}`}
              fill="url(#bm-beam)"
            />
            <line
              x1={CX}
              y1={CY}
              x2={tip.x}
              y2={tip.y}
              stroke={beamTone}
              strokeWidth="1.5"
              strokeOpacity="0.9"
              strokeDasharray="3 7"
              className={playing ? "beam-flow" : undefined}
            />
            {[0.34, 0.56, 0.78].map((f) => {
              const cx = CX + (tip.x - CX) * f;
              const cy = CY + (tip.y - CY) * f;
              const half = 5 + f * 11;
              return (
                <line
                  key={f}
                  x1={cx + px * half}
                  y1={cy + py * half}
                  x2={cx - px * half}
                  y2={cy - py * half}
                  stroke="#7ee7e2"
                  strokeOpacity={0.16 + f * 0.18}
                  strokeWidth="1.1"
                />
              );
            })}
          </g>
        )}

        {/* Everything else in the sky */}
        {others.map((m) => {
          const usable = m.el >= BEAM_MASK_DEG;
          const isHover = hoverId === m.track.satId;
          const color = isHover ? "#ffffff" : usable ? "#a9c6e4" : "#5c718f";
          return (
            <g key={`m-${m.track.satId}`}>
              {m.nudged && (
                <circle cx={m.x} cy={m.y} r="8.5" fill="none" stroke={color} strokeOpacity="0.16" />
              )}
              <circle
                cx={m.x}
                cy={m.y}
                r={isHover ? 4.2 : usable ? 3 : 2.3}
                fill={color}
                opacity={usable ? 0.85 : 0.45}
              />
              <circle
                cx={m.x}
                cy={m.y}
                r="14"
                fill="transparent"
                style={{ cursor: usable ? "pointer" : "default" }}
                onPointerEnter={() => onHover(m.track.satId)}
                onPointerLeave={() => onHover(null)}
                onClick={() => usable && onLock(m.track.satId)}
              >
                <title>{`${m.track.name} · el ${m.el.toFixed(1)}° · az ${m.az.toFixed(0)}° · ${usable ? "click to lock" : "below mask"}`}</title>
              </circle>
            </g>
          );
        })}

        {/* The satellite being served, and the one being prepared */}
        {nextMarker && (
          <g pointerEvents="none">
            <circle cx={nextMarker.x} cy={nextMarker.y} r="4.6" fill="#fbbf24" />
            <circle cx={nextMarker.x} cy={nextMarker.y} r="3.2" fill="#04121a" opacity="0.5" />
          </g>
        )}
        {targetMarker && (
          <g>
            <circle cx={targetMarker.x} cy={targetMarker.y} r="24" fill="url(#bm-halo)" pointerEvents="none" />
            <circle
              cx={targetMarker.x}
              cy={targetMarker.y}
              r="10.5"
              fill="none"
              stroke="#3ddbd9"
              strokeOpacity="0.6"
              pointerEvents="none"
            />
            <circle cx={targetMarker.x} cy={targetMarker.y} r="5" fill="#3ddbd9" pointerEvents="none" />
            <circle
              cx={targetMarker.x}
              cy={targetMarker.y}
              r="16"
              fill="transparent"
              style={{ cursor: "pointer" }}
              onPointerEnter={() => onHover(targetMarker.track.satId)}
              onPointerLeave={() => onHover(null)}
            >
              <title>{`${targetMarker.track.name} · el ${targetMarker.el.toFixed(1)}° · az ${targetMarker.az.toFixed(0)}° · serving`}</title>
            </circle>
          </g>
        )}

        {/* Labels last, on top of everything */}
        {targetMarker && renderLabel(targetMarker, "active")}
        {!targetMarker && nextMarker && renderLabel(nextMarker, "next")}
        {hovered &&
          hovered.track.satId !== target?.satId &&
          hovered.track.satId !== next?.track.satId &&
          Math.hypot(hovered.x - (targetMarker?.x ?? -999), hovered.y - (targetMarker?.y ?? -999)) > 46 &&
          renderLabel(hovered, "hover")}

        {/* The terminal, at the centre of its own sky */}
        <circle cx={CX} cy={CY} r="26" fill="url(#bm-dish)" />
        <circle cx={CX} cy={CY} r="12" fill="#081420" stroke="rgba(61,219,217,0.5)" strokeWidth="1.1" />
        <path
          d={`M ${CX - 7} ${CY + 4} L ${CX + 7} ${CY + 4} L ${CX + 5} ${CY - 1} L ${CX - 5} ${CY - 1} Z`}
          fill="#d7f6f5"
          opacity="0.9"
        />
        <line x1={CX} y1={CY + 4} x2={CX} y2={CY + 9} stroke="#7ee7e2" strokeWidth="1.2" />
        <line x1={CX - 4} y1={CY + 9} x2={CX + 4} y2={CY + 9} stroke="#7ee7e2" strokeWidth="1.2" />
      </g>

      <Rim />

      <text x="18" y="26" fill="#8a9cb4" style={{ fontFamily: FONT, fontSize: 9.4, letterSpacing: 1.4 }}>
        SKY MAP · LOOKING STRAIGHT UP
      </text>
      <text x={W - 18} y="26" textAnchor="end" fill="#5f7595" style={{ fontFamily: FONT, fontSize: 9 }}>
        {timeline.observer.latLabel} {timeline.observer.lonLabel} · RIM = HORIZON
      </text>
      {pointing && (
        <text x="18" y={H - 16} fill="#7ee7e2" style={{ fontFamily: FONT, fontSize: 9.4, letterSpacing: 1.1 }}>
          BEAM {pointing.el.toFixed(1)}° EL · {compassPoint(pointing.az)} {pointing.az.toFixed(0)}°
        </text>
      )}
      <text x={W - 18} y={H - 16} textAnchor="end" fill="#5f7595" style={{ fontFamily: FONT, fontSize: 9 }}>
        {`${BEAM_FLOOR_DEG}° = SWITCH FLOOR`}
      </text>
    </svg>
  );
}

export function SkyMapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/[0.07] px-5 py-2.5 text-[9.5px] text-faint">
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-signal" /> serving satellite + beam
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-warn" /> next satellite / reserved link
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[#a9c6e4]" /> in view
      </span>
      <span className="flex items-center gap-1.5 text-[#f87171]/80">
        <span className="h-1.5 w-1.5 rounded-full border border-[#f87171]" /> below the {BEAM_MASK_DEG}° mask
      </span>
      <span className="ml-auto hidden sm:inline">Dashed track = where it is going</span>
    </div>
  );
}
