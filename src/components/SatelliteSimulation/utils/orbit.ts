import * as THREE from "three";
import { constellation, earth } from "../config";

/** Standard gravitational parameter of Earth (km^3 / s^2). */
export const MU_KM3_S2 = 398600.4418;
/** Speed of light (km/s). */
export const SPEED_OF_LIGHT_KM_S = 299792.458;
/** Scene scale: 1 unit = 1 Earth radius = 6371 km. */
export const KM_PER_UNIT = earth.radiusKm;
export const EARTH_RADIUS_UNITS = 1;
/** Earth radius plus atmosphere, in scene units (line-of-sight check). */
export const BLOCKING_RADIUS_UNITS =
  (earth.radiusKm + earth.atmosphereKm) / KM_PER_UNIT;

/** Earth's sidereal spin rate (rad per simulated second). */
export const OMEGA_EARTH = (Math.PI * 2) / earth.siderealPeriodS;

/** One satellite of the constellation, with its orbital elements. */
export interface SatSim {
  id: number;
  plane: number;
  slot: number;
  /** Right ascension of the ascending node (rad). */
  raan: number;
  /** Inclination (rad). */
  inc: number;
  /** Mean anomaly at t = 0 (rad). */
  m0: number;
  /** Mean motion (rad per simulated second). */
  n: number;
  /** Orbital radius (km). */
  aKm: number;
  /** Orbital radius in scene units. */
  aUnits: number;
  /** Precomputed trig. */
  cosO: number;
  sinO: number;
  cosi: number;
  sini: number;
}

/**
 * Builds the constellation: `planes` planes evenly spaced in RAAN, each
 * carrying `satsPerPlane` satellites evenly spaced in mean anomaly with a
 * staggered offset so neighbouring planes interleave. Every satellite shares
 * the same circular altitude and inclination, so the period is identical
 * (~95 min) and the ground tracks stay fixed relative to each other.
 */
export function buildConstellation(cfg = constellation): SatSim[] {
  const inc = THREE.MathUtils.degToRad(cfg.inclinationDeg);
  const aKm = earth.radiusKm + cfg.altitudeKm;
  const n = Math.sqrt(MU_KM3_S2 / aKm ** 3);
  const aUnits = aKm / KM_PER_UNIT;
  const sats: SatSim[] = [];
  for (let p = 0; p < cfg.planes; p++) {
    const raan = (p * Math.PI * 2) / cfg.planes;
    // Stagger planes so they interleave in longitude instead of lining up.
    const mOffset = (p * Math.PI) / cfg.planes;
    for (let s = 0; s < cfg.satsPerPlane; s++) {
      const m0 = (s * Math.PI * 2) / cfg.satsPerPlane + mOffset;
      sats.push({
        id: sats.length,
        plane: p,
        slot: s,
        raan,
        inc,
        m0,
        n,
        aKm,
        aUnits,
        cosO: Math.cos(raan),
        sinO: Math.sin(raan),
        cosi: Math.cos(inc),
        sini: Math.sin(inc),
      });
    }
  }
  return sats;
}

/**
 * Position of a satellite at simulated time `t`, in scene units, in the
 * inertial (ECI) frame: Earth at the origin, +Y through the north pole.
 * Circular orbit with zero argument of perigee, so true anomaly = mean
 * anomaly = n*t + m0.
 */
export function satPosition(sat: SatSim, t: number, out: THREE.Vector3): THREE.Vector3 {
  const u = sat.n * t + sat.m0;
  const cu = Math.cos(u);
  const su = Math.sin(u);
  out.set(
    sat.aUnits * (sat.cosO * cu - sat.sinO * su * sat.cosi),
    sat.aUnits * su * sat.sini,
    sat.aUnits * (sat.sinO * cu + sat.cosO * su * sat.cosi),
  );
  return out;
}

/** Velocity of a satellite at time `t` (km/s), for camera fly-alongs. */
export function satVelocity(sat: SatSim, t: number, out: THREE.Vector3): THREE.Vector3 {
  const u = sat.n * t + sat.m0;
  const cu = Math.cos(u);
  const su = Math.sin(u);
  const v = sat.aKm * sat.n;
  out.set(
    v * (-sat.cosO * su - sat.sinO * cu * sat.cosi),
    v * cu * sat.sini,
    v * (-sat.sinO * su + sat.cosO * cu * sat.cosi),
  );
  return out;
}

/** Earth's rotation angle at simulated time `t` (rad, sidereal). */
export function earthAngle(t: number): number {
  return OMEGA_EARTH * t;
}

const _spin = new THREE.Quaternion();
const _axisY = new THREE.Vector3(0, 1, 0);

/**
 * Converts an earth-fixed lat/lon point into the inertial frame at
 * simulated time `t`. Matches the site-wide convention used by the explorer
 * (y = north, lon measured east from +X).
 */
export function latLonToWorld(
  latDeg: number,
  lonDeg: number,
  radiusUnits: number,
  t: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  const cosLat = Math.cos(lat);
  out.set(radiusUnits * cosLat * Math.cos(lon), radiusUnits * Math.sin(lat), -radiusUnits * cosLat * Math.sin(lon));
  _spin.setFromAxisAngle(_axisY, earthAngle(t));
  out.applyQuaternion(_spin);
  return out;
}

/** Lat/lon (deg) of an inertial-frame point, ignoring Earth's rotation. */
export function worldToLatLon(v: THREE.Vector3): { latDeg: number; lonDeg: number } {
  const r = v.length() || 1;
  return {
    latDeg: THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(v.y / r, -1, 1))),
    lonDeg: THREE.MathUtils.radToDeg(Math.atan2(-v.z, v.x)),
  };
}

/**
 * An earth-fixed lat/lon point (y = north, lon east from +X), un-rotated —
 * the local position for objects that are children of the spinning Earth
 * group. Matches the site-wide convention used by the explorer.
 */
export function latLonToEarthFixed(
  latDeg: number,
  lonDeg: number,
  radiusUnits: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  const cosLat = Math.cos(lat);
  return out.set(
    radiusUnits * cosLat * Math.cos(lon),
    radiusUnits * Math.sin(lat),
    -radiusUnits * cosLat * Math.sin(lon),
  );
}

/** Orbital speed of the constellation (km/s) — from the circular-orbit formula. */
export function orbitalSpeedKmS(): number {
  return Math.sqrt(MU_KM3_S2 / (earth.radiusKm + constellation.altitudeKm));
}

/** Orbital period (s) — from Kepler's third law. */
export function orbitalPeriodS(): number {
  const aKm = earth.radiusKm + constellation.altitudeKm;
  return (Math.PI * 2) / Math.sqrt(MU_KM3_S2 / aKm ** 3);
}

export const ORBIT_PERIOD_MIN = orbitalPeriodS() / 60;
export const ORBIT_SPEED_KM_S = orbitalSpeedKmS();

/** Evenly sample the entire fleet when the quality fallback reduces detail. */
export function shouldRenderSatellite(index: number, total: number, limit: number): boolean {
  if (total <= 0 || limit <= 0 || index < 0 || index >= total) return false;
  if (limit >= total) return true;
  return Math.floor(((index + 1) * limit) / total) > Math.floor((index * limit) / total);
}
