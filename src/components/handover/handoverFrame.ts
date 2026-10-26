import * as THREE from "three";
import { handoverClock } from "./handoverStore";
import { sampleScenario, type SatKey, type ScenarioState } from "@/lib/handover";

/**
 * One scenario sample per animation frame, shared by every scene element.
 * All the 3D pieces read the same instant, so beam, label and array can never
 * disagree about which satellite is being served.
 */
let cachedTime = Number.NaN;
let cachedState: ScenarioState | null = null;

export function frameState(): ScenarioState {
  const t = handoverClock.time;
  if (!cachedState || cachedTime !== t) {
    cachedState = sampleScenario(t);
    cachedTime = t;
  }
  return cachedState;
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

export const SAT_KEYS_3D: SatKey[] = ["A", "B", "C"];

/** Colour language used across the scene, the panel and the timeline. */
export const ROLE_COLOR = {
  serving: "#3ddbd9",
  candidate: "#fbbf24",
  previous: "#60a5fa",
  out: "#f87171",
  visible: "#93a4c0",
} as const;

export function smoothstep(x: number) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

/**
 * Point the drawn beam/array at: the serving satellite, or a blend between the
 * old and new satellite while a handover transfer is in progress.
 */
export function beamTarget(out = new THREE.Vector3()): THREE.Vector3 | null {
  const st = frameState();
  const e = st.currentEvent;
  if (st.phase === "transfer" && e) {
    _a.set(...st.sats[e.from].position);
    _b.set(...st.sats[e.to].position);
    return out.copy(_a).lerp(_b, smoothstep(st.progress));
  }
  if (!st.serving) return null;
  return out.set(...st.sats[st.serving].position);
}

/** Unit vector of the beam, from the dish origin towards the sky target. */
export function beamDirection(out = new THREE.Vector3()) {
  const t = beamTarget(_b);
  if (!t) return null;
  return out.copy(t).normalize();
}

export const UP = _up.clone();

/** Where the beam leaves the dish panel, in scene units. */
export const BEAM_ORIGIN = new THREE.Vector3(0, 0.0202, 0.0011);

/** Satellite model: body + two solar wings, merged into one geometry. */
export function makeSatelliteGeometry() {
  const body = new THREE.BoxGeometry(0.0024, 0.0019, 0.0062);
  const panel = new THREE.BoxGeometry(0.0072, 0.0006, 0.0032);
  const left = panel.clone().translate(-0.0048, 0, 0);
  const right = panel.clone().translate(0.0048, 0, 0);
  const dish = new THREE.CylinderGeometry(0.0011, 0.0011, 0.0006, 10).translate(0, 0.0016, 0);
  const geo = mergeGeometriesSafe([body, left, right, dish]);
  return geo ?? body;
}

function mergeGeometriesSafe(geos: THREE.BufferGeometry[]) {
  // Merge by hand: avoids pulling in BufferGeometryUtils for four boxes.
  const merged = new THREE.BufferGeometry();
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  let offset = 0;
  for (const g of geos) {
    const pos = g.getAttribute("position");
    const nrm = g.getAttribute("normal");
    const idx = g.getIndex();
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      if (nrm) normals.push(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
    }
    if (idx) {
      for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i) + offset);
    } else {
      for (let i = 0; i < pos.count; i++) indices.push(i + offset);
    }
    offset += pos.count;
  }
  merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  if (normals.length) merged.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  merged.setIndex(indices);
  merged.computeBoundingSphere();
  return merged;
}
