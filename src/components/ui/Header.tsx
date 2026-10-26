import { useEffect, useState } from "react";

export function Header() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-4">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 backdrop-blur-md">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-xl shadow-lg shadow-cyan-500/25">
          🛰️
        </div>
        <div>
          <h1 className="text-base font-bold leading-tight tracking-tight sm:text-lg">
            Starlink Orbit Visualizer
          </h1>
          <p className="text-[11px] text-slate-400 sm:text-xs">
            Interactive 3D model of the Starlink satellite constellation
          </p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <span
          className="flex cursor-help items-center gap-2 rounded-full border border-amber-400/40 bg-amber-950/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300 backdrop-blur-md"
          title="Orbital positions are propagated from published orbital elements using a circular-orbit model. This is NOT live Starlink telemetry."
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
          Simulated data
        </span>
        <span
          className="flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-950/60 px-3 py-1.5 font-mono text-[11px] text-cyan-300 backdrop-blur-md"
          title="Your device clock — real time"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
          {now.toISOString().slice(11, 19)} UTC · live
        </span>
      </div>
    </header>
  );
}
