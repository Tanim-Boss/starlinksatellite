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
| `#/simulation` | Starlink-focused orbital simulation — circular LEO orbits, a ground terminal, handoffs and a laser relay mesh |
| `#/comparison` | Six-stage “Broadcast TV Satellite vs Starlink” 3D story: dishes, one-way/two-way links, true-scale GEO/LEO orbits, latency pulses, a 600-satellite laser mesh and location-aware handoffs |
| `#/faq` | Short answers to the common questions, plus sources |

Routing is hash-based (`#/how-it-works@lasers`), so the built site works from
any static host, including a sub-folder and a single file.

## Interactive figures

- **Signal path** — click through uplink → relay → gateway → return, or switch to
  the laser route.
- **Phased-array figure** — pick a target elevation and watch the element phase
  offsets change while the panel itself stays perfectly still.
- **Satellite internet simulation** (`#/simulation`) — the whole chain in one
  scene: 480 satellites on physically based circular orbits (550 km, 53°,
  95-minute period, 24 evenly spaced planes), an InstancedMesh fleet whose
  antennas point toward Earth and panels align with their orbit; a flat,
  stationary phased-array dish on a tripod links to a satellite above 25°
  elevation and hands off as it sets. Choose **Dish** for a ground-level view
  of the antenna, the tracked satellite and the orange radio beam; an amber
  reticle and handoff label identify the current target. The Orbit view starts
  at 60× with orbital rings on and the laser mesh off for clarity; both are
  toggleable. The optional cyan laser mesh and highlighted BFS relay route use
  only links that clear Earth and its atmosphere. Three camera modes
  (Orbit / Dish / Laser), click-on-globe location selection, a 60-second Story
  Mode, speed (1×–3000×), play/pause, a live HUD and an automatic quality
  fallback round out the scene. Exaggerated sizes, physical orbits — not live
  tracking.
- **Broadcast TV Satellite vs Starlink** (`#/comparison`) — a reusable TypeScript React component with six guided stages and a ~78-second tour. It compares a fixed parabolic receive-only dish with a flat two-way phased array; shows GEO and LEO orbits at true relative scale (plus an exaggerated readability mode); launches GEO/LEO latency pulses together; renders 600 circular-orbit satellites in 20 planes at 53°; and selects a LEO satellite above 25° for location-aware handoffs. Radio is orange, inter-satellite links are cyan, and the shared LineSegments buffer drops any laser segment that intersects Earth. The display sleeps off-screen or in a hidden tab, honors reduced-motion preferences, caps DPR at 2 and lowers detail below 30 FPS. All visitor-facing text is centralized in `copy.ts`; physical and visual tunables are in `config.ts`. See [`src/components/SatelliteComparison/README.md`](src/components/SatelliteComparison/README.md) for React 18 installation, a lazy-import example, customization guidance and free Earth-texture sources.
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

The **satellite internet simulation** propagates every satellite with a
circular two-body model from published shell parameters (RAAN, inclination and
mean anomaly per plane and slot, so periods, speeds and ground-track geometry
are correct), and computes dish elevation, Earth line-of-sight blocking, laser
adjacency and BFS relay routes from the same physics. Satellite, dish and beam
sizes are exaggerated for visibility and labelled as such in the UI; the
wavefront rings and binary digits on the RF beam are a visual device, not an
electromagnetic solver. The latency figure is path length over the speed of
light — real latency adds processing and queuing. This is **not** a live
Starlink control system, not telemetry, and not a reproduction of any product's
firmware or hardware.

The **TV-vs-Starlink comparison** uses circular two-body propagation for its
600 rendered LEO spacecraft, a 53° inclination and a GEO spacecraft that rotates
with Earth over the selected longitude. The scale toggle changes only the
rendered LEO radius; its altitude, speed, period and 25° elevation selection
remain physical. The beam cones and terminal models are intentionally enlarged,
and the two pulse animations are time-stretched to be visible; the stopwatch
readouts retain the approximate 600 ms GEO / 20–40 ms LEO round-trip figures.
Laser segments are rejected when their line of sight would cross Earth.

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
npm run test          # typecheck + jsdom suites + orbit and comparison checks
npm run test:smoke    # every active route mounts in jsdom, including no-WebGL fallbacks
npm run test:sim      # drives the Starlink simulation controls end-to-end in jsdom
npm run test:sim-math # checks existing simulation orbits, handoffs and relay geometry
npm run test:comparison # drives the six-stage comparison controls in jsdom
```

`npm run build` emits a normal Vite build: the shell and the current page are
the only JavaScript needed for the first paint (about 75 kB gzipped), and each
route, the diagrams and three.js are separate chunks fetched when they are
needed. `npm run build:single` inlines everything into `dist-single/index.html`
(~475 kB gzipped) for hosts that only accept one file; both outputs copy the
Earth textures to `textures/` next to the HTML.

`npm run dev` still serves modules individually; the Vite `warmup` list covers
the page, diagram, simulation and comparison component directories so their
first visit does not have to compile the whole scene graph on demand.

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
  pages/                  Home, HowItWorks, SatelliteSim, BroadcastComparison, Faq
  components/
    site/                 header, footer, primitives, FAQ accordion, scene gate/posters
    home/                 home-page sections
    diagrams/             the interactive SVG figures
    SatelliteSimulation/  reusable Starlink orbital simulation (config, scenes, hooks, ui, utils)
    SatelliteComparison/  reusable GEO TV vs LEO internet story (config, copy, scenes, hooks, ui)
    three/                cinematic hero globe
    scene/                reusable three.js layers (Earth, satellites, links…)
  lib/
    astro.ts              orbital mechanics, shells, coverage, gateways
    content.ts            editorial copy and chapter metadata
    router.tsx            tiny hash router + retrying section scroll
    preload.ts            route-chunk prefetching (idle + hover)
    useViewportActivity.ts pauses animations that nobody can see
    worldPath.ts          Natural Earth land outlines for the 2D map
public/textures/          Earth day / night maps (served locally)
scripts/                  smoke, simulation math, and jsdom interaction tests
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
  (phased arrays, beamforming, beam steering, 64QAM). The reference animation
  in `Video Project 2.mp4` was the visual brief for the simulation.
- Land outlines derived from [Natural Earth](https://www.naturalearthdata.com)
  via the `world-atlas` dataset.
- Typography: Space Grotesk and JetBrains Mono (Google Fonts).
