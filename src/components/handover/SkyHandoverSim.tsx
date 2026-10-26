import { useEffect, useMemo, useRef, useState } from "react";
import { HandoverScene } from "./HandoverScene";
import { SkyRadar } from "./SkyRadar";
import { FullscreenButton, fsStageClass, useFullscreen } from "@/components/site/FullscreenStage";
import { StatusRow, QualityBar, Toggle, controlBase } from "./ui";
import {
  SPEEDS,
  handoverClock,
  seekAndPause,
  seekAndPlay,
  useHandoverUI,
  type CameraMode,
  type Speed,
} from "./handoverStore";
import {
  ELEVATION_MASK_DEG,
  SIM_RATE_AT_1X,
  OBSERVER,
  formatSimClock,
  lightTimeMs,
} from "@/lib/handover";
import {
  SKY_ALTITUDE_KM,
  SKY_INCLINATION_DEG,
  SKY_PLANES,
  SKY_PREPARE_SEC,
  SKY_SWITCH_FLOOR_DEG,
  SKY_TOTAL,
  SKY_WINDOW_SEC,
  nearestEvent,
  reasonLabel,
  sampleSky,
  satName,
  secondsUntilDropout,
  skyCompass,
  skyEvents,
  type SkyPhase,
  type SkySat,
  type SkyState,
} from "@/lib/constellation";
import { SKY_EXPLAINER, SKY_NOTES, SKY_STAGES } from "@/lib/constellationContent";
import { useReducedMotion } from "@/lib/useMediaQuery";
import { cn } from "@/utils/cn";

const PHASE_LABEL: Record<SkyPhase, string> = {
  tracking: "Tracking",
  preparing: "Preparing next link",
  transfer: "Handover in progress",
  completed: "Handover completed",
};

const PHASE_BN: Record<SkyPhase, string> = {
  tracking: "link স্থির",
  preparing: "পরের স্যাটেলাইটের প্রস্তুতি",
  transfer: "beam বদলাচ্ছে",
  completed: "handover সম্পন্ন",
};

function shortName(id: number) {
  return satName(id).replace("STARLINK-", "S-");
}

/** Camera chips floating over the 3D stage, plus the full-view toggle. */
const STAGE_CAMERAS: { id: CameraMode; label: string }[] = [
  { id: "ground", label: "Sky" },
  { id: "space", label: "Space" },
  { id: "dish", label: "Dish" },
];

function StageCameraSwitch({
  isFullscreen,
  onToggleFullscreen,
}: {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const camera = useHandoverUI((s) => s.camera);
  const setCamera = useHandoverUI((s) => s.setCamera);
  return (
    <div className="absolute left-3 top-3 flex flex-wrap gap-1">
      {STAGE_CAMERAS.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => setCamera(c.id)}
          aria-pressed={camera === c.id}
          className={cn(
            "rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em] backdrop-blur transition-colors",
            camera === c.id
              ? "border-signal/45 bg-signal/15 text-signal"
              : "border-white/12 bg-[#040a14]/70 text-muted hover:border-white/30 hover:text-white",
          )}
        >
          {c.label}
        </button>
      ))}
      <FullscreenButton onClick={onToggleFullscreen} active={isFullscreen} />
    </div>
  );
}

/** Big in-scene banner for the handover moment itself. */
function HandoverBanner({ state }: { state: SkyState }) {
  if (state.phase === "tracking") return null;
  const tone =
    state.phase === "transfer"
      ? "border-white/25 bg-white/[0.07] text-white"
      : state.phase === "preparing"
        ? "border-warn/40 bg-warn/[0.08] text-warn"
        : "border-signal/40 bg-signal/[0.08] text-signal";
  const text =
    state.phase === "transfer" && state.currentEvent
      ? `Handover in progress · ${shortName(state.currentEvent.from)} → ${shortName(state.currentEvent.to)}`
      : state.phase === "preparing" && state.nextEvent
        ? `Preparing handover → ${shortName(state.nextEvent.to)} · make-before-break`
        : state.serving
          ? `Handover complete · connected ${shortName(state.serving.id)}`
          : "";
  if (!text) return null;
  return (
    <div
      className={cn(
        "pointer-events-none absolute left-1/2 top-14 z-10 max-w-[72%] -translate-x-1/2 truncate rounded-full border px-3 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em] backdrop-blur sm:top-3",
        tone,
      )}
      role="status"
    >
      <span className={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current", state.phase === "transfer" && "animate-blink")} />
      {text}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Status panel                                                               */
/* -------------------------------------------------------------------------- */

function SatelliteCard({ sat, tone }: { sat: SkySat | null; tone: "serving" | "candidate" }) {
  const serving = tone === "serving";
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        serving ? "border-signal/25 bg-signal/[0.06]" : "border-warn/25 bg-warn/[0.05]",
      )}
    >
      <p
        className={cn(
          "font-mono text-[8.5px] uppercase tracking-[0.14em]",
          serving ? "text-signal/80" : "text-warn/80",
        )}
      >
        {serving ? "Connected satellite" : "Next candidate"}
      </p>
      <p className="mt-1 flex items-center gap-2 text-[14px] font-semibold text-white">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            serving ? "bg-signal animate-blink" : "bg-warn",
          )}
        />
        {sat ? sat.name : serving ? "No link" : "None in view"}
      </p>
      {sat ? (
        <>
          <div className="mt-1 flex items-baseline justify-between font-mono text-[10px] text-muted">
            <span>
              EL <span className="text-ink">{sat.elDeg.toFixed(1)}°</span>
            </span>
            <span>
              AZ{" "}
              <span className="text-ink">
                {sat.azDeg.toFixed(0)}° {skyCompass(sat.azDeg)}
              </span>
            </span>
            <span>
              plane <span className="text-ink">{sat.plane}</span>
            </span>
          </div>
          {serving && (
            <div className="mt-2">
              <QualityBar value={sat.quality} tone="bg-signal" />
            </div>
          )}
          <p className="mt-1.5 font-mono text-[9px] text-faint">
            {sat.rangeKm.toFixed(0)} km · {lightTimeMs(sat.rangeKm).toFixed(1)} ms one-way ·{" "}
            {sat.rising ? "rising" : "falling"}
          </p>
        </>
      ) : (
        <p className="mt-1 font-mono text-[9px] text-faint">waiting for a usable pass</p>
      )}
    </div>
  );
}

function SkyStatusPanel({ state }: { state: SkyState }) {
  const serving = state.serving;
  const dropout = useMemo(
    () => (serving ? secondsUntilDropout(serving.id, state.timeSec) : null),
    // Recompute a few times a second at most: the value only moves in 5 s steps.
    [serving?.id, Math.round(state.timeSec / 5)],
  );

  const handoverText =
    state.phase === "preparing" && state.nextEvent
      ? `Preparing ${shortName(state.nextEvent.to)} · ${Math.round(state.progress * 100)}%`
      : state.phase === "transfer" && state.currentEvent
        ? "Beam transferring"
        : state.phase === "completed" && state.lastEvent
          ? `Done · ${shortName(state.lastEvent.from)} → ${shortName(state.lastEvent.to)}`
          : "Holding the current link";

  return (
    <aside className="flex h-full min-w-0 flex-col bg-[#060b16] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-faint">Live status</p>
        <span className="rounded-full border border-white/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
          simulated
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <SatelliteCard sat={state.serving} tone="serving" />
        <SatelliteCard sat={state.candidate} tone="candidate" />
      </div>

      <dl className="mt-3">
        <StatusRow
          label="Connection"
          value={
            <span className="inline-flex items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  state.phase === "tracking" || state.phase === "completed" ? "bg-signal" : "bg-warn",
                )}
              />
              {PHASE_LABEL[state.phase]}
            </span>
          }
          sub={PHASE_BN[state.phase]}
        />
        <StatusRow
          label="Serving for"
          value={formatSimClock(state.heldSec)}
          sub={dropout ? `pass ends in ~${dropout} s` : undefined}
        />
        <StatusRow
          label="Handover"
          value={handoverText}
          tone={state.phase === "tracking" ? "text-muted" : "text-warn"}
          sub={
            state.phase === "preparing" || state.phase === "transfer"
              ? `${Math.round(state.progress * 100)}% of preparation`
              : state.nextEvent
                ? `next switch in ${Math.max(0, Math.round(state.nextEvent.tSec - state.timeSec))} s`
                : "end of window"
          }
        />
      </dl>

      {/* Progress */}
      <div className="mt-1">
        <div className="flex items-center justify-between font-mono text-[8.5px] uppercase tracking-[0.12em] text-faint">
          <span>Handover progress</span>
          <span className={state.phase === "tracking" ? "text-faint" : "text-warn"}>
            {Math.round(state.progress * 100)}%
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-150",
              state.phase === "transfer" ? "bg-warn" : "bg-signal/70",
            )}
            style={{ width: `${Math.round(state.progress * 100)}%` }}
          />
        </div>
      </div>

      {/* Sky census */}
      <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
        <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-faint">
          The sky right now
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          {[
            { v: state.counts.aboveMask, l: "usable" },
            { v: state.counts.aboveHorizon, l: "above horizon" },
            { v: state.counts.total, l: "in shell" },
          ].map((c) => (
            <div key={c.l}>
              <p className="font-mono text-[15px] leading-none text-ink">{c.v}</p>
              <p className="mt-1 font-mono text-[7.5px] uppercase tracking-[0.08em] text-faint">
                {c.l}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[9px] leading-relaxed text-faint">
          Only satellites above the {ELEVATION_MASK_DEG}° mask can carry a link; the rest are still
          crossing the sky, ignored.
        </p>
      </div>

      {/* Watchlist */}
      <div className="mt-3 border-t border-white/[0.07] pt-2">
        <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-faint">
          Watchlist · brightest {Math.min(5, state.visible.length)}
        </p>
        <div className="mt-1.5 space-y-1">
          {state.visible.slice(0, 5).map((sat) => (
            <div
              key={sat.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2 py-1.5",
                sat.role === "serving"
                  ? "border-signal/25 bg-signal/[0.05]"
                  : sat.role === "candidate"
                    ? "border-warn/25 bg-warn/[0.04]"
                    : "border-white/[0.06] bg-white/[0.015]",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  sat.role === "serving"
                    ? "bg-signal"
                    : sat.role === "candidate"
                      ? "bg-warn"
                      : "bg-muted/60",
                )}
              />
              <span className="w-[78px] shrink-0 font-mono text-[9.5px] text-ink">
                {shortName(sat.id)}
              </span>
              <span className="w-[40px] shrink-0 font-mono text-[9.5px] text-muted">
                {sat.elDeg.toFixed(0)}°
              </span>
              <span
                className={cn(
                  "flex-1 truncate font-mono text-[8.5px] uppercase tracking-[0.06em]",
                  sat.role === "serving"
                    ? "text-signal"
                    : sat.role === "candidate"
                      ? "text-warn"
                      : "text-faint",
                )}
              >
                {sat.role === "serving" ? "connected" : sat.role === "candidate" ? "candidate" : sat.rising ? "rising" : "falling"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-auto pt-3 text-[9px] leading-relaxed text-faint">
        Positions are computed from orbital mechanics for this educational model — not live
        telemetry.
      </p>
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/* Controls                                                                   */
/* -------------------------------------------------------------------------- */

function SkyControls({ state }: { state: SkyState }) {
  const playing = useHandoverUI((s) => s.playing);
  const speed = useHandoverUI((s) => s.speed);
  const camera = useHandoverUI((s) => s.camera);
  const showPaths = useHandoverUI((s) => s.showPaths);
  const showBeams = useHandoverUI((s) => s.showBeams);
  const showCoverage = useHandoverUI((s) => s.showCoverage);
  const showLabels = useHandoverUI((s) => s.showLabels);
  const loop = useHandoverUI((s) => s.loop);
  const autoSlow = useHandoverUI((s) => s.autoSlow);
  const setAutoSlow = useHandoverUI((s) => s.setAutoSlow);
  const togglePlay = useHandoverUI((s) => s.togglePlay);
  const setSpeed = useHandoverUI((s) => s.setSpeed);
  const setCamera = useHandoverUI((s) => s.setCamera);
  const toggleLayer = useHandoverUI((s) => s.toggleLayer);
  const setLoop = useHandoverUI((s) => s.setLoop);
  const restart = useHandoverUI((s) => s.restart);

  const jumpHandover = (dir: -1 | 1) => {
    const ev = nearestEvent(state.timeSec, dir);
    if (!ev) {
      seekAndPause(dir < 0 ? Math.max(0, state.timeSec - 30) : state.timeSec + 30);
      return;
    }
    seekAndPlay(Math.max(0, ev.tSec - 12));
  };

  const cameras: { id: CameraMode; label: string }[] = [
    { id: "ground", label: "Sky view" },
    { id: "space", label: "Space view" },
    { id: "dish", label: "Dish close-up" },
  ];

  return (
    <div className="space-y-2.5 border-t border-white/[0.07] bg-[#050a13] px-4 py-3 md:px-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause simulation" : "Play simulation"}
          className={cn(controlBase, "min-w-[74px]", playing && "border-signal/45 text-white")}
        >
          {playing ? "❚❚ Pause" : "▶ Play"}
        </button>
        <button type="button" onClick={restart} className={controlBase} aria-label="Restart window">
          ↺ Restart
        </button>
        <button type="button" onClick={() => jumpHandover(-1)} className={controlBase}>
          ◀ Prev handover
        </button>
        <button type="button" onClick={() => jumpHandover(1)} className={controlBase}>
          Next handover ▶
        </button>

        <span className="mx-1 hidden h-4 w-px bg-white/10 sm:block" />

        <button
          type="button"
          onClick={() => setSpeed(speed === 0.1 ? 1 : 0.1)}
          aria-pressed={speed === 0.1}
          className={cn(controlBase, speed === 0.1 && "border-warn/40 bg-warn/10 text-warn")}
        >
          🐢 Slow motion
        </button>

        <div className="flex items-center gap-0.5 rounded-full border border-white/10 p-1">
          <span className="px-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
            Speed
          </span>
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s as Speed)}
              aria-pressed={speed === s}
              className={cn(
                "rounded-full px-1.5 py-1 font-mono text-[9.5px] transition-colors",
                speed === s ? "bg-signal/20 text-signal" : "text-faint hover:text-white",
              )}
            >
              {s}×
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 font-mono text-[9.5px] text-faint">
          <span className="tabular-nums text-ink">{formatSimClock(state.timeSec)}</span>
          <span>/ {formatSimClock(SKY_WINDOW_SEC)}</span>
          <span className="hidden sm:inline">· 1× = {SIM_RATE_AT_1X}× real time</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-faint">Layers</span>
        <Toggle active={showPaths} onClick={() => toggleLayer("showPaths")}>
          Motion trails
        </Toggle>
        <Toggle active={showBeams} onClick={() => toggleLayer("showBeams")}>
          Comm beams
        </Toggle>
        <Toggle active={showCoverage} onClick={() => toggleLayer("showCoverage")}>
          Mask cone
        </Toggle>
        <Toggle active={showLabels} onClick={() => toggleLayer("showLabels")}>
          Labels
        </Toggle>
        <Toggle active={autoSlow} onClick={() => setAutoSlow(!autoSlow)}>
          Auto slow-mo
        </Toggle>
        <Toggle active={loop} onClick={() => setLoop(!loop)}>
          Loop
        </Toggle>

        <span className="mx-1 hidden h-4 w-px bg-white/10 sm:block" />

        <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-faint">Camera</span>
        {cameras.map((c) => (
          <Toggle key={c.id} active={camera === c.id} onClick={() => setCamera(c.id)}>
            {c.label}
          </Toggle>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Timeline + event log                                                       */
/* -------------------------------------------------------------------------- */

function useWindowEvents() {
  return useMemo(() => skyEvents().filter((e) => e.tSec >= 0), []);
}

function SkyTimeline({ state, paused = false }: { state: SkyState; paused?: boolean }) {
  const events = useWindowEvents();
  const pct = (t: number) => `${(t / SKY_WINDOW_SEC) * 100}%`;
  const currentIdx = events.findIndex((e) => e.tSec > state.timeSec);

  return (
    <div className="border-t border-white/[0.07] bg-[#060b16] px-4 py-3.5 md:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-faint">
          Handover timeline · one 15-minute window
        </p>
        <p className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-faint">
          {events.length} switches · click a marker to park just before it
        </p>
      </div>

      <div className="relative mt-3 h-1.5 rounded-full bg-white/10">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-signal/70 to-signal transition-[width] duration-150"
          style={{ width: pct(state.timeSec) }}
        />
        {events.map((e) => (
          <button
            key={e.id}
            type="button"
            title={`${shortName(e.from)} → ${shortName(e.to)} at ${formatSimClock(e.tSec)}`}
            onClick={() => seekAndPause(Math.max(0, e.tSec - 10))}
            className={cn(
              "absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-transform hover:scale-125",
              e.tSec <= state.timeSec
                ? "border-signal/70 bg-[#07222a]"
                : "border-warn/70 bg-[#1a1405] shadow-[0_0_10px_rgba(251,191,36,0.35)]",
            )}
            style={{ left: pct(e.tSec) }}
          />
        ))}
      </div>

      <p className="mt-2 font-mono text-[8.5px] uppercase tracking-[0.08em] text-faint">
        {paused
          ? "paused"
          : currentIdx === -1
            ? "end of window"
            : `next switch at ${formatSimClock(events[currentIdx].tSec)} · in ${Math.max(
                0,
                Math.round(events[currentIdx].tSec - state.timeSec),
              )} s`}
      </p>
    </div>
  );
}

function EventLog({ state }: { state: SkyState }) {
  const events = useWindowEvents();
  const listRef = useRef<HTMLDivElement>(null);
  const next = state.nextEvent;

  useEffect(() => {
    // Keep the upcoming switch in view as the window plays.
    const el = listRef.current?.querySelector<HTMLElement>("[data-next='true']");
    el?.scrollIntoView({ block: "nearest" });
  }, [next?.id]);

  return (
    <div className="panel flex min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-4 py-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
          Every handover in this window
        </p>
        <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
          {events.length} switches
        </span>
      </div>
      <div ref={listRef} className="max-h-[268px] min-h-0 flex-1 overflow-y-auto p-2">
        {events.map((e) => {
          const past = e.tSec <= state.timeSec;
          const isNext = next?.id === e.id;
          return (
            <button
              key={e.id}
              type="button"
              data-next={isNext || undefined}
              onClick={() => seekAndPause(Math.max(0, e.tSec - 10))}
              className={cn(
                "mb-1 flex w-full items-start gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors",
                isNext
                  ? "border-warn/35 bg-warn/[0.06]"
                  : past
                    ? "border-white/[0.05] bg-white/[0.01] opacity-70 hover:opacity-100"
                    : "border-white/[0.07] bg-white/[0.02] hover:border-white/20",
              )}
            >
              <span className="mt-0.5 w-8 shrink-0 font-mono text-[9px] text-faint">
                {formatSimClock(e.tSec)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-mono text-[10px]">
                  <span className={past ? "text-beam" : "text-ink"}>{shortName(e.from)}</span>
                  <span className="text-faint">→</span>
                  <span className="text-signal">{shortName(e.to)}</span>
                  <span className="ml-auto text-faint">
                    {e.fromElDeg.toFixed(0)}° → {e.toElDeg.toFixed(0)}°
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[9px] text-faint">
                  {reasonLabel(e.reason)} · held {Math.round(e.heldSec)} s
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Explainer                                                                  */
/* -------------------------------------------------------------------------- */

function SkyExplainer({ state }: { state: SkyState }) {
  const stageKey = state.phase;
  const stage = SKY_STAGES.find((s) => s.key === stageKey) ?? SKY_STAGES[0];

  return (
    <div className="space-y-4">
      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3 md:px-5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-signal/40 bg-signal/10 font-mono text-[10px] text-signal">
              {SKY_STAGES.findIndex((s) => s.key === stageKey) + 1}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
              {stage.label} · এই মুহূর্তে যা ঘটছে
            </span>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
            {PHASE_LABEL[state.phase]}
          </span>
        </div>
        <div className="grid gap-5 p-4 md:p-5 lg:grid-cols-[minmax(0,1fr)_296px] lg:gap-8">
          <div className="min-w-0">
            <h3 lang="bn" className="bangla text-[19px] font-semibold leading-snug text-white md:text-[21px]">
              {stage.titleBn}
            </h3>
            <p lang="bn" className="bangla mt-2 text-[13px] leading-[1.9] text-muted">
              {stage.bodyBn}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {SKY_STAGES.map((s) => (
                <div
                  key={s.key}
                  className={cn(
                    "rounded-lg border px-3 py-2",
                    s.key === stageKey
                      ? "border-signal/35 bg-signal/[0.06]"
                      : "border-white/[0.07] bg-white/[0.015]",
                  )}
                >
                  <p
                    className={cn(
                      "font-mono text-[9px] uppercase tracking-[0.12em]",
                      s.key === stageKey ? "text-signal" : "text-faint",
                    )}
                  >
                    {s.label} · {s.bn}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <aside className="min-w-0 space-y-2">
            <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-faint">
              At this instant
            </p>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
              <dl>
                <StatusRow
                  label="Serving"
                  value={state.serving ? shortName(state.serving.id) : "—"}
                  tone="text-signal"
                  sub={
                    state.serving
                      ? `${state.serving.elDeg.toFixed(1)}° · ${state.serving.rangeKm.toFixed(0)} km`
                      : undefined
                  }
                />
                <StatusRow
                  label="Candidate"
                  value={state.candidate ? shortName(state.candidate.id) : "—"}
                  tone="text-warn"
                  sub={
                    state.candidate
                      ? `${state.candidate.elDeg.toFixed(1)}° · ${state.candidate.rising ? "rising" : "falling"}`
                      : undefined
                  }
                />
                <StatusRow label="Phase" value={PHASE_LABEL[state.phase]} />
                <StatusRow
                  label="Last switch"
                  value={
                    state.lastEvent
                      ? `${shortName(state.lastEvent.from)} → ${shortName(state.lastEvent.to)}`
                      : "none yet"
                  }
                  tone="text-beam"
                  sub={
                    state.lastEvent ? `${formatSimClock(state.sinceLastSec)} ago` : undefined
                  }
                />
              </dl>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
              <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-faint">
                Rule in this model
              </p>
              <p lang="bn" className="bangla mt-1.5 text-[11.5px] leading-[1.85] text-muted">
                serving satellite {SKY_SWITCH_FLOOR_DEG}° elevation-এর নিচে নামলে (বা ২০°-এর বেশি
                ভালো pass হাজির হলে) {SKY_PREPARE_SEC} সেকেন্ডের প্রস্তুতি নিয়ে beam নতুন
                স্যাটেলাইটে যায়। সব calculation {SKY_TOTAL.toLocaleString()}টি স্যাটেলাইটের জন্য
                প্রতি মুহূর্তে করা হয়।
              </p>
            </div>
          </aside>
        </div>
      </div>

      <div className="panel p-4 md:p-5">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
          আকাশে এত স্যাটেলাইট, তবু একটি ডিশ
        </p>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {SKY_EXPLAINER.map((p, i) => (
            <p key={i} lang="bn" className="bangla text-[12.5px] leading-[1.95] text-muted">
              {p}
            </p>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {SKY_NOTES.map((n, i) => (
          <div key={n.t} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] text-signal/70">0{i + 1}</span>
              <h3 lang="bn" className="bangla-heading text-[12.5px] font-medium text-ink">
                {n.t}
              </h3>
            </div>
            <p lang="bn" className="bangla mt-1.5 text-[11.5px] leading-[1.85] text-muted">
              {n.d}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

export function SkyHandoverSim() {
  const reduced = useReducedMotion();
  const playing = useHandoverUI((s) => s.playing);
  const [time, setTime] = useState(handoverClock.time);
  const timeRef = useRef(handoverClock.time);
  const fs = useFullscreen<HTMLDivElement>();

  useEffect(() => {
    if (reduced) useHandoverUI.setState({ playing: false });
  }, [reduced]);

  // Mirror the 3D clock into React at ~14 fps for the readouts.
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 70) return;
      last = now;
      const t = handoverClock.time;
      if (Math.abs(t - timeRef.current) > 0.04) {
        timeRef.current = t;
        setTime(t);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const state = useMemo(() => sampleSky(time), [time]);
  const events = useWindowEvents();

  const fadeOut =
    time > SKY_WINDOW_SEC - 6 ? (time - (SKY_WINDOW_SEC - 6)) / 6 : 0;
  const fade = Math.min(1, Math.max(0, fadeOut));

  return (
    <div className="space-y-4">
      <div className="panel overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.07] px-4 py-3.5 md:px-5">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-white">
              Full-sky handover — {SKY_TOTAL.toLocaleString()} satellites, one dish
            </h2>
            <p className="mt-0.5 text-[11px] text-faint">
              {OBSERVER.name} · {OBSERVER.latLabel} {OBSERVER.lonLabel} · shell 1 at {SKY_ALTITUDE_KM}{" "}
              km / {SKY_INCLINATION_DEG}° · {SKY_PLANES} orbital planes · educational model
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-signal/30 bg-signal/[0.07] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-signal">
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className={cn(
                    "absolute inline-flex h-full w-full rounded-full bg-current",
                    playing && "animate-blink",
                  )}
                />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
              </span>
              {playing ? "Simulation running" : "Paused"}
            </span>
            <span className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-faint">
              {events.length} handovers / 15 min
            </span>
          </div>
        </div>

        {/* Stage + status */}
        <div className="grid gap-px bg-white/[0.07] lg:grid-cols-[minmax(0,1fr)_338px]">
          <div ref={fs.ref} className={fsStageClass(fs.isFullscreen, fs.hasNative, "relative min-w-0 bg-[#03070f]")}>
            <HandoverScene className="fs-fill h-[380px] sm:h-[440px] lg:h-[520px]" />

            <StageCameraSwitch isFullscreen={fs.isFullscreen} onToggleFullscreen={fs.toggle} />

            {/* Live chip */}
            <div className="absolute right-3 top-3 hidden items-center gap-2 rounded-full border border-white/10 bg-[#040a14]/70 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-faint backdrop-blur sm:flex">
              <span className="text-signal">●</span>
              {state.phase === "transfer" && state.currentEvent
                ? `Transfer ${shortName(state.currentEvent.from)} → ${shortName(state.currentEvent.to)}`
                : state.phase === "preparing" && state.nextEvent
                  ? `Prep ${shortName(state.nextEvent.to)}`
                  : state.serving
                    ? `Serving ${shortName(state.serving.id)} · ${state.serving.elDeg.toFixed(0)}°`
                    : "No link"}
            </div>

            {/* Handover moment banner */}
            <HandoverBanner state={state} />

            {/* Legend */}
            <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/[0.07] bg-[#040a14]/70 px-2.5 py-1.5 font-mono text-[8.5px] uppercase tracking-[0.06em] text-faint backdrop-blur">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-signal" /> connected
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-warn" /> next candidate
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-beam" /> released
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[9px] text-[#7df3e8]">▲</span> uplink packets
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[9px] text-[#f6ba68]">▼</span> downlink packets
              </span>
              <span className="hidden items-center gap-1.5 md:flex">
                <span className="h-1.5 w-1.5 rotate-45 bg-laser" /> laser mesh
              </span>
              <span className="hidden items-center gap-1.5 md:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-warn/80" /> gateway feed
              </span>
              <span className="ml-auto hidden text-signal/80 sm:inline">
                {SKY_TOTAL.toLocaleString()} satellites · drag to orbit
              </span>
            </div>

            <div
              className="pointer-events-none absolute inset-0 bg-[#02050c] transition-opacity duration-300"
              style={{ opacity: fade }}
              aria-hidden
            />
          </div>

          <SkyStatusPanel state={state} />
        </div>

        <SkyControls state={state} />
        <SkyTimeline state={state} paused={!playing} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,290px)_minmax(0,1fr)]">
        <div className="panel flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-3.5 py-2.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
              Sky map · looking up
            </p>
            <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
              {state.counts.aboveHorizon} sats in view
            </span>
          </div>
          <div className="p-3">
            <SkyRadar state={state} />
            <p lang="bn" className="bangla mt-2 text-[10.5px] leading-[1.8] text-faint">
              কেন্দ্র = ঠিক মাথার উপর (zenith), কিনারা = দিগন্ত। প্রতিটি বিন্দু একটা স্যাটেলাইট;
              ড্যাশ করা লাল রিং-এর বাইরেরগুলো {ELEVATION_MASK_DEG}° mask-এর নিচে, তাই ব্যবহার হয় না।
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <EventLog state={state} />
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-faint">
              কীভাবে ডিশ সিদ্ধান্ত নেয়
            </p>
            <ol lang="bn" className="bangla mt-2 space-y-1.5 text-[11.5px] leading-[1.9] text-muted">
              <li>
                ১. প্রতিটি স্যাটেলাইটের elevation, azimuth আর distance প্রতি মুহূর্তে হিসাব হয়।
              </li>
              <li>
                ২. {ELEVATION_MASK_DEG}°-এর নিচেরগুলো বাদ। বাকিদের মধ্যে সর্বোচ্চ score পায় যে,
                সে-ই candidate।
              </li>
              <li>
                ৩. serving satellite {SKY_SWITCH_FLOOR_DEG}°-এর নিচে নামলে (বা ২০°-এর বেশি ভালো
                pass এলে) নতুন link তৈরি হতে শুরু করে।
              </li>
              <li>৪. beam ক্রসফেড করে, পুরনো link ছাড়া হয় — make-before-break।</li>
            </ol>
          </div>
        </div>
      </div>

      <SkyExplainer state={state} />
    </div>
  );
}
