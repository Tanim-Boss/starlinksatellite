import { useProgress } from "@react-three/drei";

/**
 * Loading screen shown while the three.js chunk and textures stream in.
 * Reads drei's useProgress, which tracks the shared THREE loading manager —
 * the same progress the Earth textures report.
 */
export function LoadingScreen() {
  const { progress, active } = useProgress();
  const pct = Math.round(progress);

  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-[radial-gradient(ellipse_at_50%_40%,#0a1428_0%,#02040a_70%)]"
      role="status"
      aria-live="polite"
    >
      <div className="w-[min(320px,70%)] text-center">
        <p className="mb-3.5 font-mono text-[9px] uppercase tracking-[0.22em] text-[#3ddbd9]">
          Satellite internet simulation
        </p>
        <div className="h-[3px] overflow-hidden rounded-[2px] bg-white/8">
          <div
            className="h-full rounded-[2px] bg-gradient-to-r from-[#ff7a1a] to-[#3ddbd9] transition-[width] duration-300"
            style={{ width: `${Math.max(2, pct)}%`, opacity: active ? 1 : 0.6 }}
          />
        </div>
        <p className="mt-2.5 font-mono text-[11px] text-white/65">
          {active ? `Loading… ${pct}%` : "Almost there"}
        </p>
      </div>
    </div>
  );
}
