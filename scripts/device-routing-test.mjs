/**
 * Headless verification of the Network Media device lesson's data and routing
 * maths: ten uniquely addressed LAN devices, Dijkstra path choice under
 * latency vs hop-count metrics, rerouting after a link failure/congestion,
 * and the "each router only knows a next hop" routing-table model.
 *
 * Run with: node scripts/device-routing-test.mjs
 */
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = await build({
  entryPoints: [path.join(root, "src/lib/network/devices.ts")],
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
const pathText = (path) => path.join(" → ");
const destinationNode = (id) => m.ROUTER_DESTINATIONS.find((item) => item.id === id).nodeId;

/* ---------------------------------------------------------------- LAN data */

assert("the LAN has exactly ten end devices", m.LAN_DEVICES.length === 10);
assert("every LAN device has a unique MAC", new Set(m.LAN_DEVICES.map((d) => d.mac)).size === 10);
assert("every LAN device has a unique switch/hub port", new Set(m.LAN_DEVICES.map((d) => d.port)).size === 10);
assert(
  "the LAN balances five devices on each side of the centre",
  m.LAN_DEVICES.filter((d) => d.side === "left").length === 5 &&
    m.LAN_DEVICES.filter((d) => d.side === "right").length === 5,
);
assert("packet chips shorten a MAC without losing its device suffix", m.shortMac(m.lanDevice("pc-07").mac) === "…:2B:07");

/* --------------------------------------------------------------- best path */

const sgLatency = m.shortestPath("home-laptop", destinationNode("sg"), { metric: "latency" });
assert(
  "latency routing reaches Singapore through the direct Dhaka submarine link",
  pathText(sgLatency) === "home-laptop → r-home → r-Dhaka → r-singapore → server-sg",
  pathText(sgLatency),
);
assert("the Singapore latency path costs 48 ms in the teaching model", m.pathCost(sgLatency, { metric: "latency" }) === 48);

const deLatency = m.shortestPath("home-laptop", destinationNode("de"), { metric: "latency" });
assert(
  "latency routing reaches Frankfurt through Chennai and Mumbai",
  pathText(deLatency) === "home-laptop → r-home → r-Dhaka → r-Chennai → r-Mumbai → r-Frankfurt → server-de",
  pathText(deLatency),
);

const deHops = m.shortestPath("home-laptop", destinationNode("de"), { metric: "hops" });
assert(
  "hop-count routing chooses a different, shorter-in-hops Frankfurt path",
  pathText(deHops) === "home-laptop → r-home → r-Dhaka → r-singapore → r-Frankfurt → server-de",
  pathText(deHops),
);
assert(
  "the two metrics really disagree: fewer hops can mean more latency",
  m.pathCost(deHops, { metric: "hops" }) < m.pathCost(deLatency, { metric: "hops" }) &&
    m.pathCost(deHops, { metric: "latency" }) > m.pathCost(deLatency, { metric: "latency" }),
);

const usLatency = m.shortestPath("home-laptop", destinationNode("us"), { metric: "latency" });
assert("the US server is reachable across the router mesh", usLatency.length >= 5, pathText(usLatency));

/* ------------------------------------------------------ failure + congestion */

const cut = new Set(["Dhaka-singapore"]);
const sgAfterCut = m.shortestPath("home-laptop", destinationNode("sg"), {
  metric: "latency",
  disabledEdgeIds: cut,
});
assert(
  "cutting Dhaka–Singapore reroutes through Chattogram",
  pathText(sgAfterCut) === "home-laptop → r-home → r-Dhaka → r-chattogram → r-singapore → server-sg",
  pathText(sgAfterCut),
);

const congested = { metric: "latency", congestedEdgeId: "Dhaka-singapore", congestionMs: 90 };
const sgCongested = m.shortestPath("home-laptop", destinationNode("sg"), congested);
assert("heavy congestion also makes Dijkstra avoid the direct link", !sgCongested.includes("r-Dhaka") || sgCongested.includes("r-chattogram"));

assert(
  "removing the only server attachment leaves no route",
  m.shortestPath("home-laptop", destinationNode("sg"), {
    disabledEdgeIds: new Set(["singapore-server"]),
  }).length === 0,
);

/* ------------------------------------------------------------ routing table */

const DhakaTable = m.routingTableFor("r-Dhaka", { metric: "latency" });
const DhakaToFrankfurt = DhakaTable.find((row) => row.destinationId === "de");
assert("Dhaka's table stores only the next hop toward Frankfurt", DhakaToFrankfurt.nextHop === "r-Chennai");
assert("the routing-table row names an exit interface", /^Gi0\/0\/\d+$/.test(DhakaToFrankfurt.exitInterface));
assert("the routing-table row carries the full remaining metric", DhakaToFrankfurt.metric === 124);

const choices = m.neighbourChoices("r-Dhaka", destinationNode("de"), { metric: "latency" });
assert("neighbour choices are sorted by total estimated cost", choices.every((choice, i) => i === 0 || choices[i - 1].totalCost <= choice.totalCost));
assert("the cheapest neighbour at Dhaka matches the Dijkstra next hop", choices[0].neighbour === DhakaToFrankfurt.nextHop);
assert(
  "a neighbour choice decomposes into link cost + remaining cost",
  choices[0].linkCost + choices[0].remainingCost === choices[0].totalCost,
);

console.log(failures === 0 ? "\nAll device-routing maths passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
