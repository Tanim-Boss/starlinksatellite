import { useEffect } from "react";
import { comparisonConfig } from "../config";
import { useComparisonStore } from "../hooks/useComparisonStore";
import { geoElevationForLocation } from "../utils/orbit";
import { ComparisonTable } from "./ComparisonTable";

function StageCard() {
  const stage = useComparisonStore((state) => state.stage);
  const stageCopy = comparisonConfig.stageCopy[stage];
  return (
    <section className="sat-comparison__card" aria-live="polite" aria-atomic="true">
      <span className="sat-comparison__micro-label">Stage {String(stage + 1).padStart(2, "0")} · {comparisonConfig.copy.stageNames[stage]}</span>
      <h2>{stageCopy.title}</h2>
      <p>{stageCopy.note}</p>
      {stage === 0 && (
        <div className="sat-comparison__metric-grid">
          <div className="sat-comparison__metric">
            <div className="sat-comparison__metric-label">{comparisonConfig.copy.labels.tvDish}</div>
            <div className="sat-comparison__metric-value">One-way</div>
            <div className="sat-comparison__metric-sub">A region receives the same signal</div>
          </div>
          <div className="sat-comparison__metric">
            <div className="sat-comparison__metric-label">{comparisonConfig.copy.labels.starlinkDish}</div>
            <div className="sat-comparison__metric-value">Two-way</div>
            <div className="sat-comparison__metric-sub">Requests travel back up</div>
          </div>
        </div>
      )}
    </section>
  );
}

function TwoWaySpecs() {
  return (
    <section className="sat-comparison__panel" aria-label="Dish receive and transmit comparison">
      <div className="sat-comparison__panel-inner">
        <div className="sat-comparison__panel-title">
          <h3>What each dish can do</h3>
          <span>RF path</span>
        </div>
        <div className="sat-comparison__spec-grid">
          <div className="sat-comparison__spec-card sat-comparison__spec-card--tv">
            <h4>{comparisonConfig.copy.labels.tvDish}</h4>
            <div className="sat-comparison__spec-line">
              <span>Receive</span><span className="sat-comparison__check" aria-label="yes">✓</span>
            </div>
            <div className="sat-comparison__spec-line">
              <span>Send</span><span className="sat-comparison__cross" aria-label="no">✗</span>
            </div>
            <div className="sat-comparison__metric-sub" style={{ marginTop: 8 }}>Receive ✓ / Send ✗</div>
          </div>
          <div className="sat-comparison__spec-card sat-comparison__spec-card--leo">
            <h4>{comparisonConfig.copy.labels.starlinkDish}</h4>
            <div className="sat-comparison__spec-line">
              <span>Receive</span><span className="sat-comparison__check" aria-label="yes">✓</span>
            </div>
            <div className="sat-comparison__spec-line">
              <span>Send</span><span className="sat-comparison__check" aria-label="yes">✓</span>
            </div>
            <div className="sat-comparison__metric-sub" style={{ marginTop: 8 }}>Receive ✓ / Send ✓</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function OrbitFacts() {
  return (
    <section className="sat-comparison__panel" aria-label="Orbit altitude and speed comparison">
      <div className="sat-comparison__panel-inner">
        <div className="sat-comparison__panel-title">
          <h3>Altitude sets the geometry</h3>
          <span>Physical values</span>
        </div>
        <div className="sat-comparison__metric-grid">
          <div className="sat-comparison__metric">
            <div className="sat-comparison__metric-label">Geostationary orbit</div>
            <div className="sat-comparison__metric-value">35,786 km</div>
            <div className="sat-comparison__metric-sub">3.07 km/s · 24 h · one wide region</div>
          </div>
          <div className="sat-comparison__metric">
            <div className="sat-comparison__metric-label">Low Earth orbit</div>
            <div className="sat-comparison__metric-value">~550 km</div>
            <div className="sat-comparison__metric-sub">7.6 km/s · ~95 min · small moving spot</div>
          </div>
        </div>
        <p>Drag the time-speed slider to watch the LEO satellites sweep past while the GEO spacecraft stays over its longitude.</p>
      </div>
    </section>
  );
}

function LatencyReadouts() {
  const elapsedMs = useComparisonStore((state) => state.elapsedMs);
  const sendNonce = useComparisonStore((state) => state.sendNonce);
  const status = sendNonce ? "Pulse launched" : comparisonConfig.copy.labels.pulseReady;
  const geoStopwatch = sendNonce ? Math.min(elapsedMs, 600) : 0;
  const leoStopwatch = sendNonce ? Math.min(elapsedMs, 32) : 0;
  return (
    <section className="sat-comparison__panel" aria-label="Round trip latency stopwatch">
      <div className="sat-comparison__panel-inner">
        <div className="sat-comparison__panel-title">
          <h3>Same request · same start</h3>
          <span>{status}</span>
        </div>
        <div className="sat-comparison__latency-grid">
          <div className="sat-comparison__latency-readout sat-comparison__latency-readout--geo">
            <div>
              <strong>TV/GEO internet</strong>
              <small>~600 ms latency · stopwatch {geoStopwatch.toFixed(0)} ms</small>
            </div>
            <output aria-label="GEO round trip estimate">~600 ms</output>
          </div>
          <div className="sat-comparison__latency-readout sat-comparison__latency-readout--leo">
            <div>
              <strong>Starlink</strong>
              <small>~20–40 ms latency · stopwatch {leoStopwatch.toFixed(0)} ms</small>
            </div>
            <output aria-label="LEO round trip estimate">~20–40 ms</output>
          </div>
        </div>
        <p>A GEO user-to-gateway trip is about 240 ms one way; a request and response is often 500–600 ms. LEO is a few milliseconds to orbit; typical end-to-end latency includes routing and processing.</p>
      </div>
    </section>
  );
}

function ConstellationCounter() {
  const count = useComparisonStore((state) => state.constellationCount);
  return (
    <section className="sat-comparison__panel" aria-label="Constellation size">
      <div className="sat-comparison__panel-inner">
        <div className="sat-comparison__panel-title">
          <h3>From one spacecraft to a fleet</h3>
          <span>Animated count</span>
        </div>
        <div className="sat-comparison__wide-number" aria-live="polite">
          {count.toLocaleString("en-US")}{count >= 10000 ? "+" : ""} <span>satellites</span>
        </div>
        <div className="sat-comparison__metric-sub" style={{ marginTop: 5 }}>
          600 are drawn here in 20 planes at 53° inclination. The real constellation is much larger.
        </div>
        <div className="sat-comparison__handoff" style={{ borderColor: "rgba(100,216,255,.19)" }}>
          <span className="sat-comparison__handoff-dot" />
          4-neighbour laser mesh · line of sight checked
        </div>
      </div>
    </section>
  );
}

function HandoffAndTable() {
  const location = useComparisonStore((state) => state.location);
  const bestSatelliteId = useComparisonStore((state) => state.bestSatelliteId);
  const bestElevationDeg = useComparisonStore((state) => state.bestElevationDeg);
  const handoffNotice = useComparisonStore((state) => state.handoffNotice);
  const geoElevation = geoElevationForLocation(location);
  const geoInView = geoElevation > 0;
  const leoConnected = bestSatelliteId >= 0 && bestElevationDeg >= comparisonConfig.minimumElevationDeg;

  return (
    <>
      <section className="sat-comparison__card" aria-label="Current coverage and handoff status">
        <span className="sat-comparison__micro-label">Stage 06 · {comparisonConfig.copy.stageNames[5]} · {location.lat.toFixed(2)}° / {location.lon.toFixed(2)}°</span>
        <h2>{location.name}</h2>
        <div className="sat-comparison__facts">
          <div className="sat-comparison__fact">
            <dt>TV / GEO</dt>
            <dd>{geoInView ? comparisonConfig.copy.labels.alwaysConnected : "Below the horizon"} · {geoElevation.toFixed(0)}° elevation</dd>
          </div>
          <div className="sat-comparison__fact">
            <dt>Starlink</dt>
            <dd>{leoConnected ? `Connected · Satellite #${String(bestSatelliteId + 1).padStart(3, "0")} · ${bestElevationDeg.toFixed(0)}°` : "Searching above 25° elevation"}</dd>
          </div>
        </div>
        {handoffNotice && (
          <div className="sat-comparison__handoff" role="status">
            <span className="sat-comparison__handoff-dot" />{handoffNotice}
          </div>
        )}
        <p>{comparisonConfig.stageCopy[5].note} GEO has high latency and an equatorial-sky dependency; buildings or trees can block a low-angle dish. A broadcast receiver needs a separate uplink to send.</p>
      </section>
      <section className="sat-comparison__panel" aria-label="Final system comparison">
        <div className="sat-comparison__panel-inner">
          <div className="sat-comparison__panel-title">
            <h3>At a glance</h3>
            <span>Broadcast vs LEO internet</span>
          </div>
          <ComparisonTable />
        </div>
      </section>
    </>
  );
}

/** Stage-specific facts and overlays; captions themselves stay in copy.ts. */
export function StagePanels() {
  const stage = useComparisonStore((state) => state.stage);
  const setConstellationCount = useComparisonStore((state) => state.setConstellationCount);

  useEffect(() => {
    if (stage !== 4) return;
    const started = performance.now();
    let lastPublished = 600;
    setConstellationCount(600);
    const timer = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - started) / 4200);
      const eased = 1 - (1 - progress) ** 3;
      const next = Math.round(600 + (10000 - 600) * eased);
      if (next !== lastPublished) {
        lastPublished = next;
        setConstellationCount(next);
      }
      if (progress >= 1) window.clearInterval(timer);
    }, 100);
    return () => window.clearInterval(timer);
  }, [stage, setConstellationCount]);

  return (
    <>
      {stage !== 5 && <StageCard />}
      {stage === 1 && <TwoWaySpecs />}
      {stage === 2 && <OrbitFacts />}
      {stage === 3 && <LatencyReadouts />}
      {stage === 4 && <ConstellationCounter />}
      {stage === 5 && <HandoffAndTable />}
    </>
  );
}
