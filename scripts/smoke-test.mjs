/**
 * Smoke test: mounts the real app in jsdom and visits every route, failing if
 * a page crashes, renders the error fallback, or renders nothing. WebGL is not
 * available in jsdom, so 3D scenes must degrade gracefully (that is part of
 * what this test verifies).
 *
 * Run with: node scripts/smoke-test.mjs
 */
import { build } from "esbuild";
import { JSDOM, VirtualConsole } from "jsdom";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const ROUTES = ["/", "/how-it-works", "/beam", "/antenna", "/explorer", "/numbers", "/faq"];

const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (e) => {
  // jsdom emits "not implemented" for canvas.getContext — expected without WebGL.
  if (e.message?.includes("not implemented")) return;
  errors.push(`jsdomError: ${e.message}\n${e.stack ?? ""}`);
});
virtualConsole.on("error", (...args) => errors.push(`console.error: ${args.join(" ")}`));

// 1. Bundle the app exactly like the browser would load it.
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

// 2. Boot jsdom with the app shell.
const dom = new JSDOM(
  `<!doctype html><html><body><div id="root"></div></body></html>`,
  { runScripts: "dangerously", pretendToBeVisual: true, url: "http://localhost/", virtualConsole },
);
const { window } = dom;

// Minimal IntersectionObserver stub: everything is "intersecting" immediately.
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
  ((query) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }));
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};

window.addEventListener("error", (e) => errors.push(`window.error: ${e.message}\n${e.error?.stack ?? ""}`));
window.addEventListener("unhandledrejection", (e) =>
  errors.push(`unhandledrejection: ${e.reason?.message ?? e.reason}`),
);

const el = window.document.createElement("script");
el.textContent = code;
window.document.body.appendChild(el);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(400);

// 3. Visit every route and check what rendered.
let failures = 0;
for (const route of ROUTES) {
  errors.length = 0;
  window.location.hash = `#${route}`;
  await wait(700);

  const main = window.document.getElementById("main");
  const text = (main?.textContent ?? "").trim();
  const crashed = text.includes("This view failed to render");
  const empty = text.length < 40;

  if (crashed || empty || errors.length) {
    failures++;
    console.log(`FAIL ${route}`);
    if (crashed) console.log(`  -> error-boundary fallback rendered`);
    if (empty) console.log(`  -> main content is empty (${text.length} chars)`);
    for (const err of errors.slice(0, 5)) console.log(`  -> ${err.split(/\r?\n/)[0]}`);
  } else {
    console.log(`ok   ${route} (${text.length} chars of content)`);
  }
}

// 4. Verify the two guide pages still render in restricted webviews. These
// browsers do not provide matchMedia or IntersectionObserver; both are optional
// enhancements and must not take down the page.
window.matchMedia = undefined;
window.IntersectionObserver = undefined;
for (const route of ["/", "/how-it-works@constellation"]) {
  errors.length = 0;
  window.location.hash = `#${route}`;
  await wait(700);

  const main = window.document.getElementById("main");
  const text = (main?.textContent ?? "").trim();
  const crashed = text.includes("This view failed to render");
  const empty = text.length < 40;

  if (crashed || empty || errors.length) {
    failures++;
    console.log(`FAIL ${route} (limited browser APIs)`);
    if (crashed) console.log(`  -> error-boundary fallback rendered`);
    if (empty) console.log(`  -> main content is empty (${text.length} chars)`);
    for (const err of errors.slice(0, 5)) console.log(`  -> ${err.split(/\r?\n/)[0]}`);
  } else {
    console.log(`ok   ${route} (limited browser APIs, ${text.length} chars of content)`);
  }
}

console.log(failures === 0 ? "\nAll routes rendered without errors." : `\n${failures} route(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
