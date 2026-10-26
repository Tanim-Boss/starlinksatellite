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
| `#/antenna` | Phased-array beam lab — a physics-based 3D simulator: 256 fixed elements, live interference, a model-derived steerable beam, three satellites, a radiation-pattern view, a guided experiment and a live explanation panel |
| `#/explorer` | 3D constellation explorer: five views, speed control, layers, satellite inspector, coverage probe |
| `#/numbers` | Orbit sandbox, latency budget and the fibre-vs-space crossover chart |
| `#/faq` | Short answers to the common questions, plus sources |

Routing is hash-based (`#/how-it-works@lasers`), so the built site works from
any static host, including a sub-folder and a single file.

## Interactive figures

- **Signal path** — click through uplink → relay → gateway → return, or switch to
  the laser route.
- **Phased array** — drag the beam angle; watch the phase step and timing change.
- **Phased-array figure** — pick a target elevation and watch the element phase
  offsets change while the panel itself stays perfectly still.
- **Phased-array beam lab** (`#/antenna`) — a full 3D teaching simulation of a
  16 × 16 terminal array. Steer azimuth and elevation, sweep automatically, or
  track one of three moving satellites while the panel stays bolted down. Three
  linked views (animated wavefronts/interference, the main lobe, and the 3D
  radiation pattern) are all computed from the same separable array factor. A
  clickable close-up shows each element's phase, delay and its neighbours, with
  a phase-colour legend and keyboard navigation. A seven-step guided experiment
  and live readouts connect the maths to the scene: phase step, timing, nulls,
  side lobes, beamwidth and target error. Not telemetry or proprietary firmware.
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

The **phased-array beam lab** models a uniform 16 × 16 rectangular lattice of
ideal isotropic radiators with half-wavelength spacing at 12 GHz (λ ≈ 25 mm,
d ≈ 12.5 mm, aperture ≈ 0.20 m). Element phases come from
φ(i,j) = −2π(d/λ)(i·u_x + j·u_z); the far field is the separable Dirichlet array
factor, and the beam, wave sheet, radiation envelope and readouts all use it.
Elevation is measured from the horizon, so the scan angle from the panel normal
is θ = 90° − elevation. Mutual coupling, amplitude taper, element patterns,
ground reflections, polarisation and atmospheric loss are omitted, and the
3D envelope/wavefront scale is exaggerated. The three satellites follow
simplified closed apparent tracks, not Keplerian ephemerides, and their motion is
time-compressed; orbital motion never depends on the beam. Beamwidth, nulls and
side lobes are measured from the same sampled cut that the chart draws. This is
**not** a live Starlink control system, not telemetry, and not a reproduction of
any product's firmware or hardware; real terminals differ by generation.

The 3D model is **not live telemetry**: satellites are propagated with a simple
circular two-body model from published shell parameters. Distances are to scale
(1 scene unit = one Earth radius); spacecraft are drawn much larger than reality
so they can be seen and clicked. Simplifications are labelled in the UI.

This project is not affiliated with SpaceX.

## Development

```bash
npm install
npm run dev           # http://localhost:3000
npm run typecheck     # tsc --noEmit (TypeScript 7)
npm run build         # code-split build in dist/ (the default)
npm run build:single  # portable one-file build in dist-single/
npm run preview       # serves dist/ on http://localhost:3000
npm run test          # typecheck + both jsdom suites
npm run test:smoke    # every route mounts in jsdom, including no-WebGL fallbacks
npm run test:antenna  # drives the beam lab controls end-to-end in jsdom
```

`npm run build` emits a normal Vite build: the shell and the current page are
the only JavaScript needed for the first paint (about 75 kB gzipped), and each
route, the diagrams and three.js are separate chunks fetched when they are
needed. `npm run build:single` inlines everything into `dist-single/index.html`
(~475 kB gzipped) for hosts that only accept one file; both outputs copy the
Earth textures to `textures/` next to the HTML.

`npm run dev` still serves modules individually; the Vite `warmup` list now
covers every component directory so the first visit to the overview or the
explainer does not have to compile the whole diagram graph on demand.

### Toolchain

TypeScript **7**, Vite **8**, React **19.3**, Tailwind CSS **4.3** and
three.js **0.186**. `tsconfig.json` no longer uses `baseUrl` — it was removed in
TS 7 — so the `@/*` alias is a plain relative `paths` entry. Tailwind utilities
use the v4 names (`bg-linear-to-*`, `shrink-0`), and the project type-checks
with `verbatimModuleSyntax`.

If you host the site under a sub-path (a project page, for example), build with
`npx vite build --base=/your-path/`; textures and chunks are resolved from
`import.meta.env.BASE_URL` and the build's base, not from the domain root.

## Loading

The page is deliberately built to show words before it shows WebGL:

- **Routes are code-split.** The entry bundle contains the shell and nothing
  else; each page, the interactive figures and three.js arrive as separate
  chunks. A visitor reads the overview before the hero globe has downloaded.
- **A boot screen in `index.html`.** Inline HTML and CSS, painted before any
  script exists, then replaced by the app on first render. It also watches the
  start-up: a script error, a failed module or a bundle that never arrives is
  reported in words with a single retry button, instead of leaving visitors to
  guess and reload.
- **Fonts are not render-blocking.** Google Fonts is preloaded and promoted to a
  stylesheet when it arrives, with the system stack as the fallback, so a slow
  or blocked font host cannot leave the tab blank.
- **The 3D scenes mount late and politely.** `SceneGate` waits until the canvas
  is near the viewport and the browser is idle, so text, figures and navigation
  paint first. It also probes for WebGL once, shows a labelled placeholder while
  the engine arrives, and swaps in an explanation instead of a blank box when
  the device cannot do 3D at all. A lost WebGL context is caught and offered a
  retry, so a driver reset no longer needs a page reload.
- **Scroll reveals can never hide content.** The visible state is the default;
  a block is only hidden after mount, and only when it is below the fold. If the
  observer never fires — background tab, restricted webview, old browser — a
  timer and the page lifecycle reveal it anyway.
- **Animated figures park themselves.** The SVG animations stop when they are
  off screen or the tab is hidden, and run at 30 fps, so the long pages stay
  smooth on a phone.
- **Errors are contained.** Every canvas sits behind an `ErrorBoundary`, and so
  does each page: a shader that will not compile, a failed chunk or a driver
  reset costs the model, not the article.
- **Textures are compressed and on demand.** The Earth day and night maps are
  re-encoded for the size they are drawn at (940 kB → 274 kB) and only fetched
  once the lazy 3D chunk mounts, so they are not part of the first load.

## Structure

```
src/
  App.tsx                 route switch + page frame
  pages/                  Home, HowItWorks, PhasedArray, Explorer, Numbers, Faq
  components/
    site/                 header, footer, primitives, FAQ accordion, scene gate/posters
    home/                 home-page sections
    diagrams/             the interactive SVG figures
    antenna/              phased-array beam lab (scene, panel lattice, beam/wave/pattern layers, sky, controls, close-up, guide)
    explorer/             UI around the 3D scene
    three/                cinematic hero globe
    scene/                reusable three.js layers (Earth, satellites, links…)
  lib/
    astro.ts              orbital mechanics, shells, coverage, gateways
    content.ts            editorial copy and chapter metadata
    phasedArray.ts        phased-array model: phases, array factor, cut metrics, satellites
    antennaContent.ts     beam-lab lesson copy, guided steps, assumptions
    router.tsx            tiny hash router + retrying section scroll
    preload.ts            route-chunk prefetching (idle + hover)
    useViewportActivity.ts pauses animations that nobody can see
    worldPath.ts          Natural Earth land outlines for the 2D map
public/textures/          Earth day / night / cloud maps (served locally)
scripts/                  smoke test + jsdom interaction test for the beam lab
vite.config.ts            dev server + code-split build
vite.config.singlefile.ts one-file build used by `npm run build:single`
```

The jsdom smoke test also guards the loading behaviour: it fails if the boot
screen survives the first render, if a page ever has more than one `<h1>`, if a
`<main>` is nested inside another one, if a scroll reveal is left hidden, or if
a deep link and a real nav click fail to swap pages.

## Credits

- Earth textures from the [three.js](https://threejs.org) examples (MIT).
- The phased-array explanation follows Branch Education's
  [How does Starlink satellite internet work?](https://www.youtube.com/watch?v=qs2QcycggWU)
  (phased arrays, beamforming, beam steering, 64QAM).
- Land outlines derived from [Natural Earth](https://www.naturalearthdata.com)
  via the `world-atlas` dataset.
- Typography: Space Grotesk and JetBrains Mono (Google Fonts).
