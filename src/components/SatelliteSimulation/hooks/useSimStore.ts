import { create } from "zustand";
import {
  camera as cameraCfg,
  defaultGateway,
  storySegments,
  type CameraMode,
  type City,
} from "../config";
import type { RouteInfo } from "../utils/links";

/* -------------------------------------------------------------------------- */
/* Mutable simulation state                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Live simulation values written once per frame by the driver and read
 * imperatively by the scene graph — never through React state. Mirrors the
 * site-wide `simClock` pattern: writing these to zustand every frame would
 * re-render the HUD 60 times per second.
 */
export const simState = {
  /** Simulated seconds since T0. */
  time: 0,
  /** Earth rotation angle (rad). */
  earthAngle: 0,
  /** Sat id the dish is locked to, or null. */
  connectedSat: null as number | null,
  /** Elevation (deg) of the connected satellite above the dish. */
  connectedElevation: 0,
  /** How many satellites are above the minimum elevation right now. */
  visibleCount: 0,
  /** Simulated time of the last handoff, or -Infinity. */
  handoffAt: -Infinity,
  /** Sat id of the satellite being handed off to (label + old beam fade). */
  handoffSat: null as number | null,
  /** Fading beam target (previous satellite) and its remaining opacity. */
  secondarySat: null as number | null,
  secondaryAlpha: 0,
  /** Active relay route, or null while searching. */
  route: null as RouteInfo | null,
  /** Hovered/clicked satellite id, for the tooltip. */
  selectedSat: null as number | null,
  /** Camera distance from its target (scene units), published by CameraRig. */
  cameraDistance: cameraCfg.orbitDistance,
  /**
   * Absolute distance the camera should dolly to, set by the zoom buttons /
   * slider / reset view. Consumed (and cleared on arrival) by CameraRig;
   * null means the visitor is driving the camera directly.
   */
  zoomTarget: null as number | null,
  /** Incremented by "Reset / full view"; CameraRig recentres on Earth. */
  resetViewNonce: 0,
  /** Measured frame rate (Smoothed). */
  fps: 60,
  /** Quality tier: 0 = full, 1 = reduced (fewer satellites, bloom off). */
  qualityTier: 0,
};

/* -------------------------------------------------------------------------- */
/* UI state                                                                    */
/* -------------------------------------------------------------------------- */

export interface SimToggles {
  orbits: boolean;
  laserMesh: boolean;
  labels: boolean;
  dishBeam: boolean;
}

/** What the mouse wheel / touch scroll does over the 3D stage. */
export type ScrollMode = "zoom" | "page";

interface SimStore {
  speed: number;
  setSpeed: (v: number) => void;
  playing: boolean;
  togglePlay: () => void;
  setPlaying: (v: boolean) => void;
  cameraMode: CameraMode;
  setCameraMode: (m: CameraMode) => void;
  /** Wheel behaviour over the canvas: zoom the 3D view, or scroll the page. */
  scrollMode: ScrollMode;
  setScrollMode: (m: ScrollMode) => void;
  /** Dolly one step closer / farther (switches to Orbit view). */
  zoomIn: () => void;
  zoomOut: () => void;
  /** Dolly to an absolute camera distance in scene units. */
  zoomTo: (distance: number) => void;
  /** Bumped by every zoom/reset action so the view toolbar re-renders. */
  viewNonce: number;
  /** Frame the whole Earth again: Orbit view, default distance, centred. */
  resetView: () => void;
  toggles: SimToggles;
  setToggle: <K extends keyof SimToggles>(key: K, value?: boolean) => void;
  user: City;
  gateway: City;
  setUser: (c: City) => void;
  setGateway: (c: City) => void;
  /** Hovered/clicked satellite id (tooltip); null when nothing is selected. */
  selectedSat: number | null;
  setSelectedSat: (id: number | null) => void;
  /** Quality tier: 0 = full, 1 = reduced (mirrors simState.qualityTier). */
  qualityTier: number;
  setQualityTier: (t: number) => void;
  /** Incremented ~8x/second so DOM readouts re-render without per-frame updates. */
  uiTick: number;
  /** Story Mode: auto-playing tour state. */
  storyActive: boolean;
  storyIndex: number;
  /** Caption currently shown by the story tour (empty when idle). */
  storyCaption: string;
  startStory: () => void;
  stopStory: () => void;
}

const initialToggles: SimToggles = {
  orbits: false,
  laserMesh: true,
  labels: true,
  dishBeam: true,
};

export const useSimStore = create<SimStore>((set) => ({
  speed: 600,
  setSpeed: (v) => set({ speed: v }),
  playing: true,
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  setPlaying: (v) => set({ playing: v }),
  cameraMode: "orbit",
  setCameraMode: (m) => set({ cameraMode: m }),
  viewNonce: 0,
  scrollMode: "zoom",
  setScrollMode: (m) => set({ scrollMode: m }),
  // Taking manual control of the camera ends the guided tour.
  zoomIn: () =>
    set((s) => {
      const base = simState.zoomTarget ?? simState.cameraDistance;
      simState.zoomTarget = clampZoom(base / cameraCfg.zoomStep);
      return takenControl(s);
    }),
  zoomOut: () =>
    set((s) => {
      const base = simState.zoomTarget ?? simState.cameraDistance;
      simState.zoomTarget = clampZoom(base * cameraCfg.zoomStep);
      return takenControl(s);
    }),
  zoomTo: (distance) =>
    set((s) => {
      simState.zoomTarget = clampZoom(distance);
      return takenControl(s);
    }),
  resetView: () =>
    set((s) => {
      simState.zoomTarget = cameraCfg.orbitDistance;
      simState.resetViewNonce += 1;
      return takenControl(s);
    }),
  toggles: initialToggles,
  setToggle: (key, value) =>
    set((s) => ({ toggles: { ...s.toggles, [key]: value ?? !s.toggles[key] } })),
  user: { name: "Dhaka", lat: 23.81, lon: 90.41 },
  gateway: { ...defaultGateway },
  setUser: (c) => set({ user: c }),
  setGateway: (c) => set({ gateway: c }),
  selectedSat: null,
  setSelectedSat: (id) => set({ selectedSat: id }),
  qualityTier: 0,
  setQualityTier: (t) => set({ qualityTier: t }),
  uiTick: 0,
  storyActive: false,
  storyIndex: 0,
  storyCaption: "",
  startStory: () =>
    set({
      storyActive: true,
      storyIndex: 0,
      storyCaption: storySegments[0].caption,
    }),
  stopStory: () => set({ storyActive: false, storyCaption: "" }),
}));

/** Smooths a noisy FPS sample; keeps the quality fallback from flickering. */
export function smoothFps(previous: number, sample: number): number {
  return previous * 0.9 + sample * 0.1;
}

/** State returned when a zoom/reset action takes manual camera control. */
function takenControl(s: SimStore) {
  return {
    cameraMode: "orbit" as const,
    storyActive: false,
    storyCaption: "",
    viewNonce: s.viewNonce + 1,
  };
}

/** Keeps a requested camera distance inside the OrbitControls zoom range. */
export function clampZoom(distance: number): number {
  return Math.min(cameraCfg.orbitMax, Math.max(cameraCfg.orbitMin, distance));
}

/**
 * Maps a camera distance to a 0–100 zoom percentage (log scale, so each
 * step feels equal) and back. 100% = closest, 0% = farthest.
 */
export function distanceToZoomPct(distance: number): number {
  const lo = Math.log(cameraCfg.orbitMin);
  const hi = Math.log(cameraCfg.orbitMax);
  const pct = ((hi - Math.log(clampZoom(distance))) / (hi - lo)) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)));
}

export function zoomPctToDistance(pct: number): number {
  const clamped = Math.min(100, Math.max(0, pct));
  const lo = Math.log(cameraCfg.orbitMin);
  const hi = Math.log(cameraCfg.orbitMax);
  return Math.exp(hi - (clamped / 100) * (hi - lo));
}
