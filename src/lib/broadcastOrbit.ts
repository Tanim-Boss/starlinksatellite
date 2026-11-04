/**
 * Shared scene geometry and footprint math for the "Broadcast TV vs Starlink"
 * view. All distances are expressed in Earth radii, so the two orbit altitudes
 * keep their real 550 km vs 35,786 km proportion; spacecraft models and line
 * widths are the only things enlarged for readability.
 */

export const EARTH_RADIUS_KM = 6371;
export const EARTH_RADIUS = 1.28;

/** Real orbital altitudes above the mean Earth surface. */
export const LEO_ALTITUDE_KM = 550;
export const GEO_ALTITUDE_KM = 35_786;

export const LEO_RADIUS = EARTH_RADIUS * (1 + LEO_ALTITUDE_KM / EARTH_RADIUS_KM);
export const GEO_RADIUS = EARTH_RADIUS * (1 + GEO_ALTITUDE_KM / EARTH_RADIUS_KM);

/**
 * Both spacecraft share the TV satellite's orbital plane: the equatorial plane.
 * A geostationary satellite must sit there to stand still in the sky, so drawing
 * the 550 km Starlink orbit in that same plane lets the two altitudes and
 * footprints be compared on identical terms. Operational Starlink shells are
 * inclined about 53° (a later shell flies at 97.6°); the scene does not draw
 * those planes.
 */
export const ORBIT_PLANE_INCLINATION = 0;

/**
 * Starlink terminals only close a link at 25° of elevation or more, which is the
 * mask SpaceX filed for its user terminals. Everything below that grazing angle
 * is unusable, so 25° — not the geometric horizon — defines the real footprint.
 */
export const STARLINK_MIN_ELEVATION_DEG = 25;

/** Starlink's first shell altitude (km) and its real footprint, filled in below. */
export const LEO_FOOTPRINT = footprint(LEO_RADIUS, STARLINK_MIN_ELEVATION_DEG);
/** Geometry-only cap for the TV satellite: the edge of its line of sight. */
export const GEO_HORIZON = footprint(GEO_RADIUS, 0);
/** Same 550 km satellite seen with no elevation mask, for the card's comparison. */
export const LEO_HORIZON = footprint(LEO_RADIUS, 0);

/**
 * Position on a circular orbit. θ = 0 starts on the +x axis and sweeps toward
 * +z, the same direction the TV satellite travels, so both spacecraft orbit
 * prograde in one shared, non-crossing path family.
 */
export function orbitPoint(
  radius: number,
  angle: number,
  inclination = ORBIT_PLANE_INCLINATION,
): [number, number, number] {
  return [
    radius * Math.cos(angle),
    -radius * Math.sin(angle) * Math.sin(inclination),
    radius * Math.sin(angle) * Math.cos(inclination),
  ];
}

export interface Footprint {
  /** Earth-centred half-angle of the spherical cap, radians. */
  angle: number;
  /** Minimum elevation angle at the rim, radians. */
  elevation: number;
  /** Great-circle radius of the footprint on the ground, km. */
  radiusKm: number;
  /** Diameter of that ground circle, km. */
  diameterKm: number;
  /** Share of Earth's whole surface inside the footprint, 0–0.5. */
  fraction: number;
}

/**
 * Ground footprint of a satellite at `orbitRadius` for a minimum elevation
 * angle (0° = the true horizon, so the result is the whole visible cap).
 *
 * At the footprint rim the satellite sits at elevation e above the local
 * horizon, so the triangle Earth-centre → rim → satellite has angles
 * γ, 90° + e and 90° − e − γ. The sine rule gives the central half-angle
 *
 *   cos(γ + e) = (R / r) · cos(e)   ⇒   γ = acos((R / r) · cos e) − e
 *
 * At 550 km and e = 25° that is γ ≈ 8.46°, a ground radius of ~941 km — the
 * footprint Starlink actually serves. At e = 0 it reduces to the horizon cap.
 */
export function footprint(orbitRadius: number, minElevationDeg = 0): Footprint {
  const elevation = Math.max(0, minElevationDeg) * (Math.PI / 180);
  const ratio = Math.min(1, (EARTH_RADIUS / orbitRadius) * Math.cos(elevation));
  const angle = Math.max(0, Math.acos(ratio) - elevation);
  const radiusKm = EARTH_RADIUS_KM * angle;
  return {
    angle,
    elevation,
    radiusKm,
    diameterKm: radiusKm * 2,
    fraction: (1 - Math.cos(angle)) / 2,
  };
}

/** Visible cap down to the true horizon (zero minimum elevation). */
export function horizonCoverage(radius: number): Footprint {
  return footprint(radius, 0);
}
