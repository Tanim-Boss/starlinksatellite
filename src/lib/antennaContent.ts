import type { BeamView, SatId } from "@/lib/phasedArray";

/**
 * Copy and lesson choreography for the phased-array lab. Kept out of the
 * components so the wording can be reviewed like any other page text.
 */

export interface GuideSetup {
  view: BeamView;
  azDeg: number;
  elDeg: number;
  selectedSat: SatId | null;
  tracking: boolean;
  sweeping: boolean;
  /** Point the beam at the selected satellite when the step starts. */
  aimAtSelected?: boolean;
  /** Start the clock when the step is opened. Ignored under reduced motion. */
  autoplay?: boolean;
}

export interface GuideStep {
  id: number;
  kicker: string;
  /** Compact rail label; long kickers get clipped at 190 px otherwise. */
  short: string;
  title: string;
  body: string;
  action: string;
  setup: GuideSetup;
}

export const GUIDE_STEPS: GuideStep[] = [
  {
    id: 1,
    kicker: "The hardware",
    short: "Hardware",
    title: "A flat panel that never turns",
    body:
      "This is a 16 × 16 phased array: 256 small radiators on one flat face. There is no motor, no gimbal and no rotating joint. The mount is fixed to the ground, and every element stays exactly where it is.",
    action: "Orbit the camera around the panel. Find the four mounting feet — and no moving parts.",
    setup: {
      view: "beam",
      azDeg: 0,
      elDeg: 55,
      selectedSat: null,
      tracking: false,
      sweeping: false,
    },
  },
  {
    id: 2,
    kicker: "Radio waves",
    short: "Waves",
    title: "Switch on the waves",
    body:
      "Wave view shows the field leaving all the elements at once. Each expanding ring is a wavefront: a surface of constant phase, moving outward at the speed of light. The colour of an element is its commanded phase.",
    action: "Watch the rings leave the panel. Notice that the element colours are not all the same.",
    setup: {
      view: "wave",
      azDeg: 0,
      elDeg: 55,
      selectedSat: null,
      tracking: false,
      sweeping: false,
      autoplay: true,
    },
  },
  {
    id: 3,
    kicker: "Interference",
    short: "Interference",
    title: "Bright where fields add, dark where they cancel",
    body:
      "In the floating interference sheet, cyan regions are constructive: crests arrive together and the electric field is strong. Warm, dim regions are destructive: a crest arrives on a trough and the field nearly vanishes. The dark lines are nulls, not gaps in the hardware.",
    action: "Drag the azimuth slider a few degrees. The whole bright/dark pattern shifts — it is the sum of all 256 elements.",
    setup: {
      view: "wave",
      azDeg: 0,
      elDeg: 45,
      selectedSat: null,
      tracking: false,
      sweeping: false,
      autoplay: true,
    },
  },
  {
    id: 4,
    kicker: "Horizontal steering",
    short: "Azimuth",
    title: "Sweep the beam sideways",
    body:
      "A linear phase ramp across the east–west axis tilts the combined wavefront. The beam leaves at an angle instead of straight up. The panel does not move: only the relative phase of the elements changes.",
    action: "Drag Azimuth, or press “Sweep across the sky”, and watch the main lobe travel from left to right.",
    setup: {
      view: "beam",
      azDeg: -45,
      elDeg: 50,
      selectedSat: null,
      tracking: false,
      sweeping: false,
      autoplay: true,
    },
  },
  {
    id: 5,
    kicker: "Vertical steering",
    short: "Elevation",
    title: "Raise and lower the beam",
    body:
      "The north–south axis has its own phase ramp. Add it and the wavefront tilts in the other plane, so the beam climbs toward the zenith or drops toward the horizon. A two-dimensional array needs a phase for every element, not a single phase for the whole panel.",
    action: "Move Elevation from 30° to 75°. Watch the main lobe tilt and the phase stripes rotate across the grid.",
    setup: {
      view: "beam",
      azDeg: 0,
      elDeg: 30,
      selectedSat: null,
      tracking: false,
      sweeping: false,
      autoplay: true,
    },
  },
  {
    id: 6,
    kicker: "A moving target",
    short: "Aim",
    title: "Aim at a satellite",
    body:
      "Select SAT-A. The amber dashed line is the true direction to the satellite. The panel cannot turn, so you steer the beam electronically. Bring the beam within 2.5° of that line and the alignment chip turns green.",
    action: "Use the azimuth and elevation sliders — or “Point at target” — then watch the satellite move away again.",
    setup: {
      view: "beam",
      azDeg: 0,
      elDeg: 55,
      selectedSat: "A",
      tracking: false,
      sweeping: false,
      autoplay: true,
    },
  },
  {
    id: 7,
    kicker: "Tracking",
    short: "Auto-track",
    title: "Let the array follow it",
    body:
      "With Auto-track on, the steering angles are recomputed from the satellite's apparent position as it moves. The phase commands change every frame; the panel stays perfectly still. The satellite would keep moving even if the beam were switched off.",
    action: "Watch AZ and EL chase the satellite and the phase colours update. The hardware never rotates.",
    setup: {
      view: "beam",
      azDeg: 0,
      elDeg: 55,
      selectedSat: "A",
      tracking: true,
      aimAtSelected: true,
      sweeping: false,
      autoplay: true,
    },
  },
];

export interface Concept {
  id: string;
  number: string;
  title: string;
  body: string;
  /** Shown as a small live line under the body. */
  live?: "phase" | "interference" | "direction" | "tracking";
}

export const CONCEPTS: Concept[] = [
  {
    id: "element",
    number: "01",
    title: "What an antenna element is",
    body:
      "An element is one small radiator: a patch or slot that converts a guided electrical signal into an electromagnetic wave. Here it is a 16 × 16 lattice of 256 elements on a flat panel, spaced half a wavelength apart.",
  },
  {
    id: "phase",
    number: "02",
    title: "What phase means",
    body:
      "Phase says where a wave is in its cycle: crest, trough, or somewhere in between. Two signals at the same frequency can be offset by an angle. Driving each element with a controlled delay shifts its phase without changing its frequency.",
    live: "phase",
  },
  {
    id: "add",
    number: "03",
    title: "Waves add as fields",
    body:
      "Radio waves are oscillating electric fields. Where two fields meet, their instantaneous values add. That is the whole trick: the array does not “aim” energy like a torch; it arranges arrival times so the sum is large in one direction and small elsewhere.",
  },
  {
    id: "interference",
    number: "04",
    title: "Constructive and destructive interference",
    body:
      "Crest meeting crest gives a larger field — constructive interference. Crest meeting trough gives almost nothing — destructive interference. Between the bright main lobe and the side lobes, the array creates directions where the sum is a null.",
    live: "interference",
  },
  {
    id: "steer",
    number: "05",
    title: "How relative phase steers the beam",
    body:
      "Apply a linear phase ramp across the aperture. In the chosen direction, every element's path difference is cancelled by its electrical phase, so the contributions arrive in step. In every other direction they partly cancel. Change the ramp and the strong direction moves.",
    live: "direction",
  },
  {
    id: "fixed",
    number: "06",
    title: "Why the panel does not rotate",
    body:
      "The beam direction is a property of the interference pattern, not of the panel's orientation. Steering is a change of numbers in the beamformer, not a movement of hardware. That is why the transition is electronic and can be much faster than a motor.",
  },
  {
    id: "track",
    number: "07",
    title: "Following a satellite across the sky",
    body:
      "A LEO satellite crosses the visible sky in minutes. The terminal measures the direction, recomputes the required phase ramp, and updates it continuously. A fixed panel can therefore track a moving target; the satellite's orbit is independent of what the beam is doing.",
    live: "tracking",
  },
];

export const COMPARISON = [
  {
    aspect: "What moves",
    mechanical: "The whole dish, driven by motors and gears.",
    electronic: "Nothing physical. Only the per-element phase commands.",
  },
  {
    aspect: "How fast it can re-aim",
    mechanical: "Seconds, limited by inertia and mechanics.",
    electronic: "Microseconds to milliseconds, limited by electronics and the control loop.",
  },
  {
    aspect: "Wear",
    mechanical: "Bearings, motors and cables flex every time it moves.",
    electronic: "Solid-state switching; heat is the main constraint.",
  },
  {
    aspect: "Multiple beams",
    mechanical: "One pointing direction at a time.",
    electronic: "Several beams can share one aperture with enough independent RF chains.",
  },
  {
    aspect: "Field of view",
    mechanical: "Can be pointed almost anywhere.",
    electronic: "Bounded by element spacing, element pattern and grating lobes — not by a motor.",
  },
  {
    aspect: "Starlink terminals",
    mechanical: "Not the mechanism used for normal consumer terminal steering.",
    electronic: "Flat panels with electronic beam steering; details vary by generation.",
  },
];

export const ASSUMPTIONS = [
  "Uniform 16 × 16 rectangular lattice of ideal, isotropic radiators; no amplitude taper or weighting.",
  "Half-wavelength spacing at a 12 GHz carrier: d = λ/2 ≈ 12.5 mm and an aperture of about 0.20 m per side.",
  "Narrowband, lossless, far-field array-factor model. Mutual coupling, edge effects, ground-plane reflections, radome losses, polarisation and atmospheric attenuation are omitted.",
  "The 3D envelope and the expanding wavefronts are schematic aids. Their thickness and wavelength on screen are exaggerated; they are not to scale.",
  "The interference sheet plots |array factor| in a horizontal plane. It is a teaching device, not a near-field electromagnetic solve.",
  "The three satellites follow simplified closed apparent tracks, not live Keplerian orbits or ephemerides. Their apparent motion is time-compressed and independent of the beam.",
  "Production Starlink terminals differ by hardware generation. Element counts, feed networks, scan limits and beamforming details are not public, and none are reproduced here.",
  "Azimuth ±75° and elevation 15°–85° are interface limits chosen for this lesson, not published hardware specifications.",
];

export const HONESTY = [
  {
    title: "Not a Starlink control system",
    body: "No proprietary firmware, no exact hardware specifications, no live telemetry. This is an educational simulation built from textbook array theory.",
  },
  {
    title: "Simplified, not fake",
    body: "The phase gradients, array factor, beam direction and alignment maths are real. The visual scale and the satellite tracks are simplified, and every shortcut is labelled.",
  },
  {
    title: "Hardware varies",
    body: "Different Starlink terminal generations use different arrays and electronics. Do not read this model as a parts list for any particular product.",
  },
];

/** Short labels for the three views. */
export const VIEW_COPY: { id: BeamView; label: string; short: string; blurb: string }[] = [
  {
    id: "wave",
    label: "Wave view",
    short: "Waves",
    blurb: "Individual wavefronts and the combined interference field.",
  },
  {
    id: "beam",
    label: "Beam view",
    short: "Beam",
    blurb: "The main lobe, derived from the array model, with a simplified envelope.",
  },
  {
    id: "pattern",
    label: "Radiation pattern",
    short: "Pattern",
    blurb: "Main lobe, side lobes and nulls across the upper hemisphere.",
  },
];
