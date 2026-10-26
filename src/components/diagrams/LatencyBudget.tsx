const SEGMENTS = [
  {
    label: "Up to the satellite",
    value: 1.9,
    color: "#3ddbd9",
    note: "550 km at the speed of light",
  },
  {
    label: "Onboard relay",
    value: 0.6,
    color: "#7ee7e2",
    note: "amplify, shift, re-aim",
  },
  {
    label: "Down to a gateway",
    value: 2.2,
    color: "#60a5fa",
    note: "usually a longer slant path",
  },
  {
    label: "Gateway into fibre",
    value: 5.4,
    color: "#a78bfa",
    note: "hundreds of km across the backbone",
  },
];

const TOTAL = SEGMENTS.reduce((a, s) => a + s.value, 0);

/** Where the milliseconds actually go on a typical Starlink round trip. */
export function LatencyBudget() {
  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Where 25 milliseconds goes</h3>
          <p className="mt-0.5 text-[11px] text-faint">Illustrative one-way budget, then doubled for the reply</p>
        </div>
        <span className="rounded-full border border-signal/30 bg-signal/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-signal">
          ≈{TOTAL.toFixed(1)} ms one way
        </span>
      </div>

      <div className="p-5">
        <div className="flex h-9 w-full overflow-hidden rounded-lg border border-white/10">
          {SEGMENTS.map((s) => (
            <div
              key={s.label}
              className="group relative h-full transition-all hover:brightness-125"
              style={{ width: `${(s.value / TOTAL) * 100}%`, background: s.color, opacity: 0.85 }}
              title={`${s.label}: ${s.value} ms`}
            >
              <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-mono text-[9px] font-semibold text-[#04121a]">
                {s.value.toFixed(1)}
              </span>
            </div>
          ))}
        </div>

        <ul className="mt-5 space-y-2.5">
          {SEGMENTS.map((s) => (
            <li key={s.label} className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-sm" style={{ background: s.color }} />
              <div className="flex flex-1 flex-wrap items-baseline justify-between gap-2 border-b border-white/[0.06] pb-2">
                <span className="text-[12px] text-ink">{s.label}</span>
                <span className="font-mono text-[10.5px] text-faint">{s.note}</span>
                <span className="font-mono text-[11px] text-muted">{s.value.toFixed(1)} ms</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-signal/20 bg-signal/[0.04] p-3.5">
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-signal/80">Round trip</div>
            <div className="mt-1 font-mono text-xl font-semibold text-ink">
              ≈{(TOTAL * 2).toFixed(0)} ms
              <span className="ml-2 text-[10px] font-normal text-faint">plus queues and processing</span>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">Typical in practice</div>
            <div className="mt-1 font-mono text-xl font-semibold text-ink">
              25–60 ms
              <span className="ml-2 text-[10px] font-normal text-faint">varies by route, load, weather</span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-[10.5px] leading-relaxed text-faint">
          This is light-time plus a simple fibre hop. Real latency also includes radio scheduling,
          congestion in the cell, gateway peering and the distance from the gateway to the server you
          are talking to — which is often the largest term of all.
        </p>
      </div>
    </div>
  );
}
