import * as THREE from "three";
import { handoverClock, useHandoverUI } from "./handoverStore";
import { sampleScenario, type SatKey, type ScenarioState } from "@/lib/handover";
import { sampleSky, type SkyState } from "@/lib/constellation";

/**
 * Shared per-frame state and the physical models for the handover lab.
 *
 * One scenario sample per animation frame, shared by every scene element, so
 * beam, label and array can never disagree about which satellite is served.
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

let skyCachedTime = Number.NaN;
let skyCachedState: SkyState | null = null;

/** The same idea for the full-shell lab (sampled once per frame). */
export function skyFrameState(): SkyState {
  const t = handoverClock.time;
  if (!skyCachedState || skyCachedTime !== t) {
    skyCachedState = sampleSky(t);
    skyCachedTime = t;
  }
  return skyCachedState;
}

const _a = new THREE.Vector3();
const _tmp = new THREE.Vector3();
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
  if (useHandoverUI.getState().mode === "sky") {
    const st = skyFrameState();
    if (!st.beamTargetPosition) return null;
    return out.set(...st.beamTargetPosition);
  }
  const st = frameState();
  const e = st.currentEvent;
  if (st.phase === "transfer" && e) {
    _a.set(...st.sats[e.from].position);
    const to = _tmp.set(...st.sats[e.to].position);
    return out.copy(_a).lerp(to, smoothstep(st.progress));
  }
  if (!st.serving) return null;
  return out.set(...st.sats[st.serving].position);
}

export const UP = _up.clone();

/** Where the beam leaves the dish panel, in scene units (tilted Dishy face). */
export const BEAM_ORIGIN = new THREE.Vector3(0, 0.0292, -0.0104);

/** Centre of the Earth in the local scene (the dish sits on the surface). */
export const EARTH_CENTER = new THREE.Vector3(0, -1, 0);

/* -------------------------------------------------------------------------- */
/* The Starlink satellite model                                               */
/* -------------------------------------------------------------------------- */
/*
 * Built to the real v1.5 proportions — a flat slab bus about 3 m across, one
 * large solar wing, a white Ku-band phased array on the belly that always
 * faces Earth, and the optical laser terminals on the deck. Sizes are in
 * "metres"; the caller picks the scene scale (the whole lab is exaggerated so
 * a spacecraft is visible next to a planet).
 */

const SAT_BODY = "#39424e";
const SAT_WING = "#14264f";
const SAT_FACE = "#dce7f2";
const SAT_METAL = "#9fb2c6";

/** Detailed satellite as a Group. `tint` recolours it for a link role. */
export function buildStarlinkModel(scale = 0.0026) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: SAT_BODY,
    metalness: 0.62,
    roughness: 0.38,
    emissive: new THREE.Color("#0c2530"),
    emissiveIntensity: 0.6,
  });
  const wingMat = new THREE.MeshStandardMaterial({
    color: SAT_WING,
    metalness: 0.4,
    roughness: 0.5,
    emissive: new THREE.Color("#0a1730"),
    emissiveIntensity: 0.5,
    side: THREE.DoubleSide,
  });
  const faceMat = new THREE.MeshStandardMaterial({
    color: SAT_FACE,
    metalness: 0.15,
    roughness: 0.55,
    emissive: new THREE.Color("#2c4356"),
    emissiveIntensity: 0.4,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: SAT_METAL,
    metalness: 0.85,
    roughness: 0.28,
  });

  // Bus: a flat slab, long axis along Z (the direction of travel).
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.34, 3.4), bodyMat);
  // One large solar wing, deployed to +X.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.05, 2.9), wingMat);
  wing.position.set(4.6, 0.02, 0);
  const boom = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.2), metalMat);
  boom.position.set(1.4, 0, 0);
  // Ku-band phased array on the belly — this is what faces the dish.
  const face = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.07, 2.8), faceMat);
  face.position.set(0, -0.2, 0);
  // Optical inter-satellite link terminals on the deck.
  const laserGeo = new THREE.CylinderGeometry(0.16, 0.2, 0.44, 10);
  const laser1 = new THREE.Mesh(laserGeo, metalMat);
  laser1.position.set(0.5, 0.36, -1.15);
  const laser2 = new THREE.Mesh(laserGeo, metalMat);
  laser2.position.set(-0.5, 0.36, 1.15);
  // Star tracker.
  const tracker = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), bodyMat);
  tracker.position.set(-0.45, 0.3, 0.45);

  group.add(body, wing, boom, face, laser1, laser2, tracker);
  group.scale.setScalar(scale);

  const scratch = new THREE.Color();
  /** Tint the bus toward a role colour and raise its glow. */
  const tint = (color: THREE.ColorRepresentation, glow: number) => {
    scratch.set(color);
    bodyMat.emissive.copy(scratch).multiplyScalar(0.55);
    bodyMat.emissiveIntensity = glow;
    bodyMat.color.set(SAT_BODY).lerp(scratch, 0.3);
    faceMat.emissive.copy(scratch).multiplyScalar(0.35);
  };

  return { group, tint, bodyMat, wingMat, faceMat, metalMat };
}

/**
 * The same model, merged into one vertex-coloured geometry for the swarm.
 * Hundreds of these render in a single instanced draw call.
 */
export function makeSwarmGeometry(): THREE.BufferGeometry {
  const parts: { geo: THREE.BufferGeometry; color: string }[] = [
    { geo: new THREE.BoxGeometry(1.6, 0.34, 3.4), color: SAT_BODY },
    { geo: new THREE.BoxGeometry(7.4, 0.05, 2.9).translate(4.6, 0.02, 0), color: SAT_WING },
    { geo: new THREE.BoxGeometry(1.4, 0.12, 0.2).translate(1.4, 0, 0), color: SAT_METAL },
    { geo: new THREE.BoxGeometry(1.4, 0.07, 2.8).translate(0, -0.2, 0), color: SAT_FACE },
    {
      geo: new THREE.CylinderGeometry(0.16, 0.2, 0.44, 8).translate(0.5, 0.36, -1.15),
      color: SAT_METAL,
    },
    {
      geo: new THREE.CylinderGeometry(0.16, 0.2, 0.44, 8).translate(-0.5, 0.36, 1.15),
      color: SAT_METAL,
    },
  ];

  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const c = new THREE.Color();
  let offset = 0;

  for (const { geo, color } of parts) {
    c.set(color);
    const pos = geo.getAttribute("position");
    const nrm = geo.getAttribute("normal");
    const idx = geo.getIndex();
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      if (nrm) normals.push(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
      colors.push(c.r, c.g, c.b);
    }
    if (idx) {
      for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i) + offset);
    } else {
      for (let i = 0; i < pos.count; i++) indices.push(i + offset);
    }
    offset += pos.count;
    geo.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  merged.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  merged.setIndex(indices);
  merged.computeBoundingSphere();
  return merged;
}

/** Scene scale of one swarm satellite (body ≈ 3.4 m × this ≈ 24 km on screen). */
export const SAT_SWARM_SCALE = 0.00112;
/** Focus satellites (serving / candidate) are drawn larger so they read. */
export const SAT_FOCUS_SCALE = 0.0026;

const oUp = new THREE.Vector3();
const oVel = new THREE.Vector3();
const oX = new THREE.Vector3();
const oY = new THREE.Vector3();
const oZ = new THREE.Vector3();

/**
 * Orientation of a real Starlink satellite: belly (the Ku array) toward Earth,
 * long axis along the velocity vector, solar wing out to the side. Fills `out`
 * with the composed transform for one instance.
 */
export function orientSatelliteMatrix(
  out: THREE.Matrix4,
  px: number,
  py: number,
  pz: number,
  vx: number,
  vy: number,
  vz: number,
  scale: number,
): THREE.Matrix4 {
  oUp.set(px - EARTH_CENTER.x, py - EARTH_CENTER.y, pz - EARTH_CENTER.z).normalize();
  oVel.set(vx, vy, vz);
  // Project velocity onto the local horizontal plane: the along-track axis.
  oZ.copy(oVel).addScaledVector(oUp, -oVel.dot(oUp));
  if (oZ.lengthSq() < 1e-10) oZ.set(0, 0, 1);
  oZ.normalize();
  oX.crossVectors(oUp, oZ).normalize();
  oY.copy(oUp);
  out.makeBasis(
    oX.multiplyScalar(scale),
    oY.multiplyScalar(scale),
    oZ.multiplyScalar(scale),
  );
  out.setPosition(px, py, pz);
  return out;
}

/** Orientation only (no position/scale) — for the focus-satellite groups. */
export function orientSatelliteQuaternion(
  outQ: THREE.Quaternion,
  px: number,
  py: number,
  pz: number,
  vx: number,
  vy: number,
  vz: number,
): THREE.Quaternion {
  oUp.set(px - EARTH_CENTER.x, py - EARTH_CENTER.y, pz - EARTH_CENTER.z).normalize();
  oVel.set(vx, vy, vz);
  oZ.copy(oVel).addScaledVector(oUp, -oVel.dot(oUp));
  if (oZ.lengthSq() < 1e-10) oZ.set(0, 0, 1);
  oZ.normalize();
  oX.crossVectors(oUp, oZ).normalize();
  oY.copy(oUp);
  _m4.makeBasis(oX, oY, oZ);
  return outQ.setFromRotationMatrix(_m4);
}

const _m4 = new THREE.Matrix4();
