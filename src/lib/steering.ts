/**
 * The beam-steering model used by the `/steering` simulation.
 *
 * Where the dish beam lab models a *ground* phased array that never moves,
 * this lab models a satellite in space carrying a **steerable terminal** on a
 * two-axis gimbal: the bus stays attitude-fixed while the antenna rotates to
 * hand its narrow beam from Satellite A to Satellite B.
 *
 * The frame is the source satellite's body frame:
 *   +Y  toward the antenna mast (up)
 *   +Z  the zero-azimuth reference direction
 *   +X  completes the right-handed frame
 * Azimuth rotates about +Y (measured from +Z toward +X); elevation is the
 * angle above the XZ plane. Both are in degrees.
 *
 * Everything here is a teaching model with labelled, illustrative scales —
 * not an orbital propagator and not an electromagnetic solver.
 */

/* -------------------------------------------------------------------------- */
/* Scene scale                                                                 */
/* -------------------------------------------------------------------------- */

/** Height of the gimbal pivot above the source bus centre, in scene units. */
export const ANTENNA_Y = 0.94;
/** Where the first wavefront / laser exits the terminal. */
export const BEAM_START = 0.42;
/** One scene unit stands in for this many kilometres of inter-satellite range. */
export const KM_PER_UNIT = 100;
/** Number of orange wavefront rings drawn along an RF beam. */
export const WAVE_RINGS = 14;

/* -------------------------------------------------------------------------- */
/* Targets                                                                     */
/* -------------------------------------------------------------------------- */

export type TargetId = "A" | "B";
export type TechMode = "rf" | "optical";

export interface TargetDef {
  id: TargetId;
  name: string;
  color: string;
  /** Apparent direction at t = 0, degrees in the source body frame. */
  baseAz: number;
  baseEl: number;
  /** Distance from the source, in scene units. */
  range: number;
  /** Slow apparent drift, so auto-tracking has something to do. */
  azAmp: number;
  elAmp: number;
  azRate: number;
  elRate: number;
  phase: number;
}

/**
 * Two target spacecraft on slow, closed apparent tracks. The handover from A
 * to B is the story of the page, so the tracks themselves barely move: the
 * visible rotation comes from the gimbal, not from racing targets.
 */
export const TARGETS: TargetDef[] = [
  {
    id: "A",
    name: "SATELLITE A",
    color: "#3ddbd9",
    baseAz: -26,
    baseEl: 14,
    range: 15,
    azAmp: 2.4,
    elAmp: 1.4,
    azRate: 0.05,
    elRate: 0.041,
    phase: 0.6,
  },
  {
    id: "B",
    name: "SATELLITE B",
    color: "#60a5fa",
    baseAz: 40,
    baseEl: -8,
    range: 13.2,
    azAmp: 2.0,
    elAmp: 1.1,
    azRate: 0.057,
    elRate: 0.046,
    phase: 2.3,
  },
];

export function getTarget(id: TargetId): TargetDef {
  return TARGETS.find((target) => target.id === id) ?? TARGETS[0];
}

/* -------------------------------------------------------------------------- */
/* Angles                                                                      */
/* -------------------------------------------------------------------------- */

/** Keeps an azimuth in (−180, 180]. */
export function wrapAz(az: number): number {
  let value = az % 360;
  if (value > 180) value -= 360;
  if (value <= -180) value += 360;
  return value;
}

/** Clamps the manual elevation slider to a reachable envelope. */
export function clampEl(el: number): number {
  return Math.max(-45, Math.min(60, el));
}

/** Unit direction for an azimuth/elevation pair in the body frame. */
export function directionFromAzEl(azDeg: number, elDeg: number): [number, number, number] {
  const az = (azDeg * Math.PI) / 180;
  const el = (elDeg * Math.PI) / 180;
  const c = Math.cos(el);
  return [c * Math.sin(az), Math.sin(el), c * Math.cos(az)];
}

/** Inverse of {@link directionFromAzEl}. */
export function azElFromDirection(x: number, y: number, z: number): { az: number; el: number } {
  const len = Math.hypot(x, y, z) || 1;
  const el = (Math.asin(Math.max(-1, Math.min(1, y / len))) * 180) / Math.PI;
  const az = (Math.atan2(x, z) * 180) / Math.PI;
  return { az: wrapAz(az), el };
}

/** Great-circle angle between two body-frame directions, in degrees. */
export function angularSeparation(
  a: { az: number; el: number },
  b: { az: number; el: number },
): number {
  const [ax, ay, az] = directionFromAzEl(a.az, a.el);
  const [bx, by, bz] = directionFromAzEl(b.az, b.el);
  const dot = Math.max(-1, Math.min(1, ax * bx + ay * by + az * bz));
  return (Math.acos(dot) * 180) / Math.PI;
}

/** Apparent azimuth/elevation of a target at simulated time `t` (seconds). */
export function targetAzElAt(def: TargetDef, t: number): { az: number; el: number } {
  return {
    az: wrapAz(def.baseAz + def.azAmp * Math.sin(def.azRate * t + def.phase)),
    el: def.baseEl + def.elAmp * Math.sin(def.elRate * t + def.phase * 1.7),
  };
}

/** World position of a target, relative to the source bus centre. */
export function targetPositionAt(def: TargetDef, t: number): [number, number, number] {
  const { az, el } = targetAzElAt(def, t);
  const [x, y, z] = directionFromAzEl(az, el);
  return [x * def.range, y * def.range, z * def.range];
}

/** The gimbal pivot in world coordinates (the mast does not translate). */
export function antennaOrigin(): [number, number, number] {
  return [0, ANTENNA_Y, 0];
}

/* -------------------------------------------------------------------------- */
/* Link technology                                                             */
/* -------------------------------------------------------------------------- */

export interface TechSpec {
  id: TechMode;
  label: string;
  short: string;
  /** Pointing error below which the link is declared locked, degrees. */
  lockDeg: number;
  /** First-order gimbal approach rate, per second. */
  slewRate: number;
  /** Illustrative half-angle of the emitted beam, degrees. */
  beamwidthDeg: number;
  band: string;
  note: string;
}

/**
 * The optical terminal locks an order of magnitude tighter and slews a little
 * faster: a laser terminal is built around precision pointing, acquisition and
 * tracking (PAT), while a parabolic dish tolerates a coarser aim.
 */
export const TECH_SPECS: Record<TechMode, TechSpec> = {
  rf: {
    id: "rf",
    label: "RF dish antenna",
    short: "RF",
    lockDeg: 1.4,
    slewRate: 3.0,
    beamwidthDeg: 2.4,
    band: "Ka-band · ≈ 20 GHz",
    note: "A gimbaled parabolic reflector. Its orientation sets the pointing direction; the radio beam is several degrees wide.",
  },
  optical: {
    id: "optical",
    label: "Optical laser terminal",
    short: "OPT",
    lockDeg: 0.35,
    slewRate: 5.2,
    beamwidthDeg: 0.05,
    band: "1550 nm laser · PAT",
    note: "A steerable optical telescope. Pointing, acquisition and tracking align a microradian laser beam — a parabolic dish this is not.",
  },
};

export type LinkStatus = "locked" | "slewing" | "acquiring" | "manual";

/** Status word for the telemetry panel, given the current error. */
export function linkStatus(
  tech: TechMode,
  auto: boolean,
  errorDeg: number,
): LinkStatus {
  if (!auto) return "manual";
  if (errorDeg <= TECH_SPECS[tech].lockDeg) return "locked";
  return tech === "optical" ? "acquiring" : "slewing";
}

export function formatSigned(value: number, digits = 1): string {
  const rounded = Math.abs(value) < 0.05 ? 0 : value;
  return `${rounded >= 0 ? "+" : "−"}${Math.abs(rounded).toFixed(digits)}`;
}

/** Slant range in the illustrative kilometres used by the labels. */
export function rangeKm(def: TargetDef): number {
  return Math.round(def.range * KM_PER_UNIT);
}
