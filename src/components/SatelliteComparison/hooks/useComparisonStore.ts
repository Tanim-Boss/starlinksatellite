import { create } from "zustand";
import {
  comparisonConfig,
  type ComparisonLocation,
  type ComparisonStage,
  type ScaleMode,
} from "../config";

export interface SatelliteTooltip {
  title: string;
  altitude: string;
  speed: string;
  role: string;
}

/**
 * Mutable render-loop data. Three.js layers read and write this object from
 * useFrame; it deliberately lives outside Zustand so it never drives a React
 * render at display-frame rate.
 */
export const comparisonClock = {
  simTime: 0,
  wallTime: 0,
  stageStartedAt: 0,
  handoffStartedWall: 0,
  lastUiUpdate: 0,
  lastSatelliteScanAt: 0,
  sendStartedAtMs: 0,
};

export interface ComparisonState {
  stage: ComparisonStage;
  playing: boolean;
  timeSpeed: (typeof comparisonConfig.timeSpeeds)[number];
  tourPlaying: boolean;
  tourElapsedSec: number;
  tourProgress: number;
  scaleMode: ScaleMode;
  location: ComparisonLocation;
  showOrbits: boolean;
  showLinks: boolean;
  showLabels: boolean;
  reducedMotion: boolean;
  lowQuality: boolean;
  tooltip: SatelliteTooltip | null;
  sendNonce: number;
  sendStartedAtMs: number;
  elapsedMs: number;
  constellationCount: number;
  bestSatelliteId: number;
  previousSatelliteId: number;
  bestElevationDeg: number;
  handoffCount: number;
  handoffNotice: string;
  setStage: (stage: ComparisonStage, fromTour?: boolean) => void;
  nextStage: () => void;
  previousStage: () => void;
  setPlaying: (playing: boolean) => void;
  setTimeSpeed: (speed: ComparisonState["timeSpeed"]) => void;
  startTour: () => void;
  stopTour: () => void;
  updateTour: (elapsedSec: number) => void;
  setScaleMode: (mode: ScaleMode) => void;
  setLocation: (name: string) => void;
  toggleOrbits: () => void;
  toggleLinks: () => void;
  toggleLabels: () => void;
  setReducedMotion: (value: boolean) => void;
  setLowQuality: (value: boolean) => void;
  setTooltip: (tooltip: SatelliteTooltip | null) => void;
  sendSignal: () => void;
  setElapsedMs: (value: number) => void;
  setConstellationCount: (value: number) => void;
  setBestSatellite: (id: number, elevationDeg: number) => void;
  setHandoffNotice: (notice: string) => void;
}

const defaultLocation = comparisonConfig.locations[0];

export const useComparisonStore = create<ComparisonState>((set, get) => ({
  stage: 0,
  playing: true,
  timeSpeed: 60,
  tourPlaying: false,
  tourElapsedSec: 0,
  tourProgress: 0,
  scaleMode: "true",
  location: defaultLocation,
  showOrbits: true,
  showLinks: true,
  showLabels: true,
  reducedMotion: false,
  lowQuality: false,
  tooltip: null,
  sendNonce: 0,
  sendStartedAtMs: 0,
  elapsedMs: 0,
  constellationCount: 600,
  bestSatelliteId: 0,
  previousSatelliteId: -1,
  bestElevationDeg: 0,
  handoffCount: 0,
  handoffNotice: "",
  setStage: (stage, fromTour = false) => {
    comparisonClock.stageStartedAt = comparisonClock.simTime;
    if (stage === 5) comparisonClock.handoffStartedWall = comparisonClock.wallTime;
    set((state) => ({
      stage,
      tooltip: null,
      tourPlaying: fromTour ? state.tourPlaying : false,
      ...(stage === 4 ? { constellationCount: 600 } : {}),
    }));
  },
  nextStage: () => {
    const next = Math.min(comparisonConfig.stageCount - 1, get().stage + 1) as ComparisonStage;
    get().setStage(next);
  },
  previousStage: () => {
    const previous = Math.max(0, get().stage - 1) as ComparisonStage;
    get().setStage(previous);
  },
  setPlaying: (playing) => set({ playing }),
  setTimeSpeed: (timeSpeed) => set({ timeSpeed }),
  startTour: () => {
    comparisonClock.stageStartedAt = comparisonClock.simTime;
    set({
      stage: 0,
      tourPlaying: true,
      tourElapsedSec: 0,
      tourProgress: 0,
      playing: true,
      tooltip: null,
    });
  },
  stopTour: () => set({ tourPlaying: false }),
  updateTour: (tourElapsedSec) => {
    const duration = comparisonConfig.stageCount * comparisonConfig.tourStageSeconds;
    const clamped = Math.min(duration, Math.max(0, tourElapsedSec));
    const stage = Math.min(
      comparisonConfig.stageCount - 1,
      Math.floor(clamped / comparisonConfig.tourStageSeconds),
    ) as ComparisonStage;
    if (stage !== get().stage) get().setStage(stage, true);
    set({ tourElapsedSec: clamped, tourProgress: clamped / duration });
    if (clamped >= duration) set({ tourPlaying: false });
  },
  setScaleMode: (scaleMode) => set({ scaleMode }),
  setLocation: (name) => {
    const location = comparisonConfig.locations.find((city) => city.name === name);
    if (location) {
      set({ location, handoffNotice: "" });
      comparisonClock.lastSatelliteScanAt = 0;
    }
  },
  toggleOrbits: () => set((state) => ({ showOrbits: !state.showOrbits })),
  toggleLinks: () => set((state) => ({ showLinks: !state.showLinks })),
  toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),
  setReducedMotion: (reducedMotion) =>
    set({ reducedMotion, ...(reducedMotion ? { playing: false } : {}) }),
  setLowQuality: (lowQuality) => set({ lowQuality }),
  setTooltip: (tooltip) => set({ tooltip }),
  sendSignal: () => {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    comparisonClock.sendStartedAtMs = now;
    set((state) => ({
      sendNonce: state.sendNonce + 1,
      sendStartedAtMs: now,
      elapsedMs: 0,
    }));
  },
  setElapsedMs: (elapsedMs) => set({ elapsedMs }),
  setConstellationCount: (constellationCount) => set({ constellationCount }),
  setBestSatellite: (bestSatelliteId, bestElevationDeg) =>
    set((state) => {
      if (state.bestSatelliteId === bestSatelliteId) {
        return { bestElevationDeg };
      }
      const handoffCount = state.handoffCount + 1;
      comparisonClock.handoffStartedWall = comparisonClock.wallTime;
      return {
        previousSatelliteId: state.bestSatelliteId,
        bestSatelliteId,
        bestElevationDeg,
        handoffCount,
        handoffNotice: bestSatelliteId >= 0
          ? `Handoff → Satellite #${String(bestSatelliteId + 1).padStart(3, "0")}`
          : "Searching for a satellite above 25°",
      };
    }),
  setHandoffNotice: (handoffNotice) => set({ handoffNotice }),
}));
