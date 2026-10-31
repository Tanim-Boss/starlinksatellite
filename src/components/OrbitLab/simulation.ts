import { ORBIT_ELEMENTS, positionInEarthRadii } from "@/components/SatelliteComparison/utils/orbit";

// Render distances are deliberately adjusted. Orbital positions are computed in
// Earth radii first, then mapped to these scene units only for presentation.
export const EARTH_RADIUS = 1.86;
export const LEO_RADIUS = 2.17;
export const GEO_RADIUS = 3.88;
export const EARTH_ROTATION_RATE = (Math.PI * 2) / 86164.0905;
export const SITE_LATITUDE = 23.81 * Math.PI / 180;
export const SITE_LONGITUDE = 0.84;
export const SATELLITE_COUNT = ORBIT_ELEMENTS.length;

export interface LabVector { x: number; y: number; z: number }

/** Three.js' positive Y rotation turns the opposite way to our longitude angle. */
export function earthRotationAt(time: number): number {
  return -time * EARTH_ROTATION_RATE;
}

/** Earth-fixed ground point in an inertial coordinate frame. */
export function groundNormalAt(time: number, out: LabVector): LabVector {
  const theta = SITE_LONGITUDE + time * EARTH_ROTATION_RATE;
  out.x = Math.cos(SITE_LATITUDE) * Math.cos(theta);
  out.y = Math.sin(SITE_LATITUDE);
  out.z = Math.cos(SITE_LATITUDE) * Math.sin(theta);
  return out;
}

/** GEO spacecraft stays over the same longitude as the ground point. */
export function geostationaryPositionAt(time: number, out: LabVector): LabVector {
  const theta = SITE_LONGITUDE + time * EARTH_ROTATION_RATE;
  out.x = Math.cos(theta) * GEO_RADIUS;
  out.y = 0;
  out.z = Math.sin(theta) * GEO_RADIUS;
  return out;
}

/**
 * Propagate the physical circular orbits, fill the rendered position buffer,
 * and choose the satellite with the highest elevation over the ground point.
 * Caller-owned buffers and scratch vector keep the animation allocation-free.
 */
export function updateFleetPositions(
  time: number,
  ground: LabVector,
  physical: Float32Array,
  visual: Float32Array,
  scratch: LabVector,
): number {
  let bestElevation = -Infinity;
  let bestIndex = 0;
  for (let i = 0; i < SATELLITE_COUNT; i += 1) {
    const element = ORBIT_ELEMENTS[i];
    if (!element) continue;
    positionInEarthRadii(element, time, scratch);
    const offset = i * 3;
    physical[offset] = scratch.x;
    physical[offset + 1] = scratch.y;
    physical[offset + 2] = scratch.z;
    const visualFactor = LEO_RADIUS / element.orbitalRadiusEarthRadii;
    visual[offset] = scratch.x * visualFactor;
    visual[offset + 1] = scratch.y * visualFactor;
    visual[offset + 2] = scratch.z * visualFactor;
    const dx = scratch.x - ground.x;
    const dy = scratch.y - ground.y;
    const dz = scratch.z - ground.z;
    const distance = Math.hypot(dx, dy, dz) || 1;
    const elevation = (dx * ground.x + dy * ground.y + dz * ground.z) / distance;
    if (elevation > bestElevation) {
      bestElevation = elevation;
      bestIndex = i;
    }
  }
  return bestIndex;
}
