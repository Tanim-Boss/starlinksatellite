import { comparisonConfig, type ComparisonStage } from "../config";
import { useComparisonStore } from "../hooks/useComparisonStore";

const stages = comparisonConfig.copy.stageNames;

export function StoryNavigation() {
  const stage = useComparisonStore((state) => state.stage);
  const tourPlaying = useComparisonStore((state) => state.tourPlaying);
  const tourProgress = useComparisonStore((state) => state.tourProgress);
  const stageDuration = comparisonConfig.stageCount * comparisonConfig.tourStageSeconds;
  const progress = tourPlaying ? tourProgress : (stage + 1) / comparisonConfig.stageCount;
  const store = useComparisonStore.getState;

  return (
    <>
      <nav className="sat-comparison__stage-tabs" aria-label="Simulation stages">
        {stages.map((label, index) => (
          <button
            type="button"
            key={label}
            className="sat-comparison__stage-tab"
            aria-current={stage === index ? "step" : undefined}
            aria-label={`Go to stage ${index + 1}: ${label}`}
            onClick={() => store().setStage(index as ComparisonStage)}
          >
            <span className="sat-comparison__stage-tab-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="sat-comparison__stage-tab-label">{label}</span>
          </button>
        ))}
      </nav>
      <div className="sat-comparison__bottom">
        <div className="sat-comparison__caption" aria-live="polite" aria-atomic="true">
          <span className="sat-comparison__micro-label">{tourPlaying ? "Guided tour · about 78 seconds" : "Stage caption"}</span>
          <p>{comparisonConfig.stageCopy[stage].caption}</p>
        </div>
        <div className="sat-comparison__bottom-actions" aria-label="Story controls">
          <button
            type="button"
            className="sat-comparison__action-button"
            onClick={() => store().previousStage()}
            disabled={stage === 0}
            aria-label="Previous stage"
            aria-keyshortcuts="ArrowLeft"
          >
            ← Back
          </button>
          <button
            type="button"
            className={`sat-comparison__action-button${tourPlaying ? "" : " sat-comparison__action-button--primary"}`}
            onClick={() => tourPlaying ? store().stopTour() : store().startTour()}
            aria-pressed={tourPlaying}
            aria-label={tourPlaying ? "Stop the guided tour" : `Play the ${stageDuration}-second guided tour`}
            aria-keyshortcuts="T"
          >
            {tourPlaying ? "Stop tour" : "Play tour"}
          </button>
          <button
            type="button"
            className="sat-comparison__action-button"
            onClick={() => store().nextStage()}
            disabled={stage === comparisonConfig.stageCount - 1}
            aria-label="Next stage"
            aria-keyshortcuts="ArrowRight"
          >
            Next →
          </button>
        </div>
      </div>
      <div className="sat-comparison__tour-track" aria-label={`Story progress ${Math.round(progress * 100)} percent`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <div className="sat-comparison__tour-progress" style={{ width: `${progress * 100}%` }} />
      </div>
    </>
  );
}
