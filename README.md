# Orbital — broadcast satellites vs. Starlink

An independent, interactive field guide comparing a traditional TV broadcast
satellite with the Starlink constellation. The landing page is a 3D simulation
built around the Branch Education reference animation below: it explores
the two dishes, one- and two-way signals, GEO and LEO orbits, distance, latency,
and a moving satellite network.

Built with React, TypeScript, Vite, three.js and React Three Fiber.

## The landing-page simulation

At `#/` (or the site root), choose one of four views:

- **Compare** — see a geostationary broadcast satellite and low-orbit
  satellites around Earth together.
- **The dishes** — compare a receive-only parabolic TV dish with a two-way,
  electronically steered phased-array terminal.
- **Broadcast** — focus on a GEO satellite that stays over an equatorial point
  as Earth rotates and covers a wide region.
- **Starlink** — see a 600-satellite model of a moving LEO constellation, a
  representative handoff, and an optional laser mesh.

Drag the model to rotate it and use the wheel to zoom; when the canvas is
focused, use arrow keys to rotate and plus or minus to zoom. Pause or resume the
simulation, change its time speed, toggle orbit paths, signals and laser links,
reset the camera, or expand the view. The scene pauses when it is off screen or
in a hidden tab. Reduced-motion preferences start it paused. A labelled static
fallback and all comparison text remain usable on devices without WebGL.

Below the simulation, the page compares altitude, signal direction, latency,
terminals and coverage, and follows a simplified two-way internet request.
The older, more detailed guide pages remain available through their existing
hash routes:

| Route | Description |
| --- | --- |
| `#/` | Orbital's interactive broadcast-vs-Starlink landing page |
| `#/how-it-works` | Nine-chapter Starlink explainer |
| `#/simulation` | Detailed Starlink-focused satellite internet simulation |
| `#/comparison` | Interactive 3D view of Earth with a GEO broadcast-TV satellite and a moving LEO Starlink satellite |
| `#/faq` | Common questions and sources |

## Accuracy and visual scale

This is an **educational model, not live tracking or telemetry**, and it is not
affiliated with SpaceX. The landing-page drawing compresses the GEO orbit and
expands the LEO orbit, satellites, dishes and signals so they can be seen
together. The labels and comparison figures are approximate: a representative
GEO altitude is 35,786 km and a representative Starlink LEO altitude is about
550 km. GEO internet round-trip latency is commonly around 500–600 ms; Starlink
is often around 20–40 ms, depending on the route and conditions. A TV broadcast
receiver is one-way and does not itself have an internet round-trip latency.

The landing-page constellation uses a simplified circular-orbit model (600
spacecraft in 20 planes at a 53° inclination, approximately 95 minutes per
orbit). A ground point rotates with Earth, the GEO spacecraft follows the same
rotation, and the selected LEO spacecraft changes as the geometry changes.
Rendered inter-satellite links are only drawn when their physical line of sight
clears Earth. The ground location, signal pulses and links are illustrative, and
not a representation of operational Starlink routing.

The legacy `#/simulation` and `#/comparison` experiences contain additional
physical-orbit, handoff and relay models. See
[`src/components/SatelliteComparison/README.md`](src/components/SatelliteComparison/README.md)
for details of the six-stage comparison component. All visual sizes and other
simplifications are disclosed in the interface.

## Development

```bash
npm install
npm run dev           # http://localhost:3000, also exposed as an Arena preview
npm run typecheck
npm run build         # static, code-split output in dist/
npm run build:single  # single HTML build in dist-single/ (textures remain separate)
npm run preview
npm test              # typecheck, route, lab, simulation, math and comparison tests
npm run test:lab      # landing-page controls and no-WebGL fallback in jsdom
npm run test:lab-math # landing-page orbit, scale and handoff calculations
```

The dev and preview servers bind to `0.0.0.0` and accept proxied preview hosts.
Build with `npx vite build --base=/your-path/` for a static sub-path; textures
are resolved from the configured Vite base. Fonts and Earth textures are local;
no external font or texture host is required.

## Structure

```text
src/components/OrbitLab/  landing-page shell, controls, styling and 3D scene
src/pages/OrbitLab.tsx    comparison, metrics and signal journey
src/components/SatelliteComparison/
                          standalone six-stage comparison component (not routed)
                          and shared orbit math used by the landing page
src/components/SatelliteSimulation/
                          detailed legacy Starlink simulation
src/pages/                legacy guide pages
public/textures/          local Earth day, night and cloud maps
scripts/                  route, UI and orbital-math tests
```

## Credits

- The supplied reference animation features Branch Education. The related
  [How does Starlink satellite internet work?](https://www.youtube.com/watch?v=qs2QcycggWU)
  explainer informed the educational comparison and the 3D scene.
- Earth day, night and cloud textures are based on the
  [three.js examples](https://github.com/mrdoob/three.js/tree/master/examples/textures/planets).
- Typography: Space Grotesk and IBM Plex Mono, bundled locally through
  Fontsource. Icons: Lucide.
