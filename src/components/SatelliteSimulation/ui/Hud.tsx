import { useSimStore, simState } from "../hooks/useSimStore";
import { formatClock } from "@/lib/format";
import { ORBIT_PERIOD_MIN, ORBIT_SPEED_KM_S } from "../utils/orbit";

/**
 * Live telemetry over the canvas: simulation clock, the dish's locked
 * satellite with its orbital readouts, satellites above the minimum
 * elevation, and the relay route's hop count and light-time. Re-renders on
 * `uiTick` (~8 Hz), never per frame; all values are simulated.
 */
export function Hud() {
  useSimStore((s) => s.uiTick); // subscribe to the tick
  const speed = useSimStore((s) => s.speed);
  const playing = useSimStore((s) => s.playing);
  const storyCaption = useSimStore((s) => s.storyCaption);
  const storyActive = useSimStore((s) => s.storyActive);
  const labels = useSimStore((s) => s.toggles.labels);
  const connected = simState.connectedSat;
  const route = simState.route;

  const handoffVisible =
    simState.handoffAt > 0 && performance.now() - simState.handoffAt < 2500;

  return (
    <>
      {/* Telemetry card */}
      <div className="pointer-events-none absolute top-3.5 left-3.5 z-[5] w-[232px] rounded-[12px] border border-white/10 bg-[rgba(4,10,20,0.85)] p-[12px_14px] backdrop-blur-[10px] max-[640px]:w-[190px] max-[640px]:p-[9px_11px]">
        <div className="flex items-baseline justify-between gap-[10px]">
          <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/45">
            SIM TIME
          </span>
          <span className="font-mono text-[12px] tabular-nums text-[#e8f4ff]">
            {formatClock(simState.time)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-[10px]">
          <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/45">
            TIME SPEED
          </span>
          <span className="font-mono text-[12px] tabular-nums text-[#e8f4ff]">
            {speed}× {playing ? "" : "· PAUSED"}
          </span>
        </div>
        <div className="my-2 h-px bg-white/8" />
        <div className="flex items-baseline justify-between gap-[10px]">
          <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/45">
            DISH LINK
          </span>
          <span className="font-mono text-[12px] tabular-nums text-[#e8f4ff]">
            {connected !== null
              ? `SAT #${String(connected).padStart(3, "0")}`
              : "SEARCHING"}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-[10px]">
          <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/45">
            ELEVATION
          </span>
          <span className="font-mono text-[12px] tabular-nums text-[#e8f4ff]">
            {simState.connectedElevation.toFixed(1)}°
          </span>
        </div>
        <div className="my-1.5 grid grid-cols-3 gap-[6px]">
          <div>
            <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/45">
              ALTITUDE
            </div>
            <div className="font-mono text-[11px] tabular-nums text-[#e8f4ff]">
              550 km
            </div>
          </div>
          <div>
            <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/45">
              SPEED
            </div>
            <div className="font-mono text-[11px] tabular-nums text-[#e8f4ff]">
              {ORBIT_SPEED_KM_S.toFixed(2)} km/s
            </div>
          </div>
          <div>
            <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/45">
              PERIOD
            </div>
            <div className="font-mono text-[11px] tabular-nums text-[#e8f4ff]">
              {ORBIT_PERIOD_MIN.toFixed(0)} min
            </div>
          </div>
        </div>
        <div className="my-2 h-px bg-white/8" />
        <div className="flex items-baseline justify-between gap-[10px]">
          <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/45">
            VISIBLE (≥25°)
          </span>
          <span className="font-mono text-[12px] tabular-nums text-[#e8f4ff]">
            {simState.visibleCount}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-[10px]">
          <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/45">
            RELAY ROUTE
          </span>
          <span className="font-mono text-[12px] tabular-nums text-[#e8f4ff]">
            {route
              ? `${route.hops} laser hops · ${route.latencyMs.toFixed(1)} ms`
              : "searching…"}
          </span>
        </div>
      </div>

      {/* Handoff label */}
      {labels && handoffVisible && simState.handoffSat !== null && (
        <div
          className="pointer-events-none absolute top-3.5 left-1/2 z-[6] -translate-x-1/2 animate-[handoffFade_2.5s_ease_forwards] rounded-full border border-[rgba(255,122,26,0.4)] bg-[rgba(40,16,4,0.85)] px-4 py-2 font-mono text-[11px] tracking-[0.08em] text-[#ffb27a]"
          role="status"
        >
          Handoff → Satellite #{String(simState.handoffSat).padStart(3, "0")}
        </div>
      )}

      {/* Legend */}
      {labels && (
        <div className="pointer-events-none absolute bottom-3.5 left-3.5 z-[5] flex flex-col gap-[6px] rounded-[10px] border border-white/10 bg-[rgba(4,10,20,0.85)] p-[10px_12px] backdrop-blur-[10px] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-[8px] text-[10.5px] text-white/72">
            <span className="h-[9px] w-[9px] flex-shrink-0 rounded-full bg-[#ff7a1a] shadow-[0_0_8px_rgba(255,122,26,0.8)]" />
            Radio link · dish ↔ satellite
          </div>
          <div className="flex items-center gap-[8px] text-[10.5px] text-white/72">
            <span className="h-[9px] w-[9px] flex-shrink-0 rounded-full bg-[#3ddbd9] shadow-[0_0_8px_rgba(61,219,217,0.8)]" />
            Laser link · satellite ↔ satellite
          </div>
          <div className="flex items-center gap-[8px] text-[10.5px] text-white/72">
            <span className="h-[9px] w-[9px] flex-shrink-0 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
            Satellites
          </div>
        </div>
      )}

      {/* Story captions */}
      {storyActive && storyCaption && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-[6] max-w-[min(680px,86%)] -translate-x-1/2 rounded-[12px] border border-white/14 bg-[rgba(4,10,20,0.88)] p-[12px_18px] text-center text-[13px] leading-[1.45] text-[#eaf6ff] backdrop-blur-[10px]">
          {storyCaption}
        </div>
      )}
    </>
  );
}
