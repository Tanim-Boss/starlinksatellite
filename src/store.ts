import { create } from "zustand";

export type ScenarioId = "focus" | "shells" | "ground" | "overlap" | "laser";

export interface Toggles {
  /** Orbital plane rings. */
  rings: boolean;
  /** Sample coverage footprints on Earth's surface. */
  caps: boolean;
  /** Signal beams (ground-station links + selected satellite beam). */
  beams: boolean;
  /** Ground station markers. */
  stations: boolean;
  /** Labels (selected satellite + station names). */
  labels: boolean;
  /** Ground track trail of the selected satellite. */
  trails: boolean;
  /** Inter-satellite laser links. */
  laser: boolean;
  /** Rotate the Earth itself. */
  earthSpin: boolean;
  /** Slow automatic camera orbit. */
  autoRotate: boolean;
}

interface AppState {
  scenario: ScenarioId;
  setScenario: (s: ScenarioId) => void;
  /** Simulation speed multiplier (1x .. 10,000x). */
  speed: number;
  setSpeed: (v: number) => void;
  playing: boolean;
  togglePlay: () => void;
  toggles: Toggles;
  setToggle: <K extends keyof Toggles>(key: K, value?: boolean) => void;
  selectedId: number | null;
  selectSat: (id: number | null) => void;
  /** Ground probe point (lat/lon deg) for the coverage-overlap scenario. */
  probe: { lat: number; lon: number } | null;
  setProbe: (p: { lat: number; lon: number } | null) => void;
  /** Satellite id the camera is flying to, or null. */
  cameraFocusId: number | null;
  focusCamera: (id: number | null) => void;
  /** Incremented ~5x/second so readouts can re-render without per-frame updates. */
  uiTick: number;
}

const BASE_TOGGLES: Toggles = {
  rings: false,
  caps: false,
  beams: true,
  stations: true,
  labels: true,
  trails: true,
  laser: false,
  earthSpin: false,
  autoRotate: true,
};

const SCENARIO_TOGGLES: Record<ScenarioId, Partial<Toggles>> = {
  focus: { rings: false, caps: false, beams: true, stations: true, labels: true, trails: true, laser: false },
  shells: { rings: true, caps: true, beams: false, stations: false, labels: false, trails: false, laser: false },
  ground: { rings: false, caps: false, beams: true, stations: true, labels: true, trails: false, laser: false },
  overlap: { rings: false, caps: true, beams: false, stations: true, labels: false, trails: false, laser: false },
  laser: { rings: true, caps: false, beams: false, stations: false, labels: false, trails: false, laser: true },
};

export const useApp = create<AppState>()((set, get) => ({
  scenario: "focus",
  speed: 100,
  playing: true,
  toggles: { ...BASE_TOGGLES },
  selectedId: 0,
  probe: null,
  cameraFocusId: null,
  uiTick: 0,

  setScenario: (s) => {
    const st = get();
    set({
      scenario: s,
      toggles: { ...st.toggles, ...SCENARIO_TOGGLES[s] },
      cameraFocusId: null,
      ...(s === "focus" && st.selectedId == null ? { selectedId: 0 } : {}),
    });
  },

  setSpeed: (v) => set({ speed: v }),
  togglePlay: () => set((st) => ({ playing: !st.playing })),
  setToggle: (key, value) =>
    set((st) => ({ toggles: { ...st.toggles, [key]: value ?? !st.toggles[key] } })),
  selectSat: (id) => set({ selectedId: id, cameraFocusId: null }),
  setProbe: (p) => set({ probe: p }),
  focusCamera: (id) => set({ cameraFocusId: id }),
}));
