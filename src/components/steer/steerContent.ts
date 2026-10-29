import type { StageId } from "./steerStore";
import type { TechMode } from "@/lib/steering";

export interface StageCopy {
  id: StageId | "mechanism";
  index: number;
  label: string;
  title: string;
  body: string;
}

/**
 * The five-stage narrative. The first four stages are driven by the live
 * simulation state; the fifth is the mechanism close-up the camera opens.
 */
export const STAGE_COPY: StageCopy[] = [
  {
    id: "link-a",
    index: 1,
    label: "Initial connection",
    title: "Locked onto Satellite A",
    body: "The antenna is currently tracking Satellite A. Wavefronts leave the terminal along a narrow, steady beam and the link carries data.",
  },
  {
    id: "selected",
    index: 2,
    label: "Target selection",
    title: "A new target has been selected",
    body: "The pointing controller has been commanded toward Satellite B. The tracking line already points at the new target while the gimbal is still aimed at A.",
  },
  {
    id: "steering",
    index: 3,
    label: "Beam steering",
    title: "The pointing system is rotating toward Satellite B",
    body: "The azimuth and elevation stages slew together and the whole beam — wavefronts included — sweeps across space. The satellite body itself stays attitude-fixed.",
  },
  {
    id: "link-b",
    index: 4,
    label: "Reacquisition",
    title: "Beam aligned. Communication link established",
    body: "The pointing error has dropped inside the lock threshold. The link indicator turns green and data packets begin flowing to Satellite B.",
  },
  {
    id: "mechanism",
    index: 5,
    label: "The mechanism",
    title: "Two axes decide where the beam goes",
    body: "Azimuth rotates the terminal about the vertical axis; elevation tilts it above the reference plane. The attitude controller turns target coordinates into gimbal commands — and, for a laser terminal, PAT keeps them precise.",
  },
];

export const MANUAL_COPY: StageCopy = {
  id: "manual",
  index: 3,
  label: "Manual steering",
  title: "You are commanding the gimbal",
  body: "Automatic tracking is off. The azimuth and elevation sliders drive the terminal directly; the amber readout shows how far the beam sits from the selected satellite.",
};

export function stageCopyFor(stage: StageId, view: string): StageCopy {
  if (view === "mechanism") return STAGE_COPY[4];
  if (stage === "manual") return MANUAL_COPY;
  return STAGE_COPY.find((item) => item.id === stage) ?? STAGE_COPY[0];
}

export interface TechCard {
  id: TechMode;
  title: string;
  tagline: string;
  points: { label: string; value: string }[];
  explanation: string;
}

export const TECH_CARDS: Record<TechMode, TechCard> = {
  rf: {
    id: "rf",
    title: "Radio-frequency dish antenna",
    tagline: "A gimbaled parabolic reflector",
    points: [
      { label: "Carrier", value: "Ka-band radio, ≈ 20 GHz" },
      { label: "Beamwidth", value: "A few degrees (illustrative: 2.4°)" },
      { label: "Pointing", value: "Two-axis gimbal, sub-degree accuracy" },
      { label: "Beam control", value: "Orientation of the reflector" },
    ],
    explanation:
      "The dish physically rotates so its boresight — the axis of the narrow radio beam — meets the target. Radio energy spreads over a beam several degrees wide, so a modest pointing error still leaves the partner inside the beam.",
  },
  optical: {
    id: "optical",
    title: "Optical inter-satellite terminal",
    tagline: "A steerable laser telescope with PAT",
    points: [
      { label: "Carrier", value: "1550 nm infrared laser" },
      { label: "Divergence", value: "Microradians (illustrative: 0.05°)" },
      { label: "Pointing", value: "PAT: pointing, acquisition, tracking" },
      { label: "Beam control", value: "Gimbal + fine-steering mirror" },
    ],
    explanation:
      "A laser beam is fractions of a degree wide, so the terminal first acquires the partner with a wide search, then tracks it with a fast fine-steering mirror. A conventional parabolic dish is not the same hardware as an optical terminal.",
  },
};

/** The fixed footer caveat, reused in the HUD and on the page. */
export const CONCEPT_NOTE =
  "Conceptual simulation: wavefronts are explanatory surfaces of constant phase, not individual photons or a literal electromagnetic field. Positions, ranges, rates and thresholds are illustrative — this is neither an orbital propagator nor an electromagnetic solver.";
