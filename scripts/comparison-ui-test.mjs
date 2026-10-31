/**
 * End-to-end DOM smoke test for the Broadcast TV Satellite vs Starlink video page.
 * Verifies that #/comparison keeps the site navigation and page heading, removes
 * the old six-stage simulation UI, and renders the repository video player.
 */
import { build } from "esbuild";
import { JSDOM, VirtualConsole } from "jsdom";
import fs from "node:fs";
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

let failures = 0;
function assert(name, condition, detail = "") {
  console.log(`${condition ? "ok   " : "FAIL "}${name}${detail ? ` (${detail})` : ""}`);
  if (!condition) failures += 1;
}

await waitFor(() => Boolean($("#main h1")));
await wait(200);

const heading = $("#main h1")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
assert("comparison page title is kept", heading === "Broadcast TV Satellite vs Starlink", heading);
assert("one h1 on the page", $$("h1").length === 1);
assert("site navigation header is rendered", $$("header nav a").length >= 5);

const navLinks = $$("header nav a").map((link) => link.getAttribute("href"));
assert("old steering, explorer and numbers routes removed from nav", !navLinks.some((href) => ["#/steering", "#/explorer", "#/numbers"].includes(href)));

const video = $("#main video");
assert("video player is rendered inside main", Boolean(video));
assert(
  "video player uses controls and playsInline",
  Boolean(video?.hasAttribute("controls")) && Boolean(video?.hasAttribute("playsinline")),
);
const videoSrc = video?.getAttribute("src") ?? "";
assert(
  "video points to the repo video in public/videos",
  videoSrc.endsWith("/videos/broadcast-vs-starlink.mp4"),
  videoSrc,
);

const videoDiskPath = path.join(root, "public", "videos", "broadcast-vs-starlink.mp4");
assert(
  "video asset exists on disk and is non-empty",
  fs.existsSync(videoDiskPath) && fs.statSync(videoDiskPath).size > 1_000_000,
);

assert("old six-stage simulation UI is removed", $$('button[aria-label^="Go to stage"]').length === 0 && !$(".sat-comparison"));
assert("old stage pills and tour text are removed", !($("#main")?.textContent ?? "").includes("6 guided stages") && !($("#main")?.textContent ?? "").includes("78-second tour"));
assert("no runtime errors", errors.length === 0, errors.slice(0, 3).join("; "));

console.log(failures === 0 ? "\nAll comparison video checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
