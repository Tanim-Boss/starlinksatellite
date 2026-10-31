import assert from 'node:assert/strict';
import { build } from 'esbuild';
const result = await build({ entryPoints: ['src/lib/broadcastOrbit.ts'], bundle: true, write: false, format: 'esm' });
const { EARTH_RADIUS, LEO_RADIUS, GEO_RADIUS, LEO_INCLINATION, orbitPoint, horizonCoverage } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9);
near((LEO_RADIUS / EARTH_RADIUS - 1) * 6371, 550);
near((GEO_RADIUS / EARTH_RADIUS - 1) * 6371, 35786);
for (let i = 0; i <= 256; i++) {
  const p = orbitPoint(LEO_RADIUS, i / 256 * Math.PI * 2, LEO_INCLINATION);
  near(Math.hypot(...p), LEO_RADIUS);
  near(p[1] * Math.cos(LEO_INCLINATION) + p[2] * Math.sin(LEO_INCLINATION), 0);
}
assert.notDeepEqual(orbitPoint(LEO_RADIUS, 0), orbitPoint(LEO_RADIUS, 1));
for (const r of [LEO_RADIUS, GEO_RADIUS]) {
  const { angle, fraction } = horizonCoverage(r);
  // The cone meets Earth tangentially at the footprint boundary.
  near(r * EARTH_RADIUS * Math.cos(angle), EARTH_RADIUS ** 2);
  assert.ok(fraction > 0 && fraction < 0.5);
}
assert.ok(horizonCoverage(GEO_RADIUS).fraction > horizonCoverage(LEO_RADIUS).fraction);
console.log('Broadcast orbit altitude, plane, motion and horizon coverage checks passed.');
