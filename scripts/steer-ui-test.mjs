/**
 * Interaction test for the satellite beam-steering lab.
 *
 * Boots the real app in jsdom (no WebGL, so the canvas degrades to the
 * labelled fallback) and drives the controls a visitor actually uses: link
 * technology, target selection, the auto-tracking switch, both sliders,
 * play/pause, speed, camera views and every display toggle. The instruments
 * and narrative must keep working without a 3D context.
 *
 * Run with: node scripts/steer-ui-test.mjs
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

const dom = new JSDOM(
  `<!doctype html><html><body><div id="root"></div></body></html>`,
  {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    url: "http://localhost/#/steering",
    virtualConsole: vc,
  },
);
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
window.addEventListener("error", (e) => errors.push("window.error: " + e.message));
window.addEventListener("unhandledrejection", (e) =>
  errors.push("unhandled: " + (e.reason?.stack || e.reason)),
);

const el = window.document.createElement("script");
el.textContent = result.outputFiles[0].text;
window.document.body.appendChild(el);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(1200);

const $ = (sel, scope = window.document) => scope.querySelector(sel);
const $$ = (sel, scope = window.document) => Array.from(scope.querySelectorAll(sel));
const main = () => window.document.getElementById("main");
const text = () => main()?.textContent ?? "";
const byText = (tag, t) => $$(tag).find((b) => b.textContent?.includes(t));
const click = (node) => node?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
const lab = () => $("#simulation");

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

/* -------------------------------------------------------------------------- */
/* Page and fallback                                                           */
/* -------------------------------------------------------------------------- */

assert("hero renders", text().includes("Steer the beam"));
assert("simulator is on the page", !!lab());
assert("five-stage rail renders", $$("#simulation ol[aria-label='Simulation stages'] li").length === 5);
assert("scene degrades without WebGL", text().includes("needs WebGL"));
assert("initial narrative is the A link", text().includes("Locked onto Satellite A"));
assert("telemetry card present", text().includes("PTG ERROR"));

/* -------------------------------------------------------------------------- */
/* Technology modes                                                            */
/* -------------------------------------------------------------------------- */

const optical = byText("#simulation button", "Optical laser");
assert("optical mode button", !!optical);
click(optical);
await wait(150);
assert("optical mode selected", optical.getAttribute("aria-pressed") === "true");
assert("PAT status vocabulary appears", text().includes("PAT"));

const rf = byText("#simulation button", "RF dish");
click(rf);
await wait(150);
assert("RF mode reselected", rf.getAttribute("aria-pressed") === "true");

/* -------------------------------------------------------------------------- */
/* Target handover A → B                                                       */
/* -------------------------------------------------------------------------- */

const targetB = $$("#simulation button[aria-pressed]").find((b) =>
  b.textContent?.includes("SATELLITE B"),
);
assert("Satellite B target button", !!targetB);
click(targetB);
await wait(200);
assert("Satellite B selected", targetB.getAttribute("aria-pressed") === "true");
assert("selection narrative appears", text().includes("new target has been selected"));
assert("telemetry names Satellite B", text().includes("SATELLITE B"));

// The gimbal slews (first-order, ~1 s) and then locks the new link.
await wait(900);
assert("steering narrative appears", text().includes("rotating toward Satellite B"));
await wait(2200);
assert("reacquisition narrative appears", text().includes("Communication link established"));
assert("link locked status", text().includes("LINK LOCKED"));

/* -------------------------------------------------------------------------- */
/* Auto tracking and manual sliders                                            */
/* -------------------------------------------------------------------------- */

const autoSwitch = $("#simulation [role='switch']");
assert("auto-tracking switch", !!autoSwitch);
assert("auto tracking starts on", autoSwitch.getAttribute("aria-checked") === "true");
click(autoSwitch);
await wait(150);
assert("auto tracking switches off", autoSwitch.getAttribute("aria-checked") === "false");
assert("manual narrative appears", text().includes("commanding the gimbal"));

const az = $('#simulation input[aria-label="Antenna azimuth in degrees"]');
const elevation = $('#simulation input[aria-label="Antenna elevation in degrees"]');
assert("azimuth slider", !!az);
assert("elevation slider", !!elevation);
assert("sliders enable in manual", !az.disabled && !elevation.disabled);

setRange(az, 80);
setRange(elevation, 20);
await wait(700);
assert("azimuth commanded", text().includes("+80.0°"));
assert("elevation commanded", text().includes("+20.0°"));
assert("manual status shown", text().includes("MANUAL AIM"));

// Back to auto: the gimbal should converge on B again.
click(autoSwitch);
await wait(2600);
assert("auto tracking relocks", text().includes("LINK LOCKED"));

/* -------------------------------------------------------------------------- */
/* Transport, speed, toggles, camera                                           */
/* -------------------------------------------------------------------------- */

const pause = byText("#simulation button", "Pause");
click(pause);
await wait(200);
assert("pause works", !!byText("#simulation button", "Play"));
assert("paused chip shows", text().includes("paused"));
click(byText("#simulation button", "Play"));
await wait(150);

const fast = byText("#simulation button", "Fast");
assert("speed control exists", !!fast);
click(fast);
await wait(120);
assert("fast speed selected", fast.getAttribute("aria-pressed") === "true");

const waveToggle = byText("#simulation button", "Wavefronts");
assert("wavefronts toggle", !!waveToggle);
click(waveToggle);
await wait(120);
assert("wavefronts toggle off", waveToggle.getAttribute("aria-pressed") === "false");
click(waveToggle);

const lineToggle = byText("#simulation button", "Tracking line");
click(lineToggle);
await wait(120);
assert("tracking-line toggle off", lineToggle.getAttribute("aria-pressed") === "false");
click(lineToggle);

const labelsToggle = byText("#simulation button", "Labels");
click(labelsToggle);
await wait(120);
assert("labels toggle off", labelsToggle.getAttribute("aria-pressed") === "false");
click(labelsToggle);

const mech = byText("#simulation button", "Mechanism");
assert("mechanism camera button", !!mech);
click(mech);
await wait(200);
assert("mechanism view selected", mech.getAttribute("aria-pressed") === "true");
assert("mechanism narrative appears", text().includes("Two axes"));
assert("stage five highlighted", !!$("[aria-current='true']"));

const resetView = byText("#simulation button", "Reset view");
assert("reset-view button", !!resetView);
click(resetView);
await wait(150);

const full = byText("#simulation button", "Full view");
assert("full-view button", !!full);
click(full);
await wait(150);
assert("full view active", !!byText("#simulation button", "Exit full view"));

/* -------------------------------------------------------------------------- */
/* Reset                                                                       */
/* -------------------------------------------------------------------------- */

const reset = byText("#simulation button", "↺ Reset");
assert("reset button", !!reset);
click(reset);
await wait(400);
assert(
  "reset restores the A link",
  text().includes("Locked onto Satellite A") &&
    autoSwitch.getAttribute("aria-checked") === "true" &&
    !!byText("#simulation button", "Pause"),
);

assert("no runtime errors", errors.length === 0, errors.slice(0, 3).join(" | "));
if (errors.length) console.log(errors.join("\n---\n"));
console.log(failures === 0 ? "\ndone" : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
