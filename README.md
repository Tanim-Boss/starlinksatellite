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
| `#/explorer` | 3D constellation explorer: five views, speed control, layers, satellite inspector, coverage probe |
| `#/numbers` | Orbit sandbox, latency budget and the fibre-vs-space crossover chart |
| `#/faq` | Short answers to the common questions, plus sources |

Routing is hash-based (`#/how-it-works@lasers`), so the built site works from
any static host — including a single file.

## Interactive figures

- **Signal path** — click through uplink → relay → gateway → return, or switch to
  the laser route.
- **Phased array** — drag the beam angle; watch the phase step and timing change.
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
npm run preview  # serves dist/ on http://localhost:3000
```

`npm run dev` serves every module separately (~11 MB of JavaScript on a first
load, because three.js and drei are not bundled); that is fast to edit but slow
over a network. To look at what a visitor actually downloads, use
`npm run build && npm run preview` — one gzipped HTML file, about 470 kB.

## Loading

The page is deliberately built to show words before it shows WebGL:

- **A boot screen in `index.html`.** Inline HTML and CSS, painted before React
  (or the 1.6 MB engine) exists, then replaced by the app on first render. It
  also reports itself if the bundle is still loading after 12 seconds.
- **Fonts are not render-blocking.** Google Fonts is requested with
  `media="print"` and swapped in on load, with the system stack as the fallback,
  so a slow or blocked font host cannot leave the tab blank.
- **The 3D scenes mount late and politely.** `SceneGate` waits until the canvas
  is near the viewport and the browser is idle, so text, figures and navigation
  paint first. It also probes for WebGL once, shows a labelled placeholder while
  the engine arrives, and swaps in an explanation instead of a blank box when
  the device cannot do 3D at all.
- **Errors are contained.** Every canvas sits behind an `ErrorBoundary`, and so
  does each page: a shader that will not compile, a lost context or a driver
  reset costs the model, not the article.
- **Textures are compressed.** The Earth day and night maps are re-encoded for
  the size they are drawn at (940 kB → 274 kB) and the day map is preloaded at
  low priority.

## Structure

```
src/
  App.tsx                 route switch + page frame
  pages/                  Home, HowItWorks, Explorer, Numbers, Faq
  components/
    site/                 header, footer, primitives, FAQ accordion
    home/                 home-page sections
    diagrams/             the interactive SVG figures
    explorer/             UI around the 3D scene
    three/                cinematic hero globe
    scene/                reusable three.js layers (Earth, satellites, links…)
  lib/
    astro.ts              orbital mechanics, shells, coverage, gateways
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
