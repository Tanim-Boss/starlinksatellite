import assert from 'node:assert/strict';
import { build } from 'esbuild';
const result = await build({ entryPoints: ['src/lib/broadcastOrbit.ts'], bundle: true, write: false, format: 'esm' });
const {
  EARTH_RADIUS_KM,
  EARTH_RADIUS,
  LEO_ALTITUDE_KM,
  GEO_ALTITUDE_KM,
  LEO_RADIUS,
  GEO_RADIUS,
  ORBIT_PLANE_INCLINATION,
  STARLINK_MIN_ELEVATION_DEG,
  LEO_FOOTPRINT,
  LEO_HORIZON,
  GEO_HORIZON,
  orbitPoint,
  footprint,
  horizonCoverage,
} = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);

const near = (actual, expected, tolerance = 1e-9) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

// --- Altitudes keep their real values, on one shared Earth-radius scale. -----
near((LEO_RADIUS / EARTH_RADIUS - 1) * EARTH_RADIUS_KM, 550);
near((GEO_RADIUS / EARTH_RADIUS - 1) * EARTH_RADIUS_KM, 35786);
assert.equal(LEO_ALTITUDE_KM, 550);
assert.equal(GEO_ALTITUDE_KM, 35786);

// --- The LEO orbit sits in the TV satellite's plane. ------------------------
// The TV satellite must be equatorial to stand still, so the shared plane is
// the equatorial plane, and every point of both orbits has y = 0.
assert.equal(ORBIT_PLANE_INCLINATION, 0);
for (let i = 0; i <= 360; i++) {
  for (const radius of [LEO_RADIUS, GEO_RADIUS]) {
    const p = orbitPoint(radius, (i / 360) * Math.PI * 2, ORBIT_PLANE_INCLINATION);
    near(Math.hypot(...p), radius);
    near(p[1], 0);
  }
}
// Same start direction, same sweep: the two paths never cross and travel
// prograde together, exactly like nested circles in one plane.
for (const radius of [LEO_RADIUS, GEO_RADIUS]) {
  const start = orbitPoint(radius, 0);
  near(start[0], radius);
  near(Math.abs(start[1]), 0);
  near(start[2], 0);
  assert.ok(start[0] > 0, 'both orbits start on the +x axis');
}
for (let i = 0; i < 8; i++) {
  const a = (i / 8) * Math.PI * 2;
  const leo = orbitPoint(LEO_RADIUS, a);
  const geo = orbitPoint(GEO_RADIUS, a);
  // Same azimuth around the shared plane: scaled copies of one another.
  const ratio = LEO_RADIUS / GEO_RADIUS;
  near(leo[0], geo[0] * ratio, 1e-12);
  near(leo[2], geo[2] * ratio, 1e-12);
}
assert.notDeepEqual(orbitPoint(LEO_RADIUS, 0), orbitPoint(LEO_RADIUS, 1));

// --- Real Starlink footprint at 550 km, 25° minimum elevation. --------------
// Published figures: a 550 km satellite serves a circle of ~940-950 km radius
// (roughly 2 million km²) when user terminals need 25° of elevation.
assert.equal(STARLINK_MIN_ELEVATION_DEG, 25);
assert.ok(LEO_FOOTPRINT.radiusKm > 930 && LEO_FOOTPRINT.radiusKm < 950, `radius ${LEO_FOOTPRINT.radiusKm}`);
assert.ok(Math.abs(LEO_FOOTPRINT.diameterKm - 2 * LEO_FOOTPRINT.radiusKm) < 1e-9);
// Served cap area in km²: the whole sphere (510 M km²) times the share.
const capAreaKm2 = 4 * Math.PI * EARTH_RADIUS_KM ** 2 * LEO_FOOTPRINT.fraction;
assert.ok(capAreaKm2 > 2.6e6 && capAreaKm2 < 2.9e6, `cap area ${capAreaKm2}`);
// The 25° mask only leaves a small share of Earth per satellite.
assert.ok(LEO_FOOTPRINT.fraction > 0.004 && LEO_FOOTPRINT.fraction < 0.007, `${LEO_FOOTPRINT.fraction}`);
assert.ok(LEO_FOOTPRINT.fraction < 1 / 7, 'one satellite covers well under a seventh of Earth');

// The rim of that footprint really is at 25° elevation above the local horizon.
{
  const gamma = LEO_FOOTPRINT.angle;
  // 2-D meridian slice: Earth centre at the origin, satellite straight up.
  const rim = [EARTH_RADIUS * Math.sin(gamma), EARTH_RADIUS * Math.cos(gamma)];
  const satellite = [0, LEO_RADIUS];
  const toSatellite = [satellite[0] - rim[0], satellite[1] - rim[1]];
  const up = [rim[0] / EARTH_RADIUS, rim[1] / EARTH_RADIUS];
  const cosZenith = (toSatellite[0] * up[0] + toSatellite[1] * up[1]) / Math.hypot(...toSatellite);
  near((Math.PI / 2 - Math.acos(cosZenith)) * 180 / Math.PI, 25, 1e-9);
}

// --- Elevation mask shrinks the cap; zero elevation is the horizon. ---------
assert.equal(LEO_HORIZON.elevation, 0);
assert.ok(Math.abs(LEO_HORIZON.angle - Math.acos(EARTH_RADIUS / LEO_RADIUS)) < 1e-12);
near(LEO_HORIZON.fraction, horizonCoverage(LEO_RADIUS).fraction);
near(GEO_HORIZON.fraction, horizonCoverage(GEO_RADIUS).fraction);
assert.ok(LEO_FOOTPRINT.angle < LEO_HORIZON.angle);
assert.ok(footprint(LEO_RADIUS, 40).angle < LEO_FOOTPRINT.angle, '40° mask is stricter than 25°');
// Footprints grow monotonically with altitude at any fixed mask.
assert.ok(footprint(GEO_RADIUS, 25).angle > LEO_FOOTPRINT.angle);
assert.ok(GEO_HORIZON.fraction > LEO_HORIZON.fraction);

// The zero-elevation cone still meets Earth tangentially.
for (const r of [LEO_RADIUS, GEO_RADIUS]) {
  const { angle, fraction } = horizonCoverage(r);
  near(r * EARTH_RADIUS * Math.cos(angle), EARTH_RADIUS ** 2);
  assert.ok(fraction > 0 && fraction < 0.5);
}
assert.ok(horizonCoverage(GEO_RADIUS).fraction > horizonCoverage(LEO_RADIUS).fraction);

// No NaN: the acos argument stays inside [-1, 1] even for absurd altitudes.
for (const r of [EARTH_RADIUS * 1.0001, EARTH_RADIUS * 2, GEO_RADIUS, EARTH_RADIUS * 1000]) {
  for (const e of [0, 25, 40, 89]) {
    const fp = footprint(r, e);
    assert.ok(Number.isFinite(fp.angle) && fp.angle >= 0 && fp.fraction >= 0 && fp.fraction <= 0.5);
  }
}

console.log('Broadcast orbit: shared equatorial plane, 550 km altitude and real 25° Starlink footprint checks passed.');
