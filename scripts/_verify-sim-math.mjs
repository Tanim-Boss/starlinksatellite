/**
 * Headless verification of the simulation's orbit/link math.
 * Bundles the TypeScript sources with esbuild, runs the checks, cleans up.
 */
import { build } from "esbuild";
import { writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const entry = path.join(root, "scripts/_verify-sim-math.entry.ts");
const outfile = path.join(root, "scripts/_verify-sim-math.bundle.mjs");

let failures = 0;
function assert(name, cond, extra = "") {
  console.log((cond ? "ok   " : "FAIL ") + name + (extra ? ` (${extra})` : ""));
  if (!cond) failures += 1;
}

await build({
  entryPoints: [entry],
  bundle: true,
  outfile,
  format: "esm",
  platform: "node",
  logLevel: "silent",
});

try {
  const m = await import(path.resolve(outfile));
  m.runChecks(assert);
} finally {
  await rm(outfile, { force: true });
}

if (failures) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll simulation math checks passed.");
