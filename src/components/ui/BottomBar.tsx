import { SHELLS } from "@/lib/astro";

export function BottomBar() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl border border-slate-700/60 bg-slate-950/70 px-4 py-2 backdrop-blur-md">
        {SHELLS.map((sh) => (
          <span key={sh.key} className="flex items-center gap-1.5 text-[11px] text-slate-300">
            <span className="h-2 w-2 rounded-full" style={{ background: sh.color }} />
            {sh.short} · {sh.altitudeKm} km · {sh.inclinationDeg}°
          </span>
        ))}
        <span className="mx-1 hidden h-3 w-px bg-slate-700 sm:block" />
        <span className="flex items-center gap-1.5 text-[11px] text-slate-300">
          <span className="h-2 w-2 rounded-full bg-lime-400" />
          Gateway
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-slate-300">
          <span className="h-2 w-2 rounded-full bg-amber-300" />
          Probe
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-slate-300">
          <span className="h-2 w-2 rounded-full bg-yellow-300" />
          Selected
        </span>
      </div>
      <div className="rounded-full border border-slate-800 bg-slate-950/60 px-4 py-1.5 text-center text-[11px] text-slate-400 backdrop-blur-md">
        Drag to rotate · Scroll to zoom · Click a satellite to inspect · In{" "}
        <span className="text-cyan-300">Coverage Overlap</span>, click Earth to probe a point
      </div>
    </div>
  );
}
