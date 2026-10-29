import * as THREE from "three";
import {
  BLOCKING_RADIUS_UNITS,
  KM_PER_UNIT,
  SPEED_OF_LIGHT_KM_S,
  satPosition,
  type SatSim,
} from "./orbit";

/** Maximum laser hops used by the relay path and its rendering buffer. */
export const MAX_RELAY_HOPS = 16;

/** One directed inter-satellite laser link, stored as a pair of sat ids. */
export interface LaserLink {
  a: number;
  b: number;
}

/** A complete relay path: dish → radio hop → laser hops → radio hop → gateway. */
export interface RouteInfo {
  /** Sat ids on the path, first = dish-connected satellite, last = gateway satellite. */
  satIds: number[];
  /** World-space waypoints for drawing (dish aperture → … → gateway antenna). */
  waypoints: THREE.Vector3[];
  /** Number of laser hops between the two radio links. */
  hops: number;
  /** Total path length (km). */
  lengthKm: number;
  /** One-way light time (ms). */
  latencyMs: number;
}

const _d = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _closest = new THREE.Vector3();

/** Angle (deg) of `target` above the local horizon of `observer`. */
export function elevationDeg(observer: THREE.Vector3, target: THREE.Vector3): number {
  _d.copy(target).sub(observer);
  const len = _d.length();
  if (len <= 1e-9) return 90;
  _d.multiplyScalar(1 / len);
  const radius = observer.length();
  const vertical = radius > 1e-9 ? _d.dot(observer) / radius : _d.y;
  return THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(vertical, -1, 1)));
}

/**
 * True when the segment a→b stays outside Earth's radius plus atmosphere.
 * Tests the closest approach of the segment to the origin.
 */
export function lineOfSightClear(a: THREE.Vector3, b: THREE.Vector3): boolean {
  _a.copy(a);
  _b.copy(b);
  _closest.copy(_b).sub(_a);
  const abLenSq = _closest.lengthSq();
  if (abLenSq <= 1e-12) return true;
  // t of closest approach, clamped to the segment.
  let t = -_a.dot(_closest) / abLenSq;
  t = THREE.MathUtils.clamp(t, 0, 1);
  _closest.multiplyScalar(t).add(_a);
  return _closest.length() >= BLOCKING_RADIUS_UNITS;
}

/**
 * Builds the inter-satellite laser mesh: up to `maxLinksPerSat` links per
 * satellite — ahead and behind in its own orbital plane, plus one to the
 * satellite in each neighbouring plane. Links are stored once (a < b) and
 * shared by both endpoints.
 */
export function buildLaserMesh(
  sats: SatSim[],
  planes: number,
  satsPerPlane: number,
): LaserLink[] {
  const at = new Map<string, number>();
  sats.forEach((s, i) => at.set(`${s.plane}:${s.slot}`, i));
  const out: LaserLink[] = [];
  const seen = new Set<string>();

  const add = (a: number, b: number) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ a, b });
  };

  const find = (plane: number, slot: number): number | undefined => {
    const p = ((plane % planes) + planes) % planes;
    const s = ((slot % satsPerPlane) + satsPerPlane) % satsPerPlane;
    return at.get(`${p}:${s}`);
  };

  for (const sat of sats) {
    const behind = find(sat.plane, sat.slot - 1);
    if (behind !== undefined) add(sat.id, behind);
    const ahead = find(sat.plane, sat.slot + 1);
    if (ahead !== undefined) add(sat.id, ahead);
    const lower = find(sat.plane - 1, sat.slot);
    if (lower !== undefined) add(sat.id, lower);
    const upper = find(sat.plane + 1, sat.slot);
    if (upper !== undefined) add(sat.id, upper);
  }
  return out;
}

/** Breadth-first search over the laser mesh from `from` to `to` (sat ids). */
export function bfsRoute(
  mesh: LaserLink[],
  from: number,
  to: number,
  maxHops = 8,
): number[] | null {
  if (from === to) return [from];
  const adjacency = new Map<number, number[]>();
  for (const link of mesh) {
    (adjacency.get(link.a) ?? adjacency.set(link.a, []).get(link.a)!).push(link.b);
    (adjacency.get(link.b) ?? adjacency.set(link.b, []).get(link.b)!).push(link.a);
  }
  const queue: number[] = [from];
  const prev = new Map<number, number>();
  const visited = new Set<number>([from]);
  while (queue.length) {
    const node = queue.shift()!;
    const hops = pathHops(prev, node);
    if (hops >= maxHops) continue;
    for (const next of adjacency.get(node) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      prev.set(next, node);
      if (next === to) {
        const path = [to];
        let cur = next;
        while (prev.has(cur)) {
          cur = prev.get(cur)!;
          path.unshift(cur);
        }
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}

function pathHops(prev: Map<number, number>, node: number): number {
  let hops = 0;
  let cur = node;
  while (prev.has(cur)) {
    cur = prev.get(cur)!;
    hops++;
  }
  return hops;
}

/**
 * Picks the satellite a gateway would use: highest elevation above
 * `minElevationDeg`, closest along-track to `preferNear` when tied.
 */
export function bestSatelliteFor(
  sats: SatSim[],
  observer: THREE.Vector3,
  t: number,
  minElevationDeg: number,
): { sat: SatSim; elevation: number } | null {
  let best: SatSim | null = null;
  let bestElev = -Infinity;
  for (const sat of sats) {
    satPosition(sat, t, _b);
    const el = elevationDeg(observer, _b);
    if (el >= minElevationDeg && el > bestElev) {
      bestElev = el;
      best = sat;
    }
  }
  return best ? { sat: best, elevation: bestElev } : null;
}

/** Whether a previously computed route is still usable at the current time. */
export function routeIsValid(
  route: RouteInfo,
  sats: SatSim[],
  dishGround: THREE.Vector3,
  gatewayGround: THREE.Vector3,
  connectedSat: number | null,
  t: number,
  minElevationDeg: number,
): boolean {
  const ids = route.satIds;
  if (ids.length === 0 || ids[0] !== connectedSat || !sats[ids[0]]) return false;
  const previous = new THREE.Vector3();
  const next = new THREE.Vector3();
  satPosition(sats[ids[0]], t, previous);
  if (elevationDeg(dishGround, previous) < minElevationDeg) return false;
  for (let i = 1; i < ids.length; i++) {
    if (!sats[ids[i]]) return false;
    satPosition(sats[ids[i]], t, next);
    if (!lineOfSightClear(previous, next)) return false;
    previous.copy(next);
  }
  return elevationDeg(gatewayGround, previous) >= minElevationDeg;
}

/**
 * Builds the full relay route: dish aperture → connected satellite → laser
 * hops (BFS) → gateway satellite → gateway antenna. Returns null when either
 * radio leg has no satellite in view.
 */
export function computeRoute(
  sats: SatSim[],
  mesh: LaserLink[],
  dishAperture: THREE.Vector3,
  gatewayAntenna: THREE.Vector3,
  dishSat: SatSim | null,
  t: number,
  minElevationDeg: number,
): RouteInfo | null {
  if (!dishSat) return null;
  const gatewayPick = bestSatelliteFor(sats, gatewayAntenna, t, minElevationDeg);
  if (!gatewayPick) return null;

  let satPath: number[] | null = null;
  if (dishSat.id !== gatewayPick.sat.id) {
    // Only use laser links whose straight segments clear Earth and its
    // atmosphere at this instant. A topological BFS alone can route through
    // the planet even when that link is hidden by the renderer.
    const positions = sats.map((sat) => satPosition(sat, t, new THREE.Vector3()));
    const available = mesh.filter(({ a, b }) =>
      positions[a] && positions[b] && lineOfSightClear(positions[a], positions[b]),
    );
    satPath = bfsRoute(available, dishSat.id, gatewayPick.sat.id, MAX_RELAY_HOPS);
  } else {
    satPath = [dishSat.id];
  }
  if (!satPath) return null;

  const waypoints: THREE.Vector3[] = [dishAperture.clone()];
  let lengthKm = 0;
  let prev = dishAperture;
  for (const id of satPath) {
    const sat = sats[id];
    satPosition(sat, t, _b);
    waypoints.push(_b.clone());
    lengthKm += prev.distanceTo(_b) * KM_PER_UNIT;
    // Detach: _b is scratch and is overwritten by the next iteration.
    prev = _b.clone();
  }
  waypoints.push(gatewayAntenna.clone());
  lengthKm += prev.distanceTo(gatewayAntenna) * KM_PER_UNIT;

  return {
    satIds: satPath,
    waypoints,
    hops: Math.max(0, satPath.length - 1),
    lengthKm,
    latencyMs: (lengthKm / SPEED_OF_LIGHT_KM_S) * 1000,
  };
}
