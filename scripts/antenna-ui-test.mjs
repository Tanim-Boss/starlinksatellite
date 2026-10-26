import { build } from "esbuild";
import { JSDOM, VirtualConsole } from "jsdom";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => { if (e.message?.toLowerCase().includes("not implemented")) return; errors.push("jsdom: " + e.message); });
vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));

const result = await build({
  entryPoints: [path.join(root, "src/main.tsx")],
  bundle: true, write: false, format: "iife", jsx: "automatic",
  loader: { ".css": "empty", ".jpg": "dataurl", ".png": "dataurl" },
  alias: { "@": path.join(root, "src") },
  define: { "process.env.NODE_ENV": '"development"' },
  logLevel: "silent",
});
const code = result.outputFiles[0].text;
const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`, {
  runScripts: "dangerously", pretendToBeVisual: true, url: "http://localhost/#/antenna", virtualConsole: vc,
});
const { window } = dom;
window.IntersectionObserver = class { constructor(cb){this.cb=cb;} observe(el){ this.cb([{isIntersecting:true,target:el,boundingClientRect:{top:0}}], this); } unobserve(){} disconnect(){} };
window.matchMedia = window.matchMedia || ((q) => ({ matches:false, media:q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} }));
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
window.addEventListener("error", (e) => errors.push("window.error: " + e.message + "\n" + e.error?.stack));
window.addEventListener("unhandledrejection", (e) => errors.push("unhandled: " + (e.reason?.stack || e.reason)));
const el = window.document.createElement("script");
el.textContent = code;
window.document.body.appendChild(el);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(1200);

const $ = (sel, root = window.document) => root.querySelector(sel);
const $$ = (sel, root = window.document) => Array.from(root.querySelectorAll(sel));
const main = () => window.document.getElementById("main");
const text = () => main().textContent;
const byText = (tag, t) => $$(tag).find(b => b.textContent?.trim().includes(t));
function assert(name, cond, extra="") { console.log((cond?"ok   ":"FAIL ") + name + (extra?` (${extra})`:"")); if(!cond) process.exitCode = 1; }
function setRange(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(input, String(value));
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  input.dispatchEvent(new window.Event("change", { bubbles: true }));
}

assert("page renders hero title", text().includes("Steering a radio beam"));
assert("lab renders", !!$("#lab"));
assert("elements grid present", $$("[data-idx]").length === 256, String($$("[data-idx]").length));
assert("three view tabs", $$('[role="tab"]').length === 3);
assert("behaviour: initial view is Beam view", $('[role="tab"][aria-selected="true"]')?.textContent?.includes("Beam"));

// slider interaction
const az = $('input[aria-label="Beam azimuth in degrees from north"]');
const elv = $('input[aria-label="Beam elevation in degrees above the horizon"]');
assert("azimuth slider exists", !!az);
assert("elevation slider exists", !!elv);
setRange(az, 42);
setRange(elv, 30);
await wait(200);
const selectedTabText = $('[role="tab"][aria-selected="true"]')?.textContent ?? "";
const azReadout = $$("span").find(s => s.textContent?.trim() === "+42.0°");
assert("azimuth readout updates", text().includes("+42.0°"), selectedTabText);
assert("phase inspector updates", text().includes("Neighbour Δφ east"));
assert("element inspector reflects phase", /relative (phase|delay) ·/.test(text()));

// click an element
const cell = $('[data-idx="255"]');
cell.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await wait(150);
assert("element selection updates", text().includes("C16 · R16"));

// switch to wave view
byText("button", "Wave view").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await wait(150);
assert("wave view selected", $('[role="tab"][aria-selected="true"]')?.textContent?.includes("Wave"));
assert("constructive legend visible", text().includes("constructive"));

// click pattern tab
byText("button", "Radiation pattern").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await wait(150);
assert("pattern view selected", $('[role="tab"][aria-selected="true"]')?.textContent?.includes("Radiation"));

// select satellite A
const satA = $$("button").find(b => b.textContent?.includes("SAT-A") && b.getAttribute("aria-pressed") !== null);
assert("SAT-A selector present", !!satA);
satA.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await wait(300);
assert("target selected", text().includes("Auto-track selected satellite"));
assert("alignment panel", text().includes("Off target") || text().includes("Beam aligned"));

// point at target
const pointBtn = byText("button", "Point the beam at SAT-A now");
assert("point at target button", !!pointBtn);
pointBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await wait(250);
assert("aligned after point-at-target", text().includes("Beam aligned"), "alignment");

// auto track switch
const trackSwitch = $$('button[role="switch"]').find(b => (b.getAttribute("aria-label")||"").includes("Auto-track"));
assert("auto-track switch", !!trackSwitch);
trackSwitch.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await wait(300);
assert("auto-track on", trackSwitch.getAttribute("aria-checked") === "true");

// pause
const pause = byText("button", "Pause");
assert("pause button", !!pause);
pause.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await wait(200);
assert("play button appears", !!byText("button", "Play"));

// speed 0.25
const speedBtn = byText("button", "0.25×");
assert("speed control", !!speedBtn);
speedBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await wait(150);
assert("speed pressed", speedBtn.getAttribute("aria-pressed") === "true");

// manual steering while tracking should release auto-track
const trackBefore = trackSwitch.getAttribute("aria-checked");
setRange(az, 10);
await wait(150);
const trackAfterSwitch = $$('button[role="switch"]').find(b => (b.getAttribute("aria-label")||"").includes("Auto-track"));
assert("manual steering releases auto-track", trackBefore === "true" && trackAfterSwitch.getAttribute("aria-checked") === "false");

// sweep
byText("button", "Sweep across the sky").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await wait(200);
assert("sweep active", text().includes("Stop sweep"));

// guide next through all steps
const nextBtn = () => byText("button", "Next ▶");
assert("guide step 1", text().includes("A flat panel that never turns"));
for (let i = 0; i < 6; i++) { nextBtn().dispatchEvent(new window.MouseEvent("click", { bubbles: true })); await wait(120); }
assert("guide step 7", text().includes("Let the array follow it"));
assert("step 7 auto-track", text().includes("Stop auto-track") || text().includes("auto-track"));
byText("button", "◀ Previous").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await wait(120);
assert("previous step", text().includes("Aim at a satellite"));
byText("button", "↺ Reset").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await wait(250);
assert("reset returns to step 1", text().includes("A flat panel that never turns"));

// camera buttons
byText("button", "Panel").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
byText("button", "Sky").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
await wait(150);
assert("camera controls present", true);

assert("no runtime errors", errors.length === 0, errors.slice(0,3).join(" | "));
if (errors.length) console.log(errors.join("\n---\n"));
console.log("done");

process.exit(process.exitCode ?? 0);
