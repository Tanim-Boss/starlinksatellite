import { comparisonConfig, earthSceneRadius, geoOrbitRadius, trueLeoOrbitRadius } from "../config";
import type { ComparisonLocation } from "../config";

const { earthRadiusKm, earthMuKm3S2, leoAltitudeKm, leoInclinationDeg } = comparisonConfig;
const earthRadiusUnits = 1;
const earthRotationRate = (Math.PI * 2) / comparisonConfig.earthRotationPeriodS;

export interface CircularOrbitElement {
  id: number;
  plane: number;
  slot: number;
  raan: number;
  inclination: number;
  meanAnomalyAtEpoch: number;
  meanMotion: number;
  orbitalRadiusEarthRadii: number;
  cosRaan: number;
  sinRaan: number;
  cosInclination: number;
  sinInclination: number;
}

const radians = (degrees: number) => (degrees * Math.PI) / 180;

/** Build a reproducible, evenly phased circular constellation. */
export function buildConstellation(): CircularOrbitElement[] {
  const elements: CircularOrbitElement[] = [];
  const { planes, satellitesPerPlane } = comparisonConfig.constellation;
  const inclination = radians(leoInclinationDeg);
  const orbitalRadiusKm = earthRadiusKm + leoAltitudeKm;
  const meanMotion = Math.sqrt(earthMuKm3S2 / orbitalRadiusKm ** 3);
  const orbitalRadiusEarthRadii = orbitalRadiusKm / earthRadiusKm;

  for (let plane = 0; plane < planes; plane += 1) {
    const raan = (plane * Math.PI * 2) / planes;
    const planeStagger = (plane * Math.PI) / planes;
    for (let slot = 0; slot < satellitesPerPlane; slot += 1) {
      const meanAnomalyAtEpoch = (slot * Math.PI * 2) / satellitesPerPlane + planeStagger;
      elements.push({
        id: elements.length,
        plane,
        slot,
        raan,
        inclination,
        meanAnomalyAtEpoch,
        meanMotion,
        orbitalRadiusEarthRadii,
        cosRaan: Math.cos(raan),
        sinRaan: Math.sin(raan),
        cosInclination: Math.cos(inclination),
        sinInclination: Math.sin(inclination),
      });
    }
  }
  return elements;
}

export const ORBIT_ELEMENTS = buildConstellation();
export const LEO_MEAN_MOTION = ORBIT_ELEMENTS[0]?.meanMotion ?? 0;
export const EARTH_ANGULAR_SPEED = earthRotationRate;

/** Position in an inertial frame measured in Earth radii. */
export function positionInEarthRadii(
  element: CircularOrbitElement,
  timeSeconds: number,
  out: { x: number; y: number; z: number },
): { x: number; y: number; z: number } {
  const argument = element.meanMotion * timeSeconds + element.meanAnomalyAtEpoch;
  const cosArgument = Math.cos(argument);
  const sinArgument = Math.sin(argument);
  const radius = element.orbitalRadiusEarthRadii;
  out.x = radius * (element.cosRaan * cosArgument - element.sinRaan * sinArgument * element.cosInclination);
  out.y = radius * sinArgument * element.sinInclination;
  out.z = radius * (element.sinRaan * cosArgument + element.cosRaan * sinArgument * element.cosInclination);
  return out;
}

/** Position in scene units, returned into a caller-owned object. */
export function positionInSceneUnits(
  element: CircularOrbitElement,
  timeSeconds: number,
  out: { x: number; y: number; z: number },
): { x: number; y: number; z: number } {
  positionInEarthRadii(element, timeSeconds, out);
  out.x *= earthSceneRadius;
  out.y *= earthSceneRadius;
  out.z *= earthSceneRadius;
  return out;
}

/** Earth-fixed location carried into the inertial frame as Earth rotates. */
export function locationInSceneUnits(
  location: ComparisonLocation,
  timeSeconds: number,
  out: { x: number; y: number; z: number },
  altitudeUnits = 0.018,
): { x: number; y: number; z: number } {
  const latitude = radians(location.lat);
  const longitude = radians(location.lon);
  const earthAngle = earthRotationRate * timeSeconds;
  const cosLatitude = Math.cos(latitude);
  const baseX = cosLatitude * Math.cos(longitude);
  const baseY = Math.sin(latitude);
  const baseZ = -cosLatitude * Math.sin(longitude);
  const cosEarth = Math.cos(earthAngle);
  const sinEarth = Math.sin(earthAngle);
  const radius = earthSceneRadius + altitudeUnits;
  out.x = radius * (cosEarth * baseX + sinEarth * baseZ);
  out.y = radius * baseY;
  out.z = radius * (-sinEarth * baseX + cosEarth * baseZ);
  return out;
}

/** GEO position over a longitude, rotating with Earth so it remains fixed on the map. */
export function geoPositionInSceneUnits(
  longitudeDeg: number,
  timeSeconds: number,
  out: { x: number; y: number; z: number },
): { x: number; y: number; z: number } {
  const longitude = radians(longitudeDeg);
  const angle = longitude + earthRotationRate * timeSeconds;
  out.x = geoOrbitRadius * Math.cos(angle);
  out.y = 0;
  out.z = -geoOrbitRadius * Math.sin(angle);
  return out;
}

/**
 * Select the highest LEO satellite above the configured elevation threshold.
 * Calculations use the actual 550 km circular orbits, not the visual scale.
 */
export function findBestSatellite(
  location: ComparisonLocation,
  timeSeconds: number,
  minElevationDeg = comparisonConfig.minimumElevationDeg,
): { id: number; elevationDeg: number } {
  const lat = radians(location.lat);
  const lon = radians(location.lon);
  const earthAngle = earthRotationRate * timeSeconds;
  const cosLat = Math.cos(lat);
  const baseX = cosLat * Math.cos(lon);
  const baseY = Math.sin(lat);
  const baseZ = -cosLat * Math.sin(lon);
  const cosEarth = Math.cos(earthAngle);
  const sinEarth = Math.sin(earthAngle);
  const siteX = cosEarth * baseX + sinEarth * baseZ;
  const siteY = baseY;
  const siteZ = -sinEarth * baseX + cosEarth * baseZ;
  const minElevation = radians(minElevationDeg);
  let bestId = 0;
  let bestElevation = -90;
  const position = { x: 0, y: 0, z: 0 };

  for (let index = 0; index < ORBIT_ELEMENTS.length; index += 1) {
    const satellite = ORBIT_ELEMENTS[index];
    if (!satellite) continue;
    positionInEarthRadii(satellite, timeSeconds, position);
    const dx = position.x - siteX;
    const dy = position.y - siteY;
    const dz = position.z - siteZ;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const sineElevation = (dx * siteX + dy * siteY + dz * siteZ) / distance;
    const elevation = Math.asin(Math.max(-1, Math.min(1, sineElevation)));
    if (elevation > bestElevation) {
      bestElevation = elevation;
      bestId = satellite.id;
    }
  }

  const elevationDeg = (bestElevation * 180) / Math.PI;
  return {
    id: elevationDeg >= minElevationDeg ? bestId : -1,
    elevationDeg: elevationDeg >= minElevation ? elevationDeg : elevationDeg,
  };
}

/** Elevation to a GEO spacecraft at the same longitude as the selected city. */
export function geoElevationForLocation(location: ComparisonLocation): number {
  const latitude = radians(location.lat);
  const geoRadiusEarthRadii = geoOrbitRadius / earthSceneRadius;
  const numerator = geoRadiusEarthRadii * Math.cos(latitude) - 1;
  const distance = Math.sqrt(
    geoRadiusEarthRadii ** 2 + 1 - 2 * geoRadiusEarthRadii * Math.cos(latitude),
  );
  return (Math.asin(Math.max(-1, Math.min(1, numerator / distance))) * 180) / Math.PI;
}

/** The model's exaggerated LEO radius changes only the drawing, never the math. */
export function leoVisualRadius(exaggerated: boolean): number {
  return exaggerated
    ? comparisonConfig.orbitScale.exaggeratedLeoRadius * earthSceneRadius
    : trueLeoOrbitRadius;
}

/** Closest distance from the origin to a segment, tested without allocating. */
export function segmentClearsEarth(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  clearance = 1.025,
): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const lengthSq = dx * dx + dy * dy + dz * dz;
  const t = lengthSq > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy + az * dz) / lengthSq)) : 0;
  const cx = ax + dx * t;
  const cy = ay + dy * t;
  const cz = az + dz * t;
  return cx * cx + cy * cy + cz * cz >= clearance * clearance;
}

/** Circular ring points suitable for drei's Line component. */
export function makeOrbitPoints(
  radius: number,
  inclinationDeg = 0,
  segments = 256,
): [number, number, number][] {
  const points: [number, number, number][] = [];
  const inclination = radians(inclinationDeg);
  const cosInclination = Math.cos(inclination);
  const sinInclination = Math.sin(inclination);
  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle) * sinInclination;
    const z = radius * Math.sin(angle) * cosInclination;
    points.push([x, y, z]);
  }
  return points;
}

export function physicalOrbitalSpeedKmS(): number {
  return Math.sqrt(earthMuKm3S2 / (earthRadiusKm + leoAltitudeKm));
}

export function physicalOrbitalPeriodMinutes(): number {
  const radiusKm = earthRadiusKm + leoAltitudeKm;
  return ((2 * Math.PI) / Math.sqrt(earthMuKm3S2 / radiusKm ** 3)) / 60;
}

export const VISUAL_GEO_RADIUS = geoOrbitRadius;
export const VISUAL_TRUE_LEO_RADIUS = trueLeoOrbitRadius;
export const EARTH_RADIUS_UNITS = earthRadiusUnits;
