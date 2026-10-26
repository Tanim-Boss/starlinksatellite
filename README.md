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
| `#/beam` | Handover lab — an interactive 3D simulation of one dish switching satellites A → B → C, in Bangla and English |
| `#/explorer` | 3D constellation explorer: five views, speed control, layers, satellite inspector, coverage probe |
| `#/numbers` | Orbit sandbox, latency budget and the fibre-vs-space crossover chart |
| `#/faq` | Short answers to the common questions, plus sources |

Routing is hash-based (`#/how-it-works@lasers`), so the built site works from
any static host — including a single file.

## Interactive figures

- **Signal path** — click through uplink → relay → gateway → return, or switch to
  the laser route.
- **Phased array** — drag the beam angle; watch the phase step and timing change.
- **Handover sim** — a real-time 3D scene: one fixed dish, three satellites on
  scripted passes, communication beams, orbital sky paths and the terminal's
  25° coverage cone. Play, pause, scrub, step through the six stages of a
  handover, or loop A → B → C. Play / pause, 0.25×–2× speed, layer toggles and
  ground / space / dish-close-up cameras are all in the panel.
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

The handover lab is an explicitly labelled teaching model. Three satellite
passes over a terminal at 47.6° N in Puget Sound are scripted for clarity,
while range, light time and geometry come from a real 550 km circular orbit
(slant range is solved from the elevation). The handover policy is deliberately
simple: the terminal keeps its satellite until that satellite falls below a 40°
switch floor, then moves to a visible altitude candidate above 40°, as long as
it is above the 25° mask. Real scheduling also weighs capacity, obstructions,
gateway routing and network load; the actual SpaceX handover algorithm is not
public. The loop runs at 20× real time at 1× speed and every handover is
labelled as a conceptual simplification — the paired beams are make-before-break
made visible, not a claim about every real handover.

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
    handover/             the handover lab (3D scene, phased-array face, SVG figure, status UI)
    explorer/             UI around the 3D scene
    three/                cinematic hero globe
    scene/                reusable three.js layers (Earth, satellites, links…)
  lib/
    astro.ts              orbital mechanics, shells, coverage, gateways
    handover.ts           three-satellite pass model, handover policy, scenario steps
    handoverContent.ts    Bangla step copy, science Q&A and honesty notes
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
