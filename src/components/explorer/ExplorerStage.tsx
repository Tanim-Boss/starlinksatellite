import { Suspense, useEffect, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Scene } from "@/components/Scene";
import { SceneGate } from "@/components/site/SceneGate";
import { FullscreenButton, fsStageClass, useFullscreen } from "@/components/site/FullscreenStage";
import { useApp, type ScenarioId } from "@/store";
import {
  GATEWAY_MIN_ELEVATION_DEG,
  KM_PER_UNIT,
  SATS,
  SHELLS,
  coverageInfo,
  earthFixedToLatLon,
  latLonToEarthFixed,
  orbitalPeriodSec,
  orbitalVelocityKmS,
  satPosition,
  worldToEarthFixed,
} from "@/lib/astro";
import { simClock } from "@/lib/simClock";
import { formatArea, formatClock, formatInt, formatLat, formatLon, formatSpeedMult } from "@/lib/format";
import { cn } from "@/utils/cn";

const SCENARIOS: {
  id: ScenarioId;
  icon: string;
  title: string;
  short: string;
  blurb: string;
  tips: string[];
}[] = [
  {
    id: "focus",
    icon: "◎",
    title: "Single satellite",
    short: "Satellite",
    blurb:
      "Follow one spacecraft: its glowing footprint on Earth, the signal cone down to the ground, and the yellow ground track it traces as it orbits.",
    tips: ["Click any satellite to inspect it.", "Use “Focus camera” to fly alongside it.", "Watch the ground track sweep west with each orbit."],
  },
  {
    id: "shells",
    icon: "❖",
    title: "Orbital shells",
    short: "Shells",
    blurb:
      "Starlink is arranged in shells — groups of orbital planes sharing an altitude and an inclination. Colour shows the shell; rings show each plane.",
    tips: ["Toggle coverage samples to compare footprint sizes.", "The 70° and 97.6° shells serve high latitudes.", "Shell 4 is sun-synchronous: a dawn–dusk orbit."],
  },
  {
    id: "ground",
    icon: "⌁",
    title: "Ground stations",
    short: "Gateways",
    blurb:
      "Gateway antennas track the highest satellite in view and hand off as it sets. Lime lines are the active radio links; pulses show traffic moving.",
    tips: [`Gateways only track satellites above ${GATEWAY_MIN_ELEVATION_DEG}° elevation.`, "Watch links switch as satellites cross the sky.", "Enable “Rotate Earth” to carry stations around the planet."],
  },
  {
    id: "overlap",
    icon: "⊕",
    title: "Coverage overlap",
    short: "Overlap",
    blurb:
      "Thousands of footprints overlap so that almost every point has multiple satellites in view — the redundancy that makes seamless handover possible.",
    tips: ["Click anywhere on Earth to drop a probe.", "The probe panel counts covering satellites.", "Brighter caps mean more overlap."],
  },
  {
    id: "laser",
    icon: "⇄",
    title: "Laser links",
    short: "Lasers",
    blurb:
      "V1.5 and later satellites carry optical terminals. Neighbours in the same plane are linked, so traffic can stay in space instead of dropping to the ground.",
    tips: ["Lines chain consecutive satellites within a plane.", "Real satellites also link across planes.", "Space routing wins over long distances."],
  },
];

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5">
      <span className="text-[12px] text-muted">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={cn(
          "relative shrink-0 rounded-full transition-colors",
          checked ? "bg-signal/80" : "bg-white/15",
        )}
        style={{ height: 18, width: 32 }}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all",
            checked ? "left-[16px]" : "left-0.5",
          )}
        />
      </button>
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* Satellite + probe readouts                                                 */
/* -------------------------------------------------------------------------- */

const _w = new THREE.Vector3();
const _f = new THREE.Vector3();
const _probeFixed = new THREE.Vector3();

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/[0.06] py-1.5 last:border-0">
      <dt className="text-[10.5px] text-faint">{label}</dt>
      <dd className="font-mono text-[11px] text-ink">{value}</dd>
    </div>
  );
}

function SelectionPanel() {
  const selectedId = useApp((s) => s.selectedId);
  const selectSat = useApp((s) => s.selectSat);
  const focusCamera = useApp((s) => s.focusCamera);
  useApp((s) => s.uiTick);

  if (selectedId === null) return null;
  const sat = SATS[selectedId];
  const shell = SHELLS[sat.shell];
  const cov = coverageInfo(shell.altitudeKm);
  const speed = orbitalVelocityKmS(sat.aKm);
  const period = orbitalPeriodSec(sat.aKm);
  satPosition(sat, simClock.time, _w);
  const { latDeg, lonDeg } = earthFixedToLatLon(worldToEarthFixed(_w, _f));

  return (
    <div className="panel pointer-events-auto w-full max-w-[19rem] p-4 shadow-2xl shadow-black/50 backdrop-blur-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: shell.color }} />
            <h3 className="font-mono text-[13px] font-semibold text-white">{sat.name}</h3>
          </div>
          <p className="mt-1 text-[10px] text-faint">
            {shell.short} · plane {sat.plane + 1} · slot {sat.slot + 1}
          </p>
        </div>
        <button
          type="button"
          onClick={() => selectSat(null)}
          aria-label="Deselect satellite"
          className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-faint transition-colors hover:border-white/30 hover:text-white"
        >
          ✕
        </button>
      </div>

      <dl className="mt-3">
        <Row label="Altitude" value={`${shell.altitudeKm} km`} />
        <Row label="Inclination" value={`${shell.inclinationDeg}°`} />
        <Row label="Velocity" value={`${speed.toFixed(2)} km/s`} />
        <Row label="Period" value={`${(period / 60).toFixed(1)} min`} />
        <Row label="Sub-satellite point" value={`${formatLat(latDeg)} ${formatLon(lonDeg)}`} />
        <Row label="Footprint ⌀" value={`≈${formatInt(cov.capDiameterKm)} km`} />
        <Row label="Coverage" value={formatArea(cov.areaKm2)} />
        <Row label="Light time (zenith)" value={`${cov.minLatencyMs.toFixed(1)} ms`} />
      </dl>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => focusCamera(selectedId)}
          className="flex-1 rounded-lg border border-signal/40 bg-signal/10 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-signal transition-colors hover:bg-signal/20 hover:text-white"
        >
          Focus camera
        </button>
        <button
          type="button"
          onClick={() => selectSat((selectedId + 1) % SATS.length)}
          className="rounded-lg border border-white/12 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-white/30 hover:text-white"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function ProbePanel() {
  const probe = useApp((s) => s.probe);
  const setProbe = useApp((s) => s.setProbe);
  useApp((s) => s.uiTick);

  if (!probe) return null;
  latLonToEarthFixed(probe.lat, probe.lon, _probeFixed);
  const counts = [0, 0, 0, 0];
  let total = 0;
  for (const sat of SATS) {
    satPosition(sat, simClock.time, _w);
    worldToEarthFixed(_w, _f);
    const ang = Math.acos(THREE.MathUtils.clamp(_f.normalize().dot(_probeFixed), -1, 1));
    const lambda = Math.acos(1 / (1 + SHELLS[sat.shell].altitudeKm / KM_PER_UNIT));
    if (ang <= lambda) {
      counts[sat.shell]++;
      total++;
    }
  }

  return (
    <div className="panel pointer-events-auto w-full max-w-[19rem] border-warn/30 p-4 shadow-2xl shadow-black/50 backdrop-blur-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-semibold text-warn">Coverage probe</h3>
          <p className="mt-0.5 font-mono text-[10px] text-warn/70">
            {formatLat(probe.lat)} · {formatLon(probe.lon)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setProbe(null)}
          className="rounded-md border border-warn/30 px-1.5 py-0.5 text-[10px] text-warn transition-colors hover:border-warn hover:text-white"
        >
          Clear
        </button>
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-3xl font-semibold leading-none text-warn">{total}</span>
        <span className="pb-0.5 text-[11px] leading-tight text-muted">
          simulated satellites
          <br /> cover this point
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SHELLS.map((sh, i) =>
          counts[i] > 0 ? (
            <span
              key={sh.key}
              className="rounded-full border px-2 py-0.5 font-mono text-[9px]"
              style={{ borderColor: `${sh.color}66`, color: sh.color }}
            >
              {sh.short}: {counts[i]}
            </span>
          ) : null,
        )}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-faint">
        Geometric footprint only (0° elevation). Real gateways need ≥
        {GATEWAY_MIN_ELEVATION_DEG}°, and the real constellation is far denser than this model.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function ExplorerStage() {
  const scenario = useApp((s) => s.scenario);
  const setScenario = useApp((s) => s.setScenario);
  const toggles = useApp((s) => s.toggles);
  const setToggle = useApp((s) => s.setToggle);
  const playing = useApp((s) => s.playing);
  const togglePlay = useApp((s) => s.togglePlay);
  const speed = useApp((s) => s.speed);
  const setSpeed = useApp((s) => s.setSpeed);
  const selectedId = useApp((s) => s.selectedId);
  const probe = useApp((s) => s.probe);
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const fs = useFullscreen<HTMLDivElement>();

  // On small screens the readout lives below the canvas; open it as soon as
  // the user selects a satellite or drops a probe.
  useEffect(() => {
    if (selectedId === null && !probe) return;
    // Some embedded browsers have no matchMedia at all; falling back to the
    // viewport width keeps the panel opening instead of throwing here.
    let narrow = false;
    try {
      narrow =
        typeof window.matchMedia === "function"
          ? window.matchMedia("(max-width: 1023px)").matches
          : window.innerWidth < 1024;
    } catch {
      narrow = window.innerWidth < 1024;
    }
    if (narrow) setShowInfo(true);
  }, [selectedId, probe]);

  const meta = SCENARIOS.find((s) => s.id === scenario)!;

  // Deselect / clear probe when moving to scenarios that don't use them.
  useEffect(() => {
    if (scenario !== "overlap") useApp.getState().setProbe(null);
  }, [scenario]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#010409]">
      {/* Scenario tabs */}
      <div className="flex flex-col gap-3 border-b border-white/[0.07] bg-[#060b16] px-3 py-3 md:flex-row md:items-center md:justify-between md:px-4">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:pb-0">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScenario(s.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[11.5px] font-medium transition-colors",
                scenario === s.id
                  ? "border-signal/50 bg-signal/10 text-signal"
                  : "border-white/10 text-muted hover:border-white/25 hover:text-white",
              )}
            >
              <span className="text-[13px] leading-none opacity-80">{s.icon}</span>
              {s.title}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="rounded-lg border border-white/12 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink transition-colors hover:border-signal/50 hover:text-signal"
          >
            {playing ? "❙❙ pause" : "▶ play"}
          </button>
          <div className="rounded-lg border border-white/10 px-2 py-1.5 font-mono text-[10px] text-faint">
            {formatClock(simClock.time)}
          </div>
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            aria-expanded={showSettings}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
              showSettings
                ? "border-signal/50 bg-signal/10 text-signal"
                : "border-white/12 text-muted hover:border-white/30 hover:text-white",
            )}
          >
            Layers
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative">
        <div
          ref={fs.ref}
          className={fsStageClass(fs.isFullscreen, fs.hasNative, "relative")}
        >
          <div className="fs-fill relative h-[58vh] min-h-[380px] w-full md:h-[64vh] md:min-h-[520px]">
          <SceneGate
            caption="Spinning up the constellation…"
            unavailableTitle="The 3D explorer needs WebGL."
            unavailableBody="This browser cannot create a 3D context, so the model cannot render. The shell table, coverage numbers and the rest of the guide still work."
          >
            <Canvas
              camera={{ position: [3.35, 1.6, 4.1], fov: 42, near: 0.01, far: 400 }}
              dpr={[1, 1.75]}
              gl={{ antialias: true, powerPreference: "high-performance" }}
              style={{ touchAction: "pan-y" }}
              onPointerMissed={() => {
                const st = useApp.getState();
                if (st.selectedId !== null) st.selectSat(null);
              }}
            >
              <Suspense fallback={null}>
                <Scene />
              </Suspense>
            </Canvas>
          </SceneGate>

          {/* top gradient for legibility */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-black/60 to-transparent" />

          <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2">
            <span className="rounded-full border border-white/15 bg-black/55 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink backdrop-blur-md">
              {meta.title}
            </span>
            <span className="hidden rounded-full border border-white/10 bg-black/40 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-faint backdrop-blur-md sm:inline-block">
              drag rotate · scroll zoom · click to select
            </span>
          </div>

          {/* Settings sheet */}
          {showSettings && (
            <div className="absolute right-3 top-3 z-20 w-60 rounded-xl border border-white/12 bg-[#060b16]/95 p-3.5 shadow-2xl shadow-black/60 backdrop-blur-md">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">Display</h4>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="text-[10px] text-faint hover:text-white"
                  aria-label="Close layers panel"
                >
                  ✕
                </button>
              </div>
              <Toggle label="Orbit planes" checked={toggles.rings} onChange={() => setToggle("rings")} />
              <Toggle label="Coverage samples" checked={toggles.caps} onChange={() => setToggle("caps")} />
              <Toggle label="Signal beams" checked={toggles.beams} onChange={() => setToggle("beams")} />
              <Toggle label="Ground stations" checked={toggles.stations} onChange={() => setToggle("stations")} />
              <Toggle label="Labels" checked={toggles.labels} onChange={() => setToggle("labels")} />
              <Toggle label="Ground track" checked={toggles.trails} onChange={() => setToggle("trails")} />
              <Toggle label="Laser links" checked={toggles.laser} onChange={() => setToggle("laser")} />
              <div className="my-1 h-px bg-white/10" />
              <Toggle label="Rotate Earth" checked={toggles.earthSpin} onChange={() => setToggle("earthSpin")} />
              <Toggle label="Auto-rotate camera" checked={toggles.autoRotate} onChange={() => setToggle("autoRotate")} />
            </div>
          )}

          {/* Readout panel (desktop) */}
          <div className="pointer-events-none absolute right-3 top-3 z-10 hidden w-[19rem] flex-col gap-2 lg:flex">
            {scenario === "overlap" && <ProbePanel />}
            {selectedId !== null && (scenario === "focus" || scenario === "ground") && <SelectionPanel />}
          </div>

          {/* Legend */}
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-white/10 bg-black/50 px-3 py-2 backdrop-blur-md">
            {SHELLS.map((sh) => (
              <span key={sh.key} className="flex items-center gap-1.5 font-mono text-[9px] text-muted">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: sh.color }} />
                {sh.short} · {sh.altitudeKm} km
              </span>
            ))}
            <span className="hidden items-center gap-1.5 font-mono text-[9px] text-muted sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-400" /> gateway
            </span>
            <span className="hidden items-center gap-1.5 font-mono text-[9px] text-muted sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-300" /> selected
            </span>
            <button
              type="button"
              onClick={() => setShowInfo((v) => !v)}
              className="pointer-events-auto ml-auto rounded-full border border-white/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-white lg:hidden"
            >
              {showInfo ? "hide info" : "info"}
            </button>
          </div>

          {/* Full-view toggle floats above the legend, clear of the readouts. */}
          <FullscreenButton
            onClick={fs.toggle}
            active={fs.isFullscreen}
            className="absolute bottom-14 right-3 z-20 shadow-lg shadow-black/40"
          />
          </div>
        </div>

        {/* Mobile readout */}
        <div className={cn("border-t border-white/[0.07] bg-[#060b16] p-3 lg:hidden", showInfo ? "block" : "hidden")}>
          {scenario === "overlap" ? (
            <ProbePanel />
          ) : scenario === "focus" || scenario === "ground" ? (
            <SelectionPanel />
          ) : (
            <p className="text-[11.5px] leading-relaxed text-muted">{meta.blurb}</p>
          )}
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex flex-col gap-3 border-t border-white/[0.07] bg-[#060b16] px-4 py-3.5 md:flex-row md:items-center md:gap-6">
        <div className="flex items-center gap-3">
          <span className="whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
            Sim speed
          </span>
          <input
            type="range"
            min={0}
            max={200}
            step={1}
            value={Math.round(50 * Math.log10(speed))}
            onChange={(e) => setSpeed(Math.round(Math.pow(10, Number(e.target.value) / 50)))}
            className="w-36 accent-[#3ddbd9] md:w-44"
            aria-label="Simulation speed"
          />
          <span className="w-14 font-mono text-[10px] text-signal">{formatSpeedMult(speed)}</span>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setToggle("autoRotate")}
            className={cn(
              "rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors",
              toggles.autoRotate
                ? "border-signal/40 bg-signal/10 text-signal"
                : "border-white/10 text-faint hover:text-muted",
            )}
          >
            auto-rotate
          </button>
          <button
            type="button"
            onClick={() => setToggle("earthSpin")}
            className={cn(
              "rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors",
              toggles.earthSpin
                ? "border-signal/40 bg-signal/10 text-signal"
                : "border-white/10 text-faint hover:text-muted",
            )}
          >
            earth spin
          </button>
          <span className="ml-auto hidden font-mono text-[9px] text-faint md:block">
            {SATS.length} satellites rendered · {SHELLS.length} shells
          </span>
        </div>
      </div>

      {/* Scenario explainer */}
      <div className="border-t border-white/[0.07] bg-[#04080f] px-4 py-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:gap-8">
          <p className="max-w-xl text-[12px] leading-relaxed text-muted">{meta.blurb}</p>
          <ul className="grid gap-1 text-[11px] text-faint md:ml-auto md:max-w-sm">
            {meta.tips.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="text-signal/70">·</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
