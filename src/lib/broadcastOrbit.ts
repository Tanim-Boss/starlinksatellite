/** Shared scene geometry, with all distances on the same Earth-radius scale. */
export const EARTH_RADIUS_KM = 6371;
export const EARTH_RADIUS = 1.28;
export const LEO_RADIUS = EARTH_RADIUS * (1 + 550 / EARTH_RADIUS_KM);
export const GEO_RADIUS = EARTH_RADIUS * (1 + 35786 / EARTH_RADIUS_KM);
export const LEO_INCLINATION = 53 * Math.PI / 180;

export function orbitPoint(radius: number, angle: number, inclination = 0): [number, number, number] {
  return [radius * Math.cos(angle), -radius * Math.sin(angle) * Math.sin(inclination), radius * Math.sin(angle) * Math.cos(inclination)];
}

export function horizonCoverage(radius: number) {
  const angle = Math.acos(EARTH_RADIUS / radius);
  return { angle, fraction: (1 - Math.cos(angle)) / 2 };
}
