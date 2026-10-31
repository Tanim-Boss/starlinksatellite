/**
 * End-to-end DOM smoke test for the six-stage satellite comparison.
 * WebGL is intentionally absent in jsdom; the UI, fallback, story controls,
 * counters, location selector and comparison table must still work.
 */
import { build } from "esbuild";
import { JSDOM, VirtualConsole } from "jsdom";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => {
  if (/not implemented/i.test(error.message ?? "")) return;
  errors.push(`jsdom: ${error.message}`);
});
virtualConsole.on("error", (...args) => errors.push(`console.error: ${args.join(" ")}`));

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

const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`, {
  runScripts: "dangerously",
  pretendToBeVisual: true,
  url: "http://localhost/#/comparison",
  virtualConsole,
});
const { window } = dom;
window.IntersectionObserver = class {
  constructor(callback) { this.callback = callback; }
  observe(element) {
    this.callback([{ isIntersecting: true, target: element, boundingClientRect: { top: 0 } }], this);
  }
  unobserve() {}
  disconnect() {}
};
window.matchMedia = (query) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
});
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
window.addEventListener("error", (event) => errors.push(`window.error: ${event.message}`));
window.addEventListener("unhandledrejection", (event) => errors.push(`rejection: ${event.reason}`));

const script = window.document.createElement("script");
script.textContent = result.outputFiles[0].text;
window.document.body.appendChild(script);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(predicate, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (predicate()) return true;
    await wait(40);
  }
  return predicate();
}
const $ = (selector) => window.document.querySelector(selector);
const $$ = (selector) => [...window.document.querySelectorAll(selector)];
const mainText = () => $("#main")?.textContent ?? "";
const button = (label) => $$('button').find((item) => item.getAttribute("aria-label") === label || item.textContent?.includes(label));
const click = (element) => element?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
const key = (value, code = value) => window.dispatchEvent(new window.KeyboardEvent("keydown", { key: value, code, bubbles: true }));
const stageButton = (number) => $$('button[aria-label^="Go to stage"]').find((item) => item.getAttribute("aria-label")?.startsWith(`Go to stage ${number}:`));

let failures = 0;
function assert(name, condition, detail = "") {
  console.log(`${condition ? "ok   " : "FAIL "}${name}${detail ? ` (${detail})` : ""}`);
  if (!condition) failures += 1;
}

await wait(1100);
assert("comparison page title", mainText().includes("Broadcast TV Satellite vs Starlink"));
assert("one h1 on the page", window.document.querySelectorAll("h1").length === 1);
assert("six direct stage-jump buttons", $$('button[aria-label^="Go to stage"]').length === 6);
assert("WebGL-unavailable fallback is readable", mainText().includes("WebGL unavailable"));
assert("first stage names both dishes", mainText().includes("TV Satellite Dish") && mainText().includes("Starlink Dishy"));
assert("tour and progress UI are present", !!button("Play tour") && !!$("[role='progressbar']"));

// The removed top-level pages are no longer exposed in navigation.
const navLinks = $$('header nav a').map((link) => link.getAttribute("href"));
assert("old steering, explorer and numbers routes removed from nav", !navLinks.some((href) => ["#/steering", "#/explorer", "#/numbers"].includes(href)));

click(button("Next →"));
await wait(80);
assert("stage 2 shows receive-only versus two-way specs", mainText().includes("Receive ✓ / Send ✗") && mainText().includes("Receive ✓ / Send ✓"));
assert("stage 2 caption describes broadcast and requests", mainText().includes("passively collects a signal") && mainText().includes("transmits your requests"));

click(button("Next →"));
await wait(80);
assert("stage 3 presents GEO and LEO orbit data", mainText().includes("35,786 km") && mainText().includes("~550 km"));
assert("true and exaggerated scale controls exist", !!button("True scale") && !!button("Exaggerated scale"));
click(button("Exaggerated scale"));
await wait(40);
assert("scale toggle becomes selected", button("Exaggerated scale")?.getAttribute("aria-pressed") === "true");
const speed = $("#sc-time-speed");
if (speed) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(speed, "3");
  speed.dispatchEvent(new window.Event("input", { bubbles: true }));
  speed.dispatchEvent(new window.Event("change", { bubbles: true }));
}
await wait(60);
assert("time slider supports 3000 times speed", mainText().includes("3,000×"));
assert("orbit, laser-link and label layers are toggleable", !!button("Orbits") && !!button("Laser links") && !!button("Labels"));

click(stageButton(4));
await wait(60);
assert("stage 4 has synchronized latency readouts and Send action", mainText().includes("TV/GEO internet") && mainText().includes("20–40 ms latency") && !!button("Send both pulses"));
click(button("Send both pulses"));
await wait(180);
assert("Send starts a live stopwatch", /stopwatch\s+[1-9]\d*\s*ms/i.test(mainText()));

click(stageButton(5));
await wait(250);
assert("stage 5 shows animated constellation counter and mesh note", mainText().includes("satellites") && mainText().includes("4-neighbour laser mesh"));

click(stageButton(6));
await wait(100);
assert("stage 6 defaults to Dhaka and shows the final comparison table", mainText().includes("Dhaka, Bangladesh") && mainText().includes("TV Satellite") && mainText().includes("Coverage per satellite"));
const location = $("#sc-location");
if (location) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
  setter.call(location, "London, UK");
  location.dispatchEvent(new window.Event("change", { bubbles: true }));
}
await wait(60);
assert("location selector updates the selected city", mainText().includes("London, UK"));
assert("about note mentions exaggerated sizes and real orbit physics", mainText().includes("beam widths are exaggerated") && mainText().includes("Orbital altitudes, speeds, periods"));

click(button("Play tour"));
await wait(60);
assert("Play tour enters timed guided mode", button("Stop tour")?.getAttribute("aria-pressed") === "true");
click(button("Stop tour"));
await wait(40);
assert("tour can be stopped", button("Play tour")?.getAttribute("aria-pressed") === "false");

key("2");
await wait(40);
assert("number keys jump to a stage", stageButton(2)?.getAttribute("aria-current") === "step");
key("ArrowRight", "ArrowRight");
await wait(40);
assert("arrow keys advance the story", stageButton(3)?.getAttribute("aria-current") === "step");

assert("no runtime errors", errors.length === 0, errors.slice(0, 3).join("; "));
console.log(failures === 0 ? "\nAll comparison interactions passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
