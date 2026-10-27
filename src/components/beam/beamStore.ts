import { create } from "zustand";
import {
  anglesFromDirection,
  directionFrom,
  getSatellite,
  satelliteAt,
  wrapAz,
  type SatId,
  type SkyPoint,
} from "@/lib/dishBeam";

export type BeamView = "dish" | "sky" | "orbit";
export type BeamMode = "track" | "aim";

export const SPEEDS = [0.25, 0.5, 1, 2] as const;

/**
 * Live simulation state, kept outside React on purpose.
 *
 * The driver writes it once per frame and the three.js layers read it
 * imperatively. The 2D instruments read it through `uiTick`, which is bumped
 * about eight times a second, so the page never re-renders at 60 fps just to
 * print an azimuth.
 */
export const beamClock = {
  /** Simulated seconds since the satellites started moving. */
  t: 0,
  /** Wavefront phase in cycles (0…1). */
  wave: 0,
  /** Beam azimuth and elevation actually being radiated, in degrees. */
  az: 0,
  el: 0,
  /** Where the beam is being asked to point (the selected satellite or the aim). */
  targetAz: 0,
  targetEl: 0,
};

const start = satelliteAt(getSatellite("A"), 0);
beamClock.az = start.az;
beamClock.el = start.el;
beamClock.targetAz = start.az;
beamClock.targetEl = start.el;

/** Wavefronts per simulated second. Slow enough to follow one ring upward. */
const WAVE_HZ = 0.16;
/** First-order approach rate of the beam when the aim changes, per second. */
const SLEW_RATE = 4.5;

export interface BeamLabState {
  view: BeamView;
  playing: boolean;
  speed: number;
  targetId: SatId;
  mode: BeamMode;
  aimAz: number;
  aimEl: number;
  showCodes: boolean;
  showLabels: boolean;
  showSightLine: boolean;
  /** Bumped ~8× per second so readouts can refresh without per-frame React updates. */
  uiTick: number;
  setView: (view: BeamView) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
  selectTarget: (id: SatId) => void;
  setMode: (mode: BeamMode) => void;
  aimAt: (az: number, el: number) => void;
  toggleCodes: () => void;
  toggleLabels: () => void;
  toggleSightLine: () => void;
  reset: () => void;
}

const INITIAL = {
  view: "sky" as BeamView,
  playing: true,
  speed: 1,
  targetId: "A" as SatId,
  mode: "track" as BeamMode,
  aimAz: Math.round(start.az * 2) / 2,
  aimEl: Math.round(start.el * 2) / 2,
  showCodes: true,
  showLabels: true,
  showSightLine: true,
};

/** Where the beam should point right now: the tracked satellite or the manual aim. */
export function desiredAim(state: Pick<BeamLabState, "mode" | "aimAz" | "aimEl" | "targetId">): SkyPoint {
  if (state.mode === "aim") return { az: state.aimAz, el: state.aimEl };
  return satelliteAt(getSatellite(state.targetId), beamClock.t);
}

/** The satellite being tracked, for instruments that show its own position. */
export function trackedSatellite(): SkyPoint {
  const { targetId } = useBeamLab.getState();
  return satelliteAt(getSatellite(targetId), beamClock.t);
}

/**
 * Advances the clock and slews the beam one step. Returns true when the beam
 * actually moved, so the HUD only wakes up while something is happening.
 */
export function advanceBeam(
  dt: number,
  state: Pick<BeamLabState, "playing" | "speed" | "mode" | "aimAz" | "aimEl" | "targetId">,
): boolean {
  if (state.playing) {
    beamClock.t += dt * state.speed;
    beamClock.wave = (beamClock.wave + dt * state.speed * WAVE_HZ) % 1;
  }

  const target = desiredAim(state);
  beamClock.targetAz = target.az;
  beamClock.targetEl = target.el;

  const from = directionFrom(beamClock.az, beamClock.el);
  const to = directionFrom(target.az, target.el);
  const k = 1 - Math.exp(-dt * SLEW_RATE);
  let x = from[0] + (to[0] - from[0]) * k;
  let y = from[1] + (to[1] - from[1]) * k;
  let z = from[2] + (to[2] - from[2]) * k;
  const len = Math.hypot(x, y, z);
  if (len < 1e-5) {
    // A perfect 180° reversal has no well-defined halfway point; snap.
    x = to[0];
    y = to[1];
    z = to[2];
  }
  const next = anglesFromDirection(x, y, z);
  const moved =
    Math.abs(wrapAz(next.az - beamClock.az)) > 0.002 || Math.abs(next.el - beamClock.el) > 0.002;
  beamClock.az = wrapAz(next.az);
  beamClock.el = next.el;
  return moved;
}

/** Returns the clock to its start so Reset is a true restart. */
export function resetBeamClock(): void {
  const origin = satelliteAt(getSatellite("A"), 0);
  beamClock.t = 0;
  beamClock.wave = 0;
  beamClock.az = origin.az;
  beamClock.el = origin.el;
  beamClock.targetAz = origin.az;
  beamClock.targetEl = origin.el;
}

export const useBeamLab = create<BeamLabState>()((set) => ({
  ...INITIAL,
  uiTick: 0,

  setView: (view) => set({ view }),
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  setPlaying: (playing) => set({ playing }),
  setSpeed: (speed) => set({ speed }),
  selectTarget: (targetId) => set({ targetId, mode: "track" }),
  setMode: (mode) =>
    set((s) => {
      if (mode === "track") return { mode };
      // Seed the manual aim from where the beam is, so switching mode does not
      // make the beam jump across the sky.
      return {
        mode,
        aimAz: s.mode === "aim" ? s.aimAz : Math.round(beamClock.az * 2) / 2,
        aimEl: s.mode === "aim" ? s.aimEl : Math.round(beamClock.el * 2) / 2,
      };
    }),
  aimAt: (az, el) =>
    set({
      mode: "aim",
      aimAz: Math.round(wrapAz(az) * 2) / 2,
      aimEl: Math.round(Math.max(8, Math.min(85, el)) * 2) / 2,
    }),
  toggleCodes: () => set((s) => ({ showCodes: !s.showCodes })),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  toggleSightLine: () => set((s) => ({ showSightLine: !s.showSightLine })),
  reset: () => {
    resetBeamClock();
    set({ ...INITIAL, uiTick: 0 });
  },
}));
