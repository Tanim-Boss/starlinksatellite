/**
 * Data and routing maths for the Network Media lesson's device simulations:
 * hub, switch, router and modem.
 *
 * The LAN devices and MAC addresses are deliberately fictional lab examples.
 * They use locally administered-looking addresses only so students can follow
 * an Ethernet frame from its source MAC to its destination MAC.
 *
 * Router costs are also teaching numbers, not measured Internet latencies.
 * The graph is small enough to inspect by eye, while the Dijkstra functions
 * below are the same ideas a link-state routing protocol (OSPF/IS-IS) uses
 * after routers have shared link information with each other.
 */

/* -------------------------------------------------------------------------- */
/* One LAN: ten laptops and PCs                                               */
/* -------------------------------------------------------------------------- */

export type LanDeviceKind = "laptop" | "desktop";

export interface LanDevice {
  id: string;
  /** Short label drawn on the diagram. */
  label: string;
  /** Longer Bangla description shown in the controls. */
  name: string;
  kind: LanDeviceKind;
  /** Fictional example MAC address burned into this device's NIC. */
  mac: string;
  /** Hub/switch port number, P1 ... P10. */
  port: number;
  x: number;
  y: number;
  side: "left" | "right";
}

const LEFT_Y = [72, 162, 252, 342, 432];
const RIGHT_Y = [72, 162, 252, 342, 432];

export const LAN_DEVICES: LanDevice[] = [
  { id: "pc-01", label: "PC-01", name: "রাফির ল্যাপটপ", kind: "laptop", mac: "02:4A:9C:10:2B:01", port: 1, x: 112, y: LEFT_Y[0], side: "left" },
  { id: "pc-02", label: "PC-02", name: "ল্যাব ডেস্কটপ ২", kind: "desktop", mac: "02:4A:9C:10:2B:02", port: 2, x: 112, y: LEFT_Y[1], side: "left" },
  { id: "pc-03", label: "PC-03", name: "নুসরাতের ল্যাপটপ", kind: "laptop", mac: "02:4A:9C:10:2B:03", port: 3, x: 112, y: LEFT_Y[2], side: "left" },
  { id: "pc-04", label: "PC-04", name: "ল্যাব ডেস্কটপ ৪", kind: "desktop", mac: "02:4A:9C:10:2B:04", port: 4, x: 112, y: LEFT_Y[3], side: "left" },
  { id: "pc-05", label: "PC-05", name: "শিক্ষকের পিসি", kind: "desktop", mac: "02:4A:9C:10:2B:05", port: 5, x: 112, y: LEFT_Y[4], side: "left" },
  { id: "pc-06", label: "PC-06", name: "আরিফের ল্যাপটপ", kind: "laptop", mac: "02:4A:9C:10:2B:06", port: 6, x: 888, y: RIGHT_Y[0], side: "right" },
  { id: "pc-07", label: "PC-07", name: "ল্যাব ডেস্কটপ ৭", kind: "desktop", mac: "02:4A:9C:10:2B:07", port: 7, x: 888, y: RIGHT_Y[1], side: "right" },
  { id: "pc-08", label: "PC-08", name: "তানিয়ার ল্যাপটপ", kind: "laptop", mac: "02:4A:9C:10:2B:08", port: 8, x: 888, y: RIGHT_Y[2], side: "right" },
  { id: "pc-09", label: "PC-09", name: "ল্যাব ডেস্কটপ ৯", kind: "desktop", mac: "02:4A:9C:10:2B:09", port: 9, x: 888, y: RIGHT_Y[3], side: "right" },
  { id: "pc-10", label: "PC-10", name: "ফাইল সার্ভার পিসি", kind: "desktop", mac: "02:4A:9C:10:2B:10", port: 10, x: 888, y: RIGHT_Y[4], side: "right" },
];

export const LAN_CENTER = { x: 500, y: 252 };

export function lanDevice(id: string): LanDevice {
  const found = LAN_DEVICES.find((device) => device.id === id);
  if (!found) throw new Error(`Unknown LAN device: ${id}`);
  return found;
}

/** A short MAC label for a moving packet chip: enough to recognise the NIC. */
export function shortMac(mac: string): string {
  return `…:${mac.slice(-5)}`;
}

/* -------------------------------------------------------------------------- */
/* Router playground graph                                                    */
/* -------------------------------------------------------------------------- */

export type RouterNodeKind = "device" | "router" | "server";

export interface RouterNode {
  id: string;
  label: string;
  en: string;
  kind: RouterNodeKind;
  /** Example/documentational IP or router-id shown in the inspector. */
  ip: string;
  x: number;
  y: number;
  /** Autonomous-system style region used for the background grouping. */
  region: string;
}

export interface RouterEdge {
  id: string;
  a: string;
  b: string;
  /** One-way teaching latency in milliseconds. */
  latency: number;
  label: string;
}

export interface RouterDestination {
  id: string;
  nodeId: string;
  label: string;
  serverIp: string;
  network: string;
  description: string;
}

export const ROUTER_NODES: RouterNode[] = [
  { id: "home-laptop", label: "ঢাকার ল্যাপটপ", en: "HOME DEVICE", kind: "device", ip: "192.168.1.10", x: 78, y: 306, region: "Home LAN" },
  { id: "r-home", label: "বাসার রাউটার", en: "R1 · GATEWAY", kind: "router", ip: "192.168.1.1", x: 176, y: 306, region: "Home LAN" },
  { id: "r-Dhaka", label: "ঢাকা ISP", en: "R2 · ISP EDGE", kind: "router", ip: "Router-ID 2.2.2.2", x: 286, y: 240, region: "Bangladesh ISP" },
  { id: "r-chattogram", label: "চট্টগ্রাম", en: "R3 · POP", kind: "router", ip: "Router-ID 3.3.3.3", x: 362, y: 374, region: "Bangladesh ISP" },
  { id: "r-Chennai", label: "চেন্নাই", en: "R4 · TRANSIT", kind: "router", ip: "Router-ID 4.4.4.4", x: 432, y: 174, region: "Regional transit" },
  { id: "r-singapore", label: "সিঙ্গাপুর", en: "R5 · IX / TRANSIT", kind: "router", ip: "Router-ID 5.5.5.5", x: 522, y: 360, region: "Regional transit" },
  { id: "r-Mumbai", label: "মুম্বাই", en: "R6 · TRANSIT", kind: "router", ip: "Router-ID 6.6.6.6", x: 558, y: 146, region: "Regional transit" },
  { id: "r-Frankfurt", label: "ফ্রাঙ্কফুর্ট", en: "R7 · CORE", kind: "router", ip: "Router-ID 7.7.7.7", x: 700, y: 212, region: "Global backbone" },
  { id: "r-London", label: "লন্ডন", en: "R8 · CORE", kind: "router", ip: "Router-ID 8.8.8.8", x: 794, y: 126, region: "Global backbone" },
  { id: "r-Virginia", label: "ভার্জিনিয়া", en: "R9 · CORE", kind: "router", ip: "Router-ID 9.9.9.9", x: 888, y: 230, region: "Global backbone" },
  { id: "server-sg", label: "সিঙ্গাপুর সার্ভার", en: "WEB SERVER", kind: "server", ip: "203.0.113.10", x: 620, y: 452, region: "Destination AS" },
  { id: "server-de", label: "ফ্রাঙ্কফুর্ট সার্ভার", en: "WEB SERVER", kind: "server", ip: "198.51.100.20", x: 764, y: 324, region: "Destination AS" },
  { id: "server-us", label: "যুক্তরাষ্ট্র সার্ভার", en: "WEB SERVER", kind: "server", ip: "192.0.2.30", x: 920, y: 364, region: "Destination AS" },
];

export const ROUTER_EDGES: RouterEdge[] = [
  { id: "home-gateway", a: "home-laptop", b: "r-home", latency: 1, label: "বাসার LAN" },
  { id: "gateway-Dhaka", a: "r-home", b: "r-Dhaka", latency: 3, label: "ISP access" },
  { id: "Dhaka-chattogram", a: "r-Dhaka", b: "r-chattogram", latency: 9, label: "দেশের backbone" },
  { id: "Dhaka-Chennai", a: "r-Dhaka", b: "r-Chennai", latency: 34, label: "আঞ্চলিক ফাইবার" },
  { id: "Dhaka-singapore", a: "r-Dhaka", b: "r-singapore", latency: 42, label: "সাবমেরিন কেবল" },
  { id: "chattogram-singapore", a: "r-chattogram", b: "r-singapore", latency: 35, label: "সাবমেরিন কেবল" },
  { id: "chattogram-Chennai", a: "r-chattogram", b: "r-Chennai", latency: 44, label: "আঞ্চলিক লিংক" },
  { id: "Chennai-singapore", a: "r-Chennai", b: "r-singapore", latency: 29, label: "সাবমেরিন কেবল" },
  { id: "Chennai-Mumbai", a: "r-Chennai", b: "r-Mumbai", latency: 16, label: "ভারতীয় backbone" },
  { id: "singapore-Frankfurt", a: "r-singapore", b: "r-Frankfurt", latency: 86, label: "আন্তঃমহাদেশীয় কেবল" },
  { id: "Mumbai-Frankfurt", a: "r-Mumbai", b: "r-Frankfurt", latency: 72, label: "আন্তঃমহাদেশীয় কেবল" },
  { id: "Mumbai-London", a: "r-Mumbai", b: "r-London", latency: 86, label: "বিকল্প backbone" },
  { id: "Frankfurt-London", a: "r-Frankfurt", b: "r-London", latency: 11, label: "ইউরোপের backbone" },
  { id: "London-Virginia", a: "r-London", b: "r-Virginia", latency: 62, label: "ট্রান্সঅ্যাটলান্টিক কেবল" },
  { id: "Frankfurt-Virginia", a: "r-Frankfurt", b: "r-Virginia", latency: 74, label: "ট্রান্সঅ্যাটলান্টিক বিকল্প" },
  { id: "singapore-Virginia", a: "r-singapore", b: "r-Virginia", latency: 148, label: "ট্রান্সপ্যাসিফিক কেবল" },
  { id: "singapore-server", a: "r-singapore", b: "server-sg", latency: 2, label: "ডাটা সেন্টার LAN" },
  { id: "Frankfurt-server", a: "r-Frankfurt", b: "server-de", latency: 2, label: "ডাটা সেন্টার LAN" },
  { id: "Virginia-server", a: "r-Virginia", b: "server-us", latency: 2, label: "ডাটা সেন্টার LAN" },
];

export const ROUTER_DESTINATIONS: RouterDestination[] = [
  {
    id: "sg",
    nodeId: "server-sg",
    label: "সিঙ্গাপুর সার্ভার",
    serverIp: "203.0.113.10",
    network: "203.0.113.0/24",
    description: "এশিয়ার কাছের একটি ওয়েব সার্ভার—ঢাকা থেকে তুলনামূলক কম latency।",
  },
  {
    id: "de",
    nodeId: "server-de",
    label: "ফ্রাঙ্কফুর্ট সার্ভার",
    serverIp: "198.51.100.20",
    network: "198.51.100.0/24",
    description: "ইউরোপের সার্ভার—hop কম পথ আর latency কম পথ আলাদা হতে পারে।",
  },
  {
    id: "us",
    nodeId: "server-us",
    label: "যুক্তরাষ্ট্র সার্ভার",
    serverIp: "192.0.2.30",
    network: "192.0.2.0/24",
    description: "আটলান্টিক বা প্রশান্ত মহাসাগর—দুই দিক দিয়েই যাওয়ার সুযোগ আছে।",
  },
];

export function routerNode(id: string): RouterNode {
  const found = ROUTER_NODES.find((node) => node.id === id);
  if (!found) throw new Error(`Unknown router node: ${id}`);
  return found;
}

export function routerEdgeBetween(a: string, b: string): RouterEdge | undefined {
  return ROUTER_EDGES.find(
    (edge) => (edge.a === a && edge.b === b) || (edge.a === b && edge.b === a),
  );
}

export type RouteMetric = "latency" | "hops";

export interface RouteOptions {
  metric?: RouteMetric;
  /** Edge ids removed by a cable-cut / link-failure scenario. */
  disabledEdgeIds?: ReadonlySet<string>;
  /** Extra latency added to one congested edge, in milliseconds. */
  congestedEdgeId?: string;
  congestionMs?: number;
}

export function edgeCost(edge: RouterEdge, options: RouteOptions = {}): number {
  if (options.metric === "hops") return 1;
  const extra = options.congestedEdgeId === edge.id ? Math.max(0, options.congestionMs ?? 0) : 0;
  return edge.latency + extra;
}

export interface AdjacentLink {
  edge: RouterEdge;
  to: string;
  cost: number;
}

export function adjacency(options: RouteOptions = {}): Map<string, AdjacentLink[]> {
  const map = new Map<string, AdjacentLink[]>();
  for (const node of ROUTER_NODES) map.set(node.id, []);
  const disabled = options.disabledEdgeIds ?? new Set<string>();
  for (const edge of ROUTER_EDGES) {
    if (disabled.has(edge.id)) continue;
    const cost = edgeCost(edge, options);
    map.get(edge.a)?.push({ edge, to: edge.b, cost });
    map.get(edge.b)?.push({ edge, to: edge.a, cost });
  }
  for (const links of map.values()) {
    links.sort((x, y) => routerNode(x.to).label.localeCompare(routerNode(y.to).label, "bn"));
  }
  return map;
}

export interface DijkstraResult {
  distance: Map<string, number>;
  previous: Map<string, string | null>;
}

export function dijkstra(start: string, options: RouteOptions = {}): DijkstraResult {
  const graph = adjacency(options);
  const distance = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const visited = new Set<string>();

  for (const node of ROUTER_NODES) {
    distance.set(node.id, Number.POSITIVE_INFINITY);
    previous.set(node.id, null);
  }
  distance.set(start, 0);

  while (visited.size < ROUTER_NODES.length) {
    let current: string | null = null;
    let best = Number.POSITIVE_INFINITY;
    for (const node of ROUTER_NODES) {
      const d = distance.get(node.id) ?? Number.POSITIVE_INFINITY;
      if (!visited.has(node.id) && d < best) {
        best = d;
        current = node.id;
      }
    }
    if (current === null || !Number.isFinite(best)) break;
    visited.add(current);

    for (const link of graph.get(current) ?? []) {
      const nextDistance = best + link.cost;
      if (nextDistance < (distance.get(link.to) ?? Number.POSITIVE_INFINITY)) {
        distance.set(link.to, nextDistance);
        previous.set(link.to, current);
      }
    }
  }

  return { distance, previous };
}

export function shortestPath(start: string, end: string, options: RouteOptions = {}): string[] {
  if (start === end) return [start];
  const { distance, previous } = dijkstra(start, options);
  if (!Number.isFinite(distance.get(end) ?? Number.POSITIVE_INFINITY)) return [];

  const path: string[] = [];
  let current: string | null = end;
  while (current) {
    path.push(current);
    if (current === start) break;
    current = previous.get(current) ?? null;
  }
  return path.at(-1) === start ? path.reverse() : [];
}

export function pathCost(path: string[], options: RouteOptions = {}): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i += 1) {
    const edge = routerEdgeBetween(path[i], path[i + 1]);
    if (!edge) return Number.POSITIVE_INFINITY;
    total += edgeCost(edge, options);
  }
  return total;
}

/** Deterministic interface names, assigned from each router's sorted neighbours. */
export function interfaceFor(from: string, to: string): string {
  const neighbours = ROUTER_EDGES.filter((edge) => edge.a === from || edge.b === from)
    .map((edge) => (edge.a === from ? edge.b : edge.a))
    .sort((a, b) => routerNode(a).label.localeCompare(routerNode(b).label, "bn"));
  const index = neighbours.indexOf(to);
  return `Gi0/0/${index >= 0 ? index : 0}`;
}

export interface RoutingTableRow {
  destinationId: string;
  network: string;
  nextHop: string | null;
  nextHopLabel: string;
  exitInterface: string;
  metric: number;
  path: string[];
}

/**
 * The table a router would use after its routing protocol has exchanged link
 * information and run the shortest-path calculation. Important teaching
 * point: a real router stores only the next hop, not the packet's whole trip.
 */
export function routingTableFor(routerId: string, options: RouteOptions = {}): RoutingTableRow[] {
  return ROUTER_DESTINATIONS.map((destination) => {
    const path = shortestPath(routerId, destination.nodeId, options);
    const nextHop = path.length > 1 ? path[1] : null;
    return {
      destinationId: destination.id,
      network: destination.network,
      nextHop,
      nextHopLabel: nextHop ? routerNode(nextHop).label : "—",
      exitInterface: nextHop ? interfaceFor(routerId, nextHop) : "—",
      metric: path.length ? pathCost(path, options) : Number.POSITIVE_INFINITY,
      path,
    };
  });
}

export interface NeighbourChoice {
  edge: RouterEdge;
  neighbour: string;
  linkCost: number;
  remainingCost: number;
  totalCost: number;
}

/** “Via which neighbour is the destination cheapest?” at one router. */
export function neighbourChoices(
  at: string,
  destinationNode: string,
  options: RouteOptions = {},
): NeighbourChoice[] {
  const toDestination = dijkstra(destinationNode, options).distance;
  return (adjacency(options).get(at) ?? []).map((link) => {
    const remaining = toDestination.get(link.to) ?? Number.POSITIVE_INFINITY;
    return {
      edge: link.edge,
      neighbour: link.to,
      linkCost: link.cost,
      remainingCost: remaining,
      totalCost: link.cost + remaining,
    };
  }).sort((a, b) => a.totalCost - b.totalCost);
}

/** Tiny deterministic background mesh: a visual reminder of Internet scale. */
export const INTERNET_BACKGROUND_NODES = Array.from({ length: 72 }, (_, index) => {
  const seed = Math.sin(index * 997.13) * 10000;
  const fraction = seed - Math.floor(seed);
  const seedB = Math.sin(index * 613.71 + 19) * 10000;
  const fractionB = seedB - Math.floor(seedB);
  return {
    id: `bg-${index}`,
    x: 28 + fraction * 944,
    y: 28 + fractionB * 504,
    r: 1 + ((index * 7) % 3) * 0.45,
  };
});
