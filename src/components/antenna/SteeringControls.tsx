import { useMemo } from "react";
import {
  APERTURE_M,
  AZ_MAX_DEG,
  AZ_MIN_DEG,
  EL_MAX_DEG,
  EL_MIN_DEG,
  ELEMENT_SPACING_M,
  arrayCutMetrics,
  compassPoint,
  phaseStepXDeg,
  phaseStepZDeg,
  phaseToDelayPs,
  steeringFromAngles,
} from "@/lib/phasedArray";
import { useBeamLab } from "./antennaStore";
import { MiniStat, Row, controlBase } from "./labUI";
import { cn } from "@/utils/cn";

function signed(v: number, digits = 1) {
  const rounded = Math.abs(v) < 0.05 ? 0 : v;
  return `${rounded >= 0 ? "+" : "−"}${Math.abs(rounded).toFixed(digits)}`;
}

function Slider({
  label,
  hint,
  min,
  max,
  value,
  onChange,
  ariaLabel,
  leftLabel,
  midLabel,
  rightLabel,
}: {
  label: string;
  hint: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  ariaLabel: string;
  leftLabel: string;
  midLabel: string;
  rightLabel: string;
}) {
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">{label}</span>
          <p className="mt-0.5 text-[10.5px] text-muted">{hint}</p>
        </div>
        <span className="font-mono text-xl tabular-nums text-white">{value.toFixed(1)}°</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel}
        aria-valuetext={`${value.toFixed(1)} degrees`}
        className="mt-3 w-full accent-[#3ddbd9]"
      />
      <div className="mt-1 flex justify-between font-mono text-[8px] uppercase tracking-[0.08em] text-faint/80">
        <span>{leftLabel}</span>
        <span>{midLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

/**
 * Slider → model → beam. There is no separate "rotate the cone" path: the
 * sliders write steering angles, and every visual derives from the resulting
 * phase ramp and array factor.
 */
export function SteeringControls() {
  const azDeg = useBeamLab((s) => s.azDeg);
  const elDeg = useBeamLab((s) => s.elDeg);
  const tracking = useBeamLab((s) => s.tracking);
  const sweeping = useBeamLab((s) => s.sweeping);
  const selectedSat = useBeamLab((s) => s.selectedSat);
  const setAzimuth = useBeamLab((s) => s.setAzimuth);
  const setElevation = useBeamLab((s) => s.setElevation);
  const toggleSweep = useBeamLab((s) => s.toggleSweep);
  const setTracking = useBeamLab((s) => s.setTracking);
  const pointAtTarget = useBeamLab((s) => s.pointAtTarget);

  const steer = steeringFromAngles(azDeg, elDeg);
  const stepX = phaseStepXDeg(steer);
  const stepZ = phaseStepZDeg(steer);
  const delayX = phaseToDelayPs(stepX);
  const delayZ = phaseToDelayPs(stepZ);
  const metrics = useMemo(() => arrayCutMetrics(steer), [azDeg, elDeg]);
  const nullText =
    metrics.nullLowerEl === null && metrics.nullUpperEl === null
      ? "below the visible cut"
      : `${metrics.nullLowerEl === null ? "—" : metrics.nullLowerEl.toFixed(1)}° / ${
          metrics.nullUpperEl === null ? "—" : metrics.nullUpperEl.toFixed(1)
        }°`;
  const sideValues = [metrics.sideLowerDb, metrics.sideUpperDb].filter(
    (v): v is number => v !== null,
  );
  const sideText = sideValues.length
    ? `${Math.max(...sideValues).toFixed(1)} dB`
    : "outside the cut";

  return (
    <div className="bg-[#060b16] p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-faint">
            Electronic steering
          </p>
          <h3 className="mt-1 text-[13.5px] font-medium text-white">Steer the beam, not the panel</h3>
        </div>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em]",
            tracking || sweeping
              ? "border-signal/30 bg-signal/[0.07] text-signal"
              : "border-white/10 text-faint",
          )}
        >
          <span className={cn("h-1 w-1 rounded-full", tracking || sweeping ? "bg-signal" : "bg-white/30")} />
          {tracking ? "tracking" : sweeping ? "sweeping" : "manual"}
        </span>
      </div>

      <div className="mt-5 space-y-5">
        <Slider
          label="Azimuth"
          hint="Sweeps the beam east and west. North is 0°."
          min={AZ_MIN_DEG}
          max={AZ_MAX_DEG}
          value={azDeg}
          onChange={setAzimuth}
          ariaLabel="Beam azimuth in degrees from north"
          leftLabel="−75° W"
          midLabel="0° N"
          rightLabel="+75° E"
        />
        <Slider
          label="Elevation"
          hint="Raises the beam from the horizon toward the zenith."
          min={EL_MIN_DEG}
          max={EL_MAX_DEG}
          value={elDeg}
          onChange={setElevation}
          ariaLabel="Beam elevation in degrees above the horizon"
          leftLabel="15° low"
          midLabel="50°"
          rightLabel="85° high"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={toggleSweep}
          aria-pressed={sweeping}
          className={cn(controlBase, sweeping && "border-signal/50 bg-signal/10 text-signal")}
        >
          {sweeping ? "■ Stop sweep" : "↔ Sweep across the sky"}
        </button>
        <button
          type="button"
          onClick={() => setTracking(!tracking)}
          aria-pressed={tracking}
          disabled={!selectedSat}
          title={selectedSat ? "Follow the selected satellite" : "Select a satellite first"}
          className={cn(controlBase, tracking && "border-signal/50 bg-signal/10 text-signal")}
        >
          {tracking ? "■ Stop auto-track" : "◎ Auto-track"}
        </button>
        <button
          type="button"
          onClick={pointAtTarget}
          disabled={!selectedSat}
          className={controlBase}
        >
          ⤒ Point at target
        </button>
      </div>
      <p className="mt-1.5 text-[9.5px] leading-relaxed text-faint">
        Moving a slider switches off auto-track and sweep: manual control wins.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <MiniStat label="Azimuth" value={`${signed(azDeg)}°`} tone="text-signal" />
        <MiniStat label="Elevation" value={`${elDeg.toFixed(1)}°`} />
        <MiniStat label="Δφ east" value={`${signed(stepX)}°`} />
        <MiniStat label="Δφ north" value={`${signed(stepZ)}°`} />
      </div>

      <dl className="mt-3">
        <Row
          label="Extra drive delay"
          value={`${signed(delayX)} ps east · ${signed(delayZ)} ps north`}
        />
        <Row label="Scan angle from zenith" value={`${(90 - elDeg).toFixed(1)}°`} />
        <Row label="Visible half-power width" value={`${metrics.hpbwDeg.toFixed(1)}°`} />
        <Row label="First null elevations" value={nullText} />
        <Row label="First side lobe (this cut)" value={sideText} />
        <Row label="Element spacing" value={`${(ELEMENT_SPACING_M * 1000).toFixed(2)} mm · λ/2`} />
        <Row label="Aperture" value={`${(APERTURE_M * 1000).toFixed(0)} mm · 8λ`} />
        <Row label="Physical hardware that moves" value="None" tone="text-signal" mono={false} />
      </dl>

      <p className="mt-3 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[10.5px] leading-relaxed text-muted">
        Delay grows toward <span className="text-ink">{compassPoint(azDeg)}</span>: each element is
        fired a little later than its neighbour on the near side, which tilts the wavefront and
        points the main lobe the same way. The standard Δφ = 2π(d/λ) sin θ uses θ measured from the
        panel normal (zenith), not elevation above the horizon. The panel stays bolted to its mount
        the entire time.
      </p>
    </div>
  );
}
