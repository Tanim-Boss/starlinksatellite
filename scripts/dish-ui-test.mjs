/**
 * Interaction test for the dish beam lab.
 *
 * Boots the real app in jsdom (which has no WebGL, so the canvas degrades to
 * the labelled fallback) and drives the controls a visitor actually uses: the
 * camera tabs, play/pause, speed, target selection, manual aim, the two
 * sliders, the phase codes and the sky plot. The instruments must keep working
 * without a 3D context, which is exactly what this exercises.
 *
 * Run with: node scripts/dish-ui-test.mjs
 */
import { build } from "esbuild";
import { JSDOM, VirtualConsole } from "jsdom";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => {
  if (e.message?.toLowerCase().includes("not implemented")) return;
  errors.push("jsdom: " + e.message);
});
vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));

const result = await build({
  entryPoints: [path.join(root, "src/main.tsx")],
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  loader: { ".css": "empty", ".jpg": "dataurl", ".png": "dataurl" },
  alias: { "@": path.join(root, "src") },
  define: { "process.env.NODE_ENV": '"development"' },
  logLevel: "silent",
});
const code = result.outputFiles[0].text;
const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`, {
  runScripts: "dangerously",
  pretendToBeVisual: true,
  url: "http://localhost/#/antenna",
  virtualConsole: vc,
});
const { window } = dom;
window.IntersectionObserver = class {
  constructor(cb) {
    this.cb = cb;
  }
  observe(el) {
    this.cb([{ isIntersecting: true, target: el, boundingClientRect: { top: 0 } }], this);
  }
  unobserve() {}
  disconnect() {}
};
window.matchMedia =
  window.matchMedia ||
  ((q) => ({
    matches: false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }));
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
window.addEventListener("error", (e) => errors.push("window.error: " + e.message + "\n" + e.error?.stack));
window.addEventListener("unhandledrejection", (e) => errors.push("unhandled: " + (e.reason?.stack || e.reason)));
const el = window.document.createElement("script");
el.textContent = code;
window.document.body.appendChild(el);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(1200);

const $ = (sel, scope = window.document) => scope.querySelector(sel);
const $$ = (sel, scope = window.document) => Array.from(scope.querySelectorAll(sel));
const main = () => window.document.getElementById("main");
const text = () => main()?.textContent ?? "";
const byText = (tag, t) => $$(tag).find((b) => b.textContent?.trim().includes(t));
const click = (node) => node?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

let failures = 0;
function assert(name, cond, extra = "") {
  console.log((cond ? "ok   " : "FAIL ") + name + (extra ? ` (${extra})` : ""));
  if (!cond) {
    failures += 1;
    process.exitCode = 1;
  }
}
function setRange(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(input, String(value));
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  input.dispatchEvent(new window.Event("change", { bubbles: true }));
}
function phaseWords() {
  return $$("[data-phase-row]")
    .map((node) => node.textContent?.replace(/R\d\d/, "").trim() ?? "")
    .join(",");
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

assert("hero renders", text().includes("never moves"));
assert("simulator is on the page", !!$("#simulation"));
assert("old array lab is gone", !text().includes("Phased-array antenna simulator"));
assert("scene degrades without WebGL", text().includes("needs WebGL"));

// Camera tabs
const tabs = $$('#simulation [role="tab"]');
assert("three camera tabs", tabs.length === 3, String(tabs.length));
assert(
  "sky view is the default",
  $('[role="tab"][aria-selected="true"]')?.textContent?.trim() === "Sky",
);
click(byText('#simulation [role="tab"]', "Dish"));
await wait(150);
assert(
  "dish view selects",
  $('[role="tab"][aria-selected="true"]')?.textContent?.trim() === "Dish",
);
click(byText('#simulation [role="tab"]', "Orbit"));
await wait(150);
assert(
  "orbit view selects",
  $('[role="tab"][aria-selected="true"]')?.textContent?.trim() === "Orbit",
);

// Play / pause
const pause = byText('#simulation button', "Pause");
assert("pause control exists", !!pause);
click(pause);
await wait(200);
assert("play control appears when paused", !!byText('#simulation button', "Play"));
assert("paused chip shows", text().includes("paused"));

// Speed
const speed = byText('#simulation button', "0.5×");
assert("speed control exists", !!speed);
click(speed);
await wait(150);
assert("speed selected", speed.getAttribute("aria-pressed") === "true");

// Toggles
const codesToggle = byText('#simulation button', "Phase codes");
assert("phase codes toggle", !!codesToggle);
click(codesToggle);
await wait(120);
assert("phase codes toggle off", codesToggle.getAttribute("aria-pressed") === "false");
click(codesToggle);
await wait(120);

const labelsToggle = byText('#simulation button', "Labels");
assert("labels toggle", !!labelsToggle);
click(labelsToggle);
await wait(120);
assert("labels toggle off", labelsToggle.getAttribute("aria-pressed") === "false");

const sightToggle = byText('#simulation button', "Sight line");
assert("sight-line toggle", !!sightToggle);
click(sightToggle);
await wait(120);
assert("sight-line toggle off", sightToggle.getAttribute("aria-pressed") === "false");

/* -------------------------------------------------------------------------- */
/* Targets and aim                                                            */
/* -------------------------------------------------------------------------- */

const satB = $$('#simulation button[aria-pressed]').find((b) => b.textContent?.includes("SAT-B"));
assert("SAT-B target button", !!satB);
click(satB);
await wait(150);
assert("SAT-B is selected", satB.getAttribute("aria-pressed") === "true");
assert("HUD names SAT-B", text().includes("SAT-B"));

const manual = byText('#simulation button', "Manual");
assert("manual mode button", !!manual);
click(manual);
await wait(150);
assert("manual mode active", manual.getAttribute("aria-pressed") === "true");
assert("manual mode copy", text().includes("manual aim"));

const az = $('input[aria-label="Beam azimuth in degrees from north"]');
const elevation = $('input[aria-label="Beam elevation in degrees above the horizon"]');
assert("azimuth slider", !!az);
assert("elevation slider", !!elevation);

const scanValue = () => {
  const match = text().match(/SCAN(\d+(?:\.\d)?)°/);
  return match ? Number(match[1]) : NaN;
};

setRange(az, 42);
setRange(elevation, 30);
await wait(1200);
assert("azimuth aimed", text().includes("+42.0°"), phaseWords());
assert("elevation aimed", text().includes("30.0°"));
const scanAt30 = scanValue();
assert(
  "scan angle follows elevation",
  scanAt30 > 55 && scanAt30 < 65,
  String(scanAt30),
);
assert("aiming took over from auto-track", text().includes("manual steering"));

const wordsAt30 = phaseWords();
setRange(elevation, 70);
await wait(1000);
const wordsAt70 = phaseWords();
const scanAt70 = scanValue();
assert("phase words follow the aim", wordsAt30.length > 0 && wordsAt30 !== wordsAt70);
assert("scan angle follows the second aim", scanAt70 > 15 && scanAt70 < 25, String(scanAt70));

/* -------------------------------------------------------------------------- */
/* Sky plot                                                                   */
/* -------------------------------------------------------------------------- */

const plot = $('#simulation [role="application"]');
assert("sky plot present", !!plot);
assert("sky plot is keyboard focusable", plot?.getAttribute("tabindex") === "0");
assert("sky plot has satellites", $$("#simulation svg text").some((t) => t.textContent === "SAT-A"));

/* -------------------------------------------------------------------------- */
/* Fullscreen, reset, numbers                                                 */
/* -------------------------------------------------------------------------- */

const full = byText('#simulation button', "Full view");
assert("full-view button", !!full);
click(full);
await wait(150);
assert("full view active", !!byText('#simulation button', "Exit full view"));

assert("16 phase-row chips", $$("[data-phase-row]").length === 16, String($$("[data-phase-row]").length));
assert("readout table present", text().includes("Wavelength"));
assert("moving parts is zero", text().includes("Moving parts"));

const reset = byText('#simulation button', "↺ Reset");
assert("reset button", !!reset);
click(reset);
await wait(300);
assert(
  "reset returns to tracking SAT-A in the sky view",
  text().includes("tracking") &&
    $('[role="tab"][aria-selected="true"]')?.textContent?.trim() === "Sky" &&
    !!byText('#simulation button', "Pause"),
);

assert("no runtime errors", errors.length === 0, errors.slice(0, 3).join(" | "));
if (errors.length) console.log(errors.join("\n---\n"));
console.log(failures === 0 ? "\ndone" : `\n${failures} check(s) failed.`);

process.exit(failures === 0 ? 0 : 1);
