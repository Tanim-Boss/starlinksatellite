/**
 * Smoke test: mounts the real app in jsdom and visits every route, failing if
 * a page crashes, renders the error fallback, renders nothing, leaves the boot
 * screen in place, or hides content behind a scroll-reveal that never fires.
 * WebGL is not available in jsdom, so 3D scenes must degrade gracefully (that
 * is part of what this test verifies).
 *
 * Run with: node scripts/smoke-test.mjs
 */
import { build } from "esbuild";
import { JSDOM, VirtualConsole } from "jsdom";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const ROUTES = ["/", "/how-it-works", "/antenna", "/explorer", "/numbers", "/faq"];

/** A phrase from each route's own <h1>, used to detect that the new page won. */
const ROUTE_HEADINGS = {
  "/": "How Starlink",
  "/how-it-works": "The whole system",
  "/antenna": "dish that",
  "/explorer": "Fly the constellation",
  "/numbers": "Distance is destiny",
  "/faq": "Questions, answered",
};

const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (e) => {
  // jsdom emits "not implemented" for canvas.getContext — expected without WebGL.
  if (/not implemented/i.test(e.message ?? "")) return;
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

// 2. Boot jsdom with the app shell, including the boot screen index.html ships.
const dom = new JSDOM(
  `<!doctype html><html><head><title>How Starlink Works</title></head><body><div id="root"><div id="boot">Loading the interactive field guide…</div></div></body></html>`,
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

async function waitFor(predicate, timeout = 5000, step = 50) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (predicate()) return true;
    await wait(step);
  }
  return predicate();
}

/** Checks shared by every route visit. */
function inspect(route, label = route) {
  const doc = window.document;
  const main = doc.getElementById("main");
  const text = (main?.textContent ?? "").trim();
  const problems = [];

  if (!main) problems.push("no #main landmark");
  if (text.includes("This view failed to render")) problems.push("error-boundary fallback rendered");
  if (text.length < 40) problems.push(`main content is empty (${text.length} chars)`);

  const boot = doc.getElementById("boot");
  if (boot) problems.push("boot screen still covers the app");

  const headings = doc.querySelectorAll("h1");
  if (headings.length !== 1) problems.push(`expected 1 <h1>, found ${headings.length}`);
  if (headings.length === 1 && !main?.contains(headings[0])) {
    problems.push("<h1> rendered outside the #main landmark");
  }

  if (main && main.querySelector("main")) problems.push("nested <main> landmark (invalid HTML)");

  const stuck = main?.querySelectorAll('[data-reveal="hidden"]') ?? [];
  if (stuck.length) problems.push(`${stuck.length} scroll-reveal block(s) still hidden`);

  const title = doc.title;
  if (!title || title === "How Starlink Works") problems.push(`tab title not updated (${title})`);

  if (problems.length === 0) {
    console.log(`ok   ${label} (${text.length} chars of content)`);
    return true;
  }
  failures++;
  console.log(`FAIL ${label}`);
  for (const problem of problems) console.log(`  -> ${problem}`);
  return false;
}

let failures = 0;

// 3. Visit every route and check what rendered.
for (const route of ROUTES) {
  errors.length = 0;
  window.location.hash = `#${route}`;
  const rendered = await waitFor(() => {
    // The previous page and the Suspense fallback both have text, so wait for
    // this route's own heading rather than any <h1>.
    const heading = window.document.querySelector("#main h1")?.textContent ?? "";
    return heading.includes(ROUTE_HEADINGS[route] ?? "");
  });
  // Give a rejected chunk / late error a moment to surface.
  await wait(250);

  if (!rendered) {
    failures++;
    console.log(`FAIL ${route}`);
    console.log("  -> route never rendered its content");
    for (const err of errors.slice(0, 5)) console.log(`  -> ${err.split(/\r?\n/)[0]}`);
    continue;
  }

  if (errors.length) {
    failures++;
    console.log(`FAIL ${route} (runtime errors)`);
    for (const err of errors.slice(0, 5)) console.log(`  -> ${err.split(/\r?\n/)[0]}`);
    continue;
  }

  inspect(route);
}

// 3b. Unknown routes render the 404 page, not a blank tab.
errors.length = 0;
window.location.hash = "#/definitely-not-a-page";
await waitFor(() =>
  (window.document.querySelector("#main h1")?.textContent ?? "").includes("isn't in the constellation"),
);
if (errors.length) {
  failures++;
  console.log("FAIL 404 route (runtime errors)");
  for (const err of errors.slice(0, 3)) console.log(`  -> ${err.split(/\r?\n/)[0]}`);
} else {
  inspect("/definitely-not-a-page", "404 route");
}

// 4. In-app navigation (the path visitors actually take) must swap pages
// without a reload, and a deep link to a chapter must land on that chapter.
errors.length = 0;
window.location.hash = "#/how-it-works";
await waitFor(() =>
  (window.document.querySelector("#main h1")?.textContent ?? "").includes("The whole system"),
);
window.location.hash = "#/";
await waitFor(() => (window.document.querySelector("#main h1")?.textContent ?? "").includes("How Starlink"));
inspect("/", "navigation /how-it-works -> /");

window.location.hash = "#/how-it-works@lasers";
await waitFor(() => Boolean(window.document.getElementById("lasers")));
if (window.document.getElementById("lasers")) {
  console.log("ok   deep link /how-it-works@lasers resolves its section");
} else {
  failures++;
  console.log("FAIL deep link /how-it-works@lasers did not mount the chapter");
}

// 4b. A real click on a nav link (not just assigning location.hash) must swap
// the page: this is the path a visitor takes, including in webviews where the
// hashchange event can be unreliable.
const numbersLink = window.document.querySelector('a[href="#/numbers"]');
if (!numbersLink) {
  failures++;
  console.log("FAIL no nav link to #/numbers found");
} else {
  numbersLink.click();
  const switched = await waitFor(() =>
    (window.document.querySelector("#main h1")?.textContent ?? "").includes("Distance is destiny"),
  );
  if (switched) {
    console.log("ok   clicking a nav link renders the next page");
  } else {
    failures++;
    console.log("FAIL clicking a nav link did not render the next page");
  }
}

// 5. A silent IntersectionObserver must not strand content. Simulate a webview
// whose observer never calls back and whose blocks all sit below the fold: the
// safety timer has to reveal them, because that failure mode used to make the
// overview and the explainer look blank until a reload.
window.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
const originalRect = window.Element.prototype.getBoundingClientRect;
window.Element.prototype.getBoundingClientRect = function () {
  const rect = originalRect.call(this);
  if (this.classList && this.classList.contains("reveal")) {
    return {
      ...rect,
      top: 5000,
      bottom: 5200,
      height: 200,
      y: 5000,
      toJSON() {},
    };
  }
  return rect;
};
window.location.hash = "#/";
await waitFor(() => (window.document.querySelector("#main h1")?.textContent ?? "").includes("How Starlink"));
window.location.hash = "#/how-it-works";
await waitFor(() =>
  (window.document.querySelector("#main h1")?.textContent ?? "").includes("The whole system"),
);
const armed = window.document.querySelectorAll('[data-reveal="hidden"]').length;
await waitFor(
  () => window.document.querySelectorAll('#main [data-reveal="hidden"]').length === 0,
  3000,
);
const remaining = window.document.querySelectorAll('#main [data-reveal="hidden"]').length;
if (armed > 0 && remaining === 0) {
  console.log(`ok   silent observer: ${armed} deferred block(s) revealed by the safety net`);
} else if (remaining === 0) {
  console.log("ok   silent observer: nothing was deferred (all content above the fold)");
} else {
  failures++;
  console.log(`FAIL silent observer left ${remaining} block(s) hidden`);
}
window.Element.prototype.getBoundingClientRect = originalRect;

// 6. Verify the two guide pages still render in restricted webviews. These
// browsers do not provide matchMedia or IntersectionObserver; both are optional
// enhancements and must not take down the page.
window.matchMedia = undefined;
window.IntersectionObserver = undefined;
for (const route of ["/", "/how-it-works@constellation"]) {
  errors.length = 0;
  window.location.hash = `#${route}`;
  await waitFor(() => {
    const heading = window.document.querySelector("#main h1")?.textContent ?? "";
    const expected = route.split("@")[0];
    return heading.includes(ROUTE_HEADINGS[expected] ?? "");
  });
  await wait(250);
  if (errors.length) {
    failures++;
    console.log(`FAIL ${route} (limited browser APIs)`);
    for (const err of errors.slice(0, 5)) console.log(`  -> ${err.split(/\r?\n/)[0]}`);
    continue;
  }
  inspect(route, `${route} (limited browser APIs)`);
}

console.log(failures === 0 ? "\nAll routes rendered without errors." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
