import { create } from "zustand";
import { SCENARIO_DURATION_SEC } from "@/lib/handover";

/**
 * Shared clock for the handover simulation.
 *
 * The 3D scene advances this every animation frame, so satellite motion stays
 * smooth; the DOM panels mirror it a dozen times a second. Keeping the clock
 * out of React state on purpose: driving the whole panel tree at 60 fps would
 * be wasteful, and the canvas does not need a re-render to move a satellite.
 */
export const handoverClock = {
  time: 0,
};

export type CameraMode = "ground" | "space" | "dish";

export const SPEEDS = [0.25, 0.5, 1, 2] as const;
export type Speed = (typeof SPEEDS)[number];

export interface HandoverUIState {
  playing: boolean;
  speed: Speed;
  loop: boolean;
  showPaths: boolean;
  showBeams: boolean;
  showCoverage: boolean;
  showLabels: boolean;
  camera: CameraMode;

  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (speed: Speed) => void;
  toggleSlowMotion: () => void;
  setLoop: (loop: boolean) => void;
  toggleLayer: (layer: "showPaths" | "showBeams" | "showCoverage" | "showLabels") => void;
  setCamera: (camera: CameraMode) => void;
  restart: () => void;
  seek: (tSec: number) => void;
}

export function seekTo(tSec: number) {
  handoverClock.time = Math.max(0, Math.min(SCENARIO_DURATION_SEC - 0.01, tSec));
}

export const useHandoverUI = create<HandoverUIState>((set) => ({
  playing: true,
  speed: 1,
  loop: true,
  showPaths: true,
  showBeams: true,
  showCoverage: true,
  showLabels: true,
  camera: "ground",

  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  togglePlay: () =>
    set((s) => {
      // Pressing play at the very end of the loop starts it again.
      if (!s.playing && handoverClock.time >= SCENARIO_DURATION_SEC - 0.2) seekTo(0);
      return { playing: !s.playing };
    }),
  setSpeed: (speed) => set({ speed }),
  toggleSlowMotion: () => set((s) => ({ speed: s.speed === 0.25 ? 1 : 0.25 })),
  setLoop: (loop) => set({ loop }),
  toggleLayer: (layer) =>
    set((s) => ({ [layer]: !s[layer] }) as Partial<HandoverUIState>),
  setCamera: (camera) => set({ camera }),
  restart: () => {
    seekTo(0);
    set({ playing: true });
  },
  /** Stepping or scrubbing pauses so the learner can read the step. */
  seek: (tSec) => {
    seekTo(tSec);
    set({ playing: false });
  },
}));

export function seekAndPause(tSec: number) {
  seekTo(tSec);
  useHandoverUI.setState({ playing: false });
}

export function seekAndPlay(tSec: number) {
  seekTo(tSec);
  useHandoverUI.setState({ playing: true });
}
