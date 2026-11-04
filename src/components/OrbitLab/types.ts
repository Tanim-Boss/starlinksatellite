export type LabMode = "compare" | "dishes" | "broadcast" | "starlink";

export interface LabSceneProps {
  mode: LabMode;
  playing: boolean;
  speed: number;
  showOrbits: boolean;
  showSignals: boolean;
  showMesh: boolean;
  resetKey: number;
  active: boolean;
  onReady: () => void;
}
