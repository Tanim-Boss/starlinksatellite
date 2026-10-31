/**
 * All visitor-facing copy for the comparison lives here so it can be translated
 * without touching the scene or controls. Keep keys stable; config.ts exports
 * this copy alongside the tunable simulation values.
 */
export const COMPARISON_COPY = {
  eyebrow: "A six-part visual field guide",
  title: "Broadcast TV Satellite vs Starlink",
  subtitle:
    "One satellite broadcasts to a continent. A moving constellation hands an internet connection from spacecraft to spacecraft. Follow the signal, from the dish to the orbit.",
  stageNames: [
    "The two dishes",
    "Listening & talking",
    "How high up",
    "Speed of light",
    "A constellation",
    "Handoff & coverage",
  ],
  stages: [
    {
      title: "Two dishes. Two very different antennas.",
      caption:
        "A TV dish listens for a broadcast; a flat phased-array terminal can listen and transmit.",
      note: "Both terminals are on the same ground plane. Their shapes are enlarged so you can compare them.",
    },
    {
      title: "Receive-only, or a two-way link.",
      caption:
        "Broadcast: one-way, a large dish passively collects a signal beamed to a whole region. Two-way: it also transmits your requests, so it can carry the internet.",
      note: "The TV dish is mechanically fixed. The phased-array panel stays still while its beam steers electronically.",
    },
    {
      title: "A satellite can be 550 km up—or 35,786 km up.",
      caption:
        "A geostationary satellite stays above the same equatorial point; low-Earth-orbit satellites sweep overhead every 95 minutes.",
      note: "Toggle true scale to see how close the LEO orbit hugs Earth. Exaggerated mode enlarges it for readability.",
    },
    {
      title: "Distance becomes delay.",
      caption:
        "A GEO round trip takes about 500–600 ms. A Starlink round trip is typically about 20–40 ms, including the network—not just the hop to space.",
      note: "Send both pulses at once. The counter shows the comparison while the animated paths make the contrast visible.",
    },
    {
      title: "One satellite becomes a moving mesh.",
      caption:
        "Because LEO satellites move fast, you need thousands so that one is always overhead.",
      note: "The model draws 600 satellites; the real constellation is much larger. Cyan links are shown only when they clear Earth.",
    },
    {
      title: "Coverage is continuous because the network hands off.",
      caption:
        "A fixed GEO satellite can cover a region all day. LEO service hands your connection to another satellite as it moves toward the horizon.",
      note: "The GEO dish depends on a clear equatorial sky; a LEO terminal selects a satellite above the minimum elevation.",
    },
  ],
  labels: {
    tvDish: "TV Satellite Dish",
    starlinkDish: "Starlink Dishy",
    tvSatellite: "GEO broadcast satellite",
    leoSatellite: "LEO relay satellite",
    receive: "Receive",
    send: "Send",
    receiveOnly: "Receive ✓  /  Send ✗",
    twoWay: "Receive ✓  /  Send ✓",
    trueScale: "True scale",
    exaggeratedScale: "Exaggerated scale",
    about: "About this simulation",
    aboutText:
      "Dish sizes and beam widths are exaggerated for visibility. Orbital altitudes, speeds, periods and light-time calculations use real values. This is an educational model, not live tracking.",
    webglUnavailable: "WebGL unavailable",
    webglMessage:
      "This browser or device cannot start the 3D scene. The comparison, controls and captions still work; try a recent browser with hardware acceleration enabled to see the simulation.",
    loading: "Preparing the 3D comparison…",
    loadingDetail: "Loading Earth and orbital layers",
    noSelection: "Hover or tap a satellite or dish to inspect it.",
    handoff: "Handoff",
    alwaysConnected: "Always connected · no handoff",
    blocked: "Low equatorial sky · obstacles may block the link",
    connected: "Connected",
    pulseReady: "Ready to send",
    pulseSent: "Pulse launched",
    tours: "Play tour",
    tourRunning: "Tour playing",
  },
  facts: {
    tvDish: {
      title: "TV Satellite Dish",
      altitude: "Ground terminal",
      speed: "Fixed aim",
      role: "Receive-only broadcast receiver",
    },
    starlinkDish: {
      title: "Starlink Dishy",
      altitude: "Ground terminal",
      speed: "No moving parts",
      role: "Electronically steered, two-way terminal",
    },
    geo: {
      title: "GEO broadcast satellite",
      altitude: "35,786 km",
      speed: "3.07 km/s · 24 h period",
      role: "One satellite broadcasts over a wide region",
    },
    leo: {
      title: "LEO relay satellite",
      altitude: "~550 km",
      speed: "7.6 km/s · ~95 min period",
      role: "Two-way broadband relay; hands off as it moves",
    },
  },
  comparisonRows: [
    ["Direction", "One-way (receive)", "Two-way (receive + send)"],
    ["Orbit altitude", "35,786 km (GEO)", "~550 km (LEO)"],
    ["Satellites needed", "1 per region", "Thousands"],
    ["Latency", "~600 ms (if used for internet)", "~20–40 ms"],
    ["Dish", "Fixed, mechanical", "Flat, electronically steered"],
    ["Coverage per satellite", "Entire continent", "Small spot, constantly moving"],
  ],
} as const;

export type ComparisonStageCopy = (typeof COMPARISON_COPY.stages)[number];
