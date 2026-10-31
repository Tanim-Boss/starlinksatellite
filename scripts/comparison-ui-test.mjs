/**
 * End-to-end DOM smoke test for the Broadcast TV Satellite vs Starlink page.
 *
 * jsdom cannot create a WebGL context, so the 3D scene itself must degrade to
 * the shared "3D view off" state rather than crash the route. This test checks
 * the page shell, that the interactive scene is wired through the site's
 * SceneGate, and that no runtime error reaches the console.
 *
 * The interactive scene itself (WebGL context, R3F render loop, camera
 * controls) can only be exercised in a real browser; jsdom deliberately has no
 * WebGL, so that path is covered by the app's SceneGate error boundary instead.
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
  // jsdom reports "not implemented" for canvas.getContext — expected here.
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
  constructor(callback) {
    this.callback = callback;
  }
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

let failures = 0;
function assert(name, condition, detail = "") {
  console.log(`${condition ? "ok   " : "FAIL "}${name}${detail ? ` (${detail})` : ""}`);
  if (!condition) failures += 1;
}

await waitFor(() => Boolean($("#main h1")));
await wait(300);

const main = $("#main");
const mainText = (main?.textContent ?? "").replace(/\s+/g, " ");
const heading = main?.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim() ?? "";

assert("comparison page title is kept", heading === "Broadcast TV Satellite vs Starlink", heading);
assert("one h1 on the page", $$("h1").length === 1);
assert("site navigation header is rendered", $$("header nav a").length >= 5);

const navLinks = $$("header nav a").map((link) => link.getAttribute("href"));
assert(
  "old steering, explorer and numbers routes removed from nav",
  !navLinks.some((href) => ["#/steering", "#/explorer", "#/numbers"].includes(href)),
);

assert("page did not fall back to the error screen", !mainText.includes("This view failed to render"));
assert("page lede is present", mainText.includes("35,786 km") && mainText.includes("550 km"));

// The 3D stage is the site's error-guarded SceneGate, not a bare <Canvas>.
assert("comparison stage is present", Boolean($("#comparison")));
assert("no obsolete <video> player is rendered", !$("#main video"));
assert("video asset is no longer required by the page", !mainText.includes("Download the video"));

// Without WebGL the gate swaps the canvas for an explanation instead of
// crashing the route; both states keep the page usable.
assert("3D gate degrades gracefully without WebGL", mainText.includes("3D view off"));

assert("old six-stage simulation UI is removed", $$('button[aria-label^="Go to stage"]').length === 0 && !$(".sat-comparison"));
assert(
  "old stage pills and tour text are removed",
  !mainText.includes("6 guided stages") && !mainText.includes("78-second tour"),
);
assert("comparison text remains available without WebGL", Boolean($("#differences-heading")) && $$("#comparison tbody tr").length === 6);
assert("coverage figures and limitations are explained", mainText.includes("4.0%") && mainText.includes("42.4%") && mainText.includes("not actual radio beams"));
assert("no runtime errors", errors.length === 0, errors.slice(0, 3).join("; "));

console.log(failures === 0 ? "\nAll comparison view checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
