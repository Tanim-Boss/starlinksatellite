import { create } from "zustand";
import {
  ARRAY_N,
  DEFAULT_AZ_DEG,
  DEFAULT_EL_DEG,
  aimAtSatellite,
  angleBetweenDeg,
  clampSteering,
  satelliteAt,
  satelliteById,
  steeringFromAngles,
  type BeamView,
  type SatId,
} from "@/lib/phasedArray";
import { GUIDE_STEPS } from "@/lib/antennaContent";

/**
 * Shared clock and beam state for the phased-array lab.
 *
 * The 3D scene reads these plain objects inside its animation frame, so the
 * beam can move at 60 fps without re-rendering the React tree. The store holds
 * the UI-facing copy of the same values and is refreshed a few times a second;
 * both are written from one driver, so the sliders, readouts, phase colours and
 * radiation pattern cannot drift apart.
 */
export const antennaClock = {
  /** Seconds of satellite-sky time. Orbital motion is independent of the beam. */
  skyTime: 0,
  /** Phase clock for the wavefront animation, in the same seconds. */
  waveTime: 0,
};

export const beamState = {
  azDeg: DEFAULT_AZ_DEG,
  elDeg: DEFAULT_EL_DEG,
};

export type Speed = 0.25 | 0.5 | 1 | 2;
export const SPEEDS: Speed[] = [0.25, 0.5, 1, 2];

export type CameraView = "sky" | "panel";

export interface ElementRef {
  /** Column, west → east. */
  i: number;
  /** Row, north → south. */
  j: number;
}

interface BeamLabState {
  azDeg: number;
  elDeg: number;
  view: BeamView;
  camera: CameraView;
  cameraNonce: number;
  playing: boolean;
  speed: Speed;
  sweeping: boolean;
  tracking: boolean;
  selectedSat: SatId | null;
  selectedElement: ElementRef;
  showLabels: boolean;
  showTracks: boolean;
  guideStep: number;
  /** Refreshed ~10 Hz while the clock runs so live DOM readouts can update. */
  skyTick: number;

  setAzimuth: (azDeg: number) => void;
  setElevation: (elDeg: number) => void;
  setSteering: (azDeg: number, elDeg: number) => void;
  setView: (view: BeamView) => void;
  setCamera: (camera: CameraView) => void;
  togglePlay: () => void;
  setSpeed: (speed: Speed) => void;
  setSweeping: (on: boolean) => void;
  toggleSweep: () => void;
  setTracking: (on: boolean) => void;
  toggleTracking: () => void;
  selectSat: (id: SatId | null) => void;
  pointAtTarget: () => void;
  setSelectedElement: (el: ElementRef) => void;
  toggleLabels: () => void;
  toggleTracks: () => void;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetLab: () => void;
}

export function prefersReducedMotionNow() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true;
  }
}

function writeBeam(azDeg: number, elDeg: number) {
  const s = clampSteering(azDeg, elDeg);
  beamState.azDeg = s.azDeg;
  beamState.elDeg = s.elDeg;
  return { azDeg: s.azDeg, elDeg: s.elDeg };
}

function aimAt(id: SatId) {
  const sat = satelliteAt(satelliteById(id), antennaClock.skyTime);
  return aimAtSatellite(sat);
}

const CENTRE_ELEMENT: ElementRef = {
  i: Math.floor(ARRAY_N / 2) - 1,
  j: Math.floor(ARRAY_N / 2) - 1,
};

export const useBeamLab = create<BeamLabState>()((set, get) => ({
  azDeg: DEFAULT_AZ_DEG,
  elDeg: DEFAULT_EL_DEG,
  view: "beam",
  camera: "sky",
  cameraNonce: 0,
  playing: true,
  speed: 1,
  sweeping: false,
  tracking: false,
  selectedSat: null,
  selectedElement: CENTRE_ELEMENT,
  showLabels: true,
  showTracks: true,
  guideStep: 1,
  skyTick: 0,

  setAzimuth: (azDeg) => {
    const el = get().elDeg;
    const next = writeBeam(azDeg, el);
    set({ ...next, sweeping: false, tracking: false });
  },

  setElevation: (elDeg) => {
    const az = get().azDeg;
    const next = writeBeam(az, elDeg);
    set({ ...next, sweeping: false, tracking: false });
  },

  setSteering: (azDeg, elDeg) => {
    const next = writeBeam(azDeg, elDeg);
    set({ ...next, sweeping: false, tracking: false });
  },

  setView: (view) => set({ view }),

  setCamera: (camera) =>
    set((s) => ({ camera, cameraNonce: s.cameraNonce + 1 })),

  togglePlay: () => set((s) => ({ playing: !s.playing })),

  setSpeed: (speed) => set({ speed }),

  setSweeping: (on) => {
    if (on) {
      // Starting a sweep is an explicit request for motion: resume the clock
      // even if reduced motion had left it paused at load.
      set({ sweeping: true, tracking: false, playing: true });
    } else {
      // Keep the frame-level angles so stopping the sweep does not snap back
      // to the last throttled store value.
      const next = writeBeam(beamState.azDeg, beamState.elDeg);
      set({ ...next, sweeping: false });
    }
  },

  toggleSweep: () => get().setSweeping(!get().sweeping),

  setTracking: (on) => {
    if (!on) {
      const next = writeBeam(beamState.azDeg, beamState.elDeg);
      set({ ...next, tracking: false });
      return;
    }
    const id = get().selectedSat ?? "A";
    const aim = aimAt(id);
    set({
      ...writeBeam(aim.azDeg, aim.elDeg),
      selectedSat: id,
      tracking: true,
      sweeping: false,
      // Explicit request for motion; see setSweeping.
      playing: true,
    });
  },

  toggleTracking: () => get().setTracking(!get().tracking),

  selectSat: (id) => {
    if (!id) {
      set({ selectedSat: null, tracking: false });
      return;
    }
    set({ selectedSat: id });
    if (get().tracking) {
      const aim = aimAt(id);
      set({ ...writeBeam(aim.azDeg, aim.elDeg) });
    }
  },

  pointAtTarget: () => {
    const id = get().selectedSat;
    if (!id) return;
    const aim = aimAt(id);
    set({ ...writeBeam(aim.azDeg, aim.elDeg), tracking: false, sweeping: false });
  },

  setSelectedElement: (selectedElement) => set({ selectedElement }),

  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),

  toggleTracks: () => set((s) => ({ showTracks: !s.showTracks })),

  goToStep: (step) => {
    const bounded = Math.max(1, Math.min(GUIDE_STEPS.length, step));
    const setup = GUIDE_STEPS[bounded - 1].setup;
    // Reduced motion keeps the lab paused on load, but pressing Next or picking
    // a step is a request to see the animation, so it may run.
    const playing = setup.autoplay ? true : get().playing;

    let next = { azDeg: setup.azDeg, elDeg: setup.elDeg };
    const selectedSat = setup.selectedSat;
    if (setup.aimAtSelected && selectedSat) {
      const aim = aimAt(selectedSat);
      next = { azDeg: aim.azDeg, elDeg: aim.elDeg };
    }

    set({
      guideStep: bounded,
      view: setup.view,
      selectedSat,
      tracking: Boolean(setup.tracking && selectedSat),
      sweeping: setup.sweeping,
      playing,
      ...writeBeam(next.azDeg, next.elDeg),
    });
  },

  nextStep: () => get().goToStep(get().guideStep + 1),
  prevStep: () => get().goToStep(get().guideStep - 1),

  resetLab: () => {
    antennaClock.skyTime = 0;
    antennaClock.waveTime = 0;
    const next = writeBeam(DEFAULT_AZ_DEG, DEFAULT_EL_DEG);
    set({
      ...next,
      view: "beam",
      camera: "sky",
      playing: !prefersReducedMotionNow(),
      speed: 1,
      sweeping: false,
      tracking: false,
      selectedSat: null,
      selectedElement: CENTRE_ELEMENT,
      showLabels: true,
      showTracks: true,
      guideStep: 1,
    });
  },
}));

/** Tolerance for the "Beam aligned" badge, degrees. */
export const ALIGN_TOLERANCE_DEG = 2.5;

/**
 * Live target information. Reads the frame-level beam state and the shared sky
 * clock, so it always agrees with the 3D scene — including between React
 * renders while auto-tracking.
 */
export function liveAlignment(id: SatId) {
  const sat = satelliteAt(satelliteById(id), antennaClock.skyTime);
  const beam = steeringFromAngles(beamState.azDeg, beamState.elDeg);
  return {
    sat,
    beamAzDeg: beam.azDeg,
    beamElDeg: beam.elDeg,
    errorDeg: angleBetweenDeg(beam, sat),
  };
}
