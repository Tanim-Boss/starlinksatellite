import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { ArrowUpRight, ChevronDown, CircleHelp, Maximize2, Minimize2, MousePointer2, Pause, Play, Radio, RotateCcw, Satellite, SatelliteDish } from "lucide-react";
import { ErrorBoundary } from "@/components/site/ErrorBoundary";
import { useActivity } from "@/components/SatelliteComparison/hooks/useActivity";
import { useReducedMotion } from "@/lib/useMediaQuery";
import { useWebGLSupport } from "@/lib/webgl";
import type { LabMode } from "./types";

const LabScene = lazy(() => import("./LabScene"));

const modes: { id: LabMode; label: string }[] = [
  { id: "compare", label: "Compare" },
  { id: "dishes", label: "The dishes" },
  { id: "broadcast", label: "Broadcast" },
  { id: "starlink", label: "Starlink" },
];

const details: Record<LabMode, { number: string; eyebrow: string; title: string; description: string; geoTitle: string; geoBody: string; leoTitle: string; leoBody: string; footer: string }> = {
  compare: {
    number: "01", eyebrow: "THE BIG PICTURE", title: "One sky. Two very different networks.",
    description: "One sends a signal over a huge area. The other keeps you connected through a moving network in low orbit.",
    geoTitle: "BROADCAST SATELLITE", geoBody: "One-way TV from a fixed point in the sky.",
    leoTitle: "STARLINK SATELLITES", leoBody: "Two-way internet from a moving constellation.",
    footer: "CHOOSE A VIEW TO EXPLORE",
  },
  dishes: {
    number: "02", eyebrow: "THE GROUND TERMINALS", title: "Two dishes. Two different jobs.",
    description: "The shape tells part of the story. What each antenna can do tells the rest.",
    geoTitle: "TV SATELLITE DISH", geoBody: "A fixed parabolic dish receives a broadcast.",
    leoTitle: "STARLINK TERMINAL", leoBody: "A phased array sends and receives, steering its beam electronically.",
    footer: "SIGNALS ARE SHOWN FOR CLARITY",
  },
  broadcast: {
    number: "03", eyebrow: "GEOSTATIONARY ORBIT", title: "A steady signal from far above.",
    description: "A GEO satellite orbits at the same rate Earth turns, so it appears fixed over one point on the equator.",
    geoTitle: "35,786 KM UP", geoBody: "One satellite can cover a very large region.",
    leoTitle: "A FIXED DISH", leoBody: "A TV receiver listens; it does not send requests back.",
    footer: "GEO · ABOUT 24 HOURS PER ORBIT",
  },
  starlink: {
    number: "04", eyebrow: "LOW EARTH ORBIT", title: "Closer to Earth. Always on the move.",
    description: "Starlink satellites circle Earth quickly. Your connection hands off as another satellite comes into view.",
    geoTitle: "AROUND 550 KM UP", geoBody: "A satellite completes an orbit in roughly 95 minutes.",
    leoTitle: "A MOVING NETWORK", leoBody: "Many satellites work together; some use laser links in space.",
    footer: "600 SATELLITES IN THIS MODEL · NOT LIVE",
  },
};

function Poster({ message }: { message: string }) {
  const base = import.meta.env?.BASE_URL || "/";
  return (
    <div className="lab-poster" role="status">
      <div className="lab-poster-ring lab-poster-ring--outer" /><div className="lab-poster-ring lab-poster-ring--inner" />
      <div className="lab-poster-earth" style={{ backgroundImage: `radial-gradient(circle at 32% 27%, transparent 15%, rgba(0, 13, 29, .65) 74%), url("${base}textures/earth-day.jpg")` }} />
      <span>{message}</span>
    </div>
  );
}

function SidePanel({ mode }: { mode: LabMode }) {
  const content = details[mode];
  return (
    <aside className="lab-info" aria-live="polite" aria-atomic="true">
      <div className="lab-info-topline"><span>{content.eyebrow}</span><span>{content.number} <i>/</i> 04</span></div>
      <h3>{content.title}</h3>
      <p className="lab-info-intro">{content.description}</p>
      <div className="lab-info-divider" />
      <div className="lab-info-system">
        <span className="lab-info-icon lab-info-icon--warm"><Satellite size={17} strokeWidth={1.5} /></span>
        <div><span className="lab-info-label lab-info-label--warm">{content.geoTitle}</span><p>{content.geoBody}</p></div>
      </div>
      <div className="lab-info-system">
        <span className="lab-info-icon lab-info-icon--cool"><SatelliteDish size={17} strokeWidth={1.5} /></span>
        <div><span className="lab-info-label lab-info-label--cool">{content.leoTitle}</span><p>{content.leoBody}</p></div>
      </div>
      <div className="lab-info-footer"><span className="lab-info-footer-dot" />{content.footer}<ArrowUpRight size={13} /></div>
    </aside>
  );
}

export function LabStage() {
  const [mode, setMode] = useState<LabMode>("compare");
  const reducedMotion = useReducedMotion();
  const [playing, setPlaying] = useState(() => !reducedMotion);
  const [speed, setSpeed] = useState(60);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showSignals, setShowSignals] = useState(true);
  const [showMesh, setShowMesh] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [ready, setReady] = useState(false);
  const webglAvailable = useWebGLSupport();
  const webglOff = webglAvailable === false;
  const { ref, active } = useActivity();
  const onReady = useCallback(() => setReady(true), []);

  useEffect(() => { if (reducedMotion) setPlaying(false); }, [reducedMotion]);
  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKey); };
  }, [expanded]);

  const selectMode = (next: LabMode) => {
    setMode(next);
    if (next === "starlink") setShowMesh(true);
  };

  return (
    <div ref={ref} className={`lab-stage${expanded ? " lab-stage--expanded" : ""}`} role="region" aria-label="Interactive satellite comparison">
      <div className="lab-stage-top">
        <div className="lab-stage-name"><span className="lab-stage-name-icon"><Radio size={15} /></span><span>ORBITAL VIEW <small> / &nbsp;3D SIMULATION</small></span></div>
        <div className="lab-stage-top-right">
          <div className="lab-view-tabs" role="group" aria-label="Choose a simulation view">
            {modes.map((item) => (
              <button key={item.id} type="button" aria-pressed={mode === item.id} onClick={() => selectMode(item.id)}>{item.label}</button>
            ))}
          </div>
          <button className="lab-expand" type="button" aria-label={expanded ? "Exit expanded view" : "Expand simulation"} aria-pressed={expanded} title={expanded ? "Exit expanded view" : "Expand simulation"} onClick={() => setExpanded(!expanded)}>
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      <div className="lab-stage-body">
        <div className="lab-viewport">
          <div className="lab-viewport-glow" aria-hidden="true" />
          <div className="lab-viewport-canvas">
            {webglOff ? <Poster message="WebGL unavailable · the comparison remains available below" /> : webglAvailable === null ? (
              <Poster message="Preparing the 3D view" />
            ) : (
              <ErrorBoundary label="orbital simulation" fallback={<Poster message="3D view unavailable on this device" />}>
                <Suspense fallback={<Poster message="Preparing the 3D view" />}>
                  {!ready && <Poster message="Preparing the 3D view" />}
                  <LabScene mode={mode} playing={playing} speed={speed} showOrbits={showOrbits} showSignals={showSignals} showMesh={showMesh} resetKey={resetKey} active={active || expanded} onReady={onReady} />
                </Suspense>
              </ErrorBoundary>
            )}
          </div>
          <div className="lab-viewport-topline"><span><span className={`lab-live-dot${playing && !webglOff ? "" : " lab-live-dot--paused"}`} /> {webglOff ? "3D VIEW UNAVAILABLE" : playing ? "SIMULATION RUNNING" : "SIMULATION PAUSED"}</span><span><MousePointer2 size={13} /> DRAG TO ROTATE</span></div>
          {mode === "dishes" ? (
            <div className="lab-dish-labels" aria-hidden="true">
              <div><span className="lab-dot lab-dot--warm" /> TV SATELLITE DISH <small>RECEIVE ONLY</small></div>
              <div><span className="lab-dot lab-dot--cool" /> STARLINK TERMINAL <small>SEND + RECEIVE</small></div>
            </div>
          ) : (
            <div className="lab-viewport-legend" aria-label="Orbit color key">
              {mode !== "starlink" && <span><i className="lab-dot lab-dot--warm" /> GEO <b>·</b> BROADCAST</span>}
              {mode !== "broadcast" && <span><i className="lab-dot lab-dot--cool" /> LEO <b>·</b> STARLINK</span>}
            </div>
          )}
          <div className="lab-viewport-scale"><span>✳</span> ILLUSTRATIVE SCALE</div>
          <span className="lab-crosshair lab-crosshair--one" aria-hidden="true">+</span>
          <span className="lab-crosshair lab-crosshair--two" aria-hidden="true">+</span>
        </div>
        <SidePanel mode={mode} />
      </div>

      <div className="lab-stage-controls">
        <div className="lab-transport">
          <button className="lab-play" type="button" aria-label={playing ? "Pause simulation" : "Play simulation"} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</button>
          <span className="lab-transport-label">{playing ? "Pause" : "Play"} <small>simulation</small></span>
          <span className="lab-control-separator" />
          <label className="lab-speed-label" htmlFor="lab-speed">SPEED</label>
          <div className="lab-select-wrap"><select id="lab-speed" value={speed} onChange={(event) => setSpeed(Number(event.currentTarget.value))}><option value={1}>1×</option><option value={60}>60×</option><option value={600}>600×</option><option value={3000}>3,000×</option></select><ChevronDown size={13} /></div>
        </div>
        <div className="lab-layers" role="group" aria-label="Simulation layers">
          <button type="button" aria-pressed={showOrbits} disabled={mode === "dishes"} onClick={() => setShowOrbits(!showOrbits)}><span /> Orbit paths</button>
          <button type="button" aria-pressed={showSignals} onClick={() => setShowSignals(!showSignals)}><span /> Signals</button>
          <button type="button" aria-pressed={showMesh} disabled={mode === "dishes" || mode === "broadcast"} onClick={() => setShowMesh(!showMesh)}><span /> Laser mesh</button>
        </div>
        <button type="button" className="lab-reset" onClick={() => setResetKey((value) => value + 1)}><RotateCcw size={14} /> Reset view</button>
      </div>
      {reducedMotion && !playing && <p className="lab-reduced-note">Motion is paused to respect your device settings. Press Play to start.</p>}
      <div className="lab-stage-accessible-note"><CircleHelp size={13} /> Satellite sizes and orbit distances are adjusted for visibility. This is an educational model, not live tracking.</div>
      <span className="sr-only">The warm signal represents broadcast. The cool signal represents Starlink. Focus the 3D view and use arrow keys to rotate; use plus or minus to zoom.</span>
    </div>
  );
}
