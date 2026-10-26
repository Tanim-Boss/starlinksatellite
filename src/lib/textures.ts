import * as THREE from "three";

export const EARTH_URLS = [
  "https://unpkg.com/three-globe@2/example/img/earth-blue-marble.jpg",
  "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
  "https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/textures/planets/earth_atmos_2048.jpg",
];

export const NIGHT_URLS = [
  "https://unpkg.com/three-globe@2/example/img/earth-night.jpg",
  "https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/textures/planets/earth_lights_2048.png",
];

export const CLOUDS_URLS = [
  "https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/textures/planets/earth_clouds_1024.png",
];

/** Loads the first URL that works; calls onFail() if none do. */
export function loadTexture(
  urls: string[],
  onLoad: (tex: THREE.Texture) => void,
  onFail?: () => void,
): void {
  const loader = new THREE.TextureLoader();
  const tryAt = (i: number) => {
    if (i >= urls.length) {
      onFail?.();
      return;
    }
    loader.load(
      urls[i],
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        onLoad(tex);
      },
      undefined,
      () => tryAt(i + 1),
    );
  };
  tryAt(0);
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Procedural stand-in map (oceans + blob continents + graticule) if all CDN textures fail. */
function makeFallbackEarthTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#0a2a45");
  grad.addColorStop(0.45, "#0f4c75");
  grad.addColorStop(1, "#082138");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  const rnd = mulberry32(42);
  const landColors = ["#3d6b35", "#4a7c3f", "#8a7a4a", "#5d8a4a"];
  for (let b = 0; b < 26; b++) {
    const cx = rnd() * 1024;
    const cy = 40 + rnd() * 432;
    const r = 30 + rnd() * 90;
    ctx.fillStyle = landColors[Math.floor(rnd() * landColors.length)];
    ctx.globalAlpha = 0.85;
    for (let k = 0; k < 5; k++) {
      const a = rnd() * Math.PI * 2;
      const d = rnd() * r * 0.7;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.6, r * (0.4 + rnd() * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(240,248,255,0.9)";
  ctx.fillRect(0, 0, 1024, 26);
  ctx.fillRect(0, 486, 1024, 26);

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = 256 - (lat / 180) * 512;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }
  for (let lon = 0; lon < 360; lon += 30) {
    const x = (lon / 360) * 1024;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Radial white glow, used for the sun sprite. */
export function makeGlowTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.2, "rgba(210,235,255,0.55)");
  g.addColorStop(0.55, "rgba(130,185,255,0.14)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export const makeFallbackEarth = makeFallbackEarthTexture;
