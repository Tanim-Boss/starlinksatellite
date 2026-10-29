import { create } from "zustand";
import { defaultGateway, storySegments, type CameraMode, type City } from "../config";
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

interface SimStore {
  speed: number;
  setSpeed: (v: number) => void;
  playing: boolean;
  togglePlay: () => void;
  setPlaying: (v: boolean) => void;
  cameraMode: CameraMode;
  setCameraMode: (m: CameraMode) => void;
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
