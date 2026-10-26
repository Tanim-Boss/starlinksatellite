/**
 * Editorial content for the site. Figures are approximate and reflect the
 * public record as of October 2026; they change as the constellation grows.
 */

export const NAV = [
  { label: "Overview", path: "/" },
  { label: "How it works", path: "/how-it-works" },
  { label: "Handover lab", path: "/beam" },
  { label: "Array lab", path: "/antenna" },
  { label: "3D explorer", path: "/explorer" },
  { label: "Numbers", path: "/numbers" },
  { label: "FAQ", path: "/faq" },
] as const;

export const HERO_STATS = [
  { value: "≈550", unit: "km", label: "Orbit altitude" },
  { value: "27,000", unit: "km/h", label: "Orbital speed" },
  { value: "≈95", unit: "min", label: "One full orbit" },
  { value: "≈25", unit: "ms", label: "Typical latency" },
];

/** Marque numbers used in the stats band. Keep sourced and approximate. */
export const CONSTELLATION_STATS = [
  {
    value: "11,150",
    label: "Satellites in orbit",
    note: "Of ~13,000 launched since 2019; the rest have re-entered.",
  },
  {
    value: "9,700+",
    label: "On station in a working shell",
    note: "The remainder are raising orbit, drifting or being retired.",
  },
  {
    value: "100+",
    label: "Countries & territories",
    note: "Service is licensed market by market, not everywhere at once.",
  },
  {
    value: "~25 ms",
    label: "Median round-trip latency",
    note: "SpaceX figure; 25–60 ms is typical in the field.",
  },
];

export interface ChapterMeta {
  id: string;
  /** Short, self-contained line for the chapter cards. */
  card: string;
  num: string;
  title: string;
  short: string;
  lede: string;
}

/** The explainer chapters, in reading order. */
export const CHAPTERS: ChapterMeta[] = [
  {
    id: "constellation",
    card: "A fleet of satellites arranged in shells and planes, wrapping the planet in overlapping coverage.",
    num: "01",
    title: "A shell of satellites",
    short: "Constellation",
    lede: "Starlink is not one satellite. It is a carefully spaced fleet in low Earth orbit, arranged in shells that wrap the planet in overlapping coverage.",
  },
  {
    id: "orbit",
    card: "Why 550 km is the sweet spot — and why SpaceX keeps lowering it toward 480 km.",
    num: "02",
    title: "Why the orbit is so low",
    short: "Orbit",
    lede: "At roughly 550 km — and increasingly 480 km — satellites race around Earth in about 95 minutes. That low altitude is the source of both the speed and the low latency.",
  },
  {
    id: "satellite",
    card: "A flat, mass-produced spacecraft with a phased array, lasers, a solar wing and an ion drive.",
    num: "03",
    title: "Inside a Starlink satellite",
    short: "The satellite",
    lede: "A flat, mass-produced spacecraft: a phased-array radio, laser terminals, a solar wing, star trackers and an ion thruster. No big dish, no moving antenna.",
  },
  {
    id: "terminal",
    card: "A flat panel that steers its beam electronically — no motors, nothing to wear out.",
    num: "04",
    title: "The dish on your roof",
    short: "Your terminal",
    lede: "Your terminal is a flat phased array that steers a beam electronically — no motors — locking onto a satellite that is already moving across the sky.",
  },
  {
    id: "radio",
    card: "Ku-band spot beams divide the ground into cells, just like a mobile network turned upside down.",
    num: "05",
    title: "Radio links, in cells",
    short: "The radio link",
    lede: "Ku-band radio connects your terminal to the satellite. Like a cellular network turned upside down, the satellite paints many small spot beams onto the ground and reuses frequencies across them.",
  },
  {
    id: "gateways",
    card: "Ground stations hand your traffic to fibre. The satellite is a relay, not the internet.",
    num: "06",
    title: "Gateways to the internet",
    short: "Gateways",
    lede: "The satellite is mostly a mirror in the sky. It relays your traffic down to a gateway station that is plugged into the terrestrial internet backbone.",
  },
  {
    id: "lasers",
    card: "Optical links turn the constellation into a private mesh, letting traffic skip the ground.",
    num: "07",
    title: "A mesh of laser links",
    short: "Laser mesh",
    lede: "Newer satellites carry optical terminals that talk to their neighbours — a private fibre-optic network in space that lets traffic skip the ground entirely.",
  },
  {
    id: "handover",
    card: "A satellite is overhead for minutes. A make-before-break switch keeps the link alive.",
    num: "08",
    title: "Handing you off, invisibly",
    short: "Handovers",
    lede: "A satellite is in view for only a few minutes. Your connection survives the switch because another satellite is already rising, and the handover happens in milliseconds.",
  },
  {
    id: "latency",
    card: "Where the milliseconds come from, and why routing often matters more than the sky.",
    num: "09",
    title: "The physics of the delay",
    short: "Latency",
    lede: "Light is fast, but not infinitely fast. The distance the signal travels — up, across, down — becomes the latency you feel in a video call.",
  },
];

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ: FaqItem[] = [
  {
    q: "What actually is Starlink?",
    a: "A satellite internet network built by SpaceX. Thousands of small satellites in low Earth orbit connect to flat terminals on the ground, which route traffic through gateway stations into the ordinary internet. It is designed for places where fibre and cable are expensive, slow to build, or simply absent.",
  },
  {
    q: "Why does it need thousands of satellites instead of a few big ones?",
    a: "Each satellite only sees a circle on the ground a few thousand kilometres across, and only for a few minutes per pass. Covering the whole planet continuously — with enough capacity for everyone using it — requires a dense, overlapping constellation rather than a handful of spacecraft.",
  },
  {
    q: "Why is Starlink faster than older satellite internet?",
    a: "Altitude. Geostationary satellites sit 35,786 km up, so a signal takes about a quarter of a second just to make the round trip. Starlink satellites are roughly 550 km up, cutting the one-way trip to a couple of milliseconds. Most of the remaining latency comes from routing and the gateway hop, not the sky.",
  },
  {
    q: "Does the dish move?",
    a: "The standard terminal has no moving parts. It is a phased array: hundreds of small antenna elements whose signals are timed slightly differently so that the combined beam points wherever the electronics choose. Older, larger terminals used motors; current ones steer entirely electronically.",
  },
  {
    q: "What happens when a satellite flies out of view?",
    a: "Another satellite is already overhead or rising. The network schedules a handover — a make-before-break switch where the new link is established before the old one drops — so the transition is typically invisible to you. Satellites are spaced along each orbital plane precisely so that coverage stays continuous.",
  },
  {
    q: "Do the satellites talk to each other?",
    a: "Newer ones do. They carry optical inter-satellite links: narrow laser beams that connect neighbouring satellites at tens to hundreds of gigabits per second. That mesh lets traffic travel across oceans and remote regions without a ground station in between.",
  },
  {
    q: "Why does Starlink struggle in dense cities?",
    a: "Radio capacity is finite. Each satellite can serve a limited amount of data into a given area, so in a dense neighbourhood many users share the same spot beams and speeds fall during peak hours. In sparsely populated areas the same satellite serves far fewer people, which is why Starlink performs best where fibre does not reach.",
  },
  {
    q: "Do I need a clear view of the sky?",
    a: "Yes. The terminal needs an unobstructed view of a wide cone of the sky, ideally with no trees or buildings above roughly 25–30° elevation in the direction the satellites pass. Obstructions interrupt the beam and cause short dropouts.",
  },
  {
    q: "Do the satellites eventually fall down?",
    a: "Yes, by design. At this altitude there is still a thin atmosphere, so a dead satellite's orbit decays and it burns up on re-entry within a few years rather than lingering for centuries. Working satellites use ion thrusters to hold altitude and to deorbit deliberately at the end of their lives.",
  },
  {
    q: "Can Starlink work on ships, planes and in disasters?",
    a: "Yes. Maritime, aviation and roaming services use the same constellation with terminals designed for motion. Because the network does not depend on local ground infrastructure, it is also used for disaster response where cables and towers are down.",
  },
  {
    q: "Is the 3D model on this site live Starlink tracking?",
    a: "No. It is an educational simulation: satellite positions are propagated from published orbital shell parameters using a simple circular-orbit model, and satellite sizes are exaggerated so you can see them. Real positions come from tracking networks and precise orbital elements, which this site does not use.",
  },
  {
    q: "Does Starlink cause problems for astronomy?",
    a: "It can. Low satellites catch sunlight after sunset and before sunrise and appear as streaks in telescope images. SpaceX has applied darkening treatments, sunshades and improved attitude control, and observatories and SpaceX coordinate on avoidance, but the issue is not fully solved.",
  },
];

export const SOURCES = [
  {
    label: "SpaceX — Starlink",
    href: "https://www.starlink.com/",
    note: "Service, hardware and coverage information.",
  },
  {
    label: "Jonathan McDowell — Starlink statistics",
    href: "https://planet4589.org/space/con/star/stats.html",
    note: "Independent launch, orbit and re-entry census.",
  },
  {
    label: "FCC filings & authorisations",
    href: "https://www.fcc.gov/space/starlink",
    note: "Orbital shell parameters, frequencies and licensing.",
  },
  {
    label: "Branch Education — How does Starlink work?",
    href: "https://www.youtube.com/watch?v=qs2QcycggWU",
    note: "3D explainer of Dishy's phased array and beam steering.",
  },
  {
    label: "Wikipedia — Starlink",
    href: "https://en.wikipedia.org/wiki/Starlink",
    note: "Background, history and references.",
  },
];
