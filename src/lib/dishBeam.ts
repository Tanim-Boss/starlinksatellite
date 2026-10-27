/**
 * The dish-beam model used by the `/antenna` simulation.
 *
 * Everything here is deliberately small and explicit: a uniform 16 × 16
 * lattice at 12 GHz, the phase slope that steers its beam, and three closed
 * "apparent tracks" for the satellites that the beam can follow. The 3D scene
 * and the 2D sky plot both read from these functions, so the picture, the
 * numbers and the phase words on the wavefronts cannot drift apart.
 *
 * Not telemetry, not a link budget, not proprietary firmware: the model is
 * textbook array theory with the usual simplifications listed on the page.
 */

export const FREQ_GHZ = 12;
/** Free-space wavelength at 12 GHz, in millimetres. */
export const WAVELENGTH_MM = 24.98;
/** Half-wavelength element spacing, in millimetres. */
export const ELEMENT_SPACING_MM = WAVELENGTH_MM / 2;
export const ARRAY_ROWS = 16;
export const ARRAY_COLS = 16;
/** Physical width of the 16 × 16 aperture, in millimetres. */
export const APERTURE_MM = ARRAY_COLS * ELEMENT_SPACING_MM;
/** Quantised phase shifters: 4 bits → 22.5° steps. */
export const PHASE_BITS = 4;
export const PHASE_STEPS = 1 << PHASE_BITS;
export const PHASE_STEP_DEG = 360 / PHASE_STEPS;

/* Scene scale. One unit is roughly one metre; the sky is compressed. */
export const DISH_RADIUS = 0.62;
/** Height of the dish's radiating face above the ground. */
export const DISH_Y = 1.06;
/** Exaggerated distance to the satellites, in scene units. */
export const SKY_RADIUS = 12;
/** Number of wavefronts drawn between the dish and the satellite. */
export const WAVE_RINGS = 19;

export type SatId = "A" | "B" | "C";

export interface SatelliteDef {
  id: SatId;
  /** Short label used in the HUD. */
  name: string;
  /** A human description of the pass. */
  pass: string;
  /** Accent colour for markers and labels. */
  color: string;
  baseAz: number;
  azAmp: number;
  azRate: number;
  azPhase: number;
  baseEl: number;
  elAmp: number;
  elRate: number;
  elPhase: number;
}

/**
 * Three satellites on closed apparent tracks. The amplitudes and rates are
 * tuned so each one drifts a few degrees per minute at 1× — fast enough to see
 * the beam follow, slow enough to read the numbers while it moves.
 */
export const SATELLITES: SatelliteDef[] = [
  {
    id: "A",
    name: "SAT-A",
    pass: "High pass · north",
    color: "#3ddbd9",
    baseAz: -14,
    azAmp: 17,
    azRate: 0.052,
    azPhase: 0.4,
    baseEl: 50,
    elAmp: 9,
    elRate: 0.043,
    elPhase: 0.9,
  },
  {
    id: "B",
    name: "SAT-B",
    pass: "East pass",
    color: "#60a5fa",
    baseAz: 30,
    azAmp: 9,
    azRate: 0.061,
    azPhase: 2.1,
    baseEl: 35,
    elAmp: 7,
    elRate: 0.049,
    elPhase: 0.5,
  },
  {
    id: "C",
    name: "SAT-C",
    pass: "Low arc · west",
    color: "#a78bfa",
    baseAz: -50,
    azAmp: 8,
    azRate: 0.043,
    azPhase: 4.4,
    baseEl: 29,
    elAmp: 5,
    elRate: 0.056,
    elPhase: 2.2,
  },
];

export function getSatellite(id: SatId): SatelliteDef {
  return SATELLITES.find((s) => s.id === id) ?? SATELLITES[0];
}

export interface SkyPoint {
  /** Degrees clockwise from north (−180 … 180). */
  az: number;
  /** Degrees above the horizon. */
  el: number;
}

/** Keeps an azimuth in (−180, 180]. */
export function wrapAz(az: number): number {
  let value = az % 360;
  if (value > 180) value -= 360;
  if (value <= -180) value += 360;
  return value;
}

/** Where a satellite appears at simulated time `t` (seconds). */
export function satelliteAt(def: SatelliteDef, t: number): SkyPoint {
  const az = wrapAz(def.baseAz + def.azAmp * Math.sin(def.azRate * t + def.azPhase));
  const el = Math.min(
    78,
    Math.max(18, def.baseEl + def.elAmp * Math.sin(def.elRate * t + def.elPhase)),
  );
  return { az, el };
}

/** Unit direction for an azimuth/elevation pair. Y is up, +Z is north. */
export function directionFrom(azDeg: number, elDeg: number): [number, number, number] {
  const az = (azDeg * Math.PI) / 180;
  const el = (elDeg * Math.PI) / 180;
  const c = Math.cos(el);
  return [c * Math.sin(az), Math.sin(el), c * Math.cos(az)];
}

/** Inverse of {@link directionFrom}. */
export function anglesFromDirection(x: number, y: number, z: number): SkyPoint {
  const len = Math.hypot(x, y, z) || 1;
  const el = (Math.asin(Math.max(-1, Math.min(1, y / len))) * 180) / Math.PI;
  const az = (Math.atan2(x, z) * 180) / Math.PI;
  return { az: wrapAz(az), el };
}

/** Scene position of a satellite, relative to the dish's face. */
export function satellitePosition(def: SatelliteDef, t: number): [number, number, number] {
  const { az, el } = satelliteAt(def, t);
  const [x, y, z] = directionFrom(az, el);
  return [x * SKY_RADIUS, DISH_Y + y * SKY_RADIUS, z * SKY_RADIUS];
}

/** Great-circle angle between two sky directions, in degrees. */
export function angularSeparation(a: SkyPoint, b: SkyPoint): number {
  const [ax, ay, az] = directionFrom(a.az, a.el);
  const [bx, by, bz] = directionFrom(b.az, b.el);
  const dot = Math.max(-1, Math.min(1, ax * bx + ay * by + az * bz));
  return (Math.acos(dot) * 180) / Math.PI;
}

/** Angle between the panel normal (straight up) and the beam, in degrees. */
export function scanAngleFromElevation(elDeg: number): number {
  return Math.max(0, Math.min(89, 90 - elDeg));
}

const COMPASS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
];

export function compassPoint(azDeg: number): string {
  const index = Math.round(wrapAz(azDeg) / 22.5);
  return COMPASS[((index % 16) + 16) % 16];
}

/**
 * Half-power beamwidth of the model aperture in one cut, in degrees.
 * 0.886 λ / D for a uniform aperture, widened by 1/cosθ as the beam scans away
 * from the panel normal.
 */
export function beamwidthDeg(scanDeg: number): number {
  const lambdaM = WAVELENGTH_MM / 1000;
  const apertureM = APERTURE_MM / 1000;
  const baseRad = (0.886 * lambdaM) / apertureM;
  const scanRad = (Math.max(0, Math.min(85, scanDeg)) * Math.PI) / 180;
  return Math.min(60, (baseRad / Math.max(0.08, Math.cos(scanRad))) * (180 / Math.PI));
}

/** Progressive phase step between adjacent array rows, in degrees (0…360). */
export function phaseStepDeg(scanDeg: number): number {
  const scan = (scanDeg * Math.PI) / 180;
  const cycles = 0.5 * Math.sin(scan); // d/λ = 0.5, so d·sinθ/λ cycles
  const deg = (cycles - Math.floor(cycles)) * 360;
  return deg;
}

/** The 4-bit phase word for one array row at the current scan angle. */
export function phaseWord(row: number, scanDeg: number): string {
  const scan = (scanDeg * Math.PI) / 180;
  const cycles = (row * 0.5 * Math.sin(scan)) % 1;
  const normalised = (cycles + 1) % 1;
  const step = Math.round(normalised * PHASE_STEPS) % PHASE_STEPS;
  return step.toString(2).padStart(PHASE_BITS, "0");
}

/** All the row words, top row first. */
export function phaseWords(scanDeg: number): string[] {
  return Array.from({ length: ARRAY_ROWS }, (_, row) => phaseWord(row, scanDeg));
}

/** Time offset for one row's phase at 12 GHz, in picoseconds. */
export function rowDelayPs(row: number, scanDeg: number): number {
  const cycles = row * 0.5 * Math.sin((scanDeg * Math.PI) / 180);
  return (cycles / (FREQ_GHZ * 1e9)) * 1e12;
}

/** Delay between adjacent rows, in picoseconds. */
export function rowStepPs(scanDeg: number): number {
  return rowDelayPs(1, scanDeg);
}

/** One-way distance from the dish to a satellite, in the scene's scale. */
export function linkRange(): number {
  return SKY_RADIUS - DISH_Y;
}

export function formatSigned(value: number, digits = 1): string {
  const rounded = Math.abs(value) < 0.05 ? 0 : value;
  return `${rounded >= 0 ? "+" : "−"}${Math.abs(rounded).toFixed(digits)}`;
}
