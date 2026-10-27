import {
  APERTURE_MM,
  ARRAY_COLS,
  ARRAY_ROWS,
  ELEMENT_SPACING_MM,
  PHASE_BITS,
  PHASE_STEP_DEG,
  SATELLITES,
  WAVELENGTH_MM,
  beamwidthDeg,
  formatSigned,
  getSatellite,
  phaseStepDeg,
  rowStepPs,
  satelliteAt,
  scanAngleFromElevation,
} from "@/lib/dishBeam";
import { cn } from "@/utils/cn";
import { beamClock, useBeamLab } from "./beamStore";
import { ModeButton, Row } from "./beamUI";

/**
 * Aim controls and the numbers behind them.
 *
 * The two sliders and the sky plot write the same store value, so whichever
 * input you use, the beam is steering electronically — the panel itself never
 * gets a transform.
 */
export function BeamControls() {
  useBeamLab((s) => s.uiTick);
  const mode = useBeamLab((s) => s.mode);
  const targetId = useBeamLab((s) => s.targetId);
  const aimAz = useBeamLab((s) => s.aimAz);
  const aimEl = useBeamLab((s) => s.aimEl);
  const selectTarget = useBeamLab((s) => s.selectTarget);
  const setMode = useBeamLab((s) => s.setMode);
  const aimAt = useBeamLab((s) => s.aimAt);

  const scan = scanAngleFromElevation(beamClock.el);
  const step = phaseStepDeg(scan);
  const quantised = (Math.round(step / PHASE_STEP_DEG) * PHASE_STEP_DEG) % 360;

  // While tracking, the sliders follow the beam; touching one takes over.
  const azValue =
    mode === "aim" ? aimAz : Math.round(Math.max(-180, Math.min(180, beamClock.az)) * 2) / 2;
  const elValue = mode === "aim" ? aimEl : Math.round(beamClock.el * 2) / 2;

  return (
    <div className="flex h-full flex-col p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">Aim</h3>
        <div
          role="group"
          aria-label="Beam steering mode"
          className="flex rounded-full border border-white/10 bg-[#040a14] p-1"
        >
          <ModeButton active={mode === "track"} onClick={() => setMode("track")}>
            Track
          </ModeButton>
          <ModeButton active={mode === "aim"} onClick={() => setMode("aim")}>
            Manual
          </ModeButton>
        </div>
      </div>

      <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
        {mode === "aim"
          ? "The beam stays where you put it while the satellites keep moving on their tracks. The amber error in the HUD is the angle between the beam and the selected satellite."
          : "The beam follows the selected satellite as it crosses the sky. Pick another target and watch the whole column slew across the scene."}
      </p>

      <div className="mt-2.5 grid gap-1.5 sm:grid-cols-3">
        {SATELLITES.map((def) => {
          const point = satelliteAt(def, beamClock.t);
          const active = def.id === targetId;
          return (
            <button
              key={def.id}
              type="button"
              aria-pressed={active}
              onClick={() => selectTarget(def.id)}
              className={cn(
                "rounded-xl border px-2.5 py-2 text-left transition-colors",
                active
                  ? "border-white/25 bg-white/[0.05]"
                  : "border-white/[0.07] bg-white/[0.015] hover:border-white/20",
              )}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: def.color }}
                />
                <span
                  className="font-mono text-[9px] uppercase tracking-[0.08em]"
                  style={{ color: active ? def.color : "#8b9bb9" }}
                >
                  {def.name}
                </span>
              </span>
              <span className="mt-1 block font-mono text-[9px] tabular-nums text-white">
                {point.el.toFixed(0)}° el
                <span className="text-faint"> · {formatSigned(point.az, 0)}° az</span>
              </span>
              <span className="mt-0.5 block truncate text-[9px] text-faint">{def.pass}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <label className="block">
          <span className="flex items-baseline justify-between font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
            <span>Azimuth</span>
            <span className="text-[10px] text-ink tabular-nums">{formatSigned(azValue)}°</span>
          </span>
          <input
            type="range"
            min={-180}
            max={180}
            step={0.5}
            value={azValue}
            aria-label="Beam azimuth in degrees from north"
            onChange={(event) => aimAt(Number(event.target.value), elValue)}
            className="mt-1 w-full accent-[#3ddbd9]"
          />
        </label>
        <label className="block">
          <span className="flex items-baseline justify-between font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
            <span>Elevation</span>
            <span className="text-[10px] text-ink tabular-nums">{elValue.toFixed(1)}°</span>
          </span>
          <input
            type="range"
            min={8}
            max={85}
            step={0.5}
            value={elValue}
            aria-label="Beam elevation in degrees above the horizon"
            onChange={(event) => aimAt(azValue, Number(event.target.value))}
            className="mt-1 w-full accent-[#3ddbd9]"
          />
        </label>
      </div>

      <dl className="mt-3 grid gap-x-5 sm:grid-cols-2">
        <Row label="Wavelength · 12 GHz" value={`${WAVELENGTH_MM.toFixed(2)} mm`} />
        <Row label="Element spacing" value={`${ELEMENT_SPACING_MM.toFixed(2)} mm (λ/2)`} />
        <Row
          label="Aperture"
          value={`${(APERTURE_MM / 1000).toFixed(2)} m · ${ARRAY_COLS} × ${ARRAY_ROWS}`}
        />
        <Row label="Beamwidth (model)" value={`${beamwidthDeg(scan).toFixed(1)}°`} />
        <Row
          label="Phase step"
          value={`${step.toFixed(1)}° → ${quantised.toFixed(1)}°`}
          tone="text-signal"
        />
        <Row label="Row-to-row delay" value={`${rowStepPs(scan).toFixed(1)} ps`} />
        <Row
          label="Tracking"
          value={mode === "aim" ? "manual aim" : getSatellite(targetId).name}
          tone={mode === "aim" ? "text-warn" : "text-ink"}
        />
        <Row label="Moving parts" value="0" tone="text-signal" />
      </dl>

      <p className="mt-2 text-[10px] leading-relaxed text-faint">
        Phase words are quantised to {PHASE_STEP_DEG}° steps ({PHASE_BITS}-bit shifters). The sliders
        write the same aim value as the sky plot, and both switch the beam out of auto-track.
      </p>
    </div>
  );
}
