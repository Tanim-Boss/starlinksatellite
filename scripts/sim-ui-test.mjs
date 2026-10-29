/**
 * Interaction test for the satellite internet simulation page.
 *
 * Boots the real app in jsdom (no WebGL, so the canvas degrades to the
 * labelled fallback) and drives the controls a visitor actually uses:
 * play/pause, time speed, camera modes, display toggles, the location
 * selectors, Story Mode and the keyboard shortcuts. The instruments must
 * keep working without a 3D context.
 *
 * Run with: node scripts/sim-ui-test.mjs
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
  plugins: [
    {
      name: "empty-css-modules",
      setup(build) {
        build.onLoad({ filter: /\.module\.css$/ }, () => ({
          contents: "export default {};",
          loader: "js",
        }));
      },
    },
  ],
  alias: { "@": path.join(root, "src") },
  define: { "process.env.NODE_ENV": '"development"' },
  logLevel: "silent",
});

const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`, {
  runScripts: "dangerously",
  pretendToBeVisual: true,
  url: "http://localhost/#/simulation",
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
const byText = (tag, t, scope) => $$(tag, scope).find((b) => b.textContent?.includes(t));
const click = (node) => node?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
const sim = () => $("#simulation");

let failures = 0;
function assert(name, cond, extra = "") {
  console.log((cond ? "ok   " : "FAIL ") + name + (extra ? ` (${extra})` : ""));
  if (!cond) {
    failures += 1;
    process.exitCode = 1;
  }
}
function setSelect(select, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
  setter.call(select, value);
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
}
function key(k, code) {
  window.dispatchEvent(new window.KeyboardEvent("keydown", { key: k, code: code ?? k, bubbles: true }));
}

/* -------------------------------------------------------------------------- */
/* Page and fallback                                                           */
/* -------------------------------------------------------------------------- */

assert("hero renders", text().includes("satellite internet"));
assert("simulation section is on the page", !!sim());
assert("3D stage degrades without WebGL", text().includes("WebGL unavailable"));
assert("HUD telemetry card present", text().includes("SIM TIME"));
assert("legend present", text().includes("Radio link"));
assert("location selects present", !!$("#sim-user-location") && !!$("#sim-gateway-location"));

/* -------------------------------------------------------------------------- */
/* Transport: play/pause and time speed                                        */
/* -------------------------------------------------------------------------- */

const pauseBtn = byText("#simulation button", "Pause");
assert("starts playing (pause button shown)", !!pauseBtn);
click(pauseBtn);
await wait(120);
assert("pause button toggles to play", !!byText("#simulation button", "Play"));
click(byText("#simulation button", "Play"));
await wait(120);
assert("play toggles back to pause", !!byText("#simulation button", "Pause"));

const speed60 = byText("#simulation button", "60×");
click(speed60);
await wait(120);
assert("60x speed chip selected", speed60.getAttribute("aria-pressed") === "true");
const speed3000 = byText("#simulation button", "3000×");
click(speed3000);
await wait(120);
assert("3000x speed chip selected", speed3000.getAttribute("aria-pressed") === "true");

/* -------------------------------------------------------------------------- */
/* Camera modes                                                                */
/* -------------------------------------------------------------------------- */

for (const label of ["Orbit", "Dish", "Laser"]) {
  const chip = byText("#simulation button", label);
  click(chip);
  await wait(120);
  assert(`camera mode ${label} toggles`, chip.getAttribute("aria-pressed") === "true");
}

/* -------------------------------------------------------------------------- */
/* 3D view controls: zoom, reset/full view, scroll mode                        */
/* -------------------------------------------------------------------------- */

assert("zoom in button present", !!$("[aria-label='Zoom in']"));
assert("zoom out button present", !!$("[aria-label='Zoom out']"));
assert("zoom slider present", !!$("#sim-zoom-slider"));
click($("[aria-label='Zoom in']"));
await wait(120);
assert(
  "zoom in returns to Orbit view",
  byText("#simulation button", "Orbit")?.getAttribute("aria-pressed") === "true",
);
const zoomPctAfterIn = parseInt($("#sim-zoom-slider").value, 10);
assert("zoom slider moved up after zoom in", zoomPctAfterIn > 0, `${zoomPctAfterIn}%`);
click($("[aria-label='Zoom out']"));
await wait(120);
assert(
  "zoom slider moved down after zoom out",
  parseInt($("#sim-zoom-slider").value, 10) < zoomPctAfterIn,
);
click(byText("#simulation button", "Reset view"));
await wait(120);
assert(
  "reset view keeps Orbit view",
  byText("#simulation button", "Orbit")?.getAttribute("aria-pressed") === "true",
);
assert("full view button present", !!byText("#simulation button", "Full view"));
const scrollPageBtn = byText("#simulation button", "Scroll page");
assert("scroll-mode switch present", !!scrollPageBtn);
click(scrollPageBtn);
await wait(120);
assert("scroll page mode selected", scrollPageBtn.getAttribute("aria-pressed") === "true");
click(byText("#simulation button", "Scroll zooms"));
await wait(120);
assert(
  "scroll zoom mode selected back",
  byText("#simulation button", "Scroll zooms")?.getAttribute("aria-pressed") === "true",
);
key("+");
await wait(120);
assert("keyboard + zooms (slider rises)", parseInt($("#sim-zoom-slider").value, 10) >= zoomPctAfterIn);
key("0");
await wait(120);
assert("keyboard 0 resets view", parseInt($("#sim-zoom-slider").value, 10) < 100);

/* -------------------------------------------------------------------------- */
/* Display toggles                                                             */
/* -------------------------------------------------------------------------- */

for (const label of ["Orbit rings", "Laser mesh", "Labels", "Dish beam"]) {
  const chip = byText("#simulation button", label);
  const before = chip.getAttribute("aria-pressed");
  click(chip);
  await wait(120);
  assert(`toggle ${label} flips`, chip.getAttribute("aria-pressed") !== before);
  click(chip);
  await wait(120);
  assert(`toggle ${label} flips back`, chip.getAttribute("aria-pressed") === before);
}

/* -------------------------------------------------------------------------- */
/* Location selectors                                                          */
/* -------------------------------------------------------------------------- */

const userSelect = $("#sim-user-location");
setSelect(userSelect, "40.71,-74.01");
await wait(120);
assert("user location select updates", userSelect.value === "40.71,-74.01");

const gatewaySelect = $("#sim-gateway-location");
setSelect(gatewaySelect, "-33.87,151.21");
await wait(120);
assert("gateway select updates", gatewaySelect.value === "-33.87,151.21");

/* -------------------------------------------------------------------------- */
/* Story Mode                                                                  */
/* -------------------------------------------------------------------------- */

const storyBtn = byText("#simulation button", "Story Mode");
click(storyBtn);
await wait(120);
assert("story mode starts", !!byText("#simulation button", "Stop story"));
click(byText("#simulation button", "Stop story"));
await wait(120);
assert("story mode stops", !!byText("#simulation button", "Story Mode"));

/* -------------------------------------------------------------------------- */
/* Keyboard shortcuts                                                          */
/* -------------------------------------------------------------------------- */

key(" ", "Space");
await wait(120);
assert("space key pauses", !!byText("#simulation button", "Play"));
key(" ", "Space");
await wait(120);
assert("space key resumes", !!byText("#simulation button", "Pause"));
key("2");
await wait(120);
assert("keyboard camera switch", byText("#simulation button", "Dish")?.getAttribute("aria-pressed") === "true");
key("o");
await wait(120);
assert("keyboard orbit-rings toggle", byText("#simulation button", "Orbit rings")?.getAttribute("aria-pressed") === "true");

/* -------------------------------------------------------------------------- */

if (errors.length) {
  failures += 1;
  console.log("FAIL runtime errors");
  for (const err of errors.slice(0, 8)) console.log("  -> " + err.split(/\r?\n/)[0]);
} else {
  console.log("ok   no runtime errors");
}

console.log(failures === 0 ? "\nAll simulation UI checks passed." : `\n${failures} check(s) failed.`);
