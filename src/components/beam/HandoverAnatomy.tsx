import { useEffect, useMemo, useRef, useState } from "react";
import {
  angleDelta,
  BEAM_FLOOR_DEG,
  BEAM_MASK_DEG,
  BEAM_PREPARE_SEC,
  BEAM_SLEW_SEC,
  compassPoint,
  formatClock,
  handoverDetail,
  linkHandovers,
  sampleTrack,
  wrap360,
  type BeamTimeline,
  type BeamTrack,
  type LookAngle,
} from "@/lib/beam";
import { useReducedMotion } from "@/lib/useMediaQuery";
import { cn } from "@/utils/cn";

/* Canvas ------------------------------------------------------------------ */

const W = 620;
const H = 512;
const CX = W / 2;
const CY = 258;
const R = 214;
const DEG = Math.PI / 180;
const FONT = '"JetBrains Mono", monospace';

const FROM = "#3ddbd9";
const TO = "#fbbf24";
const MASK = "#f87171";

/** How much session time either side of the switch this view shows. */
const LOOK_BACK = 90;
const LOOK_AHEAD = 70;
/** Playback rate of the walkthrough, in simulated seconds per real second. */
const SPEED = 8;

/** Azimuthal projection, zenith at the centre, north up. */
function mapPoint(el: number, az: number) {
  const e = Math.max(0, Math.min(90, el));
  const r = (R * (90 - e)) / 90;
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
  const rnd = mulberry32(77123);
  return Array.from({ length: 90 }, () => {
    const a = rnd() * Math.PI * 2;
    const r = (0.2 + Math.sqrt(rnd()) * 0.79) * R;
    return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r, r: 0.4 + rnd() * 0.9, o: 0.1 + rnd() * 0.4 };
  });
})();

const CARDINALS = [
  { az: 0, label: "N" },
  { az: 90, label: "E" },
  { az: 180, label: "S" },
  { az: 270, label: "W" },
];

/** Sky track of one satellite between two session times. */
function arcPath(track: BeamTrack, from: number, to: number, step = 2) {
  const parts: string[] = [];
  let pen = false;
  let lx = 0;
  let ly = 0;
  for (let t = from; t <= to; t += step) {
    const look = sampleTrack(track, t);
    if (look.el < 1) {
      pen = false;
      continue;
    }
    const p = mapPoint(look.el, look.az);
    const jump = pen && Math.hypot(p.x - lx, p.y - ly) > 130;
    parts.push(`${!pen || jump ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
    pen = true;
    lx = p.x;
    ly = p.y;
  }
  return parts.join(" ");
}

function labelPlacement(p: { x: number; y: number }, dist = 15) {
  const dx = p.x - CX;
  const dy = p.y - CY;
  const len = Math.hypot(dx, dy) || 1;
  const anchor = dx / len > 0.28 ? "start" : dx / len < -0.28 ? "end" : "middle";
  return { x: p.x + (dx / len) * dist, y: p.y + (dy / len) * dist + 3.4, anchor: anchor as "start" | "end" | "middle" };
}

/* Stage model -------------------------------------------------------------- */

const STAGES = [
  { k: "01", t: "Track", d: "one satellite, moving" },
  { k: "02", t: "Prepare", d: "next link reserved" },
  { k: "03", t: "Re-aim", d: "phase ramp rewritten" },
  { k: "04", t: "Locked", d: "new satellite in service" },
] as const;

function stageOf(tSec: number, switchSec: number) {
  if (tSec < switchSec - BEAM_PREPARE_SEC) return 0;
  if (tSec < switchSec) return 1;
  if (tSec < switchSec + BEAM_SLEW_SEC) return 2;
  return 3;
}

/* Component --------------------------------------------------------------- */

export function HandoverAnatomy({
  timeline,
  index,
  onIndex,
}: {
  timeline: BeamTimeline;
  index: number;
  onIndex: (next: number) => void;
}) {
  const reduced = useReducedMotion();
  const handovers = useMemo(() => linkHandovers(timeline), [timeline]);
  const sel = Math.max(0, Math.min(handovers.length - 1, index));
  const handover = handovers[sel];
  const detail = useMemo(() => handoverDetail(timeline, handover), [timeline, handover]);

  const winStart = Math.max(0, handover.tSec - LOOK_BACK);
  const winEnd = Math.min(timeline.durationSec, handover.tSec + LOOK_AHEAD);

  const [time, setTime] = useState(winStart);
  const [playing, setPlaying] = useState(!reduced);
  const acc = useRef(0);
  const dragging = useRef(false);

  // Selecting another handover restarts the walkthrough at the top of its window.
  useEffect(() => {
    setTime(winStart);
  }, [winStart, sel]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      acc.current += dt;
      if (acc.current >= 1 / 30) {
        const step = acc.current;
        acc.current = 0;
        setTime((t) => {
          const next = t + step * SPEED;
          return next >= winEnd ? winStart : next;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, winStart, winEnd]);

  const t = Math.max(winStart, Math.min(winEnd, time));
  const stage = stageOf(t, handover.tSec);

  const fromTrack = detail.from.track;
  const toTrack = detail.to.track;
  const lookFrom = sampleTrack(fromTrack, t);
  const lookTo = sampleTrack(toTrack, t);

  // The beam is on the old satellite, swings for BEAM_SLEW_SEC, then holds the new one.
  const pointing = useMemo<LookAngle>(() => {
    if (t < handover.tSec) return lookFrom;
    if (t >= handover.tSec + BEAM_SLEW_SEC) return lookTo;
    const start = sampleTrack(fromTrack, handover.tSec);
    const p = (t - handover.tSec) / BEAM_SLEW_SEC;
    const k = 1 - Math.pow(1 - p, 3);
    return {
      el: start.el + (lookTo.el - start.el) * k,
      az: wrap360(start.az + angleDelta(start.az, lookTo.az) * k),
      rangeKm: start.rangeKm + (lookTo.rangeKm - start.rangeKm) * k,
    };
  }, [t, handover.tSec, lookFrom, lookTo, fromTrack]);

  const arcFrom = useMemo(() => arcPath(fromTrack, winStart, winEnd), [fromTrack, winStart, winEnd]);
  const arcTo = useMemo(() => arcPath(toTrack, winStart, winEnd), [toTrack, winStart, winEnd]);
  const servedFrom = useMemo(
    () => arcPath(fromTrack, winStart, Math.min(winEnd, handover.tSec)),
    [fromTrack, winStart, winEnd, handover.tSec],
  );
  const servedTo = useMemo(
    () => arcPath(toTrack, Math.max(winStart, handover.tSec), winEnd),
    [toTrack, winStart, winEnd, handover.tSec],
  );

  const switchFrom = mapPoint(detail.from.look.el, detail.from.look.az);
  const switchTo = mapPoint(detail.to.look.el, detail.to.look.az);
  const tip = mapPoint(pointing.el, pointing.az);
  const beamLen = Math.hypot(tip.x - CX, tip.y - CY) || 1;
  const ux = (tip.x - CX) / beamLen;
  const uy = (tip.y - CY) / beamLen;
  const px = -uy;
  const py = ux;
  const wedge = 12 + beamLen * 0.055;
  const beamTone = t < handover.tSec ? FROM : TO;
  const fromPoint = mapPoint(lookFrom.el, lookFrom.az);
  const toPoint = mapPoint(lookTo.el, lookTo.az);
  const fromLabel = labelPlacement(fromPoint);
  const toLabel = labelPlacement(toPoint);
  // When the two spacecraft sit close together on the sky, flip the incoming
  // label to the far side so the names never sit on top of each other.
  const labelsClash = Math.hypot(fromLabel.x - toLabel.x, fromLabel.y - toLabel.y) < 54;
  if (labelsClash) {
    const dx = toPoint.x - CX;
    const dy = toPoint.y - CY;
    const len = Math.hypot(dx, dy) || 1;
    toLabel.x = toPoint.x - (dx / len) * 18;
    toLabel.y = toPoint.y - (dy / len) * 18 - 4;
    toLabel.anchor = dx / len > 0 ? "end" : "start";
  }

  // The incoming satellite is not always above the mask when the window opens.
  const incomingBelowMask = lookTo.el < BEAM_MASK_DEG;
  const maskCrossing = useMemo(() => {
    for (let v = winStart; v <= winEnd; v += 1) {
      if (sampleTrack(toTrack, v).el >= BEAM_MASK_DEG) return v;
    }
    return null;
  }, [toTrack, winStart, winEnd]);

  const seek = (clientX: number, el: SVGSVGElement) => {
    const rect = el.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setTime(winStart + frac * (winEnd - winStart));
  };

  const snapTo = (stageIndex: number) => {
    setPlaying(false);
    const target =
      stageIndex === 0
        ? Math.max(winStart, handover.tSec - BEAM_PREPARE_SEC - 25)
        : stageIndex === 1
          ? handover.tSec - BEAM_PREPARE_SEC / 2
          : stageIndex === 2
            ? handover.tSec + BEAM_SLEW_SEC / 2
            : Math.min(winEnd, handover.tSec + 45);
    setTime(target);
  };

  const narration =
    stage === 0
      ? `${fromTrack.name} is ${lookFrom.el.toFixed(0)}° above your horizon and sinking about ${Math.abs(detail.from.rateDegPerMin).toFixed(1)}° a minute. The beam is on it, and the panel on your roof has not moved a millimetre.`
      : stage === 1
        ? incomingBelowMask
          ? `Still on ${fromTrack.name} at ${lookFrom.el.toFixed(0)}°, while ${toTrack.name} is still under the ${BEAM_MASK_DEG}° mask at ${lookTo.el.toFixed(0)}°. It is the satellite this model has picked to take over, and it crosses into view${maskCrossing !== null ? ` at ${formatClock(maskCrossing)}` : " shortly"}.`
          : `Still on ${fromTrack.name} at ${lookFrom.el.toFixed(0)}°, while ${toTrack.name} is already up at ${lookTo.el.toFixed(0)}° in another part of the sky. The network reserves it now — the second link is up before the first one drops.`
        : stage === 2
          ? `${fromTrack.name} crossed ${BEAM_FLOOR_DEG}°. Every element's phase is rewritten and the beam swings ${detail.swingDeg.toFixed(0)}° across the sky onto ${toTrack.name}. The array retunes in microseconds; this drawing stretches it to ${BEAM_SLEW_SEC} s.`
          : `Beam locked on ${toTrack.name} at ${lookTo.el.toFixed(0)}°. ${fromTrack.name} keeps falling, drops under the ${BEAM_MASK_DEG}° mask and is released. A ${Math.round(timeline.durationSec / 60)}-minute session goes through ${handovers.length + 1} of these.`;

  const azFrom = detail.from.look.az;
  const azTo = detail.to.look.az;

  return (
    <div className="panel overflow-hidden">
      {/* Header ---------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3.5 md:px-5">
        <div>
          <h2 className="text-sm font-semibold text-white">One handover, frame by frame</h2>
          <p className="mt-0.5 max-w-xl text-[11px] leading-relaxed text-faint">
            A real switch from this session&apos;s geometry: two satellites, one beam, and the{" "}
            {detail.swingDeg.toFixed(0)}° it travels at {detail.clock}.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onIndex((sel - 1 + handovers.length) % handovers.length)}
            className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] text-muted hover:border-signal/60 hover:text-white"
            aria-label="Previous handover"
          >
            ←
          </button>
          <span className="min-w-[104px] rounded-full border border-white/10 px-2.5 py-1 text-center font-mono text-[9.5px] text-faint">
            switch {sel + 1}/{handovers.length} · {detail.clock}
          </span>
          <button
            type="button"
            onClick={() => onIndex((sel + 1) % handovers.length)}
            className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] text-muted hover:border-signal/60 hover:text-white"
            aria-label="Next handover"
          >
            →
          </button>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className={cn(
              "ml-1 min-w-[62px] rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
              playing ? "border-signal/40 text-ink" : "border-white/15 text-muted hover:text-white",
            )}
          >
            {playing ? "❚❚ Pause" : "▶ Play"}
          </button>
        </div>
      </div>

      {/* Stage stepper --------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-px border-b border-white/[0.07] bg-white/[0.07] sm:grid-cols-4">
        {STAGES.map((s, i) => (
          <button
            key={s.k}
            type="button"
            onClick={() => snapTo(i)}
            aria-pressed={stage === i}
            className={cn(
              "bg-[#060b16] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]",
              stage === i && "bg-signal/[0.07]",
            )}
          >
            <span className="flex items-baseline gap-1.5">
              <span className={cn("font-mono text-[9px]", stage === i ? "text-signal" : "text-faint/70")}>{s.k}</span>
              <span className={cn("text-[12px] font-medium", stage === i ? "text-white" : "text-muted")}>{s.t}</span>
            </span>
            <span className="mt-0.5 block font-mono text-[9px] text-faint">{s.d}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-px bg-white/[0.07] lg:grid-cols-[minmax(0,1fr)_324px]">
        {/* Sky plot ------------------------------------------------------ */}
        <div className="min-w-0 bg-[#050a13]">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="block h-auto w-full"
            role="img"
            aria-label={`Sky view of one handover. ${fromTrack.name} sinks along its track and ${toTrack.name} rises on the other side of the sky. At ${detail.clock}, when ${fromTrack.name} reaches ${detail.from.look.el.toFixed(1)} degrees elevation, the beam swings ${detail.swingDeg.toFixed(0)} degrees onto ${toTrack.name}.`}
          >
            <defs>
              <radialGradient id="ha-sky" cx="50%" cy="46%" r="62%">
                <stop offset="0%" stopColor="#0b1a2c" />
                <stop offset="62%" stopColor="#070f1c" />
                <stop offset="100%" stopColor="#04080f" />
              </radialGradient>
              <linearGradient
                id="ha-beam"
                gradientUnits="userSpaceOnUse"
                x1={CX}
                y1={CY}
                x2={tip.x}
                y2={tip.y}
              >
                <stop offset="0%" stopColor={beamTone} stopOpacity="0.42" />
                <stop offset="100%" stopColor={beamTone} stopOpacity="0.03" />
              </linearGradient>
              <radialGradient id="ha-dish">
                <stop offset="0%" stopColor={FROM} stopOpacity="0.3" />
                <stop offset="100%" stopColor={FROM} stopOpacity="0" />
              </radialGradient>
              <clipPath id="ha-clip">
                <circle cx={CX} cy={CY} r={R - 0.5} />
              </clipPath>
              <marker id="ha-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={TO} />
              </marker>
            </defs>

            <circle cx={CX} cy={CY} r={R} fill="url(#ha-sky)" />
            <g clipPath="url(#ha-clip)">
              {STARS.map((s, i) => (
                <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#cfe3ff" opacity={s.o} />
              ))}

              {/* azimuth spokes + elevation rings */}
              {Array.from({ length: 12 }, (_, i) => i * 30).map((az) => {
                const outer = mapPoint(0, az);
                return (
                  <line
                    key={az}
                    x1={CX}
                    y1={CY}
                    x2={outer.x}
                    y2={outer.y}
                    stroke={az % 90 === 0 ? "rgba(148,176,224,0.14)" : "rgba(148,176,224,0.05)"}
                    strokeDasharray={az % 90 === 0 ? undefined : "2 8"}
                  />
                );
              })}
              {[30, 60].map((el) => {
                const rr = (R * (90 - el)) / 90;
                return (
                  <g key={el}>
                    <circle cx={CX} cy={CY} r={rr} fill="none" stroke="rgba(148,176,224,0.12)" strokeDasharray="2 6" />
                    <text x={CX + 4} y={CY - rr + 10} fill="#5f7595" style={{ fontFamily: FONT, fontSize: 8 }}>
                      {el}°
                    </text>
                  </g>
                );
              })}

              {/* the two thresholds */}
              <circle
                cx={CX}
                cy={CY}
                r={(R * (90 - BEAM_MASK_DEG)) / 90}
                fill="none"
                stroke={MASK}
                strokeOpacity="0.4"
                strokeDasharray="4 5"
              />
              <circle
                cx={CX}
                cy={CY}
                r={(R * (90 - BEAM_FLOOR_DEG)) / 90}
                fill="none"
                stroke={TO}
                strokeOpacity="0.35"
                strokeDasharray="3 6"
              />
              <text
                x={CX + ((R * (90 - BEAM_FLOOR_DEG)) / 90) * 0.7 + 5}
                y={CY + ((R * (90 - BEAM_FLOOR_DEG)) / 90) * 0.7 + 3}
                fill={TO}
                fillOpacity="0.65"
                style={{ fontFamily: FONT, fontSize: 7.4, letterSpacing: 0.9 }}
              >
                SWITCH FLOOR {BEAM_FLOOR_DEG}°
              </text>

              {/* the whole track of each satellite across the window */}
              <path d={arcFrom} fill="none" stroke="#5c718f" strokeOpacity="0.5" strokeWidth="1.1" strokeDasharray="2 5" />
              <path d={arcTo} fill="none" stroke="#5c718f" strokeOpacity="0.5" strokeWidth="1.1" strokeDasharray="2 5" />
            </g>

            {/* rim */}
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(148,176,224,0.22)" strokeWidth="1.3" />
            {CARDINALS.map(({ az, label }) => {
              const p = mapPoint(0, az);
              const dx = p.x - CX;
              const dy = p.y - CY;
              const len = Math.hypot(dx, dy) || 1;
              return (
                <text
                  key={label}
                  x={CX + (dx / len) * (R + 15)}
                  y={CY + (dy / len) * (R + 15) + 4}
                  textAnchor="middle"
                  fill="#c6d8ef"
                  style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, letterSpacing: 1 }}
                >
                  {label}
                </text>
              );
            })}

            <g clipPath="url(#ha-clip)">
              {/* the part of each track that is actually being served */}
              <path d={servedFrom} fill="none" stroke={FROM} strokeOpacity="0.75" strokeWidth="2.1" strokeLinecap="round" />
              <path d={servedTo} fill="none" stroke={TO} strokeOpacity="0.8" strokeWidth="2.1" strokeLinecap="round" />

              {/* the switch itself: where each satellite is at that instant */}
              <g>
                <line
                  x1={switchFrom.x}
                  y1={switchFrom.y}
                  x2={switchTo.x}
                  y2={switchTo.y}
                  stroke={TO}
                  strokeOpacity="0.28"
                  strokeDasharray="2 6"
                />
                <path
                  d={`M ${switchFrom.x} ${switchFrom.y} Q ${CX + (switchFrom.x + switchTo.x - 2 * CX) * 0.34} ${
                    CY + (switchFrom.y + switchTo.y - 2 * CY) * 0.34
                  } ${switchTo.x} ${switchTo.y}`}
                  fill="none"
                  stroke={TO}
                  strokeOpacity="0.55"
                  strokeWidth="1.2"
                  markerEnd="url(#ha-arrow)"
                />
                <rect
                  x={switchFrom.x - 3.4}
                  y={switchFrom.y - 3.4}
                  width="6.8"
                  height="6.8"
                  fill="#04121a"
                  stroke={FROM}
                  strokeWidth="1.4"
                  transform={`rotate(45 ${switchFrom.x} ${switchFrom.y})`}
                />
                <rect
                  x={switchTo.x - 3.4}
                  y={switchTo.y - 3.4}
                  width="6.8"
                  height="6.8"
                  fill="#04121a"
                  stroke={TO}
                  strokeWidth="1.4"
                  transform={`rotate(45 ${switchTo.x} ${switchTo.y})`}
                />
                {Math.hypot(switchFrom.x - switchTo.x, switchFrom.y - switchTo.y) > 24 && (() => {
                  const mx = (switchFrom.x + switchTo.x) / 2;
                  const my = (switchFrom.y + switchTo.y) / 2;
                  const dx = mx - CX;
                  const dy = my - CY;
                  const len = Math.hypot(dx, dy) || 1;
                  return (
                    <text
                      x={mx + (dx / len) * 20}
                      y={my + (dy / len) * 20 + 3}
                      textAnchor="middle"
                      fill={TO}
                      stroke="#050a13"
                      strokeWidth="2.8"
                      paintOrder="stroke"
                      strokeLinejoin="round"
                      style={{ fontFamily: FONT, fontSize: 9, letterSpacing: 0.4 }}
                    >
                      {detail.swingDeg.toFixed(0)}° swing
                    </text>
                  );
                })()}
              </g>

              {/* the reserved link, before the switch */}
              {stage === 1 && (
                <line
                  x1={CX}
                  y1={CY}
                  x2={mapPoint(lookTo.el, lookTo.az).x}
                  y2={mapPoint(lookTo.el, lookTo.az).y}
                  stroke={TO}
                  strokeOpacity="0.4"
                  strokeDasharray="3 7"
                  strokeWidth="1.1"
                />
              )}

              {/* the beam */}
              <polygon
                points={`${CX + px * 7},${CY + py * 7} ${tip.x + px * wedge},${tip.y + py * wedge} ${tip.x - px * wedge},${tip.y - py * wedge} ${CX - px * 7},${CY - py * 7}`}
                fill="url(#ha-beam)"
              />
              <line
                x1={CX}
                y1={CY}
                x2={tip.x}
                y2={tip.y}
                stroke={beamTone}
                strokeWidth="1.6"
                strokeOpacity="0.9"
                strokeDasharray="3 7"
                className={playing ? "beam-flow" : undefined}
              />
              {[0.36, 0.58, 0.8].map((f) => {
                const cx = CX + (tip.x - CX) * f;
                const cy = CY + (tip.y - CY) * f;
                const half = 4 + f * 10;
                return (
                  <line
                    key={f}
                    x1={cx + px * half}
                    y1={cy + py * half}
                    x2={cx - px * half}
                    y2={cy - py * half}
                    stroke={FROM}
                    strokeOpacity={0.14 + f * 0.16}
                    strokeWidth="1"
                  />
                );
              })}
            </g>

            {/* the two spacecraft, right now */}
            {[
              { look: lookFrom, tone: FROM, name: fromTrack.name, label: fromLabel, active: stage < 2, below: false },
              { look: lookTo, tone: TO, name: toTrack.name, label: toLabel, active: stage >= 2, below: incomingBelowMask },
            ].map((s) => {
              const p = mapPoint(s.look.el, s.look.az);
              return (
                <g key={s.name}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={s.active ? 6 : 4.4}
                    fill={s.below ? "#050a13" : s.tone}
                    fillOpacity={s.below ? 1 : s.active ? 0.95 : 0.6}
                    stroke={s.tone}
                    strokeWidth={s.below ? 1.4 : 0}
                  />
                  <circle cx={p.x} cy={p.y} r="12" fill="none" stroke={s.tone} strokeOpacity={s.active ? 0.5 : 0.22} />
                  <text
                    x={s.label.x}
                    y={s.label.y}
                    textAnchor={s.label.anchor}
                    fill={s.tone}
                    fillOpacity={s.active ? 1 : 0.7}
                    stroke="#050a13"
                    strokeWidth="2.6"
                    paintOrder="stroke"
                    strokeLinejoin="round"
                    style={{ fontFamily: FONT, fontSize: 9.4, letterSpacing: 0.3 }}
                  >
                    {s.name}
                  </text>
                  <text
                    x={s.label.x}
                    y={s.label.y + 11}
                    textAnchor={s.label.anchor}
                    fill={s.tone}
                    fillOpacity="0.72"
                    stroke="#050a13"
                    strokeWidth="2.4"
                    paintOrder="stroke"
                    strokeLinejoin="round"
                    style={{ fontFamily: FONT, fontSize: 8.2 }}
                  >
                    {s.look.el.toFixed(1)}° · {compassPoint(s.look.az)} {s.look.az.toFixed(0)}° ·{" "}
                    {Math.round(s.look.rangeKm)} km{s.below ? " · BELOW MASK" : ""}
                  </text>
                </g>
              );
            })}

            {/* the terminal */}
            <circle cx={CX} cy={CY} r="25" fill="url(#ha-dish)" />
            <circle cx={CX} cy={CY} r="11" fill="#081420" stroke="rgba(61,219,217,0.5)" strokeWidth="1.1" />
            <path d={`M ${CX - 6} ${CY + 4} L ${CX + 6} ${CY + 4} L ${CX + 4} ${CY - 1} L ${CX - 4} ${CY - 1} Z`} fill="#d7f6f5" opacity="0.9" />
            <line x1={CX} y1={CY + 4} x2={CX} y2={CY + 8} stroke="#7ee7e2" strokeWidth="1.1" />

            {/* captions */}
            <text x="16" y="24" fill="#8a9cb4" style={{ fontFamily: FONT, fontSize: 9, letterSpacing: 1.3 }}>
              SKY VIEW · {formatClock(winStart)} → {formatClock(winEnd)}
            </text>
            <text x={W - 16} y="24" textAnchor="end" fill="#5f7595" style={{ fontFamily: FONT, fontSize: 8.6 }}>
              RIM = HORIZON · NORTH UP
            </text>
            <text x="16" y={H - 14} fill={beamTone} style={{ fontFamily: FONT, fontSize: 9.4, letterSpacing: 1 }}>
              BEAM {pointing.el.toFixed(1)}° EL · {compassPoint(pointing.az)} {pointing.az.toFixed(0)}° ·{" "}
              {Math.round(pointing.rangeKm)} KM
            </text>
            <text x={W - 16} y={H - 14} textAnchor="end" fill="#5f7595" style={{ fontFamily: FONT, fontSize: 8.6 }}>
              t {t - handover.tSec >= 0 ? "+" : "−"}
              {formatClock(Math.abs(t - handover.tSec))} FROM SWITCH
            </text>
          </svg>

          {/* Scrub strip --------------------------------------------------- */}
          <div className="border-t border-white/[0.07] px-3 pb-3 pt-2">
            <svg
              viewBox="0 0 620 52"
              className="block h-auto w-full touch-none"
              role="img"
              aria-label={`Handover timeline from ${formatClock(winStart)} to ${formatClock(winEnd)}. The switch happens at ${detail.clock}. Drag to scrub through the four stages.`}
              onPointerDown={(e) => {
                dragging.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                seek(e.clientX, e.currentTarget);
              }}
              onPointerMove={(e) => dragging.current && seek(e.clientX, e.currentTarget)}
              onPointerUp={(e) => {
                dragging.current = false;
                e.currentTarget.releasePointerCapture(e.pointerId);
              }}
              onPointerCancel={() => {
                dragging.current = false;
              }}
              style={{ cursor: "crosshair" }}
            >
              {(() => {
                const x0 = 8;
                const x1 = 612;
                const sx = (v: number) => x0 + ((v - winStart) / Math.max(1, winEnd - winStart)) * (x1 - x0);
                const prepStart = handover.tSec - BEAM_PREPARE_SEC;
                const slewEnd = handover.tSec + BEAM_SLEW_SEC;
                const bands = [
                  { a: winStart, b: prepStart, fill: "rgba(61,219,217,0.10)", label: "TRACK", tone: "#3ddbd9" },
                  { a: prepStart, b: handover.tSec, fill: "rgba(251,191,36,0.16)", label: "PREPARE", tone: TO },
                  { a: handover.tSec, b: slewEnd, fill: "rgba(251,191,36,0.42)", label: "RE-AIM", tone: "#0a0f1a" },
                  { a: slewEnd, b: winEnd, fill: "rgba(251,191,36,0.10)", label: "LOCKED", tone: TO },
                ];
                return (
                  <>
                    {bands.map((b) => {
                      const w = Math.max(1, sx(b.b) - sx(b.a));
                      return (
                        <g key={b.label}>
                          <rect x={sx(b.a)} y="10" width={w} height="22" fill={b.fill} />
                          {w > 58 && (
                            <text
                              x={sx(b.a) + w / 2}
                              y="25"
                              textAnchor="middle"
                              fill={b.tone}
                              fillOpacity="0.85"
                              style={{ fontFamily: FONT, fontSize: 7.6, letterSpacing: 1 }}
                            >
                              {b.label}
                            </text>
                          )}
                        </g>
                      );
                    })}
                    <line x1={sx(handover.tSec)} x2={sx(handover.tSec)} y1="4" y2="38" stroke={TO} strokeWidth="1.2" strokeDasharray="2 3" />
                    <text x={sx(handover.tSec)} y="48" textAnchor="middle" fill={TO} style={{ fontFamily: FONT, fontSize: 7.6, letterSpacing: 0.6 }}>
                      SWITCH {detail.clock}
                    </text>
                    <line x1={sx(t)} x2={sx(t)} y1="4" y2="38" stroke="#e9effc" strokeWidth="1.4" />
                    <circle cx={sx(t)} cy="21" r="3" fill="#e9effc" />
                    <text x={8} y="48" fill="#5f7595" style={{ fontFamily: FONT, fontSize: 7.6 }}>
                      {formatClock(winStart)}
                    </text>
                    <text x={612} y="48" textAnchor="end" fill="#5f7595" style={{ fontFamily: FONT, fontSize: 7.6 }}>
                      {formatClock(winEnd)}
                    </text>
                  </>
                );
              })()}
            </svg>
          </div>
        </div>

        {/* Telemetry ----------------------------------------------------- */}
        <aside className="min-w-0 bg-[#060b16] p-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-faint">
              Step {STAGES[stage].k} · {STAGES[stage].t}
            </p>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em]",
                stage >= 2 ? "border-warn/40 bg-warn/10 text-warn" : "border-signal/30 bg-signal/10 text-signal",
              )}
            >
              {stage < 2 ? "on the old satellite" : stage === 2 ? "switching" : "on the new satellite"}
            </span>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{narration}</p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { label: "letting go", leg: detail.from, tone: FROM, live: lookFrom },
              { label: "taking over", leg: detail.to, tone: TO, live: lookTo },
            ].map(({ label, leg, tone, live }) => (
              <div key={label} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5">
                <p className="font-mono text-[8px] uppercase tracking-[0.12em]" style={{ color: tone }}>
                  {label}
                </p>
                <p className="mt-0.5 truncate font-mono text-[10.5px] text-ink" title={leg.track.name}>
                  {leg.track.name.replace("STARLINK-", "SAT ")}
                </p>
                <p className="mt-0.5 font-mono text-[8.5px] text-faint">
                  plane {leg.track.plane + 1} · slot {leg.track.slot + 1}
                </p>
                <p className="mt-1.5 font-mono text-[13px] leading-none" style={{ color: tone }}>
                  {live.el.toFixed(1)}°
                </p>
                <p className="mt-1 font-mono text-[8.5px] text-faint">
                  {compassPoint(live.az)} {live.az.toFixed(0)}° · {Math.round(live.rangeKm)} km
                </p>
              </div>
            ))}
          </div>

          <p className="mt-3 font-mono text-[8.5px] uppercase tracking-[0.16em] text-faint">
            At {detail.clock}, the instant of the switch
          </p>
          <dl className="mt-1">
            <AnatomyRow label="Beam swing" value={`${detail.swingDeg.toFixed(0)}° across the sky`} accent />
            <AnatomyRow label="Elevation" value={`${detail.from.look.el.toFixed(1)}° → ${detail.to.look.el.toFixed(1)}°`} />
            <AnatomyRow
              label="Azimuth"
              value={`${azFrom.toFixed(0)}° ${compassPoint(azFrom)} → ${azTo.toFixed(0)}° ${compassPoint(azTo)}`}
            />
            <AnatomyRow
              label="Slant range"
              value={`${Math.round(detail.from.look.rangeKm)} → ${Math.round(detail.to.look.rangeKm)} km`}
            />
            <AnatomyRow
              label="Light time"
              value={`${detail.from.lightMs.toFixed(1)} → ${detail.to.lightMs.toFixed(1)} ms`}
            />
            <AnatomyRow label="Phase step" value={`${detail.phaseFromDeg.toFixed(0)}° → ${detail.phaseToDeg.toFixed(0)}°`} />
            <AnatomyRow label="Timing step" value={`${detail.from.delayPs.toFixed(0)} → ${detail.to.delayPs.toFixed(0)} ps`} />
            <AnatomyRow label="Array re-tune" value="microseconds" />
          </dl>

          <p className="mt-3 text-[10px] leading-relaxed text-faint">
            {detail.from.riseSec !== null && detail.from.setSec !== null ? (
              <>
                {detail.from.track.name.replace("STARLINK-", "SAT ")} was usable from{" "}
                <span className="text-ink">{formatClock(detail.from.riseSec)}</span> to{" "}
                <span className="text-ink">{formatClock(detail.from.setSec)}</span> — the terminal took it for
                the last {formatClock(handover.tSec - Math.max(detail.from.riseSec, 0))} of that pass.
              </>
            ) : (
              <>It was already above the mask when the session started.</>
            )}
          </p>
        </aside>
      </div>

      <p className="border-t border-white/[0.07] px-4 py-3 text-[10.5px] leading-relaxed text-faint md:px-5">
        Left: the two satellites&apos; true tracks across this bit of sky, from the same geometry as the map above.
        Right: the geometry at the moment of the switch. The outgoing satellite is at the {BEAM_FLOOR_DEG}° floor —
        that is the rule this model follows — while the incoming one is wherever the model&apos;s next-highest
        satellite happens to be. Real Starlink also weighs capacity, obstructions and gateway visibility, and the
        visible swing is slowed down to {BEAM_SLEW_SEC} s; the array itself re-tunes in microseconds.
      </p>
    </div>
  );
}

function AnatomyRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-white/[0.06] py-1.5 last:border-0">
      <dt className="text-[10px] leading-tight text-faint">{label}</dt>
      <dd className={cn("shrink-0 font-mono text-[10.5px]", accent ? "text-warn" : "text-ink")}>{value}</dd>
    </div>
  );
}
