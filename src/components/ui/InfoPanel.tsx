import { useEffect, useState } from "react";
import * as THREE from "three";
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
import { formatArea, formatInt, formatLat, formatLon } from "@/lib/format";
import { useApp, type ScenarioId } from "@/store";

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className={`truncate text-xs text-slate-100 ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-slate-600/60 bg-slate-950/80 p-4 shadow-xl backdrop-blur-md ${className}`}
    >
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------

const _w = new THREE.Vector3();
const _fixed = new THREE.Vector3();

function SatelliteCard({ id }: { id: number }) {
  const sat = SATS[id];
  const shell = SHELLS[sat.shell];
  const focusCamera = useApp((s) => s.focusCamera);
  const selectSat = useApp((s) => s.selectSat);
  useApp((s) => s.uiTick); // live re-render

  const cov = coverageInfo(shell.altitudeKm);
  const speed = orbitalVelocityKmS(sat.aKm);
  const period = orbitalPeriodSec(sat.aKm);
  satPosition(sat, simClock.time, _w);
  const { latDeg, lonDeg } = earthFixedToLatLon(worldToEarthFixed(_w, _fixed));

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: shell.color }} />
            <h2 className="text-lg font-bold">{sat.name}</h2>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {shell.name} · plane {sat.plane + 1}, slot {sat.slot + 1} · {shell.note}
          </p>
        </div>
        <button
          onClick={() => selectSat(null)}
          className="rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-400 hover:border-slate-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        <Field label="Altitude" value={`${shell.altitudeKm} km`} />
        <Field label="Inclination" value={`${shell.inclinationDeg}°`} />
        <Field label="Orbital speed" value={`${speed.toFixed(2)} km/s`} mono />
        <Field label="Orbital period" value={`${(period / 60).toFixed(1)} min`} />
        <Field label="Ground point now" value={`${formatLat(latDeg)} ${formatLon(lonDeg)}`} mono />
        <Field label="Shell size (real)" value={`≈${shell.totalSats.toLocaleString("en-US")} sats`} />
      </dl>

      <div className="mt-3 rounded-xl border border-cyan-500/25 bg-cyan-950/30 p-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
          Coverage footprint
        </h3>
        <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
          <Field label="Footprint diameter" value={`≈${formatInt(cov.capDiameterKm)} km`} />
          <Field label="Coverage area" value={formatArea(cov.areaKm2)} />
          <Field label="Latency · overhead" value={`≈${cov.minLatencyMs.toFixed(1)} ms`} />
          <Field label="Latency · at horizon" value={`≈${cov.maxLatencyMs.toFixed(1)} ms`} />
        </dl>
        <p className="mt-2 text-[10px] leading-relaxed text-cyan-200/70">
          Footprint at the geometric horizon (0° elevation). Latency is one-way light time;
          real links add routing & processing delay (typically a few ms more).
        </p>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => focusCamera(id)}
          className="flex-1 rounded-lg border border-cyan-400/50 bg-cyan-950/60 px-3 py-2 text-sm font-semibold text-cyan-200 transition-colors hover:bg-cyan-900/60"
        >
          🎯 Focus camera
        </button>
        <button
          onClick={() => selectSat((id + 1) % SATS.length)}
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-slate-400 hover:text-white"
        >
          Next ▶
        </button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------

const _probeFixed = new THREE.Vector3();
const _satWorld = new THREE.Vector3();

function ProbeCard() {
  const probe = useApp((s) => s.probe);
  const setProbe = useApp((s) => s.setProbe);
  useApp((s) => s.uiTick);

  if (!probe) return null;

  latLonToEarthFixed(probe.lat, probe.lon, _probeFixed);
  const counts = [0, 0, 0, 0];
  let total = 0;
  for (const sat of SATS) {
    satPosition(sat, simClock.time, _satWorld);
    worldToEarthFixed(_satWorld, _fixed);
    const cosAng = THREE.MathUtils.clamp(_fixed.dot(_probeFixed), -1, 1);
    const shell = SHELLS[sat.shell];
    const lambda = Math.acos(1 / (1 + shell.altitudeKm / KM_PER_UNIT));
    if (Math.acos(cosAng) <= lambda) {
      counts[sat.shell]++;
      total++;
    }
  }

  return (
    <Card className="border-amber-400/40 bg-amber-950/20">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-amber-200">🧭 Coverage probe</h2>
          <p className="mt-0.5 font-mono text-[11px] text-amber-300/80">
            {formatLat(probe.lat)} · {formatLon(probe.lon)}
          </p>
        </div>
        <button
          onClick={() => setProbe(null)}
          className="rounded-lg border border-amber-400/40 px-2 py-1 text-xs text-amber-300 hover:border-amber-300 hover:text-white"
        >
          Clear
        </button>
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-4xl font-bold text-amber-200">{total}</span>
        <span className="pb-1 text-xs text-amber-200/80">
          satellites cover this point
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SHELLS.map((sh, i) =>
          counts[i] > 0 ? (
            <span
              key={sh.key}
              className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
              style={{ borderColor: sh.color + "80", color: sh.color }}
            >
              {sh.short}: {counts[i]}
            </span>
          ) : null,
        )}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-amber-200/60">
        Satellites whose geometric footprint (0° elevation) contains this point. Real gateways
        require ≥{GATEWAY_MIN_ELEVATION_DEG}° elevation, so usable counts are lower.
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------

const SCENARIO_META: Record<
  ScenarioId,
  { icon: string; title: string; long: string; tips: string[] }
> = {
  focus: {
    icon: "🛰️",
    title: "Single Satellite Focus",
    long: "Follow one satellite around its orbit. The glowing cap on Earth is its radio footprint, the translucent cone is its signal beam, and the yellow trail is its ground track.",
    tips: [
      "Click any satellite in the scene to inspect it.",
      "Press “Focus camera” to fly right up to it.",
      "Watch the sub-satellite point sweep out the ground track.",
    ],
  },
  shells: {
    icon: "🌐",
    title: "Orbital Shells",
    long: "Starlink's Gen1 constellation is organised in shells — groups of orbital planes sharing an altitude and inclination. Colour shows the shell; rings show each orbital plane.",
    tips: [
      "Toggle “Coverage samples” to compare footprint sizes.",
      "The 70° and 97.6° polar shells serve high latitudes.",
      "Shell 4 is sun-synchronous: a dawn–dusk orbit with near-constant sunlight.",
    ],
  },
  ground: {
    icon: "📡",
    title: "Ground Stations",
    long: "Gateway antennas on Earth track the highest-elevation satellite in view and hand off to the next as it sets. Lime lines are the active radio links; pulses show traffic flowing between ground and space.",
    tips: [
      "Watch links switch as satellites cross the sky.",
      `Stations only track satellites above ${GATEWAY_MIN_ELEVATION_DEG}° elevation.`,
      "Enable “Rotate Earth” to see stations carried around the planet.",
    ],
  },
  overlap: {
    icon: "🧭",
    title: "Coverage Overlap",
    long: "Thousands of footprints overlap so that almost every point on Earth has multiple satellites in view at once — that redundancy is what makes seamless handovers possible.",
    tips: [
      "Click anywhere on Earth to drop a probe pin.",
      "The probe panel counts how many satellites see that point.",
      "Brighter areas in the sample caps are where footprints overlap.",
    ],
  },
  laser: {
    icon: "🔗",
    title: "Laser Links",
    long: "V1.5+ satellites carry optical laser terminals. Neighbouring satellites in the same orbital plane are linked, letting traffic route through space at light speed instead of bouncing off the ground.",
    tips: [
      "Lines chain consecutive satellites within each plane.",
      "In reality each satellite also links to cross-plane neighbours.",
      "Space-based routing can beat fibre over long distances.",
    ],
  },
};

function ScenarioCard() {
  const scenario = useApp((s) => s.scenario);
  const meta = SCENARIO_META[scenario];
  return (
    <Card>
      <h2 className="text-sm font-bold text-slate-100">
        {meta.icon} {meta.title}
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{meta.long}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-slate-400">
        {meta.tips.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------

const FACTS = [
  "A Starlink satellite at 550 km orbits at ≈7.6 km/s — about 27,000 km/h — completing an orbit every ≈95 minutes.",
  "Each satellite's phased-array antennas cover a circle roughly 5,000 km across on Earth's surface (≈20 million km²).",
  "V1.5+ satellites carry laser terminals linking to neighbouring satellites at the speed of light in vacuum — faster than fibre over long hops.",
  "User terminals steer their beams electronically — no moving parts — tracking satellites that cross the sky every few minutes.",
  "At 550 km altitude a signal reaches an overhead satellite in under 2 ms; even at the footprint edge it's under 10 ms one-way.",
  "SpaceX has FCC approval for up to 12,000 Gen1/Gen2 satellites and has filed for tens of thousands more.",
  "The 97.6° sun-synchronous shell flies a dawn–dusk orbit, keeping its solar panels in near-constant sunlight.",
  "Satellites in the same plane are spaced so that as one sets below the horizon, the next is already rising — seamless handover.",
];

function FactsCard() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % FACTS.length), 9000);
    return () => clearInterval(t);
  }, []);
  return (
    <Card className="border-indigo-500/30 bg-indigo-950/20">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
          💡 Did you know?
        </h2>
        <button
          onClick={() => setI((v) => (v + 1) % FACTS.length)}
          className="text-[10px] text-indigo-300 hover:text-white"
        >
          next ↻
        </button>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{FACTS[i]}</p>
      <div className="mt-2 flex gap-1">
        {FACTS.map((_, j) => (
          <span
            key={j}
            className={`h-1 rounded-full transition-all ${j === i ? "w-4 bg-indigo-400" : "w-1 bg-indigo-800"}`}
          />
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------

export function InfoPanel() {
  const selectedId = useApp((s) => s.selectedId);
  return (
    <aside className="absolute right-4 top-24 z-10 hidden max-h-[calc(100vh-8rem)] w-96 flex-col gap-3 overflow-y-auto pr-1 md:flex">
      {selectedId !== null ? <SatelliteCard id={selectedId} /> : <ProbeCard />}
      <ScenarioCard />
      <FactsCard />
    </aside>
  );
}
