import { useSimStore, type SimToggles } from "../hooks/useSimStore";
import { cities, timeSpeeds, type CameraMode } from "../config";
import { useReducedMotion } from "@/lib/useMediaQuery";

const CAMERA_MODES: { id: CameraMode; label: string }[] = [
  { id: "orbit", label: "Orbit" },
  { id: "dish", label: "Dish" },
  { id: "laser", label: "Laser" },
];

const TOGGLE_DEFS: { key: keyof SimToggles; label: string }[] = [
  { key: "orbits", label: "Orbit rings" },
  { key: "laserMesh", label: "Laser mesh" },
  { key: "labels", label: "Labels" },
  { key: "dishBeam", label: "Dish beam" },
];

/**
 * The control panel: time speed, play/pause, camera modes, display toggles,
 * user/gateway location selectors and the Story Mode tour. Written with
 * plain buttons and native selects so it is keyboard-accessible by default;
 * on small screens it collapses behind a disclosure.
 */
export function Controls() {
  const speed = useSimStore((s) => s.speed);
  const setSpeed = useSimStore((s) => s.setSpeed);
  const playing = useSimStore((s) => s.playing);
  const togglePlay = useSimStore((s) => s.togglePlay);
  const cameraMode = useSimStore((s) => s.cameraMode);
  const setCameraMode = useSimStore((s) => s.setCameraMode);
  const toggles = useSimStore((s) => s.toggles);
  const setToggle = useSimStore((s) => s.setToggle);
  const user = useSimStore((s) => s.user);
  const setUser = useSimStore((s) => s.setUser);
  const gateway = useSimStore((s) => s.gateway);
  const setGateway = useSimStore((s) => s.setGateway);
  const storyActive = useSimStore((s) => s.storyActive);
  const startStory = useSimStore((s) => s.startStory);
  const stopStory = useSimStore((s) => s.stopStory);
  const reduced = useReducedMotion();

  return (
    <details className="absolute bottom-3.5 right-3.5 z-[6] w-[min(308px,calc(100%-28px))] overflow-hidden rounded-[12px] border border-white/12 shadow-[0_8px_32px_rgba(0,0,0,0.4)] max-[640px]:w-[calc(100%-28px)]">
      <summary className="flex cursor-pointer list-none select-none items-center justify-between gap-[10px] p-[10px_14px] [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-[6px]">
          <span aria-hidden="true" className="font-mono text-[12px] text-[#3ddbd9]">
            ⚙
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/80">
            Simulation controls
          </span>
        </span>
        <span className="font-mono text-[8px] text-white/35 max-[640px]:hidden">
          Space: play/pause · 1/2/3: camera · +/−: zoom · 0: reset · F: full view
        </span>
      </summary>

      <div className="flex flex-col gap-3 border-t border-white/8 bg-[rgba(4,10,20,0.9)] p-[4px_14px_14px] backdrop-blur-[12px]">
        {/* Transport */}
        <div className="flex flex-col gap-[6px]">
          <button
            type="button"
            className="cursor-pointer rounded-[8px] border border-[rgba(255,122,26,0.5)] bg-[rgba(255,122,26,0.14)] p-[8px_14px] font-mono text-[11px] text-[#ffb27a] transition duration-150 [&:hover]:bg-[rgba(255,122,26,0.24)] focus-visible:outline-2 focus-visible:outline-[#ff7a1a] focus-visible:outline-offset-2"
            onClick={togglePlay}
            aria-label={playing ? "Pause simulation" : "Play simulation"}
          >
            {playing ? "❚❚ Pause" : "▶ Play"}
          </button>
          <div className="flex flex-wrap gap-[6px]" role="group" aria-label="Time speed">
            {timeSpeeds.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={speed === s}
                className={`min-w-[58px] flex-1 cursor-pointer rounded-[8px] border p-[6px_10px] font-mono text-[10px] transition duration-150 focus-visible:outline-2 focus-visible:outline-[#3ddbd9] focus-visible:outline-offset-2 ${
                  speed === s
                    ? "border-[rgba(61,219,217,0.7)] bg-[rgba(61,219,217,0.12)] text-[#7ff0ec]"
                    : "border-white/14 bg-white/3 text-white/70 [&:hover]:border-[rgba(61,219,217,0.5)] [&:hover]:text-white"
                }`}
                onClick={() => setSpeed(s)}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        {/* Camera modes */}
        <div className="flex flex-col gap-[6px]">
          <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-white/45">
            Camera
          </span>
          <div className="flex flex-wrap gap-[6px]" role="group" aria-label="Camera mode">
            {CAMERA_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={cameraMode === m.id}
                className={`min-w-[58px] flex-1 cursor-pointer rounded-[8px] border p-[6px_10px] font-mono text-[10px] transition duration-150 focus-visible:outline-2 focus-visible:outline-[#3ddbd9] focus-visible:outline-offset-2 ${
                  cameraMode === m.id
                    ? "border-[rgba(61,219,217,0.7)] bg-[rgba(61,219,217,0.12)] text-[#7ff0ec]"
                    : "border-white/14 bg-white/3 text-white/70 [&:hover]:border-[rgba(61,219,217,0.5)] [&:hover]:text-white"
                }`}
                onClick={() => setCameraMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-col gap-[6px]">
          <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-white/45">
            Display
          </span>
          <div className="flex flex-wrap gap-[6px]" role="group" aria-label="Display toggles">
            {TOGGLE_DEFS.map((t) => (
              <button
                key={t.key}
                type="button"
                aria-pressed={toggles[t.key]}
                className={`min-w-[58px] flex-1 cursor-pointer rounded-[8px] border p-[6px_10px] font-mono text-[10px] transition duration-150 focus-visible:outline-2 focus-visible:outline-[#3ddbd9] focus-visible:outline-offset-2 ${
                  toggles[t.key]
                    ? "border-[rgba(61,219,217,0.7)] bg-[rgba(61,219,217,0.12)] text-[#7ff0ec]"
                    : "border-white/14 bg-white/3 text-white/70 [&:hover]:border-[rgba(61,219,217,0.5)] [&:hover]:text-white"
                }`}
                onClick={() => setToggle(t.key)}
              >
                {toggles[t.key] ? "✓ " : ""}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Locations */}
        <div className="flex flex-col gap-[6px]">
          <label className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-white/45" htmlFor="sim-user-location">
            User location
          </label>
          <select
            id="sim-user-location"
            className="w-full cursor-pointer rounded-[8px] border border-white/14 bg-[rgba(2,6,14,0.9)] p-[7px_10px] text-[11px] text-[#e8f4ff] focus-visible:outline-2 focus-visible:outline-[#3ddbd9] focus-visible:outline-offset-2"
            value={`${user.lat},${user.lon}`}
            onChange={(e) => {
              const [lat, lon] = e.target.value.split(",").map(Number);
              const city = cities.find((c) => c.lat === lat && c.lon === lon);
              setUser(city ?? { name: user.name, lat, lon });
            }}
          >
            {cities.map((c) => (
              <option key={c.name} value={`${c.lat},${c.lon}`}>
                {c.name} ({c.lat.toFixed(1)}°, {c.lon.toFixed(1)}°)
              </option>
            ))}
            <option value={`${user.lat},${user.lon}`}>
              {user.name === "Custom"
                ? `Custom (${user.lat.toFixed(1)}°, ${user.lon.toFixed(1)}°)`
                : user.name}
            </option>
          </select>

          <label className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-white/45" htmlFor="sim-gateway-location">
            Gateway
          </label>
          <select
            id="sim-gateway-location"
            className="w-full cursor-pointer rounded-[8px] border border-white/14 bg-[rgba(2,6,14,0.9)] p-[7px_10px] text-[11px] text-[#e8f4ff] focus-visible:outline-2 focus-visible:outline-[#3ddbd9] focus-visible:outline-offset-2"
            value={`${gateway.lat},${gateway.lon}`}
            onChange={(e) => {
              const [lat, lon] = e.target.value.split(",").map(Number);
              const city = cities.find((c) => c.lat === lat && c.lon === lon);
              setGateway(city ?? { name: gateway.name, lat, lon });
            }}
          >
            {cities.map((c) => (
              <option key={c.name} value={`${c.lat},${c.lon}`}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Story mode */}
        <div className="flex flex-col gap-[6px]">
          <button
            type="button"
            className={`cursor-pointer rounded-[8px] p-[8px_14px] font-mono text-[11px] transition duration-150 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[#3ddbd9] focus-visible:outline-offset-2 ${
              storyActive
                ? "border border-[rgba(255,122,26,0.6)] bg-[rgba(255,122,26,0.18)] text-[#ffb27a]"
                : "border border-[rgba(61,219,217,0.5)] bg-[rgba(61,219,217,0.1)] text-[#7ff0ec] [&:hover]:bg-[rgba(61,219,217,0.2)]"
            }`}
            onClick={storyActive ? stopStory : startStory}
            disabled={reduced}
            title={reduced ? "Disabled by your reduced-motion preference" : undefined}
          >
            {storyActive ? "■ Stop story" : "▶ Story Mode (60 s tour)"}
          </button>
          <p className="mt-[2px] text-[9.5px] leading-[1.5] text-white/45">
            Educational simulation: satellite, dish and beam sizes are exaggerated
            for visibility; orbits, speeds and geometry are physically based.
            {reduced &&
              " Reduced-motion preference detected: started paused, no auto-rotate."}
          </p>
        </div>
      </div>
    </details>
  );
}
