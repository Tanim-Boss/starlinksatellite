# How Starlink Works — an interactive field guide

An independent, editorial explainer of the Starlink satellite network: how the
constellation is arranged, how a request leaves your roof, what the satellite
actually does, where the ground stations fit, and where the milliseconds go. It
includes a real-time 3D model of the orbital shells built from published
altitudes and inclinations.

Built with React 19, TypeScript, Vite, Tailwind CSS v4 and three.js / React
Three Fiber.

## Pages

| Route | What it is |
| --- | --- |
| `#/` | Overview — the four-step signal path, why low orbit wins, laser mesh, handovers, key numbers |
| `#/how-it-works` | Nine-chapter explainer with interactive figures and a scroll-spy chapter rail |
| `#/beam` | Handover lab — a full-sky 3D simulation of one dish working through a 1,584-satellite shell, plus a scripted A → B → C lesson, in Bangla and English |
| `#/explorer` | 3D constellation explorer: five views, speed control, layers, satellite inspector, coverage probe |
| `#/numbers` | Orbit sandbox, latency budget and the fibre-vs-space crossover chart |
| `#/faq` | Short answers to the common questions, plus sources |

Routing is hash-based (`#/how-it-works@lasers`), so the built site works from
any static host — including a single file.

## Interactive figures

- **Signal path** — click through uplink → relay → gateway → return, or switch to
  the laser route.
- **Phased array** — drag the beam angle; watch the phase step and timing change.
- **Full-sky handover lab** — the default view. All 1,584 satellites of a
  Starlink-class shell (72 planes × 22, 550 km, 53°) are propagated from
  circular-orbit mechanics with Earth rotation, so roughly 80 are above the
  horizon at any moment. The dish holds one, prepares the next, cross-fades the
  beam and lets the old one set — about once a minute for a 15-minute window.
  Every switch is listed with its elevations and its reason, the timeline can be
  scrubbed or clicked, and a polar sky map plots every satellite in view.
- **Sky map** — a "looking up" disc: zenith at the centre, horizon at the rim,
  every satellite above the horizon as a dot, the 25° mask as a dashed ring, the
  beam as a line and each satellite's pass as an arc.
- **Lesson sim** — the same machinery with three named satellites on scripted
  passes, six labelled stages and a step-through rail, for when the full shell
  is too much at once.
- **Live status panel** — the serving satellite, the next candidate, elevation,
  azimuth, visibility, slant range, light time and handover progress, all read
  from the same deterministic simulation state as the 3D scene.
- **Phased-array figure** — pick a target elevation and watch the element phase
  offsets change while the panel itself stays perfectly still.
- **Spot beams** — hover the cells to see how frequency bands are reused.
- **Satellite anatomy** — hover the numbered callouts to inspect the hardware.
- **Coverage map** — click anywhere to count covering satellites in the model.
- **Pass timeline** — plot the elevation of two consecutive satellites and the
  handover between them.
- **Orbit sandbox** — one altitude slider drives speed, period, footprint and
  light time from two-body physics.
- **Latency race** — a transparent light-time model with a visible crossover.

## Accuracy

Figures are approximate and reflect the public record as of **October 2026**.
They change as the constellation grows. Orbital mechanics, footprint geometry,
light-time and the shell table are computed from published parameters
(Earth radius 6,371 km, μ = 398,600.4418 km³/s², c = 299,792.458 km/s).

Two figures deliberately bend scale for legibility and say so in the UI: the
altitude-o-meter compresses the distance to geostationary orbit, and the orbit
sandbox draws altitude 6× exaggerated while computing the footprint from the
true radius and altitude.

The handover lab has two labelled teaching models.

The **full-sky** model propagates a 72 × 22 Walker-Delta shell at 550 km / 53°
from two-body circular orbits plus Earth rotation, and solves every azimuth,
elevation and slant range from the terminal's local ENU frame. No telemetry is
used and no satellite is animated by hand: the same simulated second always
produces the same sky. Perturbations (J2, drag, station keeping) are omitted. The
handover policy is readable rather than realistic: stay on the current satellite
until it drops below a 40° switch floor (or a pass 20° better is already
overhead), then take the best-scoring satellite above the 25° mask, with an 8 s
minimum dwell, and cross-fade the beam. Each satellite carries a small
deterministic score offset that stands in for the cell load, capacity and
gateway routing a real scheduler weighs. The transfer cross-fade is stretched to
a few simulated seconds so it can be seen.

The **lesson** model scripts three passes over a terminal at 47.6° N in Puget
Sound for clarity, while range, light time and geometry still come from a real
550 km circular orbit (slant range is solved from the elevation). It steps
through the six stages of one handover A → B → C.

The loop runs at 20× real time at 1× speed (slow motion is 2× real time). Every
handover is labelled as a conceptual simplification — the paired beams are
make-before-break made visible, not a claim about every real handover, and the
actual SpaceX handover algorithm is not public.

The 3D model is **not live telemetry**: satellites are propagated with a simple
circular two-body model from published shell parameters. Distances are to scale
(1 scene unit = one Earth radius); spacecraft are drawn much larger than reality
so they can be seen and clicked. Simplifications are labelled in the UI.

This project is not affiliated with SpaceX.

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # single-file build in dist/
npm run preview
```

## Structure

```
src/
  App.tsx                 route switch + page frame
  pages/                  Home, HowItWorks, Explorer, Numbers, Faq
  components/
    site/                 header, footer, primitives, FAQ accordion
    home/                 home-page sections
    diagrams/             the interactive SVG figures
    handover/             the handover labs (shared 3D scene, sky layer, sky map, status UI)
    explorer/             UI around the 3D scene
    three/                cinematic hero globe
    scene/                reusable three.js layers (Earth, satellites, links…)
  lib/
    astro.ts              orbital mechanics, shells, coverage, gateways
    handover.ts           three-satellite pass model, handover policy, scenario steps
    handoverContent.ts    Bangla step copy, science Q&A and honesty notes
    constellation.ts      full 1,584-satellite shell: propagation, handover schedule, sky sampling
    constellationContent.ts  Bangla copy for the full-sky lab
    content.ts            editorial copy and chapter metadata
    router.tsx            tiny hash router
    worldPath.ts          Natural Earth land outlines for the 2D map
public/textures/          Earth day / night / cloud maps (served locally)
```

## Credits

- Earth textures from the [three.js](https://threejs.org) examples (MIT).
- The phased-array explanation follows Branch Education's
  [How does Starlink satellite internet work?](https://www.youtube.com/watch?v=qs2QcycggWU)
  (phased arrays, beamforming, beam steering, 64QAM).
- Land outlines derived from [Natural Earth](https://www.naturalearthdata.com)
  via the `world-atlas` dataset.
- Typography: Space Grotesk and JetBrains Mono (Google Fonts).
