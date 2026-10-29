/**
 * Every tunable of the satellite-internet simulation lives in this file:
 * constellation parameters, Earth/texture paths, colour language, camera and
 * quality settings, preset locations. Nothing in the scenes or UI hardcodes a
 * number that a visitor might reasonably want to change.
 *
 * Scene units: 1 unit = 1 Earth radius (6371 km), the same convention the
 * rest of the site's 3D work uses. Orbits, speeds and geometry are
 * physically based; satellite, dish and beam sizes are deliberately
 * exaggerated for legibility and the UI says so.
 */

/* -------------------------------------------------------------------------- */
/* Constellation (physically based)                                            */
/* -------------------------------------------------------------------------- */

export interface ConstellationConfig {
  /** Orbital planes, evenly spaced in RAAN. */
  planes: number;
  /** Satellites per plane, evenly spaced in mean anomaly. */
  satsPerPlane: number;
  /** Circular orbit altitude (km). */
  altitudeKm: number;
  /** Orbital inclination (deg). */
  inclinationDeg: number;
  /** Rendered satellite count cap (quality fallback may lower it). */
  maxRendered: number;
}

export const constellation: ConstellationConfig = {
  planes: 24,
  satsPerPlane: 20,
  altitudeKm: 550,
  inclinationDeg: 53,
  maxRendered: 480,
};

/* -------------------------------------------------------------------------- */
/* Earth and textures                                                          */
/* -------------------------------------------------------------------------- */

export const earth = {
  /** Mean equatorial radius (km). */
  radiusKm: 6371,
  /** Atmosphere thickness added to Earth's radius for line-of-sight checks (km). */
  atmosphereKm: 100,
  /** Sidereal rotation period (s). Earth rotates once per 24 h in sim time. */
  siderealPeriodS: 86164.0905,
};

export interface TextureConfig {
  /** Day map (surface albedo). */
  day: string;
  /** City lights used as the night-side emissive map. */
  night: string;
  /** Optional cloud map; empty string falls back to a procedural layer. */
  clouds: string;
}

export const textures: TextureConfig = {
  day: "/textures/earth-day.jpg",
  night: "/textures/earth-night.jpg",
  clouds: "",
};

/* -------------------------------------------------------------------------- */
/* Link geometry and colours                                                   */
/* -------------------------------------------------------------------------- */

export const links = {
  /** Minimum elevation (deg) for a dish or gateway to use a satellite. */
  minElevationDeg: 25,
  /** Maximum laser links per satellite (ahead/behind + one per neighbour plane). */
  maxLinksPerSat: 4,
  /** Handoff margin: re-select when the current satellite drops this far below min elevation (deg). */
  handoffMarginDeg: 3,
};

export const colors = {
  /** Radio link (dish ↔ satellite): orange/amber. */
  rf: "#ff7a1a",
  /** Laser link (satellite ↔ satellite): cyan. */
  laser: "#3ddbd9",
  /** Satellites and the internet node: white. */
  sat: "#ffffff",
  /** Earth rim glow. */
  atmosphere: "#5fa8ff",
  /** Dish field-of-view cone. */
  fov: "#7fc7ff",
  /** Highlighted route. */
  route: "#5ef2ff",
};

/* -------------------------------------------------------------------------- */
/* Time, camera and story                                                      */
/* -------------------------------------------------------------------------- */

export const timeSpeeds = [1, 60, 600, 3000] as const;

export type CameraMode = "orbit" | "dish" | "laser";

export const camera = {
  /** Default orbit-view distance in scene units (1 unit = 6371 km). */
  orbitDistance: 4.6,
  /** Closest zoom: just above the 550 km shell (shell radius ≈ 1.086). */
  orbitMin: 1.35,
  /** Farthest zoom: the whole constellation shell fits comfortably. */
  orbitMax: 12,
  /** Distance multiplier applied by one click of the zoom in/out buttons. */
  zoomStep: 1.4,
  /** Camera-mode transition duration (s). */
  transitionS: 1.5,
  /** Dish-view standoff above the dish (scene units). */
  dishOffset: 0.14,
  /** Laser-view standoff beside the satellite (scene units). */
  laserOffset: 0.16,
};

/** Story Mode timeline segments, in order. Captions shown over the canvas. */
export interface StorySegment {
  camera: CameraMode;
  speed: number;
  caption: string;
  durationS: number;
}

export const storySegments: StorySegment[] = [
  {
    camera: "orbit",
    speed: 600,
    caption:
      "A shell of satellites 550 km up, racing around Earth every 95 minutes — each one painting a spot beam on the ground.",
    durationS: 8,
  },
  {
    camera: "dish",
    speed: 60,
    caption:
      "Your dish is a flat phased array. It has no moving parts — the beam steers electronically, thousands of times a second.",
    durationS: 9,
  },
  {
    camera: "dish",
    speed: 60,
    caption:
      "Orange wavefronts carry your data up; binary digits stream both ways along the beam, into the satellite above.",
    durationS: 8,
  },
  {
    camera: "laser",
    speed: 60,
    caption:
      "Lasers between satellites relay your traffic across oceans — a private fibre network in space, no ground station in between.",
    durationS: 9,
  },
  {
    camera: "orbit",
    speed: 60,
    caption: "Down to a gateway antenna, and into the internet.",
    durationS: 7,
  },
  {
    camera: "orbit",
    speed: 3000,
    caption: "Satellites set below the horizon — the network hands you to the next one rising, seamlessly.",
    durationS: 8,
  },
  {
    camera: "orbit",
    speed: 60,
    caption: "That is the whole chain: dish, radio, laser mesh, gateway, internet. Replay it any time.",
    durationS: 7,
  },
];

/* -------------------------------------------------------------------------- */
/* Performance                                                                 */
/* -------------------------------------------------------------------------- */

export const performance = {
  /** Device-pixel-ratio cap. */
  dpr: [1, 2] as [number, number],
  /** Average FPS below which quality drops a tier. */
  fpsFloor: 30,
  /** Consecutive slow samples before falling back. */
  slowSamples: 40,
  /** Satellites rendered on the fallback tier. */
  reducedSatellites: 150,
};

/* -------------------------------------------------------------------------- */
/* Preset locations                                                            */
/* -------------------------------------------------------------------------- */

export interface City {
  name: string;
  lat: number;
  lon: number;
}

/** User terminal presets; the first is the default (Dhaka, Bangladesh). */
export const cities: City[] = [
  { name: "Dhaka", lat: 23.81, lon: 90.41 },
  { name: "New York", lat: 40.71, lon: -74.01 },
  { name: "London", lat: 51.51, lon: -0.13 },
  { name: "Frankfurt", lat: 50.11, lon: 8.68 },
  { name: "Lagos", lat: 6.52, lon: 3.38 },
  { name: "Nairobi", lat: -1.29, lon: 36.82 },
  { name: "Dubai", lat: 25.2, lon: 55.27 },
  { name: "Mumbai", lat: 19.08, lon: 72.88 },
  { name: "Singapore", lat: 1.35, lon: 103.82 },
  { name: "Tokyo", lat: 35.68, lon: 139.69 },
  { name: "Sydney", lat: -33.87, lon: 151.21 },
  { name: "Los Angeles", lat: 34.05, lon: -118.24 },
  { name: "São Paulo", lat: -23.55, lon: -46.63 },
  { name: "Toronto", lat: 43.65, lon: -79.38 },
];

/** Default gateway: far from the default user location, so the relay route is long. */
export const defaultGateway = { name: "Los Angeles", lat: 34.05, lon: -118.24 };
