/**
 * DOM interaction test for the Computer Network learning lab.
 *
 * Boots the real bundle in jsdom, walks every lab page and drives the actual
 * controls: clicking diagram components, firing a packet, cutting the cable,
 * taking a client offline, switching media, answering quizzes, ordering the
 * challenge sequence and running the protocol-rules simulation. A second
 * document with `prefers-reduced-motion: reduce` checks the calmer path.
 *
 * Run with: node scripts/network-ui-test.mjs
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

function makeWindow(reducedMotion = false, hash = "#/") {
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
    url: `http://localhost/${hash}`,
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole,
  });
  const { window } = dom;
  window.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
    }
    observe(element) {
      this.callback([{ target: element, isIntersecting: true }], this);
    }
    unobserve() {}
    disconnect() {}
  };
  window.matchMedia = (query) => ({
    matches: reducedMotion && /reduced-motion/.test(query),
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
  return window;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(predicate, timeout = 6000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (predicate()) return true;
    await wait(30);
  }
  return predicate();
}

let failures = 0;
function assert(name, condition, detail = "") {
  console.log(`${condition ? "ok   " : "FAIL "}${name}${detail ? ` (${detail})` : ""}`);
  if (!condition) failures += 1;
}

const window_ = makeWindow();
const $ = (selector) => window_.document.querySelector(selector);
const $$ = (selector) => [...window_.document.querySelectorAll(selector)];
const mainText = () => $("#main")?.textContent ?? "";
const click = (node) =>
  node?.dispatchEvent(new window_.MouseEvent("click", { bubbles: true, cancelable: true }));
/** Exact-label button. */
const button = (label) => $$("button").find((node) => node.textContent.trim() === label);
/** First button whose text contains the label (cards carry extra text). */
const buttonWith = (label) => $$("button").find((node) => node.textContent.includes(label));
const ariaButton = (label) =>
  $$("button").find((node) => node.getAttribute("aria-label") === label);

async function goto(hash, heading) {
  window_.location.hash = hash;
  const arrived = await waitFor(() =>
    (window_.document.querySelector("#main h1")?.textContent ?? "").includes(heading),
  );
  assert(`${hash} renders`, arrived, heading);
  await wait(60);
}

/**
 * Picks a radio inside a quiz question. A native `click()` (not a synthesised
 * event) is what runs the activation behaviour React listens for.
 */
function choose(selector) {
  const input = $(selector);
  if (!input) return false;
  input.click();
  return true;
}

/* -------------------------------------------------------------------------- */
/* 1. Home hub: both project menus, every lab page reachable                   */
/* -------------------------------------------------------------------------- */

await waitFor(() => mainText().includes("দুটি প্রজেক্ট"));
await wait(120);
assert("home hub mounts with both project menus", mainText().includes("স্যাটেলাইট সিমুলেশন") && mainText().includes("কম্পিউটার নেটওয়ার্ক ল্যাব"));
assert("home hub links to the satellite project", Boolean($('a[href="#/satellite"]')));
const hubNetworkLinks = $$('main a[href^="#/network"]');
assert("home hub links to every network lab page", hubNetworkLinks.length >= 10, `${hubNetworkLinks.length} links`);
assert("one h1 on the hub", $$("h1").length === 1);

const networkMenu = ariaButton("Computer Network পৃষ্ঠাগুলো দেখাও");
click(networkMenu);
await wait(60);
assert("site header Computer Network menu opens", networkMenu?.getAttribute("aria-expanded") === "true");
assert("the open menu lists the lab pages", Boolean($('a[href="#/network/playground"]')));
click(networkMenu);
await wait(60);
assert("the menu closes again", networkMenu?.getAttribute("aria-expanded") === "false");

/* -------------------------------------------------------------------------- */
/* 2. Playground                                                               */
/* -------------------------------------------------------------------------- */

await goto("#/network", "কম্পিউটার নেটওয়ার্ক ল্যাব");
assert("lab home explains what a network is", mainText().includes("দুই বা তার বেশি কম্পিউটার"));

await goto("#/network/playground", "ইন্টারঅ্যাক্টিভ নেটওয়ার্ক প্লেগ্রাউন্ড");
assert("diagram exposes clickable components", $$('svg g[role="button"]').length >= 6, `${$$('svg g[role="button"]').length} nodes`);
assert("the diagram is labelled as a simulation", mainText().includes("শিক্ষামূলক সিমুলেশন"));

// clicking a component shows what it does
click($$('svg g[role="button"]').find((node) => node.getAttribute("aria-label")?.startsWith("সার্ভার")));
await wait(60);
assert("clicking the server explains it", mainText().includes("সার্ভিস বা রিসোর্স সরবরাহ করে"));
click(buttonWith("মিডিয়া"));
await wait(60);
assert("the component chips work too", mainText().includes("ডাটা বহন করে এক প্রান্ত থেকে অন্য প্রান্তে"));

// firing a request starts the packet and lists every step
click(button("রিকোয়েস্ট পাঠাও"));
await wait(80);
assert("sending a request lists the packet steps", mainText().includes("প্যাকেটের ধাপসমূহ (১/৬)"));
assert("the first step explains the client request", mainText().includes("request তৈরি হলো"));
assert("step back is disabled at the first step", button("আগের ধাপ")?.disabled === true);

click(button("পরের ধাপ"));
await wait(60);
assert("stepping forward moves the packet", mainText().includes("প্যাকেটের ধাপসমূহ (২/৬)"));
assert("each step carries its own explanation", mainText().includes("NIC প্যাকেটকে মিডিয়ার উপযোগী সংকেতে রূপান্তর করল"));
click(button("আগের ধাপ"));
await wait(60);
assert("stepping back returns to the previous step", mainText().includes("প্যাকেটের ধাপসমূহ (১/৬)"));

// autoplay really animates
click(button("রিকোয়েস্ট পাঠাও"));
const autoPlayed = await waitFor(() => mainText().includes("প্যাকেটের ধাপসমূহ (২/৬)"), 4000);
assert("the packet animates on its own", autoPlayed);
click(button("থামাও"));
await wait(40);
assert("the packet can be paused", button("চালু করো") !== undefined);
click(button("রিসেট"));
await wait(60);
assert("reset clears the journey", !mainText().includes("প্যাকেটের ধাপসমূহ"));

// cutting the cable breaks the path
click(ariaButton("Client A-এর সংযোগ বিচ্ছিন্ন করো") ?? $$("button[role='switch']")[1]);
await wait(60);
click(button("রিকোয়েস্ট পাঠাও"));
await wait(80);
assert("a disconnected cable stops the packet", mainText().includes("সংযোগ বিচ্ছিন্ন"));
click($$("button[role='switch']")[1]);
await wait(60);

// opening the link between switch and server stops every client
click($$("button[role='switch']")[2]);
await wait(60);
click(button("রিকোয়েস্ট পাঠাও"));
await wait(80);
assert("an open uplink keeps every client from the server", mainText().includes("সার্ভারে পৌঁছাতে পারে না"));
click($$("button[role='switch']")[2]);
await wait(60);

// taking a client offline
click($$("button[role='switch']")[0]);
await wait(60);
click(button("রিকোয়েস্ট পাঠাও"));
await wait(80);
assert("an offline client cannot send anything", mainText().includes("request তৈরিই হলো না"));
click($$("button[role='switch']")[0]);
await wait(60);

// wireless vs wired
click(button("ক্লায়েন্ট B"));
await wait(60);
click(button("Wired (ইথারনেট)"));
await wait(60);
assert("a client can be moved to a wired connection", mainText().includes("তামার ইথারনেট কেবলে যুক্ত"));
click(button("Wi-Fi (বেতার)"));
await wait(60);
assert("a client can be moved to Wi-Fi", mainText().includes("বেতার তরঙ্গে (Wi-Fi) যুক্ত"));

// resource unavailable -> error response
click($$("button[role='switch']")[3]);
await wait(60);
assert("a shared resource can be turned off", mainText().includes("শেয়ার্ড প্রিন্টার বন্ধ (unavailable)"));
click(button("রিকোয়েস্ট পাঠাও"));
await wait(80);
assert("an unavailable resource is announced before the packet runs", mainText().includes("error response ফিরবে"));
click($$("button[role='switch']")[3]);
await wait(60);

// the playground quiz gives feedback
assert("playground quiz answers correctly", choose('input[name="pg-1"][value="a"]'));
await wait(60);
assert("a correct answer explains itself", mainText().includes("ঠিক উত্তর!"));
assert("playground quiz rejects a wrong answer", choose('input[name="pg-2"][value="a"]'));
await wait(60);
assert("a wrong answer explains the right one", mainText().includes("এবার ভুল হলো।"));
click(ariaButton("কুইজ আবার শুরু করো"));
await wait(60);
assert("the quiz can be reset", !mainText().includes("ঠিক উত্তর!"));

/* -------------------------------------------------------------------------- */
/* 3. Client–server simulation (the whole page)                                 */
/* -------------------------------------------------------------------------- */

await goto("#/network/server-client", "সার্ভার ও ক্লায়েন্ট");
assert(
  "the page holds only the new simulation",
  mainText().includes("ক্লায়েন্ট–সার্ভার সিমুলেশন") &&
    !mainText().includes("একটি ইমেইল পাঠানোর ছয় ধাপ") &&
    !mainText().includes("সহজ ব্যাখ্যা: সার্ভার ও ক্লায়েন্ট") &&
    !mainText().includes("নিজে যাচাই করো"),
);
assert(
  "clients are drawn as real laptops and a desktop",
  mainText().includes("Client A — ল্যাপটপ") &&
    mainText().includes("Client B — ডেস্কটপ") &&
    mainText().includes("Client C — ল্যাপটপ"),
);
assert("the server is drawn as a rack server", mainText().includes("RACK SERVER") && mainText().includes("অপেক্ষার কিউ"));
assert("all three clients start idle", (mainText().match(/অপেক্ষায়(?![…·])/g) ?? []).length >= 3);
assert("the log invites the first request", mainText().includes("একটা Client বেছে request পাঠাও।"));

// The browser journey keeps the illustration and page in sync with its steps.
assert("a seated user is present at the laptop", Boolean($(".bj-user")));
assert("the login page is hidden before the response", !$(".bj-login"));
click(ariaButton("Go to step 7: Response"));
await wait(60);
assert("the response is still travelling before the login appears", Boolean($(".bj-packet.response")) && !$(".bj-login"));
click(ariaButton("Go to step 8: Page render"));
await wait(60);
assert("the response renders the simulated Facebook login", Boolean($(".bj-login")) && mainText().includes("SIMULATION · NO REAL LOGIN"));
assert("the simulation has no credential inputs", !$(".bj-login input") && !$(".bj-login form"));
assert("the browser retains the domain after DNS", $(".bj-address-text")?.textContent.includes("facebook.com"));
click(ariaButton("Replay from beginning"));
await wait(80);
assert("replay resets the page and starts the user's typing", !$(".bj-login") && Boolean($(".bj-user.is-typing")));
click(ariaButton("Pause animation"));
await wait(60);
assert("pausing stops the user's typing", !$(".bj-user.is-typing"));

// speed the simulation up: shortest latency and processing time
for (const selector of ["#cs-latency", "#cs-proc"]) {
  const slider = $(selector);
  Object.getOwnPropertyDescriptor(window_.HTMLInputElement.prototype, "value").set.call(slider, "300");
  slider.dispatchEvent(new window_.Event("input", { bubbles: true }));
  slider.dispatchEvent(new window_.Event("change", { bubbles: true }));
}
await wait(60);
assert("the sliders reach their fastest settings", mainText().includes("300 ms"));

// one request end to end
click(button("Client A পাঠাক"));
await wait(80);
assert("sending logs the request", mainText().includes("Client A → Server : GET /home"));
assert("client A waits for the response", mainText().includes("অপেক্ষায়… GET /home"));
const gotOk = await waitFor(() => mainText().includes("200 OK ·"), 8000);
assert("the response returns with a round-trip time", gotOk);
assert(
  "the server logged processing and replying",
  mainText().includes("Server প্রসেস করছে : GET /home (Client A)") &&
    mainText().includes("Server → Client A : 200 OK"),
);

// everyone at once: the single-threaded server queues the extras
click(button("সবাই একসাথে"));
const queued = await waitFor(() => mainText().includes("কিউতে অপেক্ষা করছে"), 8000);
assert("simultaneous requests queue up at the server", queued);
const allOk = await waitFor(() => (mainText().match(/200 OK ·/g) ?? []).length >= 3, 10000);
assert("every queued client eventually gets a response", allOk);

// a heavier request type takes the same road
click(button("GET /video (ভারী)"));
await wait(60);
click(button("Client B পাঠাক"));
await wait(80);
assert("a heavier request type can be sent", mainText().includes("Client B → Server : GET /video"));
assert("client B waits for the video response", mainText().includes("অপেক্ষায়… GET /video"));
const videoDone = await waitFor(() => !mainText().includes("অপেক্ষায়… GET /video"), 10000);
assert("the heavy request completes too", videoDone);

// server off: a request in flight is lost
click(button("সার্ভার বন্ধ করো"));
await wait(60);
assert(
  "the server can be turned off",
  button("সার্ভার চালু করো") !== undefined && mainText().includes("Server বন্ধ করা হলো"),
);
click(button("Client C পাঠাক"));
const lost = await waitFor(
  () => mainText().includes("Server বন্ধ — Client C-এর request হারিয়ে গেল"),
  8000,
);
assert("a request to a dead server is lost", lost);
click(button("সার্ভার চালু করো"));
await wait(60);
assert("the server can be turned back on", mainText().includes("Server আবার চালু"));

/* -------------------------------------------------------------------------- */
/* 4. Media                                                                    */
/* -------------------------------------------------------------------------- */

await goto("#/network/media", "নেটওয়ার্ক মিডিয়া");
assert("twisted pair starts selected", button("টুইস্টেড-পেয়ার কেবল")?.getAttribute("aria-pressed") === "true");
assert("twisted pair carries electrical signals", mainText().includes("বৈদ্যুতিক সংকেত"));
click(button("অপটিক্যাল ফাইবার"));
await wait(60);
assert("fiber carries light pulses", mainText().includes("আলোর ঝলক") && mainText().includes("total internal reflection"));
click(button("Wi-Fi (বেতার)"));
await wait(60);
assert("Wi-Fi shows radio waves", mainText().includes("বেতার তরঙ্গ"));
assert("Wi-Fi exposes a distance control", Boolean($("#net-distance")));
const distance = $("#net-distance");
Object.getOwnPropertyDescriptor(window_.HTMLInputElement.prototype, "value").set.call(distance, "36");
distance.dispatchEvent(new window_.Event("input", { bubbles: true }));
distance.dispatchEvent(new window_.Event("change", { bubbles: true }));
await wait(80);
assert("distance and walls weaken the signal", mainText().includes("প্রায় নেই"));
Object.getOwnPropertyDescriptor(window_.HTMLInputElement.prototype, "value").set.call(distance, "4");
distance.dispatchEvent(new window_.Event("input", { bubbles: true }));
distance.dispatchEvent(new window_.Event("change", { bubbles: true }));
await wait(80);
assert("a close access point gives a strong signal", mainText().includes("চমৎকার"));
assert("media is described as a medium only", mainText().includes("এটি সার্ভার নয়, ক্লায়েন্ট নয়, প্রোটোকলও নয়"));

/* Real photographs: each cable has a cable photo and a connector photo. */
const photos = $$("main img");
assert("the media lesson shows real photographs", photos.length >= 4, `${photos.length} images`);
assert(
  "every photo resolves to an asset path",
  photos.every((img) => /media\/[a-z-]+\.jpg$/.test(img.getAttribute("src") ?? "")),
);
assert(
  "every photo has Bangla alt text",
  photos.every((img) => (img.getAttribute("alt") ?? "").length > 10),
);
assert("the coax cable is photographed", photos.some((img) => (img.getAttribute("src") ?? "").includes("coax-cable.jpg")));
assert("the RJ-45 connector is photographed", photos.some((img) => (img.getAttribute("src") ?? "").includes("ethernet-connector.jpg")));
assert("the fiber connector is photographed", photos.some((img) => (img.getAttribute("src") ?? "").includes("fiber-connector.jpg")));
assert("the connector can be swapped in the card", Boolean(button("কানেক্টর")));
click(button("ফাইবার"));
await wait(80);
assert("a cable can be selected from the gallery", mainText().includes("কাচের কোর"));
click(button("কোঅ্যাক্স"));
await wait(80);
assert("the cutaway explains the coax layers", mainText().includes("ব্রেইডেড শিল্ড"));
const layers = $$("main .net-cutaway-layer");
assert("cutaway layers are keyboard reachable", layers.length >= 3, `${layers.length} layers`);
click(layers[0]);
await wait(60);
assert("a cutaway layer explains itself", mainText().includes("কেবলকে ভেজা ও ঘষা থেকে বাঁচায়"));

/* Wireless: the same data with no wire. */
assert("wireless section explains there is no cable", mainText().includes("NO CABLE — THE MEDIUM IS THE AIR"));
assert("the wireless journey starts at the app", mainText().includes("অ্যাপ ডাটা তৈরি করল"));
const wirelessNext = $$("button").filter((node) => node.getAttribute("aria-label") === "পরের ধাপে যাও");
click(wirelessNext[wirelessNext.length - 1]);
await wait(60);
assert("the journey reaches the antenna and the wave", mainText().includes("তরঙ্গের ভাষায় বদলাল"));
assert("modulation is explained", mainText().includes("BPSK") && mainText().includes("256-QAM"));
click(button("256-QAM"));
await wait(60);
assert(
  "a denser modulation packs more bits per symbol",
  mainText().includes("৮ বিট") && mainText().includes("৩০ dB"),
);
assert("the wireless family includes satellite links", mainText().includes("স্যাটেলিয়ন") || mainText().includes("স্যাটেলাইট লিংক"));
click(buttonWith("রেডিও তরঙ্গ"));
await wait(60);
assert("a wireless medium explains what blocks it", mainText().includes("দেয়াল, দূরত্ব"));
assert("walls can be added to the air path", Boolean(button("দুই দেয়াল")));
click(button("দুই দেয়াল"));
await wait(60);
assert("obstacles make the air path lossy", mainText().includes("প্রতিটি দেয়াল তরঙ্গ দুর্বল করে"));
click(button("বাধা নেই"));
await wait(60);
assert("without walls the path is clear", mainText().includes("তরঙ্গ বাধাহীনভাবে"));
assert("photo credits are published", mainText().includes("ছবির সূত্র ও লাইসেন্স"));
assert("the quiz asks which connector ends an Ethernet cable", mainText().includes("Ethernet কেবলের প্রান্তে"));
assert("the quiz explains modulation density", mainText().includes("256-QAM ব্যবহার করলে"));

/* -------------------------------------------------------------------------- */
/* 5. NIC                                                                      */
/* -------------------------------------------------------------------------- */

await goto("#/network/nic", "নেটওয়ার্ক ইন্টারফেস কার্ড");
assert("the NIC is defined as hardware", mainText().includes("হার্ডওয়্যার ইন্টারফেস"));
const nicPhotos = $$("main img").filter((img) => (img.getAttribute("src") ?? "").includes("nic-"));
assert("four real NIC photographs are shown", nicPhotos.length === 4, `${nicPhotos.length} photos`);
assert("every NIC photo has descriptive alt text", nicPhotos.every((img) => (img.getAttribute("alt") ?? "").length > 20));
assert(
  "modern device integration is explained with real examples",
  mainText().includes("onboard বা integrated NIC") && mainText().includes("M.2 socket") && mainText().includes("ফোন বা ট্যাবলেটে আলাদা কার্ড"),
);
click(ariaButton("আলাদা PCIe Ethernet NIC—ছবি বড় করে দেখো"));
await wait(60);
assert("the hardware photograph opens in a lightbox", Boolean($("div[role='dialog']")));
click(ariaButton("ছবি বন্ধ করো"));
await wait(60);
assert("the lightbox closes", !$("div[role='dialog']"));
assert("sending starts selected", button("ডাটা পাঠানো")?.getAttribute("aria-pressed") === "true");
click(buttonWith("NIC-এর জন্য frame প্রস্তুত"));
await wait(60);
assert("the NIC send journey can be stepped", mainText().includes("NIC ও তার driver-এর সমন্বয়ে"));
click(button("ডাটা গ্রহণ"));
await wait(60);
assert("receiving explains the reverse signal path", mainText().includes("কেবল থেকে electrical signal"));

/* -------------------------------------------------------------------------- */
/* 6. Resources                                                                */
/* -------------------------------------------------------------------------- */

await goto("#/network/resources", "নেটওয়ার্ক রিসোর্স");
assert("the printer resource starts selected", buttonWith("শেয়ার্ড প্রিন্টার")?.getAttribute("aria-pressed") === "true");
click(buttonWith("শেয়ার্ড ফাইল"));
await wait(60);
assert("switching resource changes the request text", mainText().includes("শ্রেণি-৯-পদার্থ.pdf"));
click(buttonWith("ইমেইল সার্ভিস"));
await wait(60);
assert("a running service counts as a resource", mainText().includes("নেটওয়ার্ক সার্ভিস"));
click($("button[role='switch']"));
await wait(60);
assert("turning the resource off is shown", mainText().includes("ইমেইল সার্ভিস বন্ধ (unavailable)") && mainText().includes("রিসোর্স বন্ধ"));
click(button("পরের ধাপ"));
click(button("পরের ধাপ"));
await wait(80);
assert("an unavailable resource yields an error", mainText().includes("ইমেইল সার্ভিস বন্ধ থাকায় request কোনো জবাবই পেল না"));
assert("resources are not only hardware", mainText().includes("রিসোর্স কেবল হার্ডওয়্যার নয়"));

/* -------------------------------------------------------------------------- */
/* 7. User chain                                                               */
/* -------------------------------------------------------------------------- */

await goto("#/network/user", "ইউজার, ক্লায়েন্ট ও সার্ভার");
assert("user and client are distinguished", mainText().includes("ইউজার ও ক্লায়েন্ট এক নয়"));
click(buttonWith("ওয়েব সার্ভার"));
await wait(60);
assert("clicking a chain link explains it", mainText().includes("ঠিক কোন পেজ চাওয়া হয়েছে বুঝে"));
click(buttonWith("ইউজার দেখছে"));
await wait(60);
assert("the last link closes the loop", mainText().includes("পুরো যাত্রা শেষ"));
click(ariaButton("পরের ধাপে যাও"));
await wait(60);
assert("the chain animation steps forward", mainText().includes("ধাপ ২ / ৮"));

/* -------------------------------------------------------------------------- */
/* 8. Protocol                                                                 */
/* -------------------------------------------------------------------------- */

await goto("#/network/protocol", "প্রোটোকল");
assert("the simplified request is shown", mainText().includes("GET /index.html HTTP/1.1"));
assert("the simplified response is shown", mainText().includes("HTTP/1.1 200 OK"));
assert("the simplification is disclosed", mainText().includes("সরলীকৃত"));
click(buttonWith("path নেই"));
await wait(60);
click(button("সার্ভারে পাঠাও"));
await wait(80);
assert("a malformed request is rejected", mainText().includes("সার্ভার বার্তা প্রত্যাখ্যান করেছে"));
click(buttonWith("সঠিক GET request"));
await wait(60);
click(button("সার্ভারে পাঠাও"));
await wait(80);
assert("a well-formed request is accepted", mainText().includes("সার্ভার বার্তা গ্রহণ করেছে"));
assert("HTTP is placed in the application layer", mainText().includes("application-layer প্রোটোকল"));
click(ariaButton("পরের ধাপে যাও"));
await wait(60);
assert("the protocol steps advance", mainText().includes("request নেটওয়ার্ক দিয়ে সার্ভারে যাচ্ছে"));

// HTTP vs HTTPS: the same message down two wires, with an attacker in the middle
assert("HTTPS is explained as HTTP inside TLS", mainText().includes("HTTPS মানে নতুন কোনো প্রোটোকল নয়"));
assert("the difference table gives the HTTPS port", mainText().includes("৪৪৩"));
click(button("দুটি লেনে একই বার্তা পাঠাও"));
await wait(1700);
assert("the attacker reads the HTTP password in clear text", mainText().includes("password=rahim1234"));
assert("the attacker only captures ciphertext from HTTPS", mainText().includes("শুধু এলোমেলো বাইট"));

click(buttonWith("HTTPS লেনে TLS স্তর চালু"));
await wait(60);
click(button("দুটি লেনে একই বার্তা পাঠাও"));
await wait(1700);
assert(
  "turning TLS off turns HTTPS back into plain text",
  mainText().includes("TLS বন্ধ, তাই HTTPS-ও প্লেইন টেক্সট"),
);
click(buttonWith("TLS স্তর বন্ধ"));
await wait(60);

// The same diagram at three reading depths
assert(
  "the depth switch offers all three levels",
  Boolean(ariaButton("ব্যাখ্যার স্তর সহজ")) &&
    Boolean(ariaButton("ব্যাখ্যার স্তর মাধ্যমিক")) &&
    Boolean(ariaButton("ব্যাখ্যার স্তর বিস্তারিত")),
);
assert("the middle level explains the message in full", mainText().includes("ব্রাউজার বলে সে কোন TLS সংস্করণ বোঝে"));
click(ariaButton("ব্যাখ্যার স্তর সহজ"));
await wait(60);
assert("the easy level keeps one short sentence", mainText().includes("ব্রাউজার সার্ভারকে বলে সে কোন নিয়মগুলো বোঝে"));
assert("every level keeps the everyday analogy", mainText().includes("উপমা দিয়ে বুঝি"));
click(ariaButton("ব্যাখ্যার স্তর বিস্তারিত"));
await wait(60);
assert("the deep level adds the wire-level detail", mainText().includes("supported_versions"));
click(ariaButton("ব্যাখ্যার স্তর মাধ্যমিক"));
await wait(60);
assert("the three jobs are named beside the figure", mainText().includes("পরিচয় যাচাই") && mainText().includes("নিরাপদ টানেল"));

// TLS handshake steps
click(buttonWith("Certificate"));
await wait(60);
assert("the certificate step shows the certificate", mainText().includes("সার্টিফিকেট পাঠায়"));
assert("no session key exists before the key exchange", mainText().includes("চাবি এখনো তৈরি হয়নি"));
click(buttonWith("Session key"));
await wait(60);
assert(
  "both sides derive the same session key",
  mainText().includes("4f 0b 9e 22 13 88") && mainText().includes("একই session key পেয়েছে"),
);
click(buttonWith("Finished"));
await wait(60);
assert("the tunnel is encrypted after Finished", mainText().includes("TLS tunnel চালু"));
click(buttonWith("বৈধ সার্টিফিকেট"));
await wait(60);
assert("a forged certificate stops the handshake", mainText().includes("সংযোগ এখানেই বন্ধ"));
assert("the forged certificate is named", mainText().includes("জাল সার্টিফিকেট"));
click(buttonWith("জাল সার্টিফিকেট"));
await wait(60);
click(buttonWith("এবার HTTP"));
await wait(60);
assert("the encrypted request is shown inside the tunnel", mainText().includes("GET /login → ciphertext"));

// A broken certificate is not just a red badge: the later messages never happen
click(buttonWith("বৈধ সার্টিফিকেট"));
await wait(60);
assert("a failed certificate rewinds to the verification step", mainText().includes("সার্টিফিকেট যাচাই — ব্রাউজারের নিজের কাজ"));
click(buttonWith("এবার HTTP"));
await wait(60);
assert(
  "stepping past the failure says nothing is sent",
  mainText().includes("এখান থেকে আর কোনো বার্তা যায় না"),
);
click(buttonWith("জাল সার্টিফিকেট"));
await wait(60);
assert("turning the certificate back on resumes the walkthrough", mainText().includes("এবার HTTP — টানেলের ভেতরে"));

/* -------------------------------------------------------------------------- */
/* 9. Guided learning mode                                                     */
/* -------------------------------------------------------------------------- */

await goto("#/network/learn", "ধাপে ধাপে শেখা");
assert("guided mode starts at server and client", mainText().includes("ধাপ ১ / ৭") && mainText().includes("সার্ভার ও ক্লায়েন্ট"));
click(ariaButton("পরবর্তী ধাপে যাও"));
await wait(80);
assert("the next guided step is media", mainText().includes("ধাপ ২ / ৭") && mainText().includes("টুইস্টেড-পেয়ার কেবল"));
assert("every guided step has a real-life example", mainText().includes("বাস্তব উদাহরণ"));
assert("every guided step has questions", mainText().includes("ছোট প্রশ্ন"));
click(ariaButton("আগের ধাপে যাও"));
await wait(80);
assert("the previous guided step returns", mainText().includes("ধাপ ১ / ৭"));
assert("guided quiz answers give feedback", choose('input[name="sc-1"][value="b"]'));
await wait(60);
assert("guided quiz feedback is shown", mainText().includes("ঠিক উত্তর!"));
for (let i = 0; i < 6; i += 1) {
  click(ariaButton("পরবর্তী ধাপে যাও"));
  await wait(50);
}
assert("the last guided step is the full simulation", mainText().includes("ধাপ ৭ / ৭") && mainText().includes("সম্পূর্ণ নেটওয়ার্ক সিমুলেশন"));

/* -------------------------------------------------------------------------- */
/* 10. Challenge mode                                                          */
/* -------------------------------------------------------------------------- */

await goto("#/network/challenge", "চ্যালেঞ্জ মোড");
assert("the challenge states the task", mainText().includes("শেয়ার্ড ফাইল ডাউনলোড করতে চায়"));

// wrong order first
click(button("সার্ভার"));
await wait(60);
click(button("ক্রমটি পরীক্ষা করো"));
await wait(80);
assert("a wrong order is rejected with an explanation", mainText().includes("ক্রমটি মেলেনি"));
click(button("আবার সাজাও"));
await wait(60);
assert("the sequence can be cleared", !mainText().includes("ফলাফল: ক্রম মেলেনি"));

for (const label of [
  "ক্লায়েন্ট",
  "নেটওয়ার্ক ইন্টারফেস",
  "নেটওয়ার্ক মিডিয়া",
  "রাউটার / সুইচ",
  "সার্ভার",
  "রিসোর্স / ফাইল",
  "রেসপন্স",
]) {
  click(button(label));
  await wait(40);
}
click(button("ক্রমটি পরীক্ষা করো"));
await wait(80);
assert("the full path in the right order is accepted", mainText().includes("ক্রমটি ঠিক আছে"));
assert("the result line reports success", mainText().includes("ফলাফল: সঠিক"));

// the router is optional, but only in the middle of the path
click(button("আবার সাজাও"));
await wait(40);
for (const label of ["ক্লায়েন্ট", "নেটওয়ার্ক ইন্টারফেস", "নেটওয়ার্ক মিডিয়া", "সার্ভার", "রিসোর্স / ফাইল", "রেসপন্স"]) {
  click(button(label));
  await wait(40);
}
click(button("ক্রমটি পরীক্ষা করো"));
await wait(80);
assert("a single-switch network without the router is also accepted", mainText().includes("ক্রমটি ঠিক আছে"));

click(button("একটি পিছিয়ে"));
await wait(60);
assert("the last piece can be taken back", mainText().includes("৫ / ৭ টি অংশ সাজানো হয়েছে"));

assert("scenario questions answer correctly", choose('input[name="cs-cable"][value="a"]'));
await wait(60);
assert("scenario feedback explains the media", mainText().includes("কেবলই হলো মিডিয়া"));

/* -------------------------------------------------------------------------- */
/* 11. Reduced motion                                                          */
/* -------------------------------------------------------------------------- */

const reducedWindow = makeWindow(true, "#/network/playground");
const reducedWaitFor = async (predicate, timeout = 6000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (predicate()) return true;
    await wait(30);
  }
  return predicate();
};
const reducedText = () => reducedWindow.document.querySelector("#main")?.textContent ?? "";
await reducedWaitFor(() => reducedText().includes("ইন্টারঅ্যাক্টিভ নেটওয়ার্ক প্লেগ্রাউন্ড"));
await wait(120);
const reducedButtons = [...reducedWindow.document.querySelectorAll("button")];
const reducedClick = (node) =>
  node?.dispatchEvent(new reducedWindow.MouseEvent("click", { bubbles: true, cancelable: true }));
reducedClick(reducedButtons.find((node) => node.textContent.trim() === "রিকোয়েস্ট পাঠাও"));
await wait(1900); // longer than one step, so an autoplaying packet would have moved on
assert("reduced motion keeps the packet on the first step", reducedText().includes("প্যাকেটের ধাপসমূহ (১/৬)"));
assert("reduced motion does not start the timer", Boolean([...reducedWindow.document.querySelectorAll("button")].find((node) => node.textContent.trim() === "চালু করো")));
reducedClick([...reducedWindow.document.querySelectorAll("button")].find((node) => node.textContent.trim() === "পরের ধাপ"));
await wait(120);
assert("reduced motion users can still step by hand", reducedText().includes("প্যাকেটের ধাপসমূহ (২/৬)"));
reducedWindow.close();

assert("no runtime errors", errors.length === 0, errors.slice(0, 3).join(" | "));

console.log(failures === 0 ? "\nAll network lab interactions passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
