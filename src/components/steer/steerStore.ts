import { create } from "zustand";
import {
  TECH_SPECS,
  angularSeparation,
  azElFromDirection,
  clampEl,
  directionFromAzEl,
  getTarget,
  linkStatus,
  targetAzElAt,
  wrapAz,
  type TargetId,
  type TechMode,
  type LinkStatus,
} from "@/lib/steering";

export type CameraView = "overview" | "mechanism" | "beam";
export type StageId = "link-a" | "selected" | "steering" | "link-b" | "manual";

export const SPEEDS = [
  { id: 0.5, label: "Slow" },
  { id: 1, label: "Normal" },
  { id: 2, label: "Fast" },
] as const;

/** Wavefront rings travel at this many cycles per simulated second. */
const WAVE_HZ = 0.22;
/** Data-packet round trips per simulated second while a link is locked. */
const PACKET_HZ = 0.5;
/**
 * A freshly selected target stays in the "selected" stage for this long —
 * long enough to read the tracking line jumping while the gimbal is still
 * aimed at the old partner, short enough that the slew gets its own stage.
 */
const SELECT_HOLD_S = 0.7;

/**
 * Live simulation state, kept outside React on purpose.
 *
 * The driver writes it once per frame and the three.js layers read it
 * imperatively; the DOM instruments read it through `uiTick`, bumped about
 * eight times a second, so the page never re-renders at 60 fps to print an
 * azimuth.
 */
export const steerClock = {
  /** Simulated seconds since the run started. */
  t: 0,
  /** Wavefront phase in cycles (0…1). */
  wave: 0,
  /** Data-packet phase in cycles (0…1). */
  packet: 0,
  /** Gimbal angles actually being radiated, degrees in the body frame. */
  az: 0,
  el: 0,
  /** Commanded angles (the tracked target or the manual aim). */
  targetAz: 0,
  targetEl: 0,
  /** Angle between the beam and the selected target, degrees. */
  errorDeg: 0,
  status: "locked" as LinkStatus,
  stage: "link-a" as StageId,
  /** Simulated time of the most recent target handover. */
  handoverAt: -10,
  /** 0…1 envelope used to grow the beam in on start / reset. */
  intro: 0,
};

const origin = targetAzElAt(getTarget("A"), 0);
steerClock.az = origin.az;
steerClock.el = origin.el;
steerClock.targetAz = origin.az;
steerClock.targetEl = origin.el;

export interface SteerState {
  tech: TechMode;
  targetId: TargetId;
  autoTrack: boolean;
  playing: boolean;
  speed: number;
  aimAz: number;
  aimEl: number;
  showWavefronts: boolean;
  showTrackingLine: boolean;
  showLabels: boolean;
  view: CameraView;
  /** Bumped to re-run the current camera preset (the "reset view" button). */
  viewNonce: number;
  /** Bumped ~8× per second so readouts refresh without per-frame React renders. */
  uiTick: number;
  setTech: (tech: TechMode) => void;
  selectTarget: (id: TargetId) => void;
  setAutoTrack: (auto: boolean) => void;
  aimAt: (az: number, el: number) => void;
  setPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  toggleWavefronts: () => void;
  toggleTrackingLine: () => void;
  toggleLabels: () => void;
  setView: (view: CameraView) => void;
  resetCamera: () => void;
  reset: () => void;
}

const INITIAL = {
  tech: "rf" as TechMode,
  targetId: "A" as TargetId,
  autoTrack: true,
  playing: true,
  speed: 1,
  aimAz: Math.round(origin.az * 2) / 2,
  aimEl: Math.round(origin.el * 2) / 2,
  showWavefronts: true,
  showTrackingLine: true,
  showLabels: true,
  view: "overview" as CameraView,
};

/** Commanded pointing right now: the tracked target or the manual sliders. */
function commandedPointing(
  state: Pick<SteerState, "autoTrack" | "aimAz" | "aimEl" | "targetId">,
): { az: number; el: number } {
  if (!state.autoTrack) return { az: state.aimAz, el: state.aimEl };
  return targetAzElAt(getTarget(state.targetId), steerClock.t);
}

/** Which stage the narrative strip should highlight from the live clock. */
export function deriveStage(
  state: Pick<SteerState, "autoTrack" | "targetId">,
  status: LinkStatus,
): StageId {
  if (!state.autoTrack) return "manual";
  if (status === "locked") return state.targetId === "A" ? "link-a" : "link-b";
  return steerClock.t - steerClock.handoverAt < SELECT_HOLD_S ? "selected" : "steering";
}

/**
 * Advances the clock and slews the gimbal one step. Returns true when
 * something visible moved, so the HUD only wakes up while that is happening.
 */
export function advanceSteering(
  dt: number,
  state: Pick<
    SteerState,
    "playing" | "speed" | "tech" | "autoTrack" | "aimAz" | "aimEl" | "targetId"
  >,
): boolean {
  if (state.playing) {
    steerClock.t += dt * state.speed;
    steerClock.wave = (steerClock.wave + dt * state.speed * WAVE_HZ) % 1;
    steerClock.packet = (steerClock.packet + dt * state.speed * PACKET_HZ) % 1;
  }
  // The grow-in envelope runs even while paused so reduced-motion visitors
  // (who start paused) never face an invisible beam.
  steerClock.intro = Math.min(1, steerClock.intro + dt / 1.4);

  const commanded = commandedPointing(state);
  steerClock.targetAz = commanded.az;
  steerClock.targetEl = commanded.el;

  // Slew the *direction*, not the raw angles: a slerp handles the ±180°
  // azimuth seam and combined az/el motion without gimbal-flip artefacts.
  const from = directionFromAzEl(steerClock.az, steerClock.el);
  const to = directionFromAzEl(commanded.az, commanded.el);
  const rate = TECH_SPECS[state.tech].slewRate;
  const k = 1 - Math.exp(-dt * rate);
  let x = from[0] + (to[0] - from[0]) * k;
  let y = from[1] + (to[1] - from[1]) * k;
  let z = from[2] + (to[2] - from[2]) * k;
  const len = Math.hypot(x, y, z);
  if (len < 1e-5) {
    x = to[0];
    y = to[1];
    z = to[2];
  }
  const next = azElFromDirection(x, y, z);
  const moved =
    Math.abs(wrapAz(next.az - steerClock.az)) > 0.002 ||
    Math.abs(next.el - steerClock.el) > 0.002;
  steerClock.az = wrapAz(next.az);
  steerClock.el = next.el;

  // Pointing error is always measured against the selected target, even in
  // manual mode, so the panel can show how far off the hand aim is.
  const target = targetAzElAt(getTarget(state.targetId), steerClock.t);
  steerClock.errorDeg = angularSeparation({ az: steerClock.az, el: steerClock.el }, target);
  steerClock.status = linkStatus(state.tech, state.autoTrack, steerClock.errorDeg);
  steerClock.stage = deriveStage(state, steerClock.status);
  return moved;
}

export function resetSteerClock(): void {
  const start = targetAzElAt(getTarget("A"), 0);
  steerClock.t = 0;
  steerClock.wave = 0;
  steerClock.packet = 0;
  steerClock.az = start.az;
  steerClock.el = start.el;
  steerClock.targetAz = start.az;
  steerClock.targetEl = start.el;
  steerClock.errorDeg = 0;
  steerClock.status = "locked";
  steerClock.stage = "link-a";
  steerClock.handoverAt = -10;
  steerClock.intro = 0;
}

export const useSteerLab = create<SteerState>()((set) => ({
  ...INITIAL,
  viewNonce: 0,
  uiTick: 0,

  setTech: (tech) => set({ tech }),
  selectTarget: (targetId) =>
    set((s) => {
      if (targetId === s.targetId) return { autoTrack: true };
      // A handover: stamp the clock so the "target selected" stage can hold
      // for a beat before the slew takes over the narrative.
      steerClock.handoverAt = steerClock.t;
      return { targetId, autoTrack: true };
    }),
  setAutoTrack: (autoTrack) =>
    set((s) => {
      if (autoTrack) return { autoTrack: true };
      // Seed the sliders from the live gimbal so switching to manual never
      // makes the terminal jump.
      return {
        autoTrack: false,
        aimAz: s.autoTrack ? Math.round(wrapAz(steerClock.az) * 2) / 2 : s.aimAz,
        aimEl: s.autoTrack ? Math.round(clampEl(steerClock.el) * 2) / 2 : s.aimEl,
      };
    }),
  aimAt: (az, el) =>
    set({
      autoTrack: false,
      aimAz: Math.round(wrapAz(az) * 2) / 2,
      aimEl: Math.round(clampEl(el) * 2) / 2,
    }),
  setPlaying: (playing) => set({ playing }),
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  setSpeed: (speed) => set({ speed }),
  toggleWavefronts: () => set((s) => ({ showWavefronts: !s.showWavefronts })),
  toggleTrackingLine: () => set((s) => ({ showTrackingLine: !s.showTrackingLine })),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  setView: (view) => set({ view }),
  resetCamera: () => set((s) => ({ viewNonce: s.viewNonce + 1 })),
  reset: () => {
    resetSteerClock();
    set({ ...INITIAL, viewNonce: 0, uiTick: 0 });
  },
}));
