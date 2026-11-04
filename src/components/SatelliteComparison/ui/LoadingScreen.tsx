import { Html, useProgress } from "@react-three/drei";
import { comparisonConfig } from "../config";

/** Drei's loader manager drives this canvas-level Suspense fallback. */
export function LoadingScreen() {
  const { active, progress, item } = useProgress();
  const percent = Math.max(3, Math.round(progress));
  return (
    <Html fullscreen zIndexRange={[100, 0]}>
      <div className="sat-comparison__canvas-loading" role="status" aria-live="polite">
        <div>
          <span className="sat-comparison__eyebrow">{comparisonConfig.copy.labels.loading}</span>
          <div className="sat-comparison__loading-bar" aria-hidden>
            <span style={{ width: `${percent}%` }} />
          </div>
          <p className="sat-comparison__micro-label" style={{ marginTop: 10, color: "rgba(220,229,247,.6)" }}>
            {active ? `${comparisonConfig.copy.labels.loadingDetail} · ${percent}%` : item || "Almost ready"}
          </p>
        </div>
      </div>
    </Html>
  );
}
