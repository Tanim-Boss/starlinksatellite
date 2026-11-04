import * as THREE from "three";
import { earthState } from "./simClock";

/** Mean equatorial Earth radius (km). */
export const EARTH_RADIUS_KM = 6371;
/** Standard gravitational parameter of Earth (km^3 / s^2). */
export const MU_KM3_S2 = 398600.4418;
/** Speed of light (km/s). */
export const SPEED_OF_LIGHT_KM_S = 299792.458;
/** Scene scale: 1 scene unit = 6371 km (one Earth radius). */
export const KM_PER_UNIT = EARTH_RADIUS_KM;
/** Earth sidereal rotation rate (rad/s). */
export const OMEGA_EARTH = (2 * Math.PI) / 86164.0905;

export interface Shell {
  key: string;
  name: string;
  short: string;
  altitudeKm: number;
  inclinationDeg: number;
  /** Full authorised Gen1 constellation figures (public filings). */
  planes: number;
  satsPerPlane: number;
  totalSats: number;
  color: string;
  /** How many planes / satellites we actually render (representative subset). */
  dispPlanes: number;
  dispPerPlane: number;
  note: string;
}

/**
 * Publicly documented Starlink Gen1 operational shells (SpaceX / FCC filings).
 * Altitudes and inclinations are the published values.
 */
export const SHELLS: Shell[] = [
  {
    key: "s1",
    name: "Shell 1 · V1.0",
    short: "Shell 1",
    altitudeKm: 550,
    inclinationDeg: 53.0,
    planes: 72,
    satsPerPlane: 22,
    totalSats: 1584,
    color: "#22d3ee",
    dispPlanes: 24,
    dispPerPlane: 6,
    note: "First operational shell",
  },
  {
    key: "s2",
    name: "Shell 2 · V1.5",
    short: "Shell 2",
    altitudeKm: 540,
    inclinationDeg: 53.2,
    planes: 72,
    satsPerPlane: 22,
    totalSats: 1584,
    color: "#818cf8",
    dispPlanes: 24,
    dispPerPlane: 6,
    note: "Adds laser cross-links",
  },
  {
    key: "s3",
    name: "Shell 3 · polar",
    short: "Shell 3",
    altitudeKm: 560,
    inclinationDeg: 70.0,
    planes: 6,
    satsPerPlane: 58,
    totalSats: 348,
    color: "#fb923c",
    dispPlanes: 6,
    dispPerPlane: 20,
    note: "High-latitude coverage",
  },
  {
    key: "s4",
    name: "Shell 4 · sun-sync",
    short: "Shell 4",
    altitudeKm: 540,
    inclinationDeg: 97.6,
    planes: 6,
    satsPerPlane: 58,
    totalSats: 348,
    color: "#f472b6",
    dispPlanes: 6,
    dispPerPlane: 20,
    note: "Dawn–dusk orbit",
  },
];

export interface Sat {
  id: number;
  name: string;
  /** Index into SHELLS. */
  shell: number;
  plane: number;
  slot: number;
  /** Semi-major axis (km) for a circular orbit. */
  aKm: number;
  /** Inclination (rad). */
  inc: number;
  /** Right ascension of ascending node (rad). */
  raan: number;
  /** Initial mean anomaly (rad). */
  m0: number;
  /** Mean motion (rad/s). */
  n: number;
  cosO: number;
  sinO: number;
  cosi: number;
  sini: number;
  /** Semi-major axis in scene units. */
  aUnits: number;
}

export function buildSatellites(): Sat[] {
  const sats: Sat[] = [];
  SHELLS.forEach((shell, si) => {
    const inc = THREE.MathUtils.degToRad(shell.inclinationDeg);
    const aKm = EARTH_RADIUS_KM + shell.altitudeKm;
    const n = Math.sqrt(MU_KM3_S2 / aKm ** 3);
    const raan0 = si * 0.61 + 0.35;
    for (let p = 0; p < shell.dispPlanes; p++) {
      const raan = raan0 + (p * 2 * Math.PI) / shell.dispPlanes;
      for (let s = 0; s < shell.dispPerPlane; s++) {
        const m0 = (s * 2 * Math.PI) / shell.dispPerPlane + p * (Math.PI / shell.dispPerPlane);
        const id = sats.length;
        sats.push({
          id,
          name: `STARLINK-${1001 + id}`,
          shell: si,
          plane: p,
          slot: s,
          aKm,
          inc,
          raan,
          m0,
          n,
          cosO: Math.cos(raan),
          sinO: Math.sin(raan),
          cosi: Math.cos(inc),
          sini: Math.sin(inc),
          aUnits: aKm / KM_PER_UNIT,
        });
      }
    }
  });
  return sats;
}

/** The representative subset rendered in the scene. */
export const SATS: Sat[] = buildSatellites();

/**
 * ECI position (z = north pole) of a satellite on a circular orbit,
 * in scene units, at simulated time tSec.
 */
export function satPosition(sat: Sat, tSec: number, out: THREE.Vector3): THREE.Vector3 {
  const u = sat.m0 + sat.n * tSec;
  const cu = Math.cos(u);
  const su = Math.sin(u);
  const r = sat.aUnits;
  out.set(
    r * (sat.cosO * cu - sat.sinO * su * sat.cosi),
    r * (sat.sinO * cu + sat.cosO * su * sat.cosi),
    r * (su * sat.sini),
  );
  return out;
}

/** ECI velocity (scene units per simulated second). */
export function satVelocity(sat: Sat, tSec: number, out: THREE.Vector3): THREE.Vector3 {
  const u = sat.m0 + sat.n * tSec;
  const cu = Math.cos(u);
  const su = Math.sin(u);
  const r = sat.aUnits * sat.n;
  out.set(
    r * (-sat.cosO * su - sat.sinO * cu * sat.cosi),
    r * (-sat.sinO * su + sat.cosO * cu * sat.cosi),
    r * (cu * sat.sini),
  );
  return out;
}

/** Circular-orbit speed (km/s) at a given semi-major axis (km). */
export function orbitalVelocityKmS(aKm: number): number {
  return Math.sqrt(MU_KM3_S2 / aKm);
}

/** Circular-orbit period (seconds). */
export function orbitalPeriodSec(aKm: number): number {
  return 2 * Math.PI * Math.sqrt(aKm ** 3 / MU_KM3_S2);
}

export interface CoverageInfo {
  /** Earth central angle of the footprint (rad). */
  lambdaRad: number;
  /** Ground footprint radius along the surface (km). */
  capRadiusKm: number;
  capDiameterKm: number;
  /** Surface area covered (km^2). */
  areaKm2: number;
  /** Slant range to the geometric horizon (km). */
  slantRangeKm: number;
  /** One-way light time straight down (ms). */
  minLatencyMs: number;
  /** One-way light time to the footprint edge (ms). */
  maxLatencyMs: number;
}

/** Coverage of a satellite at the given altitude, geometric horizon (0° elevation). */
export function coverageInfo(altitudeKm: number): CoverageInfo {
  const R = EARTH_RADIUS_KM;
  const h = altitudeKm;
  const lambda = Math.acos(R / (R + h));
  const slant = Math.sqrt(h * (2 * R + h));
  return {
    lambdaRad: lambda,
    capRadiusKm: R * lambda,
    capDiameterKm: 2 * R * lambda,
    areaKm2: 2 * Math.PI * R * R * (1 - Math.cos(lambda)),
    slantRangeKm: slant,
    minLatencyMs: (h / SPEED_OF_LIGHT_KM_S) * 1000,
    maxLatencyMs: (slant / SPEED_OF_LIGHT_KM_S) * 1000,
  };
}

// ---------------------------------------------------------------------------
// Coordinate frames
//
// World / ECI frame: z axis = north pole (satellite math above lives here).
// Earth-fixed frame: y axis = north pole (matches three.js sphere UV mapping).
// The Earth assembly in the scene is: outer group rotates about world Z by the
// Earth spin angle, inner group is tilted +90° about X so the texture's +Y
// north pole aligns with world +Z.
// ---------------------------------------------------------------------------

const _AXIS_Z = new THREE.Vector3(0, 0, 1);
const _AXIS_X = new THREE.Vector3(1, 0, 0);
const Q_TILT = new THREE.Quaternion().setFromAxisAngle(_AXIS_X, Math.PI / 2);
const Q_TILT_INV = new THREE.Quaternion().setFromAxisAngle(_AXIS_X, -Math.PI / 2);
const Q_SPIN = new THREE.Quaternion();
const Q_SPIN_INV = new THREE.Quaternion();

/** lat/lon (deg) -> unit vector in the earth-fixed (y = north) frame. */
export function latLonToEarthFixed(latDeg: number, lonDeg: number, out: THREE.Vector3): THREE.Vector3 {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  out.set(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon));
  return out;
}

/** earth-fixed unit vector -> { lat, lon } in degrees. */
export function earthFixedToLatLon(v: THREE.Vector3): { latDeg: number; lonDeg: number } {
  const r = v.length() || 1;
  return {
    latDeg: THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(v.y / r, -1, 1))),
    lonDeg: THREE.MathUtils.radToDeg(Math.atan2(-v.z, v.x)),
  };
}

/** world (ECI, z = north) -> earth-fixed (y = north). */
export function worldToEarthFixed(v: THREE.Vector3, out: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
  Q_SPIN_INV.setFromAxisAngle(_AXIS_Z, -earthState.angle);
  out.copy(v).applyQuaternion(Q_SPIN_INV).applyQuaternion(Q_TILT_INV);
  return out;
}

/** earth-fixed (y = north) -> world (ECI, z = north). */
export function earthFixedToWorld(v: THREE.Vector3, out: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
  Q_SPIN.setFromAxisAngle(_AXIS_Z, earthState.angle);
  out.copy(v).applyQuaternion(Q_TILT).applyQuaternion(Q_SPIN);
  return out;
}

export interface Gateway {
  name: string;
  lat: number;
  lon: number;
}

/** Approximate public Starlink gateway locations. */
export const GATEWAYS: Gateway[] = [
  { name: "Hawthorne, CA", lat: 33.92, lon: -118.33 },
  { name: "Seattle, WA", lat: 47.45, lon: -122.3 },
  { name: "Portland, OR", lat: 45.57, lon: -122.66 },
  { name: "Phoenix, AZ", lat: 33.57, lon: -112.12 },
  { name: "Denver, CO", lat: 39.62, lon: -104.92 },
  { name: "Dallas, TX", lat: 32.88, lon: -96.85 },
  { name: "Chicago, IL", lat: 41.95, lon: -87.72 },
  { name: "Atlanta, GA", lat: 33.85, lon: -84.4 },
  { name: "Miami, FL", lat: 25.77, lon: -80.32 },
  { name: "New York, NY", lat: 40.73, lon: -73.94 },
  { name: "London, UK", lat: 51.5, lon: -0.13 },
  { name: "Sydney, AU", lat: -33.87, lon: 151.21 },
  { name: "Tokyo, JP", lat: 35.62, lon: 139.78 },
];

/** Minimum elevation a gateway antenna will track a satellite at (deg). */
export const GATEWAY_MIN_ELEVATION_DEG = 25;
