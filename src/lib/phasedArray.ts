/**
 * A deliberately small, honest phased-array model for the beam-steering lab.
 *
 * Everything the 3D scene draws is derived from the functions in this file:
 * the per-element phases, the combined field, the array factor, the direction
 * of the main lobe and the sky positions of the satellites. Nothing is an
 * independently rotated decoration.
 *
 * Model assumptions (also repeated in the UI):
 *  - A uniform 16 x 16 rectangular lattice of ideal, isotropic radiators.
 *  - Half-wavelength spacing (d = λ/2) at a 12 GHz carrier.
 *  - Narrowband, lossless, no mutual coupling, no edge effects, no amplitude
 *    taper, no polarisation, no ground-plane reflections.
 *  - The far field is approximated by the separable array factor; the near
 *    field is shown schematically, not solved with Maxwell's equations.
 *  - Elevation is measured from the horizon. The panel normal is the zenith,
 *    so the scan angle from boresight is θ = 90° − elevation; the standard
 *    Δφ = 2π (d/λ) sin θ formula applies to that θ, not to elevation.
 *  - Production terminals use different element counts, spacing, tapering and
 *    beamforming hardware. This is a teaching model, not Starlink firmware.
 */

export const SPEED_OF_LIGHT_M_S = 299_792_458;
/** Ku-band downlink, near the middle of the 10.7–12.7 GHz receive band. */
export const CARRIER_FREQ_HZ = 12e9;
export const CARRIER_PERIOD_PS = 1e12 / CARRIER_FREQ_HZ;
export const WAVELENGTH_M = SPEED_OF_LIGHT_M_S / CARRIER_FREQ_HZ;
/** Half-wavelength element spacing, the usual choice for a scan-capable array. */
export const ELEMENT_SPACING_M = WAVELENGTH_M / 2;
/** Elements per side of the square lattice. */
export const ARRAY_N = 16;
export const ELEMENT_COUNT = ARRAY_N * ARRAY_N;
export const APERTURE_M = ARRAY_N * ELEMENT_SPACING_M;
/** Ideal uniform-aperture directivity, 4πA/λ², for the whole square aperture. */
export const IDEAL_DIRECTIVITY_DBI = 10 * Math.log10((4 * Math.PI * APERTURE_M ** 2) / WAVELENGTH_M ** 2);
/** Uniform illumination puts the first side lobe about 13.2 dB below the peak. */
export const UNIFORM_SIDELOBE_DB = -13.26;

/** Steering limits, degrees. Kept away from the exact zenith and horizon. */
export const AZ_MIN_DEG = -75;
export const AZ_MAX_DEG = 75;
export const EL_MIN_DEG = 15;
export const EL_MAX_DEG = 85;
export const DEFAULT_AZ_DEG = 0;
export const DEFAULT_EL_DEG = 55;

/**
 * Half-width of the main lobe at the half-power point, in direction-cosine
 * space (u = cos θ measured from the panel normal). 1.39156 is the first
 * solution of sinc(x) = 1/√2.
 */
export const HPBW_U_HALF = 1.39156 / (ARRAY_N * Math.PI);

export interface Steering {
  azDeg: number;
  elDeg: number;
  /** Unit direction in local scene axes: +x east, +y up, +z north. */
  ux: number;
  uy: number;
  uz: number;
}

export interface SkyDirection {
  azDeg: number;
  elDeg: number;
  ux: number;
  uy: number;
  uz: number;
}

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

export function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function wrap180(deg: number) {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}

export function wrapPi(rad: number) {
  return ((((rad + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
}

/** Unit vector for an apparent sky direction. Azimuth is clockwise from north. */
export function directionFromAngles(azDeg: number, elDeg: number): SkyDirection {
  const az = azDeg * DEG;
  const el = elDeg * DEG;
  const c = Math.cos(el);
  return {
    azDeg,
    elDeg,
    ux: c * Math.sin(az),
    uy: Math.sin(el),
    uz: c * Math.cos(az),
  };
}

export function steeringFromAngles(azDeg: number, elDeg: number): Steering {
  const d = directionFromAngles(azDeg, elDeg);
  return { azDeg, elDeg, ux: d.ux, uy: d.uy, uz: d.uz };
}

export function clampSteering(azDeg: number, elDeg: number): Steering {
  return steeringFromAngles(
    clamp(azDeg, AZ_MIN_DEG, AZ_MAX_DEG),
    clamp(elDeg, EL_MIN_DEG, EL_MAX_DEG),
  );
}

/** Angle between two unit directions, degrees. */
export function angleBetweenDeg(a: SkyDirection, b: SkyDirection) {
  const dot = clamp(a.ux * b.ux + a.uy * b.uy + a.uz * b.uz, -1, 1);
  return Math.acos(dot) * RAD;
}

/* -------------------------------------------------------------------------- */
/* Element phase                                                              */
/* -------------------------------------------------------------------------- */

/** Signed position of a lattice index in units of the element spacing. */
export function latticeOffset(index: number) {
  return index - (ARRAY_N - 1) / 2;
}

/**
 * Phase that the beamformer applies to one element, radians in (−π, π].
 *
 * For a main lobe toward unit vector u, the geometric path delay across the
 * aperture is (r · u). Applying the conjugate phase to every element makes all
 * element contributions arrive in step in that direction:
 *
 *   φ(i, j) = −k (x_i u_x + z_j u_z),  k = 2π/λ,  d = λ/2
 *           = −π (x_i u_x + z_j u_z)
 *
 * where x_i and z_j are measured in element spacings. Columns run east and
 * rows run north in the close-up grid.
 */
export function elementPhaseRad(i: number, j: number, steer: Steering) {
  const x = latticeOffset(i);
  const z = (ARRAY_N - 1) / 2 - j;
  return wrapPi(-Math.PI * (x * steer.ux + z * steer.uz));
}

/** Same phase in degrees, in [−180, 180). */
export function elementPhaseDeg(i: number, j: number, steer: Steering) {
  return wrap180(elementPhaseRad(i, j, steer) * RAD);
}

/** Progressive phase shift between adjacent columns, degrees (unwrapped). */
export function phaseStepXDeg(steer: Steering) {
  return -180 * steer.ux;
}

/** Progressive phase shift between adjacent rows, degrees (unwrapped). */
export function phaseStepZDeg(steer: Steering) {
  return -180 * steer.uz;
}

/**
 * Extra drive delay that produces a given commanded phase, picoseconds.
 *
 * A phasor written e^{j(ωt + φ)} reaches a given state later when φ is
 * negative, so a phase lag of |φ| is a delay of |φ|/360 of a carrier period.
 * Delaying the elements on the far side of the panel is exactly what tilts the
 * wavefront toward the steered direction: at azimuth 0° / elevation 55° the
 * northward phase step is −103.2°, i.e. each row north fires 23.9 ps later.
 */
export function phaseToDelayPs(phaseDeg: number) {
  return (-phaseDeg / 360) * CARRIER_PERIOD_PS;
}

/* -------------------------------------------------------------------------- */
/* Array factor                                                               */
/* -------------------------------------------------------------------------- */

/** sin(n ψ / 2) / sin(ψ / 2), evaluated safely at ψ = 0. */
function dirichlet(n: number, psi: number) {
  const s = Math.sin(psi / 2);
  if (Math.abs(s) < 1e-9) return n;
  return Math.sin((n * psi) / 2) / s;
}

/**
 * Normalised array factor |AF| ∈ [0, 1] for a direction and steering vector.
 *
 * The 2-D lattice factorises into two Dirichlet kernels:
 *
 *   AF(θ, φ) = | sin(N ψx/2)/(N sin(ψx/2)) · sin(N ψz/2)/(N sin(ψz/2)) |
 *   ψx = π (u_x − u_x^steer),  ψz = π (u_z − u_z^steer)
 *
 * It peaks at 1 exactly along the steering direction.
 */
export function arrayFactor(azDeg: number, elDeg: number, steer: Steering) {
  const ux = Math.cos(elDeg * DEG) * Math.sin(azDeg * DEG);
  const uz = Math.cos(elDeg * DEG) * Math.cos(azDeg * DEG);
  const ax = Math.abs(dirichlet(ARRAY_N, Math.PI * (ux - steer.ux))) / ARRAY_N;
  const az = Math.abs(dirichlet(ARRAY_N, Math.PI * (uz - steer.uz))) / ARRAY_N;
  return ax * az;
}

export function arrayFactorDb(azDeg: number, elDeg: number, steer: Steering) {
  return 20 * Math.log10(Math.max(arrayFactor(azDeg, elDeg, steer), 1e-6));
}

export interface CutMetrics {
  /** Visible half-power width in the elevation cut. */
  hpbwDeg: number;
  /** Elevations and depths of the first nulls either side of the main lobe. */
  nullLowerEl: number | null;
  nullUpperEl: number | null;
  nullLowerDb: number;
  nullUpperDb: number;
  /** First side lobes beyond those nulls. */
  sideLowerDb: number | null;
  sideUpperDb: number | null;
  sideLowerEl: number | null;
  sideUpperEl: number | null;
}

/**
 * Measure the elevation cut through the actual 2-D array factor.
 *
 * The panel's normal is the zenith, so the scan angle from boresight is
 * θ = 90° − elevation and the direction cosines are u = cos(θ)·(sin φ, cos φ).
 * A single 1-D "sin θ" formula is only exact for a broadside line array, so the
 * live beamwidth, null and side-lobe numbers are measured from the same array
 * factor the scene draws. Sampling step is 0.1°.
 */
export function arrayCutMetrics(steer: Steering, stepDeg = 0.1): CutMetrics {
  const n = Math.round(90 / stepDeg) + 1;
  const af = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    af[i] = arrayFactor(steer.azDeg, i * stepDeg, steer);
  }
  const peak = clamp(Math.round(steer.elDeg / stepDeg), 1, n - 2);

  // Half-power crossings, linearly interpolated between samples.
  const half = Math.SQRT1_2;
  let leftEl: number | null = null;
  let rightEl: number | null = null;
  for (let i = peak; i > 0; i--) {
    if (af[i] >= half && af[i - 1] < half) {
      const t = (af[i] - half) / Math.max(1e-9, af[i] - af[i - 1]);
      leftEl = (i - t) * stepDeg;
      break;
    }
  }
  for (let i = peak; i < n - 1; i++) {
    if (af[i] >= half && af[i + 1] < half) {
      const t = (af[i] - half) / Math.max(1e-9, af[i] - af[i + 1]);
      rightEl = (i + t) * stepDeg;
      break;
    }
  }

  const findNull = (dir: -1 | 1) => {
    let i = peak;
    let increasing = false;
    for (let k = 0; k < 600; k++) {
      const next = i + dir;
      if (next <= 0 || next >= n - 1) return null;
      if (af[next] > af[i]) increasing = true;
      if (increasing && af[next] > af[i] && af[i] <= af[i - dir]) {
        return i;
      }
      i = next;
    }
    return null;
  };

  const sideFrom = (nullIdx: number | null, dir: -1 | 1) => {
    if (nullIdx === null) return { db: null as number | null, el: null as number | null };
    let i = nullIdx;
    let rising = false;
    for (let k = 0; k < 400; k++) {
      const next = i + dir;
      if (next <= 0 || next >= n - 1) return { db: null, el: null };
      if (af[next] > af[i]) rising = true;
      if (rising && af[next] < af[i]) {
        return {
          db: 20 * Math.log10(Math.max(af[i], 1e-6)),
          el: i * stepDeg,
        };
      }
      i = next;
    }
    return { db: null, el: null };
  };

  const leftNull = findNull(-1);
  const rightNull = findNull(1);
  const leftSide = sideFrom(leftNull, -1);
  const rightSide = sideFrom(rightNull, 1);
  const leftDb = leftNull === null ? 0 : 20 * Math.log10(Math.max(af[leftNull], 1e-6));
  const rightDb = rightNull === null ? 0 : 20 * Math.log10(Math.max(af[rightNull], 1e-6));

  return {
    hpbwDeg:
      leftEl !== null && rightEl !== null
        ? rightEl - leftEl
        : leftEl !== null
          ? steer.elDeg - leftEl
          : rightEl !== null
            ? rightEl - steer.elDeg
            : 0,
    nullLowerEl: leftNull === null ? null : leftNull * stepDeg,
    nullUpperEl: rightNull === null ? null : rightNull * stepDeg,
    nullLowerDb: leftDb,
    nullUpperDb: rightDb,
    sideLowerDb: leftSide.db,
    sideLowerEl: leftSide.el,
    sideUpperDb: rightSide.db,
    sideUpperEl: rightSide.el,
  };
}

/** Gain profile along the elevation cut at the current beam azimuth, dB. */
export function elevationCut(steer: Steering, samples = 121) {
  const out: { elDeg: number; db: number }[] = [];
  for (let n = 0; n < samples; n++) {
    const elDeg = (n / (samples - 1)) * 90;
    out.push({ elDeg, db: Math.max(-40, arrayFactorDb(steer.azDeg, elDeg, steer)) });
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Colour language                                                            */
/* -------------------------------------------------------------------------- */

/**
 * A cyclic phase colour. ±180° map to the same hue, which matters because a
 * phase of −180° and +180° describe exactly the same wave. 0° is the site's
 * cyan "in step" colour.
 */
export function phaseHue(phaseDeg: number) {
  return (((phaseDeg + 180) % 360) + 360) % 360;
}

export function phaseColorCss(phaseDeg: number, lightness = 60) {
  return `hsl(${phaseHue(phaseDeg).toFixed(1)} 76% ${lightness}%)`;
}

/** CSS gradient stops matching `phaseColorCss`, for the legend bar. */
export const PHASE_LEGEND_STOPS = Array.from({ length: 25 }, (_, i) => {
  const phase = -180 + (360 * i) / 24;
  return `${phaseColorCss(phase, 58)} ${(i / 24) * 100}%`;
}).join(", ");

/* -------------------------------------------------------------------------- */
/* Apparent satellite tracks                                                  */
/* -------------------------------------------------------------------------- */

export type SatId = "A" | "B" | "C";

/** The three teaching views in the beam lab. */
export type BeamView = "wave" | "beam" | "pattern";

/**
 * Three teaching satellites on closed apparent tracks high in the sky.
 *
 * A real LEO satellite follows a great-circle ground track and rises and sets;
 * this lab instead gives each one a small circle of angular radius ρ around a
 * fixed "pole" in the observer's sky. That keeps all three visible and
 * steerable for the whole lesson, while still moving smoothly and independently
 * of the beam. The tracks are illustrative apparent paths, not ephemerides.
 */
export interface SatelliteDef {
  id: SatId;
  name: string;
  color: string;
  poleAzDeg: number;
  poleElDeg: number;
  radiusDeg: number;
  periodSec: number;
  phaseDeg: number;
  altitudeKm: number;
}

export const SATELLITES: SatelliteDef[] = [
  {
    id: "A",
    name: "SAT-A",
    color: "#3ddbd9",
    poleAzDeg: 0,
    poleElDeg: 50,
    radiusDeg: 28,
    periodSec: 122,
    phaseDeg: 68,
    altitudeKm: 550,
  },
  {
    id: "B",
    name: "SAT-B",
    color: "#60a5fa",
    poleAzDeg: 16,
    poleElDeg: 49,
    radiusDeg: 25,
    periodSec: 149,
    phaseDeg: 208,
    altitudeKm: 540,
  },
  {
    id: "C",
    name: "SAT-C",
    color: "#a78bfa",
    poleAzDeg: -19,
    poleElDeg: 55,
    radiusDeg: 23,
    periodSec: 173,
    phaseDeg: 322,
    altitudeKm: 560,
  },
];

export const SKY_RADIUS = 11;

interface TrackBasis {
  pole: SkyDirection;
  e1x: number;
  e1y: number;
  e1z: number;
  e2x: number;
  e2y: number;
  e2z: number;
}

function trackBasis(def: SatelliteDef): TrackBasis {
  const pole = directionFromAngles(def.poleAzDeg, def.poleElDeg);
  // e1 is horizontal and perpendicular to the pole; e2 completes the frame.
  const e1 = { x: pole.uz, y: 0, z: -pole.ux };
  const l = Math.hypot(e1.x, e1.z) || 1;
  e1.x /= l;
  e1.z /= l;
  const e2 = {
    x: pole.uy * e1.z - pole.uz * e1.y,
    y: pole.uz * e1.x - pole.ux * e1.z,
    z: pole.ux * e1.y - pole.uy * e1.x,
  };
  return {
    pole,
    e1x: e1.x,
    e1y: e1.y,
    e1z: e1.z,
    e2x: e2.x,
    e2y: e2.y,
    e2z: e2.z,
  };
}

const TRACK_BASES = new Map<SatId, TrackBasis>(SATELLITES.map((s) => [s.id, trackBasis(s)]));

export interface SatelliteSnapshot extends SkyDirection {
  id: SatId;
  name: string;
  color: string;
  /** Direction angle along the apparent track, radians. */
  trackAngle: number;
  altitudeKm: number;
  rangeKm: number;
  lightTimeMs: number;
  x: number;
  y: number;
  z: number;
}

/** Slant range to a satellite at 550 km seen at this elevation. */
export function slantRangeKm(elDeg: number, altitudeKm = 550) {
  const re = 6371;
  const rs = re + altitudeKm;
  const e = clamp(elDeg, 0, 90) * DEG;
  return Math.sqrt(rs * rs - (re * Math.cos(e)) ** 2) - re * Math.sin(e);
}

/** Apparent position of a satellite track at a given sky-clock time. */
export function satelliteAt(def: SatelliteDef, skyTimeSec: number): SatelliteSnapshot {
  const b = TRACK_BASES.get(def.id)!;
  const angle = def.phaseDeg * DEG + (2 * Math.PI * skyTimeSec) / def.periodSec;
  const rho = def.radiusDeg * DEG;
  const cr = Math.cos(rho);
  const sr = Math.sin(rho);
  const cs = Math.cos(angle);
  const ss = Math.sin(angle);
  const ux = cr * b.pole.ux + sr * (cs * b.e1x + ss * b.e2x);
  const uy = cr * b.pole.uy + sr * (cs * b.e1y + ss * b.e2y);
  const uz = cr * b.pole.uz + sr * (cs * b.e1z + ss * b.e2z);
  const elDeg = Math.asin(clamp(uy, -1, 1)) * RAD;
  const azDeg = Math.atan2(ux, uz) * RAD;
  const rangeKm = slantRangeKm(elDeg, def.altitudeKm);
  return {
    id: def.id,
    name: def.name,
    color: def.color,
    azDeg,
    elDeg,
    ux,
    uy,
    uz,
    trackAngle: angle,
    altitudeKm: def.altitudeKm,
    rangeKm,
    lightTimeMs: (rangeKm / 299.792458) * 1000,
    x: ux * SKY_RADIUS,
    y: uy * SKY_RADIUS,
    z: uz * SKY_RADIUS,
  };
}

export function satelliteById(id: SatId) {
  return SATELLITES.find((s) => s.id === id) ?? SATELLITES[0];
}

/** Sample the closed apparent track, for the faint orbit rings in the scene. */
export function satelliteTrackPoints(def: SatelliteDef, segments = 160) {
  const pts: [number, number, number][] = [];
  for (let n = 0; n <= segments; n++) {
    const p = satelliteAt(def, (n / segments) * def.periodSec);
    pts.push([p.x, p.y, p.z]);
  }
  return pts;
}

/** Compass label for an azimuth in degrees. */
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
] as const;

export function compassPoint(azDeg: number) {
  return COMPASS[Math.round((((azDeg % 360) + 360) % 360) / 22.5) % 16];
}

/** Steering needed to point at a satellite, clipped to the slider range. */
export function aimAtSatellite(sat: SatelliteSnapshot) {
  return clampSteering(sat.azDeg, sat.elDeg);
}
