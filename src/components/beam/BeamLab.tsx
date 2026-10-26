import { useEffect, useMemo, useRef, useState } from "react";
import {
  BEAM_FLOOR_DEG,
  BEAM_MASK_DEG,
  BEAM_PREPARE_SEC,
  compassPoint,
  formatClock,
  getBeamTimeline,
  inViewAt,
  lightTimeMs,
  linkEndsAt,
  nextHandover,
  phaseDelayPs,
  phaseStepDeg,
  pointingAt,
  sampleTrack,
  servingTrackAt,
  zenithAngle,
  KU_BAND_GHZ,
} from "@/lib/beam";
import { useReducedMotion } from "@/lib/useMediaQuery";
import { cn } from "@/utils/cn";
import { SkyMap, SkyMapLegend } from "./SkyMap";
import { SideElevation } from "./SideElevation";
import { ArrayAperture, BeamPattern } from "./Aperture";
import { ElevationTimeline } from "./ElevationTimeline";

const SPEEDS = [5, 12, 30, 60];
const button =
  "rounded-full border border-white/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-signal/60 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-white/[0.06] py-1.5 last:border-0">
      <dt className="text-[10px] leading-tight text-faint">{label}</dt>
      <dd className={cn("shrink-0 font-mono text-[10.5px]", accent ? "text-signal" : "text-ink")}>{value}</dd>
    </div>
  );
}

export function BeamLab() {
  const reduced = useReducedMotion();
  const timeline = useMemo(() => getBeamTimeline(), []);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(!reduced);
  const [speed, setSpeed] = useState(12);
  const [manualId, setManualId] = useState<number | null>(null);
  const [hoverId, setHoverId] = useState<number | null>(null);
  const acc = useRef(0);

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
          const next = t + step * speed;
          return next >= timeline.durationSec ? next % timeline.durationSec : next;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, timeline.durationSec]);

  // A manual lock is released when the chosen satellite drops below the mask.
  useEffect(() => {
    if (manualId === null) return;
    const track = timeline.byId.get(manualId);
    if (!track || sampleTrack(track, time).el < BEAM_MASK_DEG) setManualId(null);
  }, [manualId, time, timeline]);

  const autoTarget = servingTrackAt(timeline, time);
  const target = manualId !== null ? timeline.byId.get(manualId) ?? autoTarget : autoTarget;
  const look = target ? sampleTrack(target, time) : null;
  const pointing = pointingAt(timeline, time, target, manualId !== null);
  const upcoming = nextHandover(timeline, time);
  const nextIn = upcoming ? upcoming.tSec - time : null;
  const nextTrack = upcoming ? timeline.byId.get(upcoming.toId) ?? null : null;
  const preparing = manualId === null && nextIn !== null && nextIn <= BEAM_PREPARE_SEC;
  const inView = inViewAt(timeline, time);
  const manualEnd = manualId !== null && target ? linkEndsAt(target, time) : null;
  const phase = look ? phaseStepDeg(look.el) : 0;
  const delay = look ? phaseDelayPs(look.el) : 0;
  const steer = look ? zenithAngle(pointing?.el ?? look.el) : 0;
  const nextSteer =
    preparing && nextTrack ? zenithAngle(sampleTrack(nextTrack, time).el) : null;

  const statusTone = manualId !== null ? "text-laser" : preparing ? "text-warn" : "text-signal";
  const status = manualId !== null
    ? `MANUAL LOCK · ${target?.name ?? "—"}`
    : preparing && nextTrack
      ? `PREPARING ${nextTrack.name} · ${Math.max(0, Math.ceil(nextIn ?? 0))} s`
      : pointing?.slewing
        ? `RE-AIMING BEAM · ${target?.name ?? "—"}`
        : `LOCKED ON ${target?.name ?? "—"}`;

  const lock = (id: number) => {
    const track = timeline.byId.get(id);
    if (!track) return;
    if (sampleTrack(track, time).el < BEAM_MASK_DEG) return;
    setManualId(id);
    setHoverId(null);
  };

  return (
    <div className="space-y-6">
      {/* Main sky view + telemetry ------------------------------------------ */}
      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-3.5 md:px-5">
          <div>
            <h2 className="text-sm font-semibold text-white">Your dish&apos;s sky, right now</h2>
            <p className="mt-0.5 text-[11px] text-faint">
              {timeline.observer.name} · {timeline.observer.latLabel} {timeline.observer.lonLabel} · a
              30-minute geometric session
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className={cn(button, "min-w-[64px]", playing && "border-signal/40 text-ink")}
              aria-label={playing ? "Pause the simulation" : "Play the simulation"}
            >
              {playing ? "❚❚ Pause" : "▶ Play"}
            </button>
            <div className="flex items-center gap-1 rounded-full border border-white/10 p-1">
              <span className="px-1.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-faint">Speed</span>
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  aria-pressed={speed === s}
                  className={cn(
                    "rounded-full px-2 py-1 font-mono text-[9.5px] transition-colors",
                    speed === s ? "bg-signal/20 text-signal" : "text-faint hover:text-white",
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                if (!upcoming) return;
                setManualId(null);
                setTime(Math.max(0, upcoming.tSec - 2));
                setPlaying(true);
              }}
              disabled={!upcoming}
              className={cn(button, "disabled:cursor-not-allowed disabled:opacity-40")}
            >
              Next switch →
            </button>
            <button
              type="button"
              onClick={() => {
                setTime(0);
                setManualId(null);
                setPlaying(!reduced);
              }}
              className={button}
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 bg-white/[0.02] px-4 py-2.5 md:px-5">
          <p className={cn("flex items-center gap-2 font-mono text-[10.5px]", statusTone)} role="status">
            <span className="relative flex h-1.5 w-1.5">
              <span
                className={cn(
                  "absolute inline-flex h-full w-full rounded-full bg-current",
                  playing && "animate-blink",
                )}
              />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
            </span>
            {status}
          </p>
          <p className="font-mono text-[9.5px] text-faint">
            {manualId !== null
              ? `Link ends in ${manualEnd ? formatClock(manualEnd - time) : "—"}`
              : `Next handover in ${nextIn !== null ? formatClock(nextIn) : "—"}`}
            {" · "}
            {playing ? `${speed}× real time` : "paused"}
          </p>
        </div>

        <div className="grid gap-px bg-white/[0.07] lg:grid-cols-[minmax(0,1fr)_338px]">
          <div className="min-w-0 bg-[#050a13]">
            <SkyMap
              timeline={timeline}
              time={time}
              target={target}
              pointing={pointing}
              next={preparing && nextTrack ? { track: nextTrack, inSec: nextIn ?? 0 } : null}
              hoverId={hoverId}
              manualId={manualId}
              playing={playing}
              onHover={setHoverId}
              onLock={lock}
            />
            <SkyMapLegend />
          </div>

          <aside className="min-w-0 bg-[#060b16] p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-faint">
                Serving satellite
              </p>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em]",
                  manualId !== null
                    ? "border-laser/40 bg-laser/10 text-laser"
                    : "border-signal/30 bg-signal/10 text-signal",
                )}
              >
                {manualId !== null ? "manual" : "auto"}
              </span>
            </div>
            <h3 className="mt-1 font-mono text-[16px] font-semibold leading-tight text-white">
              {target?.name ?? "No link"}
            </h3>
            <p className="mt-1 text-[10px] leading-relaxed text-faint">
              {target
                ? `${target.shellName} · plane ${target.plane + 1} · slot ${target.slot + 1} · ${target.altitudeKm} km`
                : "Nothing above the elevation mask at this instant."}
            </p>

            <div className="mt-3">
              <SideElevation
                target={target}
                pointing={pointing}
                next={preparing ? nextTrack : null}
                nextEl={nextTrack && preparing ? sampleTrack(nextTrack, time).el : null}
              />
            </div>

            <dl className="mt-3">
              <Row label="Elevation" value={look ? `${look.el.toFixed(1)}°` : "—"} accent />
              <Row
                label="Azimuth"
                value={look ? `${look.az.toFixed(0)}° ${compassPoint(look.az)}` : "—"}
              />
              <Row label="Slant range" value={look ? `${Math.round(look.rangeKm)} km` : "—"} />
              <Row label="One-way light time" value={look ? `${lightTimeMs(look.rangeKm).toFixed(1)} ms` : "—"} />
              <Row label="Beam off zenith" value={look ? `${zenithAngle(look.el).toFixed(1)}°` : "—"} />
              <Row label="Phase step / element" value={look ? `${phase.toFixed(0)}°` : "—"} />
              <Row label="Timing step" value={look ? `${delay.toFixed(0)} ps` : "—"} />
              <Row label={`In view (≥ ${BEAM_MASK_DEG}°)`} value={`${inView.length}`} />
            </dl>

            <div className="mt-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-faint">
                  In view now · click to hold
                </p>
                {manualId !== null && (
                  <button
                    type="button"
                    onClick={() => setManualId(null)}
                    className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-laser hover:text-white"
                  >
                    Release
                  </button>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {inView.slice(0, 6).map(({ track, look: satLook }) => {
                  const active = target?.satId === track.satId;
                  return (
                    <button
                      key={track.satId}
                      type="button"
                      onClick={() => lock(track.satId)}
                      onPointerEnter={() => setHoverId(track.satId)}
                      onPointerLeave={() => setHoverId(null)}
                      aria-pressed={active}
                      className={cn(
                        "rounded border px-1.5 py-1 font-mono text-[9px] transition-colors",
                        active
                          ? "border-signal/60 bg-signal/15 text-signal"
                          : "border-white/10 text-faint hover:border-white/30 hover:text-ink",
                      )}
                    >
                      {track.name.replace("STARLINK-", "SAT ")} · {satLook.el.toFixed(0)}°
                    </button>
                  );
                })}
                {inView.length > 6 && (
                  <span className="self-center font-mono text-[9px] text-faint">+{inView.length - 6}</span>
                )}
              </div>
            </div>
          </aside>
        </div>

        <p className="border-t border-white/[0.07] px-4 py-3 text-[10.5px] leading-relaxed text-faint md:px-5">
          The terminal keeps its current satellite until it falls to {BEAM_FLOOR_DEG}° elevation, then
          re-aims at the highest one above the {BEAM_MASK_DEG}° mask. In this model the link is never lost, but the
          beam you see swings from one side of the sky to the other. The swing is slowed down here:
          a real phased array retunes in microseconds.
        </p>
      </div>

      {/* Elevation timeline -------------------------------------------------- */}
      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3.5 md:px-5">
          <div>
            <h2 className="text-sm font-semibold text-white">Two passes, one connection</h2>
            <p className="mt-0.5 text-[11px] text-faint">
              Elevation of every satellite above your horizon · handovers marked in amber
            </p>
          </div>
          <p className="rounded-full border border-signal/30 bg-signal/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-signal">
            {Math.max(0, timeline.handovers.filter((h) => h.fromId !== null).length)} switches /{" "}
            {Math.round(timeline.durationSec / 60)} min
          </p>
        </div>
        <ElevationTimeline
          timeline={timeline}
          time={time}
          target={target}
          next={preparing ? nextTrack : null}
          onSeek={(t) => {
            setTime(t);
            setPlaying(false);
          }}
        />
      </div>

      {/* Aperture ----------------------------------------------------------- */}
      <div className="panel overflow-hidden">
        <div className="grid gap-px bg-white/[0.07] lg:grid-cols-[1.06fr_0.94fr]">
          <div className="min-w-0 bg-[#060b16] p-4 md:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">Inside the aperture</h2>
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
                1,280 elements · 40 × 32 lattice
              </p>
            </div>
            <p className="mt-1 max-w-md text-[11.5px] leading-relaxed text-muted">
              Every dot is one antenna element; the bright bands are the wavefronts it emits, and the
              sweep runs along them as the radio oscillates. The beam points perpendicular to those
              bands and the fringe spacing tightens as it steers away from straight up. That changing
              phase slope is the whole steering mechanism.
            </p>
            <div className="relative mt-3">
              <ArrayAperture el={pointing?.el ?? 45} az={pointing?.az ?? 0} time={time} />
              <span className="pointer-events-none absolute left-3 top-3 rounded bg-black/35 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-ink/80">
                PANEL FACE · NORTH UP
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded border border-white/[0.08] bg-white/[0.02] px-2.5 py-2">
                <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-faint">Phase step</p>
                <p className="mt-0.5 font-mono text-[12px] text-signal">{phase.toFixed(0)}°</p>
              </div>
              <div className="rounded border border-white/[0.08] bg-white/[0.02] px-2.5 py-2">
                <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-faint">Timing</p>
                <p className="mt-0.5 font-mono text-[12px] text-ink">{delay.toFixed(0)} ps</p>
              </div>
              <div className="rounded border border-white/[0.08] bg-white/[0.02] px-2.5 py-2">
                <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-faint">Off zenith</p>
                <p className="mt-0.5 font-mono text-[12px] text-ink">{steer.toFixed(0)}°</p>
              </div>
            </div>
            <p className="mt-3 font-mono text-[10px] text-signal/90">Δφ = 2π · d · sin θ / λ</p>
            <p className="mt-1 text-[10px] leading-relaxed text-faint">
              With half-wavelength spacing at {KU_BAND_GHZ} GHz, steering {steer.toFixed(0)}° from broadside
              needs <span className="text-ink">{phase.toFixed(0)}°</span> of progressive phase — about{" "}
              {delay.toFixed(0)} ps between neighbours.
            </p>
          </div>

          <div className="min-w-0 bg-[#060b16] p-4 md:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">The beam, in one cut</h2>
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
                array factor · 16 elements
              </p>
            </div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
              A phased array does not make a laser. It makes a narrow main lobe plus sidelobes. As the
              steer angle changes, the main lobe slides to follow the satellite.
            </p>
            <div className="mt-3">
              <BeamPattern steerDeg={steer} nextSteerDeg={nextSteer} />
            </div>
            <div className="mt-3 space-y-1.5 text-[10px] leading-relaxed text-faint">
              <p>
                <span className="text-signal">Cyan</span> is the lobe for the satellite being served now.
                {nextSteer !== null && (
                  <>
                    {" "}
                    <span className="text-warn">Amber</span> is where it will point after the next
                    handover.
                  </>
                )}
              </p>
              <p>
                Real Dishy uses 20 beamformer chips driving 1,280 elements — the equivalent aperture
                gain is roughly 3,500× a single element. The terminal can see about 100° of sky, but it
                only ever aims one main lobe at a time.
              </p>
            </div>
          </div>
        </div>
        <p className="border-t border-white/[0.07] px-4 py-3 text-[10.5px] leading-relaxed text-faint md:px-5">
          The aperture drawing is a schematic: 40 × 32 elements in a lattice, not a teardown-accurate
          layout, and the colour scale is the phase ramp only. The pattern plot is the ideal uniform
          array factor for a 16-element cut, not a measured antenna pattern.
        </p>
      </div>
    </div>
  );
}
