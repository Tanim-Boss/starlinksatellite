/**
 * Terminal-level beam model.
 *
 * Everything here is geometric: a representative slice of the modelled fleet
 * (the same satellites the 3D explorer draws) is propagated with a circular
 * two-body orbit, and a single terminal at a fixed latitude/longitude computes
 * where each satellite sits in its sky. The terminal keeps the link until the
 * serving satellite drops below a switch floor, then re-aims at the highest
 * satellite still above the elevation mask.
 *
 * It is not live telemetry and it is not SpaceX's scheduling algorithm. The
 * real network balances capacity, obstructions and gateway routing as well as
 * geometry; the timing here is illustrative.
 */

import { EARTH_RADIUS_KM, OMEGA_EARTH, SATS, SHELLS, type Sat } from "./astro";

export interface BeamObserver {
  name: string;
  lat: number;
  lon: number;
  latLabel: string;
  lonLabel: string;
}

/** A fixed mid-latitude terminal, roughly Puget Sound, Washington. */
export const BEAM_OBSERVER: BeamObserver = {
  name: "Puget Sound, WA",
  lat: 47.62,
  lon: -122.35,
  latLabel: "47.6° N",
  lonLabel: "122.4° W",
};

/** The terminal will not use satellites below this elevation. */
export const BEAM_MASK_DEG = 25;
/** When the serving satellite falls below this, the terminal re-aims. */
export const BEAM_FLOOR_DEG = 30;
/** Length of the looping session. */
export const BEAM_DURATION_SEC = 30 * 60;
/** Sampling resolution of the ephemeris. */
export const BEAM_STEP_SEC = 1;
/** Satellites are kept in the timeline if they ever rise above this. */
export const BEAM_TRACK_MIN_EL = 2;
/** How long before a handover the next satellite is flagged. */
export const BEAM_PREPARE_SEC = 45;
/** Visible re-aiming time, in simulated seconds (the real array retunes in µs). */
export const BEAM_SLEW_SEC = 8;
/** Ku-band downlink, used for the phase-timing readout. */
export const KU_BAND_GHZ = 12.2;

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export interface LookAngle {
  /** Elevation above the horizon, degrees. */
  el: number;
  /** Azimuth clockwise from north, degrees. */
  az: number;
  /** Slant range from the terminal, km. */
  rangeKm: number;
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function wrap360(deg: number) {
  return ((deg % 360) + 360) % 360;
}

/** Shortest signed difference a -> b, in degrees (-180, 180]. */
export function angleDelta(a: number, b: number) {
  return ((b - a + 540) % 360) - 180;
}

const DEG_KEYS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"] as const;

export function compassPoint(az: number) {
  return DEG_KEYS[Math.round(wrap360(az) / 22.5) % 16];
}

const SAT_BY_ID = new Map<number, Sat>(SATS.map((s) => [s.id, s]));

export function satelliteById(id: number) {
  return SAT_BY_ID.get(id) ?? null;
}

/**
 * Elevation, azimuth and slant range of a satellite from a ground observer.
 * Earth rotation is included; the orbit is the site's circular two-body model.
 */
export function lookAngles(
  sat: Sat,
  tSec: number,
  out: LookAngle = { el: 0, az: 0, rangeKm: 0 },
  observer: BeamObserver = BEAM_OBSERVER,
): LookAngle {
  const u = sat.m0 + sat.n * tSec;
  const cu = Math.cos(u);
  const su = Math.sin(u);
  const px = sat.aKm * (sat.cosO * cu - sat.sinO * su * sat.cosi);
  const py = sat.aKm * (sat.sinO * cu + sat.cosO * su * sat.cosi);
  const pz = sat.aKm * (su * sat.sini);

  const lat = observer.lat * DEG;
  const theta = observer.lon * DEG + OMEGA_EARTH * tSec;
  const cl = Math.cos(lat);
  const sl = Math.sin(lat);
  const ct = Math.cos(theta);
  const st = Math.sin(theta);

  const ox = EARTH_RADIUS_KM * cl * ct;
  const oy = EARTH_RADIUS_KM * cl * st;
  const oz = EARTH_RADIUS_KM * sl;

  const dx = px - ox;
  const dy = py - oy;
  const dz = pz - oz;

  const range = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

  const up = dx * cl * ct + dy * cl * st + dz * sl;
  const north = -dx * sl * ct - dy * sl * st + dz * cl;
  const east = -dx * st + dy * ct;

  out.el = Math.asin(clamp(up / range, -1, 1)) * RAD;
  out.az = wrap360(Math.atan2(east, north) * RAD);
  out.rangeKm = range;
  return out;
}

export interface BeamTrack {
  satId: number;
  name: string;
  shell: number;
  shellName: string;
  altitudeKm: number;
  plane: number;
  slot: number;
  /** Per-second ephemeris across the session. */
  el: Float32Array;
  az: Float32Array;
  rangeKm: Float32Array;
  peakEl: number;
}

export interface BeamHandover {
  tSec: number;
  fromId: number | null;
  toId: number;
  /** Elevation/azimuth of the incoming satellite at the switch. */
  el: number;
  az: number;
  fromEl: number | null;
}

export interface BeamTimeline {
  observer: BeamObserver;
  durationSec: number;
  stepSec: number;
  count: number;
  tracks: BeamTrack[];
  byId: Map<number, BeamTrack>;
  /** Serving satellite id per sample, or -1 if nothing is above the mask. */
  serving: Int32Array;
  handovers: BeamHandover[];
  peakInView: number;
}

let cachedTimeline: BeamTimeline | null = null;

/** Built once per page load (a few tens of milliseconds). */
export function getBeamTimeline(): BeamTimeline {
  if (!cachedTimeline) cachedTimeline = buildBeamTimeline();
  return cachedTimeline;
}

export function buildBeamTimeline(observer: BeamObserver = BEAM_OBSERVER): BeamTimeline {
  const count = Math.floor(BEAM_DURATION_SEC / BEAM_STEP_SEC) + 1;
  const coarseStep = 15;
  const probe: LookAngle = { el: 0, az: 0, rangeKm: 0 };

  const candidates: Sat[] = [];
  for (const sat of SATS) {
    for (let t = 0; t <= BEAM_DURATION_SEC; t += coarseStep) {
      if (lookAngles(sat, t, probe, observer).el > BEAM_TRACK_MIN_EL) {
        candidates.push(sat);
        break;
      }
    }
  }

  const tracks: BeamTrack[] = [];
  const byId = new Map<number, BeamTrack>();

  for (const sat of candidates) {
    const el = new Float32Array(count);
    const az = new Float32Array(count);
    const rangeKm = new Float32Array(count);
    let peakEl = -90;
    for (let i = 0; i < count; i++) {
      const look = lookAngles(sat, i * BEAM_STEP_SEC, probe, observer);
      el[i] = look.el;
      az[i] = look.az;
      rangeKm[i] = look.rangeKm;
      if (look.el > peakEl) peakEl = look.el;
    }
    const track: BeamTrack = {
      satId: sat.id,
      name: sat.name,
      shell: sat.shell,
      shellName: SHELLS[sat.shell]?.short ?? "Shell",
      altitudeKm: SHELLS[sat.shell]?.altitudeKm ?? 550,
      plane: sat.plane,
      slot: sat.slot,
      el,
      az,
      rangeKm,
      peakEl,
    };
    tracks.push(track);
    byId.set(sat.id, track);
  }

  const serving = new Int32Array(count).fill(-1);
  const handovers: BeamHandover[] = [];
  let current = -1;
  let peakInView = 0;

  for (let i = 0; i < count; i++) {
    let best = -1;
    let bestEl = -90;
    let inView = 0;
    for (let k = 0; k < tracks.length; k++) {
      const e = tracks[k].el[i];
      if (e < BEAM_MASK_DEG) continue;
      inView++;
      if (e > bestEl) {
        bestEl = e;
        best = k;
      }
    }
    if (inView > peakInView) peakInView = inView;
    if (best < 0) {
      current = -1;
      continue;
    }
    const servingEl = current >= 0 ? tracks[current].el[i] : -90;
    if (current >= 0 && servingEl >= BEAM_FLOOR_DEG) {
      serving[i] = tracks[current].satId;
      continue;
    }
    if (best !== current) {
      handovers.push({
        tSec: i * BEAM_STEP_SEC,
        fromId: current >= 0 ? tracks[current].satId : null,
        toId: tracks[best].satId,
        el: tracks[best].el[i],
        az: tracks[best].az[i],
        fromEl: current >= 0 ? tracks[current].el[i] : null,
      });
      current = best;
    }
    serving[i] = tracks[current].satId;
  }

  return {
    observer,
    durationSec: BEAM_DURATION_SEC,
    stepSec: BEAM_STEP_SEC,
    count,
    tracks,
    byId,
    serving,
    handovers,
    peakInView,
  };
}

export function indexAt(timeline: BeamTimeline, tSec: number) {
  return clamp(Math.round(tSec / timeline.stepSec), 0, timeline.count - 1);
}

export function sampleTrack(track: BeamTrack, tSec: number): LookAngle {
  const max = track.el.length - 1;
  const raw = clamp(tSec, 0, max);
  const i0 = Math.floor(raw);
  const i1 = Math.min(i0 + 1, max);
  const f = raw - i0;
  const az0 = track.az[i0];
  const az1 = track.az[i1];
  return {
    el: track.el[i0] + (track.el[i1] - track.el[i0]) * f,
    az: wrap360(az0 + angleDelta(az0, az1) * f),
    rangeKm: track.rangeKm[i0] + (track.rangeKm[i1] - track.rangeKm[i0]) * f,
  };
}

/** The satellite the terminal is serving from at this instant (auto policy). */
export function servingTrackAt(timeline: BeamTimeline, tSec: number): BeamTrack | null {
  const id = timeline.serving[indexAt(timeline, tSec)];
  if (id < 0) return null;
  return timeline.byId.get(id) ?? null;
}

export function nextHandover(timeline: BeamTimeline, tSec: number): BeamHandover | null {
  for (const h of timeline.handovers) {
    if (h.tSec > tSec + 0.001) return h;
  }
  return null;
}

export function lastHandover(timeline: BeamTimeline, tSec: number): BeamHandover | null {
  let found: BeamHandover | null = null;
  for (const h of timeline.handovers) {
    if (h.tSec <= tSec + 0.001) found = h;
    else break;
  }
  return found;
}

export interface Pointing {
  el: number;
  az: number;
  /** True while the visible beam is still swinging to a new satellite. */
  slewing: boolean;
}

/**
 * Where the beam should be drawn right now. Handovers are physically almost
 * instantaneous; we ease the line across for `BEAM_SLEW_SEC` of simulated time
 * so the eye can follow it.
 */
export function pointingAt(
  timeline: BeamTimeline,
  tSec: number,
  target: BeamTrack | null,
  manual: boolean,
): Pointing | null {
  if (!target) return null;
  const look = sampleTrack(target, tSec);
  if (manual) return { el: look.el, az: look.az, slewing: false };
  const ho = lastHandover(timeline, tSec);
  if (!ho || ho.toId !== target.satId || ho.fromId === null) {
    return { el: look.el, az: look.az, slewing: false };
  }
  const progress = clamp((tSec - ho.tSec) / BEAM_SLEW_SEC, 0, 1);
  if (progress >= 1) return { el: look.el, az: look.az, slewing: false };
  const from = timeline.byId.get(ho.fromId);
  if (!from) return { el: look.el, az: look.az, slewing: false };
  const start = sampleTrack(from, ho.tSec);
  const k = 1 - Math.pow(1 - progress, 3);
  return {
    el: start.el + (look.el - start.el) * k,
    az: wrap360(start.az + angleDelta(start.az, look.az) * k),
    slewing: true,
  };
}

export interface InViewSat {
  track: BeamTrack;
  look: LookAngle;
}

/** Everything above the mask at this instant, highest first. */
export function inViewAt(timeline: BeamTimeline, tSec: number): InViewSat[] {
  const i = indexAt(timeline, tSec);
  const out: InViewSat[] = [];
  for (const track of timeline.tracks) {
    const el = track.el[i];
    if (el < BEAM_MASK_DEG) continue;
    out.push({ track, look: sampleTrack(track, tSec) });
  }
  out.sort((a, b) => b.look.el - a.look.el);
  return out;
}

/** When the given satellite drops below the mask, or null if it already has. */
export function linkEndsAt(track: BeamTrack, tSec: number): number | null {
  const from = Math.max(0, Math.ceil(tSec));
  for (let i = from; i < track.el.length; i++) {
    if (track.el[i] < BEAM_MASK_DEG) return i;
  }
  return null;
}

/** Beam steer angle away from straight up (zenith), degrees. */
export function zenithAngle(el: number) {
  return Math.max(0, 90 - el);
}

/** Progressive phase step between adjacent elements, degrees (d = λ/2). */
export function phaseStepDeg(el: number) {
  return (180 * Math.sin(zenithAngle(el) * DEG) + 360) % 360;
}

/** The same step expressed as a time delay at Ku-band, picoseconds. */
export function phaseDelayPs(el: number) {
  return (phaseStepDeg(el) / 360 / (KU_BAND_GHZ * 1e9)) * 1e12;
}

export function lightTimeMs(rangeKm: number) {
  return (rangeKm / 299792.458) * 1000;
}

export function formatClock(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** Normalised array factor in dB for a uniform line of N elements. */
export function arrayFactorDb(angleFromZenithDeg: number, steerDeg: number, N = 16) {
  const alpha = Math.sin(angleFromZenithDeg * DEG);
  const beta = Math.sin(steerDeg * DEG);
  const psi = Math.PI * (alpha - beta);
  const den = N * Math.sin(psi / 2);
  const af = Math.abs(den) < 1e-9 ? 1 : Math.abs(Math.sin((N * psi) / 2) / den);
  return 20 * Math.log10(Math.max(af, 2e-3));
}
