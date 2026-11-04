import { COMPARISON_COPY } from "./copy";

/**
 * Tunable simulation values. Scene sizes use Earth radii unless a value is
 * explicitly labelled otherwise. Visual sizes and beam widths are enlarged;
 * orbital math uses kilometres, seconds and Earth's real gravity parameter.
 */
const assetBase = (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) || "/";

export const comparisonConfig = {
  earthRadiusKm: 6371,
  earthMuKm3S2: 398600.4418,
  speedOfLightKmS: 299792.458,
  earthRotationPeriodS: 86164.0905,
  earthRadiusUnits: 1.28,
  geoAltitudeKm: 35786,
  geoOrbitPeriodS: 86164.0905,
  geoSpeedKmS: 3.07,
  leoAltitudeKm: 550,
  leoInclinationDeg: 53,
  leoSpeedKmS: 7.6,
  leoPeriodS: 95 * 60,
  minimumElevationDeg: 25,
  geoLongitudeDeg: 90.41,
  constellation: {
    planes: 20,
    satellitesPerPlane: 30,
    count: 600,
    /** Rendered count used when PerformanceMonitor detects sustained slow FPS. */
    reducedCount: 180,
    inclinationDeg: 53,
  },
  timeSpeeds: [1, 60, 600, 3000] as const,
  tourStageSeconds: 13,
  orbitScale: {
    exaggeratedLeoRadius: 2.25,
    groundOrbitRadius: 1.04,
  },
  colors: {
    radio: "#ff7a1a",
    laser: "#64d8ff",
    orbit: "#ff9b4a",
    satellite: "#f5f7ff",
    atmosphere: "#63a9ff",
    ground: "#101725",
    text: "#f6f8ff",
  },
  textures: {
    day: `${assetBase}textures/earth-day.jpg`,
    night: `${assetBase}textures/earth-night.jpg`,
  },
  performance: {
    dpr: [1, 2] as [number, number],
    fpsFloor: 30,
    bloomHigh: 0.7,
    bloomReduced: 0.18,
  },
  locations: [
    { name: "Dhaka, Bangladesh", lat: 23.81, lon: 90.41 },
    { name: "New York, USA", lat: 40.71, lon: -74.01 },
    { name: "London, UK", lat: 51.51, lon: -0.13 },
    { name: "Nairobi, Kenya", lat: -1.29, lon: 36.82 },
    { name: "Dubai, UAE", lat: 25.2, lon: 55.27 },
    { name: "Mumbai, India", lat: 19.08, lon: 72.88 },
    { name: "Singapore", lat: 1.35, lon: 103.82 },
    { name: "Tokyo, Japan", lat: 35.68, lon: 139.69 },
    { name: "Sydney, Australia", lat: -33.87, lon: 151.21 },
    { name: "Reykjavík, Iceland", lat: 64.15, lon: -21.94 },
  ],
  stageCount: COMPARISON_COPY.stages.length,
  stageCopy: COMPARISON_COPY.stages,
  copy: COMPARISON_COPY,
} as const;

export type ComparisonLocation = (typeof comparisonConfig.locations)[number];
export type ScaleMode = "true" | "exaggerated";
export type ComparisonStage = 0 | 1 | 2 | 3 | 4 | 5;

export const GROUND_STAGE_LIMIT = 2;
export const GEO_ROUND_TRIP_MS = 600;
export const LEO_TYPICAL_ROUND_TRIP_MS = 32;
export const LEO_VISUAL_PULSE_SECONDS = 0.24;
export const GEO_VISUAL_PULSE_SECONDS = 0.88;

/** True-scale orbital radii in scene units (1 Earth radius = earthRadiusUnits). */
export const earthSceneRadius = comparisonConfig.earthRadiusUnits;
export const trueLeoOrbitRadius =
  earthSceneRadius * (1 + comparisonConfig.leoAltitudeKm / comparisonConfig.earthRadiusKm);
export const geoOrbitRadius =
  earthSceneRadius * (1 + comparisonConfig.geoAltitudeKm / comparisonConfig.earthRadiusKm);
