/**
 * A full LEO shell over one dish — the "many satellites" handover lab.
 *
 * The scripted A/B/C lesson next door (handover.ts) shows the *idea* of a
 * handover with three satellites on invented passes. This module does the
 * opposite: it propagates a whole Walker-Delta shell of Starlink-class
 * satellites with real circular-orbit geometry and Earth rotation, so the dish
 * is genuinely looking at dozens of spacecraft crossing the sky at once, each
 * on its own ~95-minute orbit, and has to choose one.
 *
 * Real Shell 1 is 72 planes × 22 satellites at 550 km / 53°. All 1,584 are
 * propagated here — the same shape the FCC filing describes — because the point
 * of the exercise is the *density* of the sky. Nothing is animated by hand:
 * every position is a closed-form evaluation at time t, and the same t always
 * produces the same sky.
 *
 * The handover policy is a readable teaching policy, not SpaceX's scheduler:
 *
 *   1. Stay on the serving satellite while it is healthy.
 *   2. When it sinks below the 40° switch floor (or gets low with a much better
 *      satellite available), pick the best-scoring visible candidate.
 *   3. Make before break: prepare the new link, cross-fade the beam, then
 *      release the old satellite.
 *
 * The score is elevation plus a small deterministic per-satellite offset. That
 * offset stands in for the things a real scheduler weighs — cell load,
 * capacity, gateway routing, obstructions — none of which are public.
 */

import { EARTH_RADIUS_KM, ELEVATION_MASK_DEG, OBSERVER, lightTimeMs } from "./handover";

/* -------------------------------------------------------------------------- */
/* Constellation parameters                                                   */
/* -------------------------------------------------------------------------- */

/** Standard gravitational parameter, km^3/s^2. */
const MU_KM3_S2 = 398600.4418;
/** Sidereal rotation rate of Earth, rad/s. */
const OMEGA_EARTH = (2 * Math.PI) / 86164.0905;

/** Altitude of the modelled shell, km. */
export const SKY_ALTITUDE_KM = 550;
/** Inclination of the modelled shell, degrees. */
export const SKY_INCLINATION_DEG = 53;
/** Orbital planes. */
export const SKY_PLANES = 72;
/** Satellites per plane. */
export const SKY_PER_PLANE = 22;
/** Satellites in the model. */
export const SKY_TOTAL = SKY_PLANES * SKY_PER_PLANE;

const DEG = Math.PI / 180;
const A_KM = EARTH_RADIUS_KM + SKY_ALTITUDE_KM;
const MEAN_MOTION = Math.sqrt(MU_KM3_S2 / A_KM ** 3);

/** The dish will not hold a link below this elevation. */
export const SKY_SWITCH_FLOOR_DEG = 40;
/** A candidate at or above this elevation is considered a clean swap. */
export const SKY_READY_DEG = 45;
/** Ignore a satellite this soon after acquiring it (prevents link flapping). */
export const SKY_MIN_DWELL_SEC = 8;
/** Half-width of the drawn make-before-break transfer, simulated seconds. */
export const SKY_TRANSFER_HALF_SEC = 4;
/** How long before a switch the terminal is shown preparing the new link. */
export const SKY_PREPARE_SEC = 26;
/** How long "handover completed" stays on the panel. */
export const SKY_COMPLETE_SEC = 10;
/** How long the released link stays drawn, seconds. */
export const SKY_RELEASE_FADE_SEC = 8;
/** Length of one replayable sky window, simulated seconds (15 minutes). */
export const SKY_WINDOW_SEC = 900;

/** Epoch angle of the Earth at t = 0, radians. Chosen only for a pleasant sky. */
const GMST0 = 0.62;

/* -------------------------------------------------------------------------- */
/* The satellites (constants only — positions are computed per instant)       */
/* -------------------------------------------------------------------------- */

const cosRaan = new Float64Array(SKY_TOTAL);
const sinRaan = new Float64Array(SKY_TOTAL);
const cosU0 = new Float64Array(SKY_TOTAL);
const sinU0 = new Float64Array(SKY_TOTAL);
/** Deterministic per-satellite score offset, degrees. Stands in for load. */
const loadBias = new Float32Array(SKY_TOTAL);

const cosInc = Math.cos(SKY_INCLINATION_DEG * DEG);
const sinInc = Math.sin(SKY_INCLINATION_DEG * DEG);

(function buildConstellation() {
  let seed = 1234567;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let p = 0; p < SKY_PLANES; p++) {
    for (let s = 0; s < SKY_PER_PLANE; s++) {
      const i = p * SKY_PER_PLANE + s;
      // Walker-Delta: planes evenly spread in RAAN, slots evenly spread in
      // phase, plus a small inter-plane phasing offset (F = 1).
      const raan = (p * 2 * Math.PI) / SKY_PLANES;
      const phase = (s * 2 * Math.PI) / SKY_PER_PLANE + (p * 2 * Math.PI) / SKY_TOTAL;
      cosRaan[i] = Math.cos(raan);
      sinRaan[i] = Math.sin(raan);
      cosU0[i] = Math.cos(phase);
      sinU0[i] = Math.sin(phase);
      loadBias[i] = (rnd() * 2 - 1) * 3.2;
    }
  }
})();

export function satName(id: number) {
  return `STARLINK-${1000 + id}`;
}

export function satPlane(id: number) {
  return Math.floor(id / SKY_PER_PLANE);
}

export function satSlot(id: number) {
  return id % SKY_PER_PLANE;
}

/* -------------------------------------------------------------------------- */
/* Geometry at one instant                                                    */
/* -------------------------------------------------------------------------- */

/** Scratch buffers, reused every sample so the frame loop allocates nothing. */
const px = new Float32Array(SKY_TOTAL);
const py = new Float32Array(SKY_TOTAL);
const pz = new Float32Array(SKY_TOTAL);
/** Unit velocity direction in the same local frame (x east, y up, z south). */
const vx = new Float32Array(SKY_TOTAL);
const vy = new Float32Array(SKY_TOTAL);
const vz = new Float32Array(SKY_TOTAL);
const elArr = new Float32Array(SKY_TOTAL);
const azArr = new Float32Array(SKY_TOTAL);
const rangeArr = new Float32Array(SKY_TOTAL);
const sinElArr = new Float32Array(SKY_TOTAL);
/** Elevations a couple of seconds ahead, for the rising/falling flag. */
const elAhead = new Float32Array(SKY_TOTAL);
/** Satellites above the geometric horizon at the sampled instant. */
const aboveHorizon: number[] = [];

const OBS = (() => {
  const lat = OBSERVER.lat * DEG;
  const lon = OBSERVER.lon * DEG;
  const cosLat = Math.cos(lat);
  const sinLat = Math.sin(lat);
  const cosLon = Math.cos(lon);
  const sinLon = Math.sin(lon);
  return {
    ecefX: EARTH_RADIUS_KM * cosLat * cosLon,
    ecefY: EARTH_RADIUS_KM * cosLat * sinLon,
    ecefZ: EARTH_RADIUS_KM * sinLat,
    // Local east / north / up unit vectors in the earth-fixed frame (z = north).
    ex: -sinLon,
    ey: cosLon,
    ez: 0,
    nx: -sinLat * cosLon,
    ny: -sinLat * sinLon,
    nz: cosLat,
    ux: cosLat * cosLon,
    uy: cosLat * sinLon,
    uz: sinLat,
  };
})();

/**
 * Fill the shared buffers with every satellite's geometry at simulated time t.
 *
 * Only two trig calls per instant are needed for the whole constellation: the
 * mean motion and the Earth rotation are shared, so per-satellite sines and
 * cosines are precomputed and combined with angle-addition identities. Angles
 * (asin / atan2) are then evaluated only for the ~60 satellites above the
 * horizon, which is what makes 1,584 satellites viable every frame.
 */
function computeGeometry(tSec: number) {
  const rot = GMST0 + OMEGA_EARTH * tSec;
  const ct = Math.cos(rot);
  const st = Math.sin(rot);
  const nt = MEAN_MOTION * tSec;
  const cn = Math.cos(nt);
  const sn = Math.sin(nt);
  const { ecefX, ecefY, ecefZ, ex, ey, nx, ny, nz, ux, uy, uz } = OBS;

  aboveHorizon.length = 0;

  for (let i = 0; i < SKY_TOTAL; i++) {
    const cu = cosU0[i] * cn - sinU0[i] * sn;
    const su = sinU0[i] * cn + cosU0[i] * sn;
    const cO = cosRaan[i];
    const sO = sinRaan[i];

    // ECI, z = north pole.
    const x = A_KM * (cO * cu - sO * su * cosInc);
    const y = A_KM * (sO * cu + cO * su * cosInc);
    const z = A_KM * (su * sinInc);

    // ECI velocity (d/dt of the above; du/dt = MEAN_MOTION). Used to point each
    // modelled satellite along its track, the way a real spacecraft flies.
    const ivx = -A_KM * MEAN_MOTION * (cO * su + sO * cu * cosInc);
    const ivy = -A_KM * MEAN_MOTION * (sO * su - cO * cu * cosInc);
    const ivz = A_KM * MEAN_MOTION * (cu * sinInc);

    // Rotate the earth under the orbit: ECI -> earth-fixed, then to the dish.
    const dx = x * ct + y * st - ecefX;
    const dy = -x * st + y * ct - ecefY;
    const dz = z - ecefZ;

    // Same rotation for the velocity direction (observer offset is constant).
    const dvx = ivx * ct + ivy * st;
    const dvy = -ivx * st + ivy * ct;
    const dvz = ivz;

    const e = dx * ex + dy * ey; // dz * ez, and ez is 0
    const n = dx * nx + dy * ny + dz * nz;
    const u = dx * ux + dy * uy + dz * uz;
    const range = Math.sqrt(dx * dx + dy * dy + dz * dz);

    px[i] = e / EARTH_RADIUS_KM;
    py[i] = u / EARTH_RADIUS_KM;
    pz[i] = -n / EARTH_RADIUS_KM;
    rangeArr[i] = range;
    sinElArr[i] = u / range;

    // Velocity in the local scene frame (x east, y up, z south), normalized.
    const ve = dvx * ex + dvy * ey;
    const vn = dvx * nx + dvy * ny + dvz * nz;
    const vu = dvx * ux + dvy * uy + dvz * uz;
    const vscale = 1 / (Math.hypot(ve, vn, vu) || 1);
    vx[i] = ve * vscale;
    vy[i] = vu * vscale;
    vz[i] = -vn * vscale;

    if (u > 0) {
      aboveHorizon.push(i);
      elArr[i] = Math.asin(u / range) / DEG;
      azArr[i] = ((Math.atan2(e, n) / DEG) + 360) % 360;
    } else {
      elArr[i] = -90;
    }
  }
}

/** Elevation of a single satellite at t, degrees. Cheap: one satellite's math. */
export function elevationOf(id: number, tSec: number): number {
  const rot = GMST0 + OMEGA_EARTH * tSec;
  const ct = Math.cos(rot);
  const st = Math.sin(rot);
  const nt = MEAN_MOTION * tSec;
  const cn = Math.cos(nt);
  const sn = Math.sin(nt);
  const cu = cosU0[id] * cn - sinU0[id] * sn;
  const su = sinU0[id] * cn + cosU0[id] * sn;
  const cO = cosRaan[id];
  const sO = sinRaan[id];
  const x = A_KM * (cO * cu - sO * su * cosInc);
  const y = A_KM * (sO * cu + cO * su * cosInc);
  const z = A_KM * (su * sinInc);
  const dx = x * ct + y * st - OBS.ecefX;
  const dy = -x * st + y * ct - OBS.ecefY;
  const dz = z - OBS.ecefZ;
  const u = dx * OBS.ux + dy * OBS.uy + dz * OBS.uz;
  const range = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return Math.asin(Math.max(-1, Math.min(1, u / range))) / DEG;
}

/**
 * Elevations `dt` seconds ahead, computed only for the satellites currently in
 * view — that is all the rising/falling flag ever needs.
 */
function snapshotAhead(tSec: number, dt: number) {
  const rot = GMST0 + OMEGA_EARTH * (tSec + dt);
  const ct = Math.cos(rot);
  const st = Math.sin(rot);
  const nt = MEAN_MOTION * (tSec + dt);
  const cn = Math.cos(nt);
  const sn = Math.sin(nt);
  const { ecefX, ecefY, ecefZ, ux, uy, uz } = OBS;
  for (let k = 0; k < aboveHorizon.length; k++) {
    const i = aboveHorizon[k];
    const cu = cosU0[i] * cn - sinU0[i] * sn;
    const su = sinU0[i] * cn + cosU0[i] * sn;
    const x = A_KM * (cosRaan[i] * cu - sinRaan[i] * su * cosInc);
    const y = A_KM * (sinRaan[i] * cu + cosRaan[i] * su * cosInc);
    const z = A_KM * (su * sinInc);
    const dx = x * ct + y * st - ecefX;
    const dy = -x * st + y * ct - ecefY;
    const dz = z - ecefZ;
    const u = dx * ux + dy * uy + dz * uz;
    elAhead[i] = Math.asin(Math.max(-1, Math.min(1, u / Math.hypot(dx, dy, dz)))) / DEG;
  }
}

/* -------------------------------------------------------------------------- */
/* Handover schedule                                                          */
/* -------------------------------------------------------------------------- */

export type HandoverReason = "floor" | "low" | "rescue" | "better" | "acquire";

export interface SkyEvent {
  id: number;
  from: number;
  to: number;
  /** Simulated second of the switch, within the replay window. */
  tSec: number;
  fromElDeg: number;
  toElDeg: number;
  fromAzDeg: number;
  toAzDeg: number;
  rangeKm: number;
  lightMs: number;
  reason: HandoverReason;
  /** How long the released satellite had held the link, seconds. */
  heldSec: number;
  /** When the released satellite drops below the mask (display only). */
  dropsOutSec: number | null;
}

const SCHEDULE_STEP = 1;
/** Warm-up before the replay window, so t = 0 opens in a stable state. */
const WARMUP_SEC = 150;

/** Score used to rank candidates: elevation plus a stand-in load term. */
function score(i: number) {
  return elArr[i] + loadBias[i];
}

/**
 * Best satellite that is still climbing — what a terminal would actually target
 * while it is just keeping an eye on the alternatives.
 */
function bestRising(exclude: number) {
  let best = -1;
  let bestScore = -Infinity;
  for (let k = 0; k < aboveHorizon.length; k++) {
    const i = aboveHorizon[k];
    if (i === exclude) continue;
    if (elArr[i] < ELEVATION_MASK_DEG) continue;
    if (elAhead[i] <= elArr[i]) continue;
    const s = score(i);
    if (s > bestScore) {
      bestScore = s;
      best = i;
    }
  }
  return best;
}

function bestVisible(exclude: number) {
  let best = -1;
  let bestScore = -Infinity;
  for (let k = 0; k < aboveHorizon.length; k++) {
    const i = aboveHorizon[k];
    if (i === exclude) continue;
    if (elArr[i] < ELEVATION_MASK_DEG) continue;
    const s = score(i);
    if (s > bestScore) {
      bestScore = s;
      best = i;
    }
  }
  return best;
}

interface Schedule {
  events: SkyEvent[];
  initial: number;
}

let schedule: Schedule | null = null;

/**
 * Build (once, lazily) the handover timeline for the 15-minute window by
 * replaying the policy a second at a time. Lazy so that the rest of the site
 * never pays for it, and deterministic so the same second is always the same
 * handover.
 */
function getSchedule(): Schedule {
  if (schedule) return schedule;
  const events: SkyEvent[] = [];
  let serving = -1;
  let servingSince = -WARMUP_SEC;
  let initial = -1;

  for (let t = -WARMUP_SEC; t <= SKY_WINDOW_SEC; t += SCHEDULE_STEP) {
    computeGeometry(t);

    if (serving < 0) {
      serving = bestVisible(-1);
      servingSince = t;
      if (initial < 0) initial = serving;
      continue;
    }
    if (t === 0) initial = serving;

    const sEl = elArr[serving];
    const cand = bestVisible(serving);
    if (cand < 0) continue;
    const cEl = elArr[cand];

    let reason: HandoverReason | null = null;
    if (sEl < SKY_SWITCH_FLOOR_DEG && cEl >= SKY_READY_DEG) reason = "floor";
    else if (sEl < 32 && cEl >= 40) reason = "low";
    else if (sEl < 27 && cEl > sEl + 1.5) reason = "rescue";
    else if (sEl < 55 && cEl - sEl > 20) reason = "better";

    if (reason && t - servingSince >= SKY_MIN_DWELL_SEC) {
      events.push({
        id: events.length,
        from: serving,
        to: cand,
        tSec: t,
        fromElDeg: sEl,
        toElDeg: cEl,
        fromAzDeg: azArr[serving],
        toAzDeg: azArr[cand],
        rangeKm: rangeArr[cand],
        lightMs: lightTimeMs(rangeArr[cand]),
        reason,
        heldSec: t - servingSince,
        dropsOutSec: null,
      });
      serving = cand;
      servingSince = t;
    }
  }

  if (initial < 0) initial = events[0]?.from ?? 0;

  // When each released satellite drops below the mask — display detail only.
  for (const ev of events) {
    for (let dt = 2; dt <= 300; dt += 2) {
      if (elevationOf(ev.from, ev.tSec + dt) < ELEVATION_MASK_DEG) {
        ev.dropsOutSec = ev.tSec + dt;
        break;
      }
    }
  }

  schedule = { events, initial };
  return schedule;
}

/** The handover timeline of the replay window. */
export function skyEvents(): SkyEvent[] {
  return getSchedule().events;
}

/** Event index whose switch is the most recent at t (or -1). */
function lastEventIndex(tSec: number) {
  const events = getSchedule().events;
  let idx = -1;
  for (let i = 0; i < events.length; i++) {
    if (events[i].tSec <= tSec) idx = i;
    else break;
  }
  return idx;
}

export function servingIdAt(tSec: number): number {
  const events = getSchedule().events;
  const idx = lastEventIndex(tSec);
  return idx < 0 ? getSchedule().initial : events[idx].to;
}

export function nextEventAt(tSec: number): SkyEvent | null {
  for (const e of getSchedule().events) if (e.tSec > tSec) return e;
  return null;
}

/** The nearest handover in the given direction — used by the step buttons. */
export function nearestEvent(tSec: number, direction: -1 | 1): SkyEvent | null {
  if (direction < 0) {
    const idx = lastEventIndex(tSec - 0.5);
    return idx < 0 ? null : getSchedule().events[idx];
  }
  return nextEventAt(tSec + 0.5);
}

/* -------------------------------------------------------------------------- */
/* Live state                                                                 */
/* -------------------------------------------------------------------------- */

export type SkyRole = "serving" | "candidate" | "released" | "visible" | "masked";

export interface SkySat {
  id: number;
  name: string;
  plane: number;
  slot: number;
  elDeg: number;
  azDeg: number;
  rangeKm: number;
  /** Above the terminal's elevation mask. */
  visible: boolean;
  /** Position in the local ENU sky frame, Earth radii (x east, y up, z south). */
  position: [number, number, number];
  rising: boolean;
  role: SkyRole;
  /** 0..1 link quality from the elevation margin. */
  quality: number;
}

export interface SkyLink {
  id: number;
  kind: "serving" | "candidate" | "released";
  opacity: number;
}

export type SkyPhase = "tracking" | "preparing" | "transfer" | "completed";

export interface SkyState {
  timeSec: number;
  /** Every satellite above the geometric horizon, best elevation first. */
  sats: SkySat[];
  /** Satellites above the elevation mask, best elevation first. */
  visible: SkySat[];
  serving: SkySat | null;
  candidate: SkySat | null;
  previous: SkySat | null;
  phase: SkyPhase;
  /** 0..1 preparation, then transfer, then 1 when complete. */
  progress: number;
  currentEvent: SkyEvent | null;
  nextEvent: SkyEvent | null;
  lastEvent: SkyEvent | null;
  /** Seconds since the last switch — or since acquisition, if none yet. */
  sinceLastSec: number;
  /** How long the serving satellite has held the link, seconds. */
  heldSec: number;
  current: SkyLink | null;
  candidateLink: SkyLink | null;
  releasedLink: SkyLink | null;
  /** Beam pointing target: blends between old and new during a transfer. */
  beamTargetPosition: [number, number, number] | null;
  counts: {
    total: number;
    aboveHorizon: number;
    aboveMask: number;
    planes: number;
  };
}

let cacheT = Number.NaN;
let cacheState: SkyState | null = null;

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

function smoothstep(x: number) {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

function toSat(i: number, role: SkyRole): SkySat {
  const el = elArr[i];
  return {
    id: i,
    name: satName(i),
    plane: satPlane(i),
    slot: satSlot(i),
    elDeg: el,
    azDeg: azArr[i],
    rangeKm: rangeArr[i],
    visible: el >= ELEVATION_MASK_DEG,
    position: [px[i], py[i], pz[i]],
    rising: elAhead[i] > el,
    role,
    quality: clamp((el - ELEVATION_MASK_DEG) / (70 - ELEVATION_MASK_DEG), 0, 1),
  };
}

/** One consistent sample of sky, dish and link state at simulated time t. */
export function sampleSky(tSecRaw: number): SkyState {
  const t = clamp(tSecRaw, 0, SKY_WINDOW_SEC);
  if (cacheState && cacheT === t) return cacheState;

  // Building the schedule runs thousands of geometry passes, so make sure it is
  // done *before* the buffers for this instant are filled.
  getSchedule();
  computeGeometry(t);
  snapshotAhead(t, 2);

  const servingId = servingIdAt(t);
  const lastIdx = lastEventIndex(t);
  const lastEvent = lastIdx >= 0 ? getSchedule().events[lastIdx] : null;
  const nextEvent = nextEventAt(t);
  const transferEvent =
    lastEvent && Math.abs(t - lastEvent.tSec) <= SKY_TRANSFER_HALF_SEC + 0.0001 ? lastEvent : null;

  let phase: SkyPhase = "tracking";
  let progress = 0;
  if (transferEvent) {
    phase = "transfer";
    progress = clamp(
      (t - (transferEvent.tSec - SKY_TRANSFER_HALF_SEC)) / (SKY_TRANSFER_HALF_SEC * 2),
      0,
      1,
    );
  } else if (nextEvent && t >= nextEvent.tSec - SKY_PREPARE_SEC) {
    phase = "preparing";
    progress = clamp((t - (nextEvent.tSec - SKY_PREPARE_SEC)) / SKY_PREPARE_SEC, 0, 1);
  } else if (lastEvent && t - lastEvent.tSec <= SKY_COMPLETE_SEC) {
    phase = "completed";
    progress = 1;
  }

  // Candidate: the scheduled next target once the terminal is preparing for it,
  // otherwise the best other satellite the dish could move to right now.
  const liveCandidate = bestRising(servingId);
  const candidateId =
    nextEvent && nextEvent.tSec - t <= 60
      ? nextEvent.to
      : liveCandidate >= 0
        ? liveCandidate
        : bestVisible(servingId);

  const releasedId =
    lastEvent && t - lastEvent.tSec >= 0 && t - lastEvent.tSec <= SKY_RELEASE_FADE_SEC
      ? lastEvent.from
      : -1;
  const previousId = lastEvent && t - lastEvent.tSec <= SKY_COMPLETE_SEC ? lastEvent.from : -1;

  const sats: SkySat[] = [];
  for (let k = 0; k < aboveHorizon.length; k++) {
    const i = aboveHorizon[k];
    let role: SkyRole = elArr[i] >= ELEVATION_MASK_DEG ? "visible" : "masked";
    if (i === servingId) role = "serving";
    else if (candidateId >= 0 && i === candidateId) role = "candidate";
    else if (i === releasedId) role = "released";
    sats.push(toSat(i, role));
  }
  sats.sort((a, b) => b.elDeg - a.elDeg);

  const find = (id: number) => (id >= 0 ? sats.find((s) => s.id === id) ?? null : null);
  const serving = find(servingId);
  const candidate = find(candidateId);
  const previous = find(previousId);

  // Beam opacities: a cross-fade through the transfer window.
  let current: SkyLink | null = null;
  let candidateLink: SkyLink | null = null;
  let releasedLink: SkyLink | null = null;

  if (transferEvent) {
    const k = smoothstep(progress);
    current = { id: transferEvent.from, kind: "serving", opacity: 1 - k };
    candidateLink = { id: transferEvent.to, kind: "candidate", opacity: k };
  } else {
    if (serving) current = { id: serving.id, kind: "serving", opacity: 1 };
    if (candidate) {
      const prep = phase === "preparing" ? progress : 0;
      candidateLink = { id: candidate.id, kind: "candidate", opacity: 0.18 + 0.55 * prep };
    }
    if (lastEvent) {
      const age = t - lastEvent.tSec;
      if (age >= 0 && age < SKY_RELEASE_FADE_SEC) {
        releasedLink = {
          id: lastEvent.from,
          kind: "released",
          opacity: 0.85 * (1 - age / SKY_RELEASE_FADE_SEC),
        };
      }
    }
  }

  // Where the array actually points: the serving satellite, or a blend across
  // the make-before-break window.
  let beamTargetPosition: [number, number, number] | null = null;
  if (transferEvent) {
    const k = smoothstep(progress);
    const a = transferEvent.from;
    const b = transferEvent.to;
    beamTargetPosition = [
      px[a] + (px[b] - px[a]) * k,
      py[a] + (py[b] - py[a]) * k,
      pz[a] + (pz[b] - pz[a]) * k,
    ];
  } else if (serving) {
    beamTargetPosition = serving.position;
  }

  const heldSec = lastEvent ? t - lastEvent.tSec : t + WARMUP_SEC;
  let aboveMask = 0;
  for (const s of sats) if (s.visible) aboveMask++;

  cacheT = t;
  cacheState = {
    timeSec: t,
    sats,
    visible: sats.filter((s) => s.visible),
    serving,
    candidate,
    previous,
    phase,
    progress,
    currentEvent: transferEvent ?? (phase === "preparing" ? nextEvent : lastEvent),
    nextEvent,
    lastEvent,
    sinceLastSec: heldSec,
    heldSec,
    current,
    candidateLink,
    releasedLink,
    beamTargetPosition,
    counts: {
      total: SKY_TOTAL,
      aboveHorizon: sats.length,
      aboveMask,
      planes: SKY_PLANES,
    },
  };
  return cacheState;
}

/**
 * Scene positions and unit velocity directions of every satellite, as flat
 * buffers (Earth radii; x = east, y = up, z = south). Valid until the next
 * sample — the renderer reads these immediately after sampling, so nothing is
 * copied.
 */
export function allPositions() {
  return { px, py, pz, vx, vy, vz };
}

/** Position of one satellite at t, in scene units (used for drawn trails). */
export function satScenePosition(id: number, tSec: number): [number, number, number] {
  const rot = GMST0 + OMEGA_EARTH * tSec;
  const ct = Math.cos(rot);
  const st = Math.sin(rot);
  const nt = MEAN_MOTION * tSec;
  const cn = Math.cos(nt);
  const sn = Math.sin(nt);
  const cu = cosU0[id] * cn - sinU0[id] * sn;
  const su = sinU0[id] * cn + cosU0[id] * sn;
  const cO = cosRaan[id];
  const sO = sinRaan[id];
  const x = A_KM * (cO * cu - sO * su * cosInc);
  const y = A_KM * (sO * cu + cO * su * cosInc);
  const z = A_KM * (su * sinInc);
  const dx = x * ct + y * st - OBS.ecefX;
  const dy = -x * st + y * ct - OBS.ecefY;
  const dz = z - OBS.ecefZ;
  return [
    (dx * OBS.ex + dy * OBS.ey) / EARTH_RADIUS_KM,
    (dx * OBS.ux + dy * OBS.uy + dz * OBS.uz) / EARTH_RADIUS_KM,
    -(dx * OBS.nx + dy * OBS.ny + dz * OBS.nz) / EARTH_RADIUS_KM,
  ];
}

/** Elevation / azimuth / range of a single satellite at t. */
export function satLookAngles(id: number, tSec: number) {
  const pos = satScenePosition(id, tSec);
  const r = Math.sqrt(pos[0] ** 2 + pos[1] ** 2 + pos[2] ** 2);
  const el = Math.asin(Math.max(-1, Math.min(1, pos[1] / r))) / DEG;
  const az = ((Math.atan2(pos[0], -pos[2]) / DEG) + 360) % 360;
  return { elDeg: el, azDeg: az, rangeKm: r * EARTH_RADIUS_KM };
}

/** Predicted seconds until the satellite falls below the mask (capped). */
export function secondsUntilDropout(id: number, tSec: number, capSec = 240): number | null {
  for (let dt = 5; dt <= capSec; dt += 5) {
    if (elevationOf(id, tSec + dt) < ELEVATION_MASK_DEG) return dt;
  }
  return null;
}

/** Compass label helper shared with the scripted lab. */
export function skyCompass(azDeg: number) {
  const points = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return points[Math.round((((azDeg % 360) + 360) % 360) / 22.5) % 16];
}

/** Human label for why a handover happened. */
export function reasonLabel(reason: HandoverReason) {
  switch (reason) {
    case "floor":
      return "serving satellite fell below the 40° floor";
    case "low":
      return "serving satellite getting low · a better pass is up";
    case "rescue":
      return "link rescued before the 25° mask";
    case "better":
      return "a much better pass is already overhead";
    default:
      return "acquired the best satellite in view";
  }
}
