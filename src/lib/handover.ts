/**
 * Three-satellite handover model.
 *
 * A single ground terminal (a Starlink dish on a roof) watches three LEO
 * satellites on scripted passes. Each pass is defined by an elevation profile
 * and an azimuth sweep. Slant range is then derived from the *real* circular
 * orbit geometry (R = 6,371 km, h = 550 km), so every distance, elevation and
 * light-time number on the page is internally consistent.
 *
 * The handover policy is deliberately simple and readable: the terminal keeps
 * its satellite until that satellite falls below a switch floor (40°), then
 * moves to the highest satellite still above the 25° elevation mask, provided
 * that satellite is itself above 40°. Real scheduling also weighs capacity,
 * obstructions, gateway routing and network load — see the honesty notes.
 *
 * Nothing here is live telemetry. It is a deterministic teaching model: the
 * same second of scenario time always produces the same sky.
 */

export type SatKey = "A" | "B" | "C";

export const SAT_KEYS: SatKey[] = ["A", "B", "C"];

/** Mean Earth radius (km). */
export const EARTH_RADIUS_KM = 6371;
/** Operational Starlink shell altitude (km). */
export const SHELL_ALTITUDE_KM = 550;
/** The terminal ignores anything below this elevation. */
export const ELEVATION_MASK_DEG = 25;
/** The terminal will not hold a satellite below this elevation. */
export const SWITCH_FLOOR_DEG = 40;
/** A satellite this high is considered a usable handover candidate. */
export const CANDIDATE_READY_DEG = 40;
/** Half-width of the visible beam-transfer window, simulated seconds. */
export const TRANSFER_HALF_SEC = 3.5;
/** How long "handover completed" stays on the status panel. */
export const HANDOVER_COMPLETE_SEC = 10;
/** Length of one loop of the scenario, simulated seconds. */
export const SCENARIO_DURATION_SEC = 400;
/** Simulated seconds per real second at 1× speed. */
export const SIM_RATE_AT_1X = 20;
/** Scene units per km: one unit is one Earth radius. */
export const KM_PER_SCENE_UNIT = EARTH_RADIUS_KM;

const DEG = Math.PI / 180;

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

function smoothstep(x: number) {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

/** Where the dish is installed. */
export const OBSERVER = {
  name: "Puget Sound, WA",
  lat: 47.62,
  lon: -122.35,
  latLabel: "47.6° N",
  lonLabel: "122.4° W",
};

export interface PassSpec {
  key: SatKey;
  /** Displayed satellite name, in the style of a constellation label. */
  name: string;
  /** Simulated second at which the satellite rises above 0° elevation. */
  riseSec: number;
  /** Simulated second at which it sets below 0° elevation. */
  setSec: number;
  /** Peak elevation of the pass, degrees. */
  peakElDeg: number;
  azRiseDeg: number;
  azSetDeg: number;
}

/**
 * Three passes, staggered so that B is well up by the time A reaches the
 * switch floor, and C is well up by the time B does the same.
 */
export const PASSES: Record<SatKey, PassSpec> = {
  A: {
    key: "A",
    name: "STARLINK-SAT-A",
    riseSec: -60,
    setSec: 240,
    peakElDeg: 52,
    azRiseDeg: 15,
    azSetDeg: 85,
  },
  B: {
    key: "B",
    name: "STARLINK-SAT-B",
    riseSec: 100,
    setSec: 400,
    peakElDeg: 60,
    azRiseDeg: 75,
    azSetDeg: 155,
  },
  C: {
    key: "C",
    name: "STARLINK-SAT-C",
    riseSec: 260,
    setSec: 560,
    peakElDeg: 56,
    azRiseDeg: 100,
    azSetDeg: 180,
  },
};

/** Fraction of the pass completed at this instant (0 = rise, 1 = set). */
export function passProgress(key: SatKey, tSec: number) {
  const p = PASSES[key];
  return (tSec - p.riseSec) / (p.setSec - p.riseSec);
}

/** Elevation above the horizon, degrees. Negative means below the horizon. */
export function elevationAt(key: SatKey, tSec: number) {
  const p = PASSES[key];
  const u = passProgress(key, tSec);
  if (u <= 0 || u >= 1) return -6;
  return p.peakElDeg * Math.pow(Math.sin(Math.PI * u), 1.1);
}

/** Azimuth clockwise from north, degrees. */
export function azimuthAt(key: SatKey, tSec: number) {
  const p = PASSES[key];
  const u = clamp(passProgress(key, tSec), 0, 1);
  return p.azRiseDeg + (p.azSetDeg - p.azRiseDeg) * u;
}

/**
 * Exact slant range to a satellite on a circular orbit of altitude 550 km at
 * the given elevation, in km. Standard law-of-cosines result.
 */
export function slantRangeKm(elDeg: number) {
  const el = Math.max(0, elDeg) * DEG;
  const rs = EARTH_RADIUS_KM + SHELL_ALTITUDE_KM;
  const c = EARTH_RADIUS_KM * Math.cos(el);
  return Math.sqrt(rs * rs - c * c) - EARTH_RADIUS_KM * Math.sin(el);
}

/** One-way light time along the link, milliseconds. */
export function lightTimeMs(rangeKm: number) {
  return (rangeKm / 299792.458) * 1000;
}

export interface SatSnapshot {
  key: SatKey;
  name: string;
  elDeg: number;
  azDeg: number;
  rangeKm: number;
  /** True while the satellite is above the terminal's elevation mask. */
  visible: boolean;
  /** True while the elevation is still increasing. */
  rising: boolean;
  /**
   * Position in the local ENU sky frame, in Earth radii.
   * x = east, y = up, z = south. The dish sits at the origin.
   */
  position: [number, number, number];
}

export function satelliteSnapshot(key: SatKey, tSec: number): SatSnapshot {
  const elDeg = elevationAt(key, tSec);
  const azDeg = azimuthAt(key, tSec);
  const rangeKm = slantRangeKm(elDeg);
  const el = elDeg * DEG;
  const az = azDeg * DEG;
  const r = rangeKm / KM_PER_SCENE_UNIT;
  const rising = elevationAt(key, tSec + 0.5) > elevationAt(key, tSec - 0.5);
  return {
    key,
    name: PASSES[key].name,
    elDeg,
    azDeg,
    rangeKm,
    visible: elDeg >= ELEVATION_MASK_DEG,
    rising,
    position: [
      r * Math.sin(az) * Math.cos(el),
      r * Math.sin(el),
      -r * Math.cos(az) * Math.cos(el),
    ],
  };
}

/** 0..1 quality score for the link, from the elevation margin. */
export function linkQuality(elDeg: number) {
  return clamp((elDeg - ELEVATION_MASK_DEG) / (70 - ELEVATION_MASK_DEG), 0, 1);
}

/* -------------------------------------------------------------------------- */
/* Timeline                                                                   */
/* -------------------------------------------------------------------------- */

export interface HandoverEvent {
  from: SatKey;
  to: SatKey;
  /** Simulated second of the switch. */
  tSec: number;
  fromElDeg: number;
  toElDeg: number;
  fromAzDeg: number;
  toAzDeg: number;
  rangeKm: number;
  lightMs: number;
  /** Simulated second at which preparation began (candidate became ready). */
  prepareSec: number;
}

export interface ScenarioStep {
  id: number;
  startSec: number;
  endSec: number;
  /** Short English caption for the timeline rail. */
  short: string;
}

export interface ScenarioTimeline {
  durationSec: number;
  events: HandoverEvent[];
  steps: ScenarioStep[];
  /** First simulated second each satellite rises above the elevation mask. */
  visibleAt: Partial<Record<SatKey, number>>;
  /** First simulated second each satellite becomes a usable candidate. */
  readyAt: Partial<Record<SatKey, number>>;
  /** Simulated second at which A drops below the mask (after its handover). */
  aOutSec: number;
  servingAt: (tSec: number) => SatKey | null;
}

const STEP_DT = 0.1;

function buildTimeline(): ScenarioTimeline {
  const durationSec = SCENARIO_DURATION_SEC;
  const frames = Math.round(durationSec / STEP_DT) + 1;
  const servingTrack: (SatKey | null)[] = new Array(frames).fill(null);
  const visibleAt: Partial<Record<SatKey, number>> = {};
  const readyAt: Partial<Record<SatKey, number>> = {};
  const events: HandoverEvent[] = [];
  const prevVisible: Partial<Record<SatKey, boolean>> = {};
  const prevReady: Partial<Record<SatKey, boolean>> = {};
  let serving: SatKey | null = null;
  /** When the serving satellite first fell below the switch floor. */
  let floorSec: number | null = null;

  for (let i = 0; i < frames; i++) {
    const t = i * STEP_DT;
    const el = {
      A: elevationAt("A", t),
      B: elevationAt("B", t),
      C: elevationAt("C", t),
    } as Record<SatKey, number>;
    const visible = SAT_KEYS.filter((k) => el[k] >= ELEVATION_MASK_DEG);

    for (const k of SAT_KEYS) {
      if (el[k] >= ELEVATION_MASK_DEG && visibleAt[k] === undefined) visibleAt[k] = t;
      const rising = elevationAt(k, t + 0.3) > elevationAt(k, t - 0.3);
      const ready = el[k] >= CANDIDATE_READY_DEG && rising && el[k] >= ELEVATION_MASK_DEG;
      if (ready && !prevReady[k] && readyAt[k] === undefined) readyAt[k] = t;
      prevReady[k] = ready;
      prevVisible[k] = el[k] >= ELEVATION_MASK_DEG;
    }

    if (serving === null) {
      if (visible.length) {
        serving = visible.slice().sort((a, b) => el[b] - el[a])[0];
      }
    } else if (
      el[serving] < SWITCH_FLOOR_DEG &&
      elevationAt(serving, t + 0.3) < elevationAt(serving, t - 0.3)
    ) {
      if (floorSec === null) floorSec = t;
    }

    if (serving !== null && el[serving] < SWITCH_FLOOR_DEG) {
      const candidate = visible
        .filter((k) => k !== serving)
        .sort((a, b) => el[b] - el[a])[0];
      if (candidate && el[candidate] >= CANDIDATE_READY_DEG) {
        const from = serving;
        events.push({
          from,
          to: candidate,
          tSec: t,
          fromElDeg: el[from],
          toElDeg: el[candidate],
          fromAzDeg: azimuthAt(from, t),
          toAzDeg: azimuthAt(candidate, t),
          rangeKm: slantRangeKm(el[candidate]),
          lightMs: lightTimeMs(slantRangeKm(el[candidate])),
          prepareSec: floorSec ?? Math.max(0, t - 12),
        });
        floorSec = null;
        serving = candidate;
      }
    }
    servingTrack[i] = serving;
  }

  const servingAt = (tSec: number) => {
    const i = clamp(Math.round(tSec / STEP_DT), 0, frames - 1);
    return servingTrack[i];
  };

  const e1 = events[0];
  const t1 = e1?.tSec ?? 160;
  const bVisible = visibleAt.B ?? Math.max(10, t1 - 40);
  const aOutSec = (() => {
    if (!e1) return 200;
    for (let t = e1.tSec; t < durationSec; t += 0.1) {
      if (elevationAt(e1.from, t) < ELEVATION_MASK_DEG) return t;
    }
    return Math.min(durationSec - 10, e1.tSec + 25);
  })();

  const step1End = Math.max(20, bVisible - 10);
  const prepStart = clamp(e1?.prepareSec ?? t1 - 12, step1End + 1, t1 - TRANSFER_HALF_SEC);
  const steps: ScenarioStep[] = [
    { id: 1, startSec: 0, endSec: step1End, short: "A connected" },
    { id: 2, startSec: step1End, endSec: prepStart, short: "B approaches" },
    { id: 3, startSec: prepStart, endSec: t1 - TRANSFER_HALF_SEC, short: "Prepare" },
    {
      id: 4,
      startSec: t1 - TRANSFER_HALF_SEC,
      endSec: t1 + TRANSFER_HALF_SEC,
      short: "Transfer to B",
    },
    { id: 5, startSec: t1 + TRANSFER_HALF_SEC, endSec: aOutSec + 2, short: "A leaves" },
    { id: 6, startSec: aOutSec + 2, endSec: durationSec, short: "Next handover → C" },
  ];

  // Keep the rail monotonic no matter how the pass parameters are tuned.
  for (let i = 1; i < steps.length; i++) {
    if (steps[i].startSec < steps[i - 1].startSec) steps[i].startSec = steps[i - 1].startSec;
    if (steps[i].endSec < steps[i].startSec + 1) steps[i].endSec = steps[i].startSec + 1;
  }

  return { durationSec, events, steps, visibleAt, readyAt, aOutSec, servingAt };
}

export const SCENARIO: ScenarioTimeline = buildTimeline();

/* -------------------------------------------------------------------------- */
/* Live scenario state                                                        */
/* -------------------------------------------------------------------------- */

export type SatRole = "serving" | "candidate" | "previous" | "out" | "visible";

export interface SatView extends SatSnapshot {
  role: SatRole;
  /** 0..1 opacity for this satellite's communication beam. */
  beamOpacity: number;
  /** 0..1 quality of this satellite's link. */
  quality: number;
  /** Above the mask and usable as a handover target. */
  suitable: boolean;
}

export type HandoverPhase = "tracking" | "preparing" | "transfer" | "completed";

export interface ScenarioState {
  timeSec: number;
  sats: Record<SatKey, SatView>;
  serving: SatKey | null;
  candidate: SatKey | null;
  previous: SatKey | null;
  /** Satellite that currently carries the brightest drawn beam. */
  activeLink: SatKey | null;
  phase: HandoverPhase;
  /** 0..1. Preparation progress, then transfer progress, then 1. */
  progress: number;
  /** Handover being prepared / executed, if any. */
  currentEvent: HandoverEvent | null;
  /** Next handover, if one is still ahead in this loop. */
  nextEvent: HandoverEvent | null;
  lastEvent: HandoverEvent | null;
  /** Seconds since the last transfer completed. */
  sinceLastSec: number | null;
  stepId: number;
}

export function stepForTime(tSec: number) {
  const steps = SCENARIO.steps;
  for (const s of steps) if (tSec < s.endSec) return s;
  return steps[steps.length - 1];
}

function transferEventAt(tSec: number): { event: HandoverEvent; progress: number } | null {
  for (const e of SCENARIO.events) {
    if (Math.abs(tSec - e.tSec) <= TRANSFER_HALF_SEC) {
      return { event: e, progress: (tSec - (e.tSec - TRANSFER_HALF_SEC)) / (TRANSFER_HALF_SEC * 2) };
    }
  }
  return null;
}

export function sampleScenario(tSec: number): ScenarioState {
  const time = clamp(tSec, 0, SCENARIO.durationSec);
  const serving = SCENARIO.servingAt(time);
  const snaps = {} as Record<SatKey, SatSnapshot>;
  for (const k of SAT_KEYS) snaps[k] = satelliteSnapshot(k, time);

  /**
   * The next handover target: the highest visible satellite that is not the
   * one being served, not the link just released, and either arriving (rising)
   * or already high enough to be usable. A satellite that has just been
   * released is descending towards the horizon — it is still visible, but it
   * is not a sensible candidate.
   */
  const releasedRecently = SCENARIO.events.find(
    (e) => e.tSec <= time + 0.001 && time - e.tSec <= 15,
  );
  const visibleOthers = SAT_KEYS.filter((k) => {
    if (k === serving || !snaps[k].visible) return false;
    if (releasedRecently && releasedRecently.from === k) return false;
    return snaps[k].rising || snaps[k].elDeg >= CANDIDATE_READY_DEG;
  }).sort((a, b) => snaps[b].elDeg - snaps[a].elDeg);
  const candidate = visibleOthers[0] ?? null;

  const nextEvent = SCENARIO.events.find((e) => e.tSec > time + 0.001) ?? null;
  const lastEvent = [...SCENARIO.events].reverse().find((e) => e.tSec <= time + 0.001) ?? null;
  const transfer = transferEventAt(time);

  let phase: HandoverPhase = "tracking";
  let progress = 0;
  if (transfer) {
    phase = "transfer";
    progress = clamp(transfer.progress, 0, 1);
  } else if (nextEvent && time >= nextEvent.prepareSec) {
    phase = "preparing";
    const span = Math.max(1e-3, nextEvent.tSec - nextEvent.prepareSec);
    progress = clamp((time - nextEvent.prepareSec) / span, 0, 1);
  } else if (lastEvent && time - lastEvent.tSec <= HANDOVER_COMPLETE_SEC) {
    phase = "completed";
    progress = 1;
  }

  const previous =
    lastEvent && time - lastEvent.tSec <= HANDOVER_COMPLETE_SEC ? lastEvent.from : null;

  // The tracked candidate is highlighted even before it clears the readiness
  // threshold — that is what "B is approaching" looks like from the dish.
  const candidateTracked = candidate !== null;

  // Beam opacities: crossfade inside the transfer window, otherwise role-based.
  const beam: Record<SatKey, number> = { A: 0, B: 0, C: 0 };
  if (transfer) {
    const k = smoothstep(transfer.progress);
    beam[transfer.event.from] = 1 - k;
    beam[transfer.event.to] = k;
  } else {
    if (serving) beam[serving] = 1;
    if (lastEvent) {
      const age = time - lastEvent.tSec;
      if (age >= 0 && age < 8) {
        // The released link fades away over a few seconds.
        beam[lastEvent.from] = Math.max(beam[lastEvent.from], 0.9 * (1 - age / 8));
      }
    }
    if (candidate) {
      const prep = phase === "preparing" ? progress : 0;
      beam[candidate] = Math.max(beam[candidate], 0.16 + 0.6 * prep);
    }
  }

  const sats = {} as Record<SatKey, SatView>;
  for (const k of SAT_KEYS) {
    const snap = snaps[k];
    let role: SatRole = "visible";
    if (!snap.visible) role = "out";
    else if (k === serving) role = "serving";
    else if (previous && k === previous) role = "previous";
    else if (k === candidate && candidateTracked) role = "candidate";
    sats[k] = {
      ...snap,
      role,
      beamOpacity: clamp(beam[k], 0, 1),
      quality: snap.visible ? linkQuality(snap.elDeg) : 0,
      suitable: snap.visible && snap.elDeg >= CANDIDATE_READY_DEG,
    };
  }

  const activeLink = serving ?? null;
  const stepId = stepForTime(time).id;

  return {
    timeSec: time,
    sats,
    serving,
    candidate,
    previous,
    activeLink,
    phase,
    progress,
    currentEvent: transfer ? transfer.event : phase === "preparing" ? nextEvent : lastEvent,
    nextEvent,
    lastEvent,
    sinceLastSec: lastEvent ? time - lastEvent.tSec : null,
    stepId,
  };
}

/** Convenience: the sign of the elevation trend as a word. */
export function elevationTrend(sat: SatView) {
  if (!sat.visible) return "below mask";
  return sat.rising ? "rising" : "falling";
}

/** Short label for the satellite's state, used in the HUD. */
export function roleLabel(role: SatRole) {
  switch (role) {
    case "serving":
      return "Connected";
    case "candidate":
      return "Next candidate";
    case "previous":
      return "Released";
    case "out":
      return "Unavailable";
    default:
      return "Visible";
  }
}

/** Compass point for the sky map / status panel. */
const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

export function compassPoint(azDeg: number) {
  return COMPASS[Math.round((((azDeg % 360) + 360) % 360) / 22.5) % 16];
}

/** mm:ss clock for the scenario. */
export function formatSimClock(sec: number) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
