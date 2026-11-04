import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/useMediaQuery";
import { useViewportActive } from "@/lib/useViewportActivity";

const IDS = [4471, 4488, 4505];
const PERIOD = 8;
const UP = "#3ddbd9";
const DOWN = "#f6ba68";

/** Educational model: accelerated motion and scheduled links, not network telemetry. */
export function HandoverDemo() {
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [traffic, setTraffic] = useState("both");
  const stageRef = useRef<HTMLDivElement | null>(null);
  const onScreen = useViewportActive(stageRef);
  // The loop only runs while the figure is on screen and the tab is visible.
  // It used to tick at 60 fps for the whole session on two different pages,
  // which is enough re-rendering to make scrolling stutter on a phone.
  const running = playing && !reduced && onScreen;
  const animating = playing && !reduced;

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    let pending = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      pending += dt * speed;
      // 30 fps is plenty for a schematic and halves the React work.
      if (pending >= 1 / 30) {
        const step = pending;
        pending = 0;
        setTime((t) => t + step);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, speed]);

  const cycle = Math.floor(time / PERIOD);
  const phase = (time % PERIOD) / PERIOD;
  const active = cycle % 3;
  const next = (active + 1) % 3;
  const preparing = phase >= 0.75;
  const sats = IDS.map((id, i) => {
    const relative = i === active ? 0 : i === next ? -1 : 1;
    const x = 450 + relative * 240 + phase * 240;
    return { id, x, y: 100 + Math.pow((x - 450) / 360, 2) * 55 };
  });
  const target = sats[active];
  const upcoming = sats[next];
  const buttonClass = "rounded-full border border-white/15 px-3 py-1.5 text-xs text-ink hover:border-signal/60 focus-visible:outline-2 focus-visible:outline-signal";

  return (
    <div ref={stageRef} className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Your dish. A moving sky. One connection.</h3>
          <p className="mt-1 text-[11px] text-faint">Interactive handoff + two-way data flow · accelerated illustration</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!reduced && <button className={buttonClass} onClick={() => setPlaying(!playing)}>{playing ? "Pause" : "Play"}</button>}
          <button className={buttonClass} onClick={() => { setTime((Math.floor(time / PERIOD) + 1) * PERIOD); }}>Next satellite →</button>
          <button className={buttonClass} onClick={() => setTime(0)}>Reset</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] px-5 py-3">
        <p className="font-mono text-[11px] text-signal" role="status">{preparing ? `Preparing SAT ${IDS[next]}` : `Tracking SAT ${target.id}`} · {animating ? "running" : "paused"}</p>
        <div className="flex flex-wrap gap-4 text-xs text-muted">
          <label>Data <select aria-label="Data flow direction" className="ml-2 rounded border border-white/15 bg-[#0a1523] p-1 text-ink" value={traffic} onChange={(e) => setTraffic(e.target.value)}>
            <option value="both">Send + receive</option><option value="up">Send only</option><option value="down">Receive only</option>
          </select></label>
          <label>Speed <select aria-label="Simulation speed" className="ml-2 rounded border border-white/15 bg-[#0a1523] p-1 text-ink" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
            <option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option>
          </select></label>
        </div>
      </div>

      <svg viewBox="0 0 900 420" className="w-full bg-[#060b16]" role="img" aria-label={`Dish connected to satellite ${target.id}. Cyan packets travel up to the satellite; amber packets travel down to the dish. ${preparing ? `Satellite ${IDS[next]} is being prepared for handoff.` : "The beam electronically tracks the moving satellite."}`}>
        <defs>
          <linearGradient id="ho-beam" x1="0" y1="1" x2="0" y2="0"><stop stopColor={UP} stopOpacity="0.22"/><stop offset="1" stopColor={UP} stopOpacity="0.02"/></linearGradient>
        </defs>
        {[70, 140, 210, 280].map((y) => <line key={y} x1="25" x2="875" y1={y} y2={y} stroke="#172638" strokeDasharray="2 10"/>)}
        <path d="M50 168 Q450 15 850 168" fill="none" stroke="#294052" strokeDasharray="5 8"/>
        <text x="30" y="32" fill="#8a9cb4" fontSize="12" fontFamily="monospace">LEO SATELLITES →</text>
        <text x="870" y="32" textAnchor="end" fill="#8a9cb4" fontSize="11">Not to scale</text>
        <path d="M0 365 Q450 345 900 365 V420 H0 Z" fill="#0b1b27" stroke="#294052"/>

        {preparing && <g>
          <line x1="450" y1="322" x2={upcoming.x} y2={upcoming.y + 12} stroke="#a4a1ff" strokeDasharray="6 7" strokeWidth="2"/>
          <text x={upcoming.x} y={upcoming.y + 40} fill="#bcbaff" textAnchor="middle" fontSize="12">NEXT LINK · PREPARING</text>
        </g>}
        <path d={`M432 322 L${target.x - 18} ${target.y} L${target.x + 18} ${target.y} L468 322 Z`} fill="url(#ho-beam)"/>
        {(["up", "down"] as const).map((direction) => {
          if (traffic !== "both" && traffic !== direction) return null;
          const up = direction === "up";
          const offset = up ? -7 : 7;
          const color = up ? UP : DOWN;
          return <g key={direction}>
            <line x1={450 + offset} y1="322" x2={target.x + offset} y2={target.y + 14} stroke={color} strokeOpacity="0.45" strokeWidth="1.5"/>
            {[0, 1, 2, 3, 4].map((n) => {
              const p = (time * 0.7 + n / 5) % 1;
              const f = up ? p : 1 - p;
              const x = 450 + (target.x - 450) * f + offset;
              const y = 322 + (target.y + 14 - 322) * f;
              const angle = Math.atan2((target.y + 14 - 322) * (up ? 1 : -1), (target.x - 450) * (up ? 1 : -1)) * 180 / Math.PI;
              return <path key={n} d="M-5 -3 L5 0 L-5 3 Z" fill={color} transform={`translate(${x} ${y}) rotate(${angle})`}/>;
            })}
          </g>;
        })}
        {sats.map((sat, i) => <g key={sat.id} transform={`translate(${sat.x} ${sat.y})`}>
          <circle r="31" fill={i === active ? "#3ddbd912" : "transparent"} stroke={i === active ? UP : "transparent"}/>
          <path d="M-39 -9 H-16 V9 H-39 Z M16 -9 H39 V9 H16 Z" fill="#102d42" stroke={i === active ? UP : "#49617b"}/>
          <rect x="-12" y="-13" width="24" height="26" rx="4" fill="#203e50" stroke={i === active ? "#b8ffff" : "#758ba2"}/>
          <text y="-43" textAnchor="middle" fill={i === active ? UP : "#8a9cb4"} fontFamily="monospace" fontSize="12">SAT {sat.id}</text>
        </g>)}
        <g transform="translate(450 329)">
          <path d="M0 0 V28 M-20 30 L0 18 L20 30" fill="none" stroke="#8297aa" strokeWidth="4"/>
          <rect x="-29" y="-10" width="58" height="10" rx="5" fill="#d0e4ea" stroke={UP} strokeWidth="2"/>
        </g>
        <text x="450" y="387" textAnchor="middle" fill="#d6e8f0" fontSize="13">YOUR DISH · ELECTRONIC BEAM STEERING</text>
        <text x="30" y="410" fill={UP} fontSize="12">▲ Uplink · send data</text>
        <text x="870" y="410" textAnchor="end" fill={DOWN} fontSize="12">▼ Downlink · receive data</text>
      </svg>

      <div className="grid gap-px border-t border-white/[0.07] bg-white/[0.07] md:grid-cols-3">
        {[
          ["01 · TRACK", "The dish stays still", "Its phased array steers the radio beam electronically as the serving satellite moves across the sky."],
          ["02 · PREPARE", preparing ? `Next: SAT ${IDS[next]}` : "Watch for the dotted link", "In this model, the final quarter of each pass highlights the next scheduled satellite. The dotted line is preparation, not a second data stream."],
          ["03 · SWITCH", `${cycle} handoff${cycle === 1 ? "" : "s"} completed`, "At the switch, uplink and downlink packets move to the new satellite. Your dish does not physically turn to follow each one."],
        ].map(([step, title, body]) => <div key={step} className="bg-[#060b16] p-5">
          <p className="font-mono text-[10px] tracking-widest text-signal">{step}</p>
          <h4 className="mt-2 text-sm font-medium text-white">{title}</h4>
          <p className="mt-2 text-xs leading-relaxed text-muted">{body}</p>
        </div>)}
      </div>
      <p className="border-t border-white/[0.07] px-5 py-3 text-[11px] leading-relaxed text-faint">
        Educational simulation, not live Starlink telemetry. Eight simulation seconds per handoff is illustrative; real scheduling also depends on coverage, capacity and network conditions. Packet spacing is symbolic, not measured throughput. The satellite forwards traffic via gateways or inter-satellite links to the internet (not shown).
        {reduced && " Reduced motion is enabled: use Next satellite to step through handoffs."}
      </p>
    </div>
  );
}
