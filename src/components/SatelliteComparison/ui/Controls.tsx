import { comparisonConfig, type ScaleMode } from "../config";
import { useComparisonStore } from "../hooks/useComparisonStore";

interface ControlsProps {
  open: boolean;
}

export function Controls({ open }: ControlsProps) {
  const stage = useComparisonStore((state) => state.stage);
  const timeSpeed = useComparisonStore((state) => state.timeSpeed);
  const playing = useComparisonStore((state) => state.playing);
  const scaleMode = useComparisonStore((state) => state.scaleMode);
  const location = useComparisonStore((state) => state.location);
  const showOrbits = useComparisonStore((state) => state.showOrbits);
  const showLinks = useComparisonStore((state) => state.showLinks);
  const showLabels = useComparisonStore((state) => state.showLabels);
  const reducedMotion = useComparisonStore((state) => state.reducedMotion);
  const store = useComparisonStore.getState;
  const speedIndex = comparisonConfig.timeSpeeds.indexOf(timeSpeed);

  const setScale = (mode: ScaleMode) => store().setScaleMode(mode);
  const setSpeedFromSlider = (value: string) => {
    const index = Number(value);
    const speed = comparisonConfig.timeSpeeds[index] ?? 1;
    store().setTimeSpeed(speed);
  };

  return (
    <aside
      className={`sat-comparison__control-card${open ? "" : " sat-comparison__control-card--closed"}`}
      aria-label="Simulation controls"
    >
      <div className="sat-comparison__control-title">
        <strong>Simulation controls</strong>
        <span>Adjust the view</span>
      </div>

      {stage >= 2 && (
        <div className="sat-comparison__control-group">
          <label className="sat-comparison__control-label" htmlFor="sc-time-speed">Time speed · {timeSpeed.toLocaleString()}×</label>
          <input
            id="sc-time-speed"
            className="sat-comparison__range"
            type="range"
            min={0}
            max={comparisonConfig.timeSpeeds.length - 1}
            step={1}
            value={speedIndex}
            onChange={(event) => setSpeedFromSlider(event.currentTarget.value)}
            aria-label="Simulation time speed"
            aria-valuetext={`${timeSpeed} times real time`}
          />
          <div className="sat-comparison__range-labels" aria-hidden>
            {comparisonConfig.timeSpeeds.map((speed) => <span key={speed}>{speed.toLocaleString()}×</span>)}
          </div>
          <div className="sat-comparison__control-row" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="sat-comparison__chip"
              aria-pressed={playing}
              onClick={() => store().setPlaying(!playing)}
            >
              {playing ? "Pause motion" : "Resume motion"}
            </button>
          </div>
        </div>
      )}

      {stage >= 2 && (
        <div className="sat-comparison__control-group">
          <span className="sat-comparison__control-label">Orbit scale</span>
          <div className="sat-comparison__control-row">
            <button
              type="button"
              className="sat-comparison__scale-toggle"
              aria-pressed={scaleMode === "true"}
              onClick={() => setScale("true")}
            >
              {comparisonConfig.copy.labels.trueScale}
            </button>
            <button
              type="button"
              className="sat-comparison__scale-toggle"
              aria-pressed={scaleMode === "exaggerated"}
              onClick={() => setScale("exaggerated")}
            >
              {comparisonConfig.copy.labels.exaggeratedScale}
            </button>
          </div>
        </div>
      )}

      {stage === 5 && (
        <div className="sat-comparison__control-group">
          <label className="sat-comparison__control-label" htmlFor="sc-location">User location</label>
          <select
            id="sc-location"
            className="sat-comparison__select"
            value={location.name}
            onChange={(event) => store().setLocation(event.currentTarget.value)}
            aria-label="Choose a simulation location"
          >
            {comparisonConfig.locations.map((city) => (
              <option key={city.name} value={city.name}>{city.name}</option>
            ))}
          </select>
        </div>
      )}

      {stage >= 2 && (
        <div className="sat-comparison__control-group">
          <span className="sat-comparison__control-label">Layers</span>
          <div className="sat-comparison__control-row">
            <button type="button" className="sat-comparison__chip" aria-pressed={showOrbits} onClick={() => store().toggleOrbits()}>
              Orbits
            </button>
            <button type="button" className="sat-comparison__chip sat-comparison__chip--cyan" aria-pressed={showLinks} onClick={() => store().toggleLinks()}>
              Laser links
            </button>
            <button type="button" className="sat-comparison__chip" aria-pressed={showLabels} onClick={() => store().toggleLabels()}>
              Labels
            </button>
          </div>
        </div>
      )}

      {stage === 3 && (
        <div className="sat-comparison__control-footer">
          <button
            type="button"
            className="sat-comparison__action-button sat-comparison__action-button--primary"
            onClick={() => store().sendSignal()}
            aria-keyshortcuts="Enter"
          >
            Send both pulses
          </button>
        </div>
      )}

      <div className="sat-comparison__control-footer">
        <span className="sat-comparison__control-label" style={{ margin: 0 }}>Signal colors</span>
        <span className="sat-comparison__metric-sub" style={{ margin: 0, color: "#ffb27a" }}>● radio</span>
        <span className="sat-comparison__metric-sub" style={{ margin: 0, color: "#8ce5ff" }}>● laser</span>
      </div>

      <details className="sat-comparison__about">
        <summary>{comparisonConfig.copy.labels.about}</summary>
        <p>{comparisonConfig.copy.labels.aboutText}</p>
      </details>
      {reducedMotion && <p className="sat-comparison__about">Reduced-motion preference is on; continuous motion is paused.</p>}
    </aside>
  );
}
