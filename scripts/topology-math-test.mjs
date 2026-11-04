/**
 * Headless verification of the topology page's routing model.
 *
 * The figure is only as honest as the maths behind it: which pairs still have
 * a path after a cable is cut, how many hops a ring takes to come back the
 * other way, and whether a bus with a cut end really refuses to deliver.
 * Bundles the TypeScript module with esbuild and checks it in Node.
 *
 * Run with: node scripts/topology-math-test.mjs
 */
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = await build({
  entryPoints: [path.join(root, "src/lib/network/topology.ts")],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  alias: { "@": path.join(root, "src") },
  logLevel: "silent",
});
const m = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString("base64")}`
);

let failures = 0;
function assert(name, condition, detail = "") {
  console.log(`${condition ? "ok   " : "FAIL "}${name}${detail ? ` (${detail})` : ""}`);
  if (!condition) failures += 1;
}
const set = (...ids) => new Set(ids);
const route = (id, from, to, removed = new Set(), cuts = new Set()) =>
  m.findRoute(m.TOPOLOGIES[id], from, to, removed, cuts);
const hops = (p) => (p ? p.length - 1 : null);

/* ---------------------------------------------------------------- catalogue */

assert("seven topologies are defined", m.TOPOLOGY_ORDER.length === 7);
assert(
  "every topology has its copy",
  m.TOPOLOGY_ORDER.every((id) => Boolean(m.TOPOLOGY_META[id]?.pros.length && m.TOPOLOGY_META[id]?.uses.length)),
);
assert(
  "each topology has at least four devices",
  m.TOPOLOGY_ORDER.every((id) => m.endpoints(m.TOPOLOGIES[id]).length >= 5),
);

/* --------------------------------------------------------------------- bus */

const bus = m.TOPOLOGIES.bus;
assert("the bus has five taps", bus.bus.taps.length === 5);
assert("the bus has a terminator at each end of its six segments", m.busSegments(bus.bus).length === 6);
const busSend = m.planSend(bus, "pc1", "pc4");
assert("a healthy bus delivers with one shared-cable hop", busSend.kind === "ok" && busSend.hops === 1);
assert("a bus delivery is a broadcast", busSend.kind === "ok" && busSend.broadcast === true);
assert(
  "the bus route travels down to the cable and back up",
  busSend.points.length === 4 && busSend.points[1].y === bus.bus.y && busSend.points[2].y === bus.bus.y,
);
const cutMiddle = m.planSend(bus, "pc1", "pc4", new Set(), set(m.busSegmentKey(2)));
assert("a cut bus segment echoes instead of delivering", cutMiddle.kind === "bus-echo" && cutMiddle.reason === "cut");
const cutFarEnd = m.planSend(bus, "pc1", "pc2", new Set(), set(m.busSegmentKey(5)));
assert("a cut anywhere still breaks the shared cable", cutFarEnd.kind === "bus-echo");
const missingTerm = m.planSend(bus, "pc1", "pc4", new Set(), new Set(), { left: false, right: true });
assert(
  "a missing terminator is reported as a reflection at that end",
  missingTerm.kind === "bus-echo" && missingTerm.reason === "terminator",
);
assert(
  "any bus damage leaves only the source reachable",
  m.reachableFrom(bus, "pc1", new Set(), set(m.busSegmentKey(3))).size === 1,
);
assert(
  "a healthy bus makes every device reachable",
  m.reachableFrom(bus, "pc1").size === 5,
);
assert("a bus has no alternate path", m.hasAlternateRoute(bus, "pc1", "pc4", ["pc1", "pc4"]) === false);
assert(
  "an offline bus station cannot receive",
  m.planSend(bus, "pc1", "pc4", set("pc4")).kind === "blocked",
);

/* -------------------------------------------------------------------- star */

const star = m.TOPOLOGIES.star;
const starPath = route("star", "pc1", "pc2");
assert("a star path always passes the centre", hops(starPath) === 2 && starPath[1] === "sw");
assert("removing one client leaves the others connected", Boolean(route("star", "pc1", "pc2", set("pc3"))));
assert("the centre switch is a single point of failure", route("star", "pc1", "pc2", set("sw")) === null);
assert(
  "a star has no redundant path from one client to another",
  m.hasAlternateRoute(star, "pc1", "pc2", starPath) === false,
);
assert(
  "the star facts show six cables and two hops",
  m.topologyFacts(star).links === 6 && m.topologyFacts(star).maxHops === 2,
);

/* -------------------------------------------------------------------- ring */

const ring = m.TOPOLOGIES.ring;
assert("the ring is drawn one-way", ring.links.every((edge) => edge.oneWay === true));
assert("the ring sends forward to the next station in one hop", hops(route("ring", "pc1", "pc2")) === 1);
const backwards = route("ring", "pc2", "pc1");
assert(
  "the ring must travel the long way round instead",
  hops(backwards) === 5,
  `${hops(backwards)} hops`,
);
assert(
  "cutting one ring cable breaks the one-way circle",
  route("ring", "pc1", "pc2", new Set(), set("pc1--pc2")) === null,
);
const farRingCut = m.planSend(ring, "pc1", "pc2", new Set(), set("pc4--pc5"));
assert(
  "a cut anywhere makes the whole unterminated single ring echo and fail",
  farRingCut.kind === "ring-echo" && farRingCut.reason === "cut",
);
assert(
  "after any ring cut only the source is shown as reachable",
  m.reachableFrom(ring, "pc1", new Set(), set("pc4--pc5")).size === 1,
);
assert("the ring needs five hops to go the wrong way round", m.topologyFacts(ring).maxHops === 5);
assert(
  "a ring never offers a second path in the same direction",
  m.hasAlternateRoute(ring, "pc1", "pc2", route("ring", "pc1", "pc2")) === false,
);

/* -------------------------------------------------------------------- tree */

const tree = m.TOPOLOGIES.tree;
const treePath = route("tree", "pc1", "pc6");
assert("a tree path crosses the root", hops(treePath) === 4, `${hops(treePath)} hops`);
assert("cutting a branch keeps the other branch alive", Boolean(route("tree", "pc4", "pc5", new Set(), set("core--sw1"))));
assert(
  "cutting the root link splits the branches",
  route("tree", "pc1", "pc6", new Set(), set("core--sw1")) === null,
);
assert("the root is a single point of failure", route("tree", "pc1", "pc6", set("core")) === null);
assert("the tree facts show four hops at worst", m.topologyFacts(tree).maxHops === 4);

/* ------------------------------------------------------------------- meshes */

const mesh = m.TOPOLOGIES["full-mesh"];
assert("a full mesh of five devices has ten cables", mesh.links.length === 10);
assert("every full-mesh pair is one hop apart", m.topologyFacts(mesh).maxHops === 1);
assert("a full mesh survives two cut cables", Boolean(route("full-mesh", "pc1", "pc2", new Set(), set("pc1--pc2", "pc3--pc4"))));
assert("a full mesh survives a lost device", Boolean(route("full-mesh", "pc1", "pc2", set("pc3"))));
assert(
  "a full mesh always reports an alternate path",
  m.hasAlternateRoute(mesh, "pc1", "pc2", route("full-mesh", "pc1", "pc2")) === true,
);

const partial = m.TOPOLOGIES["partial-mesh"];
assert("a partial mesh has fewer cables than a full mesh", partial.links.length < 15 && partial.links.length > 6);
assert("two distant partial-mesh nodes are one short chord apart", hops(route("partial-mesh", "pc1", "pc4")) === 1);
assert(
  "cutting the two ring cables on both sides isolates a node",
  route("partial-mesh", "pc1", "pc2", new Set(), set("ring-0", "ring-5", "chord-a")) === null,
);
assert(
  "partial mesh still offers an alternate route for most pairs",
  m.hasAlternateRoute(partial, "pc1", "pc2", route("partial-mesh", "pc1", "pc2")) === true,
);

/* ------------------------------------------------------------------- hybrid */

const hybrid = m.TOPOLOGIES.hybrid;
assert("the hybrid mixes switches and devices", hybrid.nodes.some((node) => node.kind === "switch"));
assert("the hybrid loop is one-way", hops(route("hybrid", "pc5", "pc6")) === 1);
assert("against the loop a packet must go round", hops(route("hybrid", "pc6", "pc5")) === 2);
assert("the hybrid connects both halves", Boolean(route("hybrid", "pc1", "pc6")));
assert(
  "losing the left switch isolates the left cluster",
  route("hybrid", "pc1", "pc2", set("swL")) === null,
);

/* ------------------------------------------------------------ small helpers */

const half = m.pointAlong([{ x: 0, y: 0 }, { x: 10, y: 0 }], 0.5);
assert("pointAlong walks by length", Math.abs(half.x - 5) < 1e-9 && half.y === 0);
const trimmed = m.towards({ x: 0, y: 0 }, { x: 100, y: 0 }, 20);
assert("towards stops a cable at the device edge", Math.abs(trimmed.x - 20) < 1e-9);
assert("a device is never both source and target", m.planSend(star, "pc1", "pc1").kind === "blocked");

console.log(failures === 0 ? "\nAll topology maths passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
