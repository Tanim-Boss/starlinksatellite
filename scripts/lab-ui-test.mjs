/** DOM interaction test for the new landing-page satellite lab.
 * WebGL is absent in jsdom, so this also verifies its readable fallback.
 */
import { build } from "esbuild";
import { JSDOM, VirtualConsole } from "jsdom";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => {
  if (!/not implemented/i.test(error.message ?? "")) errors.push(`jsdom: ${error.message}`);
});
virtualConsole.on("error", (...args) => errors.push(`console.error: ${args.join(" ")}`));
const result = await build({
  entryPoints: [path.join(root, "src/main.tsx")], bundle: true, write: false, format: "iife", jsx: "automatic",
  loader: { ".css": "empty", ".jpg": "dataurl", ".png": "dataurl" },
  alias: { "@": path.join(root, "src") },
  define: { "process.env.NODE_ENV": '"development"' }, logLevel: "silent",
});
const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
  url: "http://localhost/", runScripts: "dangerously", pretendToBeVisual: true, virtualConsole,
});
const { window } = dom;
window.IntersectionObserver = class {
  constructor(callback) { this.callback = callback; }
  observe(element) { this.callback([{ target: element, isIntersecting: true }], this); }
  unobserve() {}
  disconnect() {}
};
window.matchMedia = (query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
window.addEventListener("error", (event) => errors.push(`window.error: ${event.message}`));
window.addEventListener("unhandledrejection", (event) => errors.push(`rejection: ${event.reason}`));
const script = window.document.createElement("script");
script.textContent = result.outputFiles[0].text;
window.document.body.appendChild(script);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(predicate, timeout = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeout) { if (predicate()) return true; await wait(30); }
  return predicate();
}
const $ = (selector) => window.document.querySelector(selector);
const $$ = (selector) => [...window.document.querySelectorAll(selector)];
const mainText = () => $("#main")?.textContent ?? "";
const button = (text) => $$("button").find((node) => node.textContent.trim() === text);
const ariaButton = (label) => $$("button").find((node) => node.getAttribute("aria-label") === label);
const click = (node) => node?.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
let failures = 0;
function assert(name, condition, detail = "") {
  console.log(`${condition ? "ok   " : "FAIL "}${name}${detail ? ` (${detail})` : ""}`);
  if (!condition) failures += 1;
}

await waitFor(() => mainText().includes("Same sky."));
await wait(200);
assert("new comparison landing page mounts", mainText().includes("Different satellites.") && mainText().includes("See the difference for yourself"));
assert("one h1 and a main landmark", $$("h1").length === 1 && Boolean($("#main h1")));
assert("accessible WebGL fallback", mainText().includes("WebGL unavailable") && mainText().includes("3D VIEW UNAVAILABLE"));
assert("four view controls and Compare initially selected", $$(".lab-view-tabs button").length === 4 && button("Compare")?.getAttribute("aria-pressed") === "true");
assert("comparison gives orbit, direction and latency figures", ["35,786", "~550", "One-way", "Two-way", "~600", "~20–40"].every((value) => mainText().includes(value)));
assert("the educational scale is clearly disclosed", mainText().includes("not live tracking") && mainText().includes("not drawn to scale"));

click(button("The dishes")); await wait(60);
assert("dish view explains receive-only and two-way terminals", button("The dishes")?.getAttribute("aria-pressed") === "true" && mainText().includes("A fixed parabolic dish receives a broadcast") && mainText().includes("A phased array sends and receives"));
assert("orbit and laser controls are disabled in dish view", button("Orbit paths")?.disabled && button("Laser mesh")?.disabled);
click(button("Broadcast")); await wait(60);
assert("broadcast view shows GEO explanation", button("Broadcast")?.getAttribute("aria-pressed") === "true" && mainText().includes("appears fixed over one point"));
click(button("Starlink")); await wait(60);
assert("Starlink view describes moving constellation", button("Starlink")?.getAttribute("aria-pressed") === "true" && mainText().includes("satellite completes an orbit in roughly 95 minutes"));
assert("Starlink view enables laser mesh", button("Laser mesh")?.getAttribute("aria-pressed") === "true" && !button("Laser mesh")?.disabled);
click(button("Laser mesh")); await wait(40);
assert("laser mesh can be turned off", button("Laser mesh")?.getAttribute("aria-pressed") === "false");
click(button("Signals")); await wait(40);
assert("signals layer toggles", button("Signals")?.getAttribute("aria-pressed") === "false");
click(button("Orbit paths")); await wait(40);
assert("orbit layer toggles", button("Orbit paths")?.getAttribute("aria-pressed") === "false");

click(ariaButton("Pause simulation")); await wait(40);
assert("simulation pauses", Boolean(ariaButton("Play simulation")));
click(ariaButton("Play simulation")); await wait(40);
assert("simulation resumes", Boolean(ariaButton("Pause simulation")));
const speed = $("#lab-speed");
if (speed) {
  Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set.call(speed, "600");
  speed.dispatchEvent(new window.Event("change", { bubbles: true }));
}
await wait(40);
assert("simulation speed can be changed", speed?.value === "600");
click(button("Reset view")); await wait(40);
assert("reset view leaves the selected mode intact", button("Starlink")?.getAttribute("aria-pressed") === "true");

click(ariaButton("Expand simulation")); await wait(40);
assert("simulation can be expanded", $(".lab-stage")?.classList.contains("lab-stage--expanded") && Boolean(ariaButton("Exit expanded view")));
window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await wait(40);
assert("Escape exits the expanded view", !$(".lab-stage")?.classList.contains("lab-stage--expanded") && Boolean(ariaButton("Expand simulation")));
click(ariaButton("Open menu")); await wait(40);
assert("mobile navigation opens", Boolean($(".lab-mobile-nav")) && ariaButton("Close menu")?.getAttribute("aria-expanded") === "true");
click(ariaButton("Close menu")); await wait(40);
assert("mobile navigation closes", !$(".lab-mobile-nav"));
const beforeSkipHash = window.location.hash;
click($('a[href="#main"]')); await wait(40);
assert("skip link focuses main without changing the hash route", window.document.activeElement?.id === "main" && window.location.hash === beforeSkipHash);

const reducedDom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: "http://localhost/", runScripts: "dangerously", pretendToBeVisual: true, virtualConsole,
});
const reducedWindow = reducedDom.window;
reducedWindow.matchMedia = (query) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
reducedWindow.scrollTo = () => {};
reducedWindow.HTMLElement.prototype.scrollIntoView = () => {};
const reducedScript = reducedWindow.document.createElement("script");
reducedScript.textContent = result.outputFiles[0].text;
reducedWindow.document.body.appendChild(reducedScript);
await waitFor(() => Boolean(reducedWindow.document.querySelector('button[aria-label="Play simulation"]')));
assert("reduced-motion preference starts the simulation paused", Boolean(reducedWindow.document.querySelector('button[aria-label="Play simulation"]')) && reducedWindow.document.body.textContent.includes("Motion is paused"));
reducedWindow.document.querySelector('button[aria-label="Play simulation"]')?.click();
await wait(40);
assert("reduced-motion users can opt into animation", Boolean(reducedWindow.document.querySelector('button[aria-label="Pause simulation"]')));
reducedWindow.close();
assert("no runtime errors", errors.length === 0, errors.slice(0, 3).join("; "));
console.log(failures ? `\n${failures} lab check(s) failed.` : "\nAll satellite lab interactions passed.");
process.exit(failures ? 1 : 0);
