/** Verify the exact orbital calculations used by the landing-page 3D view. */
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = await build({
  entryPoints: [path.join(root, "src/components/OrbitLab/simulation.ts")],
  bundle: true, write: false, format: "esm", platform: "node",
  alias: { "@": path.join(root, "src") }, logLevel: "silent",
});
const m = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString("base64")}`);
let failures = 0;
function assert(name, condition, detail = "") {
  console.log(`${condition ? "ok   " : "FAIL "}${name}${detail ? ` (${detail})` : ""}`);
  if (!condition) failures += 1;
}
const vec = () => ({ x: 0, y: 0, z: 0 });
const magnitude = (v) => Math.hypot(v.x, v.y, v.z);
const separation = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const day = 2 * Math.PI / m.EARTH_ROTATION_RATE;
const ground0 = m.groundNormalAt(0, vec());
const groundLater = m.groundNormalAt(18000, vec());
const geo0 = m.geostationaryPositionAt(0, vec());
const geoLater = m.geostationaryPositionAt(18000, vec());
assert("600 satellites in the comparison model", m.SATELLITE_COUNT === 600);
assert("ground normal is unit length", Math.abs(magnitude(ground0) - 1) < 1e-12);
assert("ground point and GEO position repeat after a sidereal day", separation(ground0, m.groundNormalAt(day, vec())) < 1e-12 && separation(geo0, m.geostationaryPositionAt(day, vec())) < 1e-12);
const angle = m.earthRotationAt(18000);
const rotateY = (v) => ({ x: Math.cos(angle) * v.x + Math.sin(angle) * v.z, y: v.y, z: -Math.sin(angle) * v.x + Math.cos(angle) * v.z });
assert("ground and GEO follow the same rotation as the Earth texture", separation(rotateY(ground0), groundLater) < 1e-12 && separation(rotateY(geo0), geoLater) < 1e-12);
assert("GEO remains above the site's longitude on the equator", Math.abs(geoLater.y) < 1e-12 && Math.abs(groundLater.x * geoLater.z - groundLater.z * geoLater.x) < 1e-12);
const physical = new Float32Array(m.SATELLITE_COUNT * 3);
const visual = new Float32Array(m.SATELLITE_COUNT * 3);
const scratch = vec();
const best = m.updateFleetPositions(0, ground0, physical, visual, scratch);
const physicalRadius = (6371 + 550) / 6371;
let maxPhysicalError = 0;
let maxVisualError = 0;
for (let i = 0; i < m.SATELLITE_COUNT; i += 1) {
  const j = i * 3;
  maxPhysicalError = Math.max(maxPhysicalError, Math.abs(Math.hypot(physical[j], physical[j + 1], physical[j + 2]) - physicalRadius));
  maxVisualError = Math.max(maxVisualError, Math.abs(Math.hypot(visual[j], visual[j + 1], visual[j + 2]) - m.LEO_RADIUS));
}
assert("physical satellites stay at the 550 km orbital radius", maxPhysicalError < 1e-6, `max error ${maxPhysicalError.toExponential(2)}`);
assert("displayed GEO and LEO radii are adjusted without changing physical positions", maxVisualError < 1e-6 && m.LEO_RADIUS / m.EARTH_RADIUS > physicalRadius && m.GEO_RADIUS / m.EARTH_RADIUS < (6371 + 35786) / 6371);
function elevationFor(index, ground) {
  const i = index * 3;
  const dx = physical[i] - ground.x;
  const dy = physical[i + 1] - ground.y;
  const dz = physical[i + 2] - ground.z;
  return Math.asin((dx * ground.x + dy * ground.y + dz * ground.z) / Math.hypot(dx, dy, dz)) * 180 / Math.PI;
}
const bestElevation = elevationFor(best, ground0);
let maximum = -90;
for (let i = 0; i < m.SATELLITE_COUNT; i += 1) maximum = Math.max(maximum, elevationFor(i, ground0));
assert("the selected satellite has the highest elevation", Math.abs(maximum - bestElevation) < 1e-4 && bestElevation > 25);
let minBest = 90;
let changes = 0;
let previous = -1;
for (let time = 0; time <= day; time += 600) {
  const ground = m.groundNormalAt(time, vec());
  const current = m.updateFleetPositions(time, ground, physical, visual, scratch);
  minBest = Math.min(minBest, elevationFor(current, ground));
  if (previous !== -1 && current !== previous) changes += 1;
  previous = current;
}
assert("the model hands off between visible LEO satellites", changes > 1 && minBest > 25, `minimum elevation ${minBest.toFixed(1)}°, ${changes} changes sampled`);
console.log(failures ? `\n${failures} lab math check(s) failed.` : "\nAll lab orbit checks passed.");
process.exit(failures ? 1 : 0);
