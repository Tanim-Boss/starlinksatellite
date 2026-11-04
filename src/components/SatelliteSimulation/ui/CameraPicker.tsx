import { type CameraMode } from "../config";
import { useSimStore } from "../hooks/useSimStore";

const MODES: { id: CameraMode; label: string; description: string }[] = [
  { id: "orbit", label: "Orbit", description: "View the orbital planes around Earth" },
  { id: "dish", label: "Dish", description: "Watch the dish track satellites from the ground" },
  { id: "laser", label: "Laser", description: "Follow a satellite in space" },
];

/** Keep the three viewpoints discoverable without opening the settings panel. */
export function CameraPicker() {
  const mode = useSimStore((s) => s.cameraMode);
  const setMode = useSimStore((s) => s.setCameraMode);

  return (
    <div
      role="group"
      aria-label="Camera mode"
      className="absolute bottom-3.5 left-1/2 z-[7] flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/15 bg-[rgba(4,10,20,0.9)] p-1 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-[10px] max-[640px]:bottom-16"
    >
      {MODES.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={mode === item.id}
          title={item.description}
          onClick={() => setMode(item.id)}
          className={`min-w-[68px] cursor-pointer rounded-full px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors focus-visible:outline-2 focus-visible:outline-[#3ddbd9] focus-visible:outline-offset-2 ${
            mode === item.id
              ? "bg-[rgba(61,219,217,0.17)] text-[#8cf2ee]"
              : "text-white/60 hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
