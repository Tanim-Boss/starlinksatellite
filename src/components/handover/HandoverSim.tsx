import { useEffect, useMemo, useRef, useState } from "react";
import {
  CANDIDATE_READY_DEG,
  ELEVATION_MASK_DEG,
  OBSERVER,
  SAT_KEYS,
  SCENARIO,
  SCENARIO_DURATION_SEC,
  SIM_RATE_AT_1X,
  SWITCH_FLOOR_DEG,
  compassPoint,
  formatSimClock,
  lightTimeMs,
  roleLabel,
  sampleScenario,
  type SatRole,
  type ScenarioState,
} from "@/lib/handover";
import { STEP_COPY } from "@/lib/handoverContent";
import { useReducedMotion } from "@/lib/useMediaQuery";
import { cn } from "@/utils/cn";
import { HandoverScene } from "./HandoverScene";
import {
  SPEEDS,
  handoverClock,
  seekAndPause,
  seekAndPlay,
  useHandoverUI,
  type CameraMode,
  type Speed,
} from "./handoverStore";

/* -------------------------------------------------------------------------- */
/* Small UI pieces                                                            */
/* -------------------------------------------------------------------------- */

const ROLE_TEXT: Record<SatRole, string> = {
  serving: "text-signal",
  candidate: "text-warn",
  previous: "text-beam",
  out: "text-[#f87171]",
  visible: "text-muted",
};

const ROLE_DOT: Record<SatRole, string> = {
  serving: "bg-signal shadow-[0_0_10px_2px_rgba(61,219,217,0.6)]",
  candidate: "bg-warn shadow-[0_0_10px_2px_rgba(251,191,36,0.45)]",
  previous: "bg-beam",
  out: "bg-[#f87171]/60",
  visible: "bg-muted/60",
};

const controlBase =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted transition-colors hover:border-signal/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:cursor-not-allowed disabled:opacity-35";

function StatusRow({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  tone?: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] py-2 last:border-0">
      <span className="pt-0.5 text-[10.5px] leading-tight text-faint">{label}</span>
      <span className={cn("text-right font-mono text-[11px] leading-tight", tone ?? "text-ink")}>
        {value}
        {sub && <span className="mt-0.5 block text-[9px] text-faint">{sub}</span>}
      </span>
    </div>
  );
}

function QualityBar({ value, tone }: { value: number; tone: string }) {
  return (
    <span className="block h-1 w-full overflow-hidden rounded-full bg-white/10">
      <span
        className={cn("block h-full rounded-full transition-[width] duration-200", tone)}
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Status panel                                                               */
/* -------------------------------------------------------------------------- */

const PHASE_LABEL: Record<ScenarioState["phase"], string> = {
  tracking: "Active · tracking",
  preparing: "Preparing next link",
  transfer: "Handover in progress",
  completed: "Handover completed",
};

function StatusPanel({ state }: { state: ScenarioState }) {
  const { serving, candidate, sats, phase, progress, lastEvent } = state;
  const servingSat = serving ? sats[serving] : null;
  const candidateSat = candidate ? sats[candidate] : null;

  const handoverText =
    phase === "preparing"
      ? `Preparing ${state.nextEvent?.to ? `SAT-${state.nextEvent.to}` : "next satellite"} · ${Math.round(progress * 100)}%`
      : phase === "transfer"
        ? "Beam transferring"
        : phase === "completed" && lastEvent
          ? `Completed · SAT-${lastEvent.from} → SAT-${lastEvent.to}`
          : "Waiting for suitable satellite";

  return (
    <aside className="flex h-full min-w-0 flex-col bg-[#060b16] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-faint">Live status</p>
        <span className="rounded-full border border-white/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
          simulated
        </span>
      </div>

      {/* Current satellite */}
      <div className="mt-3 rounded-xl border border-signal/25 bg-signal/[0.06] p-3">
        <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-signal/80">
          Current satellite
        </p>
        <p className="mt-1 flex items-center gap-2 text-[15px] font-semibold text-white">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              serving ? "bg-signal animate-blink" : "bg-[#f87171]",
            )}
          />
          {serving ? servingSat?.name : "No link"}
        </p>
        <div className="mt-2 flex items-baseline justify-between font-mono text-[10px] text-muted">
          <span>
            EL{" "}
            <span className="text-ink">
              {servingSat ? `${servingSat.elDeg.toFixed(1)}°` : "—"}
            </span>
          </span>
          <span>
            AZ{" "}
            <span className="text-ink">
              {servingSat ? `${servingSat.azDeg.toFixed(0)}° ${compassPoint(servingSat.azDeg)}` : "—"}
            </span>
          </span>
        </div>
        <div className="mt-2">
          <QualityBar value={servingSat?.quality ?? 0} tone="bg-signal" />
        </div>
        <p className="mt-1.5 font-mono text-[9px] text-faint">
          {servingSat && servingSat.visible
            ? `visible above ${ELEVATION_MASK_DEG}° mask · link quality ${Math.round(
                (servingSat.quality ?? 0) * 100,
              )}%`
            : "link dropped"}
        </p>
      </div>

      {/* Candidate */}
      <div className="mt-2 rounded-xl border border-white/[0.09] bg-white/[0.02] p-3">
        <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-faint">
          Next candidate
        </p>
        <p className="mt-1 flex items-center gap-2 text-[13px] font-medium text-white">
          <span className={cn("h-1.5 w-1.5 rounded-full", candidate ? "bg-warn" : "bg-white/20")} />
          {candidate ? candidateSat?.name : "No suitable satellite"}
        </p>
        <p className="mt-1 font-mono text-[9.5px] text-faint">
          {candidateSat
            ? `EL ${candidateSat.elDeg.toFixed(1)}° · ${candidateSat.rising ? "rising" : "falling"} · ${
                candidateSat.elDeg >= CANDIDATE_READY_DEG ? "suitable" : "not yet suitable"
              }`
            : "waiting for the next pass"}
        </p>
      </div>

      {/* State rows */}
      <dl className="mt-3">
        <StatusRow
          label="Connection"
          value={
            <span className="inline-flex items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  phase === "tracking" ? "bg-signal" : phase === "completed" ? "bg-signal" : "bg-warn",
                )}
              />
              {PHASE_LABEL[phase]}
            </span>
          }
        />
        {(phase === "transfer" || phase === "completed") && lastEvent && (
          <>
            <StatusRow
              label="Previous satellite"
              value={lastEvent.from ? `STARLINK-SAT-${lastEvent.from}` : "—"}
              tone="text-beam"
            />
            <StatusRow
              label="New satellite"
              value={`STARLINK-SAT-${lastEvent.to}`}
              tone="text-signal"
            />
          </>
        )}
        <StatusRow
          label="Handover"
          value={handoverText}
          tone={phase === "tracking" ? "text-muted" : "text-warn"}
          sub={
            phase === "preparing" || phase === "transfer"
              ? `${Math.round(progress * 100)}% of preparation`
              : state.nextEvent
                ? `next switch in ${Math.max(0, Math.round(state.nextEvent.tSec - state.timeSec))} s`
                : "end of loop"
          }
        />
        <StatusRow
          label="Active link"
          value={
            servingSat?.visible
              ? `Ku-band · SAT-${serving} → dish`
              : "No active link"
          }
          tone={servingSat?.visible ? "text-signal" : "text-[#f87171]"}
          sub={
            servingSat?.visible
              ? `${servingSat.rangeKm.toFixed(0)} km · ${lightTimeMs(servingSat.rangeKm).toFixed(1)} ms one-way`
              : undefined
          }
        />
        <StatusRow label="Visibility mask" value={`${ELEVATION_MASK_DEG}° elevation`} />
        <StatusRow label="Handover floor" value="40° elevation" />
      </dl>

      {/* Progress bar */}
      <div className="mt-1">
        <div className="flex items-center justify-between font-mono text-[8.5px] uppercase tracking-[0.12em] text-faint">
          <span>Handover progress</span>
          <span className={phase === "tracking" ? "text-faint" : "text-warn"}>
            {Math.round(progress * 100)}%
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-150",
              phase === "transfer" ? "bg-warn" : "bg-signal/70",
            )}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      {/* Per-satellite table */}
      <div className="mt-3 border-t border-white/[0.07] pt-2">
        <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-faint">
          Watchlist · 3 satellites
        </p>
        <div className="mt-1.5 space-y-1">
          {SAT_KEYS.map((key) => {
            const sat = state.sats[key];
            return (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2 py-1.5",
                  sat.role === "serving"
                    ? "border-signal/25 bg-signal/[0.05]"
                    : "border-white/[0.06] bg-white/[0.015]",
                )}
              >
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", ROLE_DOT[sat.role])} />
                <span className="w-[74px] shrink-0 font-mono text-[9.5px] text-ink">SAT-{key}</span>
                <span className="w-[46px] shrink-0 font-mono text-[9.5px] text-muted">
                  {sat.visible ? `${sat.elDeg.toFixed(0)}°` : "—"}
                </span>
                <span className={cn("flex-1 truncate font-mono text-[8.5px] uppercase tracking-[0.06em]", ROLE_TEXT[sat.role])}>
                  {roleLabel(sat.role)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-auto pt-3 text-[9px] leading-relaxed text-faint">
        All values are generated by this educational simulation — not live satellite telemetry.
      </p>
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/* Controls                                                                   */
/* -------------------------------------------------------------------------- */

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em] transition-colors",
        active
          ? "border-signal/40 bg-signal/10 text-signal"
          : "border-white/10 text-faint hover:border-white/25 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function Controls({
  time,
  stepId,
  onStep,
}: {
  time: number;
  stepId: number;
  onStep: (dir: -1 | 1) => void;
}) {
  const playing = useHandoverUI((s) => s.playing);
  const speed = useHandoverUI((s) => s.speed);
  const camera = useHandoverUI((s) => s.camera);
  const showPaths = useHandoverUI((s) => s.showPaths);
  const showBeams = useHandoverUI((s) => s.showBeams);
  const showCoverage = useHandoverUI((s) => s.showCoverage);
  const showLabels = useHandoverUI((s) => s.showLabels);
  const loop = useHandoverUI((s) => s.loop);
  const togglePlay = useHandoverUI((s) => s.togglePlay);
  const setSpeed = useHandoverUI((s) => s.setSpeed);
  const setCamera = useHandoverUI((s) => s.setCamera);
  const toggleLayer = useHandoverUI((s) => s.toggleLayer);
  const setLoop = useHandoverUI((s) => s.setLoop);
  const restart = useHandoverUI((s) => s.restart);

  const cameras: { id: CameraMode; label: string }[] = [
    { id: "ground", label: "Ground view" },
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
        <button type="button" onClick={restart} className={controlBase} aria-label="Restart simulation">
          ↺ Restart
        </button>
        <button
          type="button"
          onClick={() => onStep(-1)}
          disabled={stepId <= 1}
          className={controlBase}
        >
          ◀ Prev step
        </button>
        <button
          type="button"
          onClick={() => onStep(1)}
          disabled={stepId >= STEP_COPY.length}
          className={controlBase}
        >
          Next step ▶
        </button>

        <span className="mx-1 hidden h-4 w-px bg-white/10 sm:block" />

        <button
          type="button"
          onClick={() => setSpeed(speed === 0.25 ? 1 : 0.25)}
          aria-pressed={speed === 0.25}
          className={cn(
            controlBase,
            speed === 0.25 && "border-warn/40 bg-warn/10 text-warn",
          )}
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
                "rounded-full px-2 py-1 font-mono text-[9.5px] transition-colors",
                speed === s ? "bg-signal/20 text-signal" : "text-faint hover:text-white",
              )}
            >
              {s}×
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 font-mono text-[9.5px] text-faint">
          <span className="tabular-nums text-ink">{formatSimClock(time)}</span>
          <span>/ {formatSimClock(SCENARIO_DURATION_SEC)}</span>
          <span className="hidden sm:inline">· 1× = {SIM_RATE_AT_1X}× real time</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-faint">Layers</span>
        <Toggle active={showPaths} onClick={() => toggleLayer("showPaths")}>
          Orbital paths
        </Toggle>
        <Toggle active={showBeams} onClick={() => toggleLayer("showBeams")}>
          Comm beams
        </Toggle>
        <Toggle active={showCoverage} onClick={() => toggleLayer("showCoverage")}>
          Coverage area
        </Toggle>
        <Toggle active={showLabels} onClick={() => toggleLayer("showLabels")}>
          Labels
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
/* Timeline                                                                   */
/* -------------------------------------------------------------------------- */

function Timeline({
  time,
  stepId,
  onSelect,
}: {
  time: number;
  stepId: number;
  onSelect: (id: number) => void;
}) {
  const steps = SCENARIO.steps;
  const pct = (t: number) => `${(t / SCENARIO_DURATION_SEC) * 100}%`;

  return (
    <div className="border-t border-white/[0.07] bg-[#060b16] px-4 py-3.5 md:px-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-faint">
          Handover timeline
        </p>
        <p className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-faint">
          A → B → C · click a step
        </p>
      </div>

      {/* Progress track with event flags */}
      <div className="relative mt-2.5 h-1.5 rounded-full bg-white/10">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-signal/70 to-signal transition-[width] duration-150"
          style={{ width: pct(time) }}
        />
        {steps.slice(1).map((s) => (
          <span
            key={s.id}
            className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-white/25"
            style={{ left: pct(s.startSec) }}
          />
        ))}
        {SCENARIO.events.map((e) => (
          <span
            key={`${e.from}-${e.to}`}
            title={`${e.from} → ${e.to} at ${formatSimClock(e.tSec)}`}
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-warn/70 bg-[#1a1405] shadow-[0_0_10px_rgba(251,191,36,0.45)]"
            style={{ left: pct(e.tSec) }}
          />
        ))}
      </div>

      <ol className="mt-2.5 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
        {steps.map((s) => {
          const copy = STEP_COPY[s.id - 1];
          const active = stepId === s.id;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "group flex w-full items-start gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors",
                  active
                    ? "border-signal/40 bg-signal/[0.07]"
                    : "border-white/[0.07] bg-white/[0.015] hover:border-white/20",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border font-mono text-[8px]",
                    active
                      ? "border-signal bg-signal/20 text-signal"
                      : "border-white/20 text-faint group-hover:text-white",
                  )}
                >
                  {s.id}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block truncate font-mono text-[9px] uppercase tracking-[0.04em]",
                      active ? "text-signal" : "text-ink",
                    )}
                  >
                    {copy?.rail ?? s.short}
                  </span>
                  <span className="mt-0.5 block font-mono text-[8px] text-faint">
                    {formatSimClock(s.startSec)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step explanation                                                           */
/* -------------------------------------------------------------------------- */

function StepExplanation({ state }: { state: ScenarioState }) {
  const copy = STEP_COPY[Math.min(state.stepId, STEP_COPY.length) - 1];
  const sat = state.serving ? state.sats[state.serving] : null;
  const candidate = state.candidate ? state.sats[state.candidate] : null;

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3 md:px-5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-signal/40 bg-signal/10 font-mono text-[10px] text-signal">
            {copy.id}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
            {copy.leadEn}
          </span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
          এই ধাপে যা ঘটছে
        </span>
      </div>

      <div className="grid gap-6 p-4 md:p-5 lg:grid-cols-[minmax(0,1fr)_296px] lg:gap-8">
        <div className="min-w-0">
          <h3 lang="bn" className="bangla text-[19px] font-semibold leading-snug text-white md:text-[22px]">
            {copy.titleBn}
          </h3>
          <p lang="bn" className="bangla mt-2 text-[13.5px] leading-relaxed text-signal/90">
            {copy.summaryBn}
          </p>
          <div className="mt-3 space-y-2.5">
            {copy.bodyBn.map((p, i) => (
              <p key={i} lang="bn" className="bangla text-[13px] leading-[1.9] text-muted">
                {p}
              </p>
            ))}
          </div>

          {copy.noteBn && (
            <div
              className={cn(
                "mt-4 rounded-xl border p-3.5",
                copy.noteBn.tone === "warn"
                  ? "border-warn/25 bg-warn/[0.05]"
                  : "border-signal/20 bg-signal/[0.04]",
              )}
            >
              <p lang="bn" className={cn("bangla text-[11.5px] font-semibold", copy.noteBn.tone === "warn" ? "text-warn" : "text-signal")}>
                {copy.noteBn.title}
              </p>
              <p lang="bn" className="bangla mt-1 text-[12px] leading-[1.85] text-muted">
                {copy.noteBn.body}
              </p>
            </div>
          )}
        </div>

        <aside className="min-w-0 space-y-2">
          <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-faint">
            At this instant
          </p>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
            <dl>
              <StatusRow
                label="Serving"
                value={state.serving ? `SAT-${state.serving}` : "—"}
                tone="text-signal"
                sub={sat ? `${sat.elDeg.toFixed(1)}° · ${sat.rangeKm.toFixed(0)} km` : undefined}
              />
              <StatusRow
                label="Candidate"
                value={state.candidate ? `SAT-${state.candidate}` : "—"}
                tone="text-warn"
                sub={
                  candidate
                    ? `${candidate.elDeg.toFixed(1)}° · ${candidate.rising ? "rising" : "falling"}`
                    : undefined
                }
              />
              <StatusRow
                label="Phase"
                value={PHASE_LABEL[state.phase]}
                tone={state.phase === "tracking" ? "text-muted" : "text-warn"}
              />
              <StatusRow
                label="Progress"
                value={`${Math.round(state.progress * 100)}%`}
                tone={state.phase === "tracking" ? "text-muted" : "text-warn"}
              />
              <StatusRow
                label="Last switch"
                value={
                  state.lastEvent
                    ? `SAT-${state.lastEvent.from} → SAT-${state.lastEvent.to}`
                    : "none yet"
                }
                tone={state.lastEvent ? "text-beam" : "text-faint"}
                sub={
                  state.sinceLastSec !== null
                    ? `${formatSimClock(state.sinceLastSec)} ago`
                    : undefined
                }
              />
            </dl>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
            <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-faint">
              Handover rule in this model
            </p>
            <p lang="bn" className="bangla mt-1.5 text-[11.5px] leading-[1.85] text-muted">
              serving satellite {`${SWITCH_FLOOR_DEG}°`} elevation-এর নিচে নামলে, এবং পরবর্তী candidate{" "}
              {`${CANDIDATE_READY_DEG}°`}-এর উপরে থাকলে link transfer হয়। বাস্তব নেটওয়ার্কে capacity,
              obstruction ও routing-ও বিবেচনা করা হয়।
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

function countCompleted(state: ScenarioState) {
  if (!state.lastEvent) return 0;
  return SCENARIO.events.filter((e) => e.tSec <= state.timeSec + 0.001).length;
}

export function HandoverSim() {
  const reduced = useReducedMotion();
  const playing = useHandoverUI((s) => s.playing);
  const camera = useHandoverUI((s) => s.camera);
  const setCamera = useHandoverUI((s) => s.setCamera);
  const [time, setTime] = useState(0);
  const timeRef = useRef(0);

  // Pause when the visitor prefers reduced motion, once.
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

  const state = useMemo(() => sampleScenario(time), [time]);
  const stepId = state.stepId;

  const goStep = (id: number, play: boolean) => {
    const step = SCENARIO.steps.find((s) => s.id === id) ?? SCENARIO.steps[0];
    // Land on the transfer itself for step 4, and just before C becomes visible
    // for the repeat step — otherwise the wait would be most of the step.
    const second = SCENARIO.events[1];
    const target =
      step.id === 4
        ? (step.startSec + step.endSec) / 2
        : step.id === 6 && second
          ? Math.max(step.startSec, second.prepareSec - 22)
          : step.startSec + Math.min(1.2, (step.endSec - step.startSec) * 0.2);
    if (play) seekAndPlay(target);
    else seekAndPause(target);
    timeRef.current = target;
    setTime(target);
  };

  const onStep = (dir: -1 | 1) => {
    const next = Math.max(1, Math.min(STEP_COPY.length, stepId + dir));
    goStep(next, true);
  };

  // Fade the canvas at the loop seam so the restart reads as intentional.
  const fadeOut = time > SCENARIO_DURATION_SEC - 8 ? (time - (SCENARIO_DURATION_SEC - 8)) / 8 : 0;
  const fade = Math.min(1, Math.max(0, fadeOut));

  const transferCount = countCompleted(state);

  return (
    <div className="space-y-4">
      <div className="panel overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.07] px-4 py-3.5 md:px-5">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-white">
              Starlink dish handover — interactive simulation
            </h2>
            <p className="mt-0.5 text-[11px] text-faint">
              {OBSERVER.name} · {OBSERVER.latLabel} {OBSERVER.lonLabel} · three LEO satellites at{" "}
              550 km · educational model
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
              Handovers this loop: {transferCount}/{SCENARIO.events.length}
            </span>
          </div>
        </div>

        {/* Stage + status */}
        <div className="grid gap-px bg-white/[0.07] lg:grid-cols-[minmax(0,1fr)_338px]">
          <div className="relative min-w-0 bg-[#03070f]">
            <HandoverScene className="h-[360px] sm:h-[430px] lg:h-[510px]" />

            {/* Camera switcher */}
            <div className="absolute left-3 top-3 flex flex-wrap gap-1">
              {(
                [
                  { id: "ground", label: "Ground" },
                  { id: "space", label: "Space" },
                  { id: "dish", label: "Dish close-up" },
                ] as { id: CameraMode; label: string }[]
              ).map((c) => (
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
            </div>

            {/* Live chip */}
            <div className="absolute right-3 top-3 hidden items-center gap-2 rounded-full border border-white/10 bg-[#040a14]/70 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-faint backdrop-blur sm:flex">
              <span className="text-signal">●</span>
              {SCENARIO_SAT_LABEL(state)}
            </div>

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
                <span className="h-1.5 w-1.5 rounded-full bg-[#f87171]" /> below 25° mask
              </span>
              <span className="ml-auto hidden text-signal/80 sm:inline">
                drag to orbit · scroll to zoom
              </span>
            </div>

            <div
              className="pointer-events-none absolute inset-0 bg-[#02050c] transition-opacity duration-300"
              style={{ opacity: fade }}
              aria-hidden
            />
          </div>

          <StatusPanel state={state} />
        </div>

        <Controls time={time} stepId={stepId} onStep={onStep} />
        <Timeline time={time} stepId={stepId} onSelect={(id) => goStep(id, false)} />
      </div>

      <StepExplanation state={state} />
    </div>
  );
}

function SCENARIO_SAT_LABEL(state: ScenarioState) {
  const evt = state.lastEvent;
  if (state.phase === "transfer" && evt) return `Transfer ${evt.from} → ${evt.to}`;
  if (state.phase === "preparing" && state.nextEvent)
    return `Prep ${state.nextEvent.from} → ${state.nextEvent.to}`;
  if (state.serving) return `Serving ${state.serving} · ${state.sats[state.serving].elDeg.toFixed(0)}°`;
  return "No link";
}
