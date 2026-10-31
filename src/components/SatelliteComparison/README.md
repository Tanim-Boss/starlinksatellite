# Install

For a fresh **React 18 + TypeScript + Vite** project, install the compatible renderer versions with:

```bash
npm install react@18.3.1 react-dom@18.3.1 three @react-three/fiber@8 @react-three/drei@9 @react-three/postprocessing@2 zustand@4
npm install -D @types/react@18 @types/react-dom@18
```

This repository already includes the required packages. Its existing app is on React 19.3, React Three Fiber 9, Drei 10 and postprocessing 3; those project versions are kept intact rather than downgrading the whole site. The component uses the same React/R3F APIs and TypeScript conventions as the checkout.

## Lazy import

```tsx
import { lazy, Suspense } from "react";
const SatelliteComparison = lazy(() => import("../components/SatelliteComparison"));
<Suspense fallback={<div>Preparing the satellite comparison…</div>}><SatelliteComparison /></Suspense>
```

Adjust the relative path to the component folder from your page file; no `@` alias or site-specific helper is required.

Give the component's parent a height (the component fills it at 100% width and height):

```tsx
<div style={{ height: "min(84vh, 940px)", minHeight: 720 }}>
  <Suspense fallback={<div>Loading…</div>}><SatelliteComparison /></Suspense>
</div>
```

The default export is `SatelliteComparison` from `index.tsx`. In this repo the route wrapper is `src/pages/BroadcastComparison.tsx`, and the story is available at `#/comparison`.

## Source files

```text
src/components/SatelliteComparison/
  README.md
  index.tsx
  config.ts
  copy.ts
  styles.css
  hooks/
    useActivity.ts
    useComparisonStore.ts
    useReducedMotion.ts
  scenes/
    CameraRig.tsx
    ComparisonCanvas.tsx
    Constellation.tsx
    DishStation.tsx
    Earth.tsx
    EarthScene.tsx
    GroundScene.tsx
    OrbitRings.tsx
    SatelliteModel.tsx
    SignalEffects.tsx
    World.tsx
  ui/
    ComparisonTable.tsx
    Controls.tsx
    LoadingScreen.tsx
    StagePanels.tsx
    StoryNavigation.tsx
  utils/
    orbit.ts
    supportsWebGL.ts
    textures.ts
```

`copy.ts` is the translatable visitor-facing text source. `config.ts` is the tunables entry point: it exports altitudes, Earth constants, satellite counts, speed choices, colors, location presets, texture URLs, quality settings and the copy object.

## Earth textures

The repository already includes these local texture files:

- `public/textures/earth-day.jpg` — Earth surface/day map.
- `public/textures/earth-night.jpg` — city-lights map.

`config.ts` resolves them relative to Vite's `BASE_URL`. A cloud layer is generated locally as a low-contrast procedural texture, so there is no extra download. To replace the maps, free sources include NASA's [Blue Marble collection](https://visibleearth.nasa.gov/collection/1484/blue-marble) for a daytime equirectangular map and NASA's [Earth at Night / Black Marble material](https://earthobservatory.nasa.gov/features/NightLights) for city lights. Put the files in `/public/textures/` and update `comparisonConfig.textures`.

## Customize

- **Locations:** add `{ name, lat, lon }` entries to `comparisonConfig.locations` in `config.ts`. The first entry is the default (Dhaka, Bangladesh, 23.81° N, 90.41° E).
- **Text / translation:** edit `copy.ts`; the stage captions, labels, tooltips and final spec table are kept together.
- **Colors:** change `comparisonConfig.colors` in `config.ts`. Orange is radio, cyan is the satellite laser mesh, and the thin orange orbital paths are kept distinct from the beams by their low opacity.
- **Physics and performance:** tune GEO/LEO altitudes, inclination, minimum elevation, orbital plane/satellite counts, DPR cap and low-FPS satellite count in `config.ts`. `utils/orbit.ts` derives circular speed, period, positions, line-of-sight, GEO elevation and LEO selection from those values.
- **Parent layout:** the component handles Canvas resize itself; set a real parent height. It pauses its render loop while outside the viewport or while the browser tab is hidden, and R3F disposes scene objects on unmount. Its local Earth and generated beam textures are explicitly disposed as well.

The displayed satellite, dish and beam dimensions are exaggerated for readability. Orbital altitude, speed, period and circular-orbit propagation are physical; the pulse animation is time-stretched so both paths are visible while the latency counters retain the approximate end-to-end figures.
