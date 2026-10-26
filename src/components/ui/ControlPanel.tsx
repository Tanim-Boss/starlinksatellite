import { useApp, type ScenarioId } from "@/store";
import {
  DISPLAYED_COUNT,
  EARTH_RADIUS_KM,
  TOTAL_REAL,
  orbitalPeriodSec,
} from "@/lib/astro";
import { simClock } from "@/lib/simClock";
import { formatClock, formatSpeedMult } from "@/lib/format";

const SCENARIOS: { id: ScenarioId; icon: string; title: string; desc: string }[] = [
  { id: "focus", icon: "🛰️", title: "Single Satellite", desc: "Footprint, beam & ground track of one satellite." },
  { id: "shells", icon: "🌐", title: "Orbital Shells", desc: "All four shells, their planes and sample footprints." },
  { id: "ground", icon: "📡", title: "Ground Stations", desc: "Gateways tracking visible satellites in real time." },
  { id: "overlap", icon: "🧭", title: "Coverage Overlap", desc: "Probe any point; count covering satellites." },
  { id: "laser", icon: "🔗", title: "Laser Links", desc: "Optical inter-satellite links within each plane." },
];

const ORBIT_SEC_550 = orbitalPeriodSec(EARTH_RADIUS_KM + 550);

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 py-1.5">
      <span className="text-sm text-slate-300">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-cyan-500" : "bg-slate-600"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-700/60 bg-slate-950/70 p-3.5 backdrop-blur-md">
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ControlPanel() {
  const scenario = useApp((s) => s.scenario);
  const setScenario = useApp((s) => s.setScenario);
  const speed = useApp((s) => s.speed);
  const setSpeed = useApp((s) => s.setSpeed);
  const playing = useApp((s) => s.playing);
  const togglePlay = useApp((s) => s.togglePlay);
  const toggles = useApp((s) => s.toggles);
  const setToggle = useApp((s) => s.setToggle);
  useApp((s) => s.uiTick); // re-render readouts ~5x/second

  const sliderVal = Math.round(50 * Math.log10(speed));

  return (
    <aside className="absolute bottom-24 left-4 top-24 z-10 hidden w-80 flex-col gap-3 overflow-y-auto pr-1 lg:flex">
      <Section title="Scenario">
        <div className="grid gap-1.5">
          {SCENARIOS.map((sc) => {
            const active = sc.id === scenario;
            return (
              <button
                key={sc.id}
                onClick={() => setScenario(sc.id)}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                  active
                    ? "border-cyan-400/60 bg-cyan-950/50"
                    : "border-slate-700/50 bg-slate-900/40 hover:border-slate-500 hover:bg-slate-800/50"
                }`}
              >
                <span className="text-base">{sc.icon}</span>
                <span>
                  <span className={`block text-sm font-semibold ${active ? "text-cyan-200" : "text-slate-200"}`}>
                    {sc.title}
                  </span>
                  <span className="block text-[11px] leading-snug text-slate-400">{sc.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Simulation">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="flex-1 rounded-lg border border-cyan-400/50 bg-cyan-950/60 px-3 py-2 text-sm font-semibold text-cyan-200 transition-colors hover:bg-cyan-900/60"
          >
            {playing ? "⏸  Pause" : "▶  Play"}
          </button>
          <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 font-mono text-xs text-slate-300">
            {formatClock(simClock.time)}
          </div>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm text-slate-300">Orbital speed</span>
            <span className="font-mono text-xs font-semibold text-cyan-300">
              {formatSpeedMult(speed)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={200}
            step={1}
            value={sliderVal}
            onChange={(e) => setSpeed(Math.round(Math.pow(10, Number(e.target.value) / 50)))}
            className="w-full accent-cyan-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>1×</span>
            <span>100×</span>
            <span>10,000×</span>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          One orbit at 550 km takes {Math.round(ORBIT_SEC_550 / 60)} min →{" "}
          <span className="font-mono text-slate-400">{formatClock(ORBIT_SEC_550 / speed)}</span> at the
          current speed.
        </p>
      </Section>

      <Section title="Display">
        <Toggle label="Orbit rings" checked={toggles.rings} onChange={(v) => setToggle("rings", v)} />
        <Toggle label="Coverage samples" checked={toggles.caps} onChange={(v) => setToggle("caps", v)} />
        <Toggle label="Signal beams" checked={toggles.beams} onChange={(v) => setToggle("beams", v)} />
        <Toggle label="Ground stations" checked={toggles.stations} onChange={(v) => setToggle("stations", v)} />
        <Toggle label="Labels" checked={toggles.labels} onChange={(v) => setToggle("labels", v)} />
        <Toggle label="Ground track" checked={toggles.trails} onChange={(v) => setToggle("trails", v)} />
        <Toggle label="Laser links" checked={toggles.laser} onChange={(v) => setToggle("laser", v)} />
        <div className="my-1 h-px bg-slate-700/60" />
        <Toggle
          label="Rotate Earth"
          checked={toggles.earthSpin}
          onChange={(v) => setToggle("earthSpin", v)}
        />
        <Toggle
          label="Auto-rotate camera"
          checked={toggles.autoRotate}
          onChange={(v) => setToggle("autoRotate", v)}
        />
      </Section>

      <Section title="About this model">
        <p className="text-[11px] leading-relaxed text-slate-400">
          Educational simulation. Shell altitudes and inclinations follow public SpaceX / FCC
          filings. Satellite positions are propagated with a circular-orbit (two-body) model —{" "}
          <span className="font-semibold text-amber-300">not live telemetry</span>. Distances are to
          scale (1 unit = 6,371 km); satellite sizes are exaggerated for visibility.
        </p>
        <p className="mt-2 text-[11px] text-slate-500">
          Showing {DISPLAYED_COUNT} representative satellites of ≈{TOTAL_REAL.toLocaleString("en-US")}{" "}
          in these Gen1 shells.
        </p>
      </Section>
    </aside>
  );
}
