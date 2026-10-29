import * as THREE from "three";
import { SATS } from "../hooks/useSimDriver";

/**
 * Procedural canvas textures for the simulation.
 *
 * The Earth day/night maps ship in `/public/textures/` (see config.ts);
 * everything here is generated so the component works with zero external
 * assets. All textures are cached per call site: nothing is rebuilt per
 * frame, and every maker returns a texture the caller disposes on unmount.
 */

function makeCanvas(w: number, h: number): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  return ctx ? { c, ctx } : null;
}

function blankTexture(): THREE.Texture {
  const data = new Uint8Array([0, 0, 0, 0]);
  const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

/* -------------------------------------------------------------------------- */
/* Cloud layer                                                                 */
/* -------------------------------------------------------------------------- */

let cloudTexture: THREE.Texture | null = null;

/** A soft, thin cloud sheet drawn from layered radial blobs. */
export function makeCloudTexture(): THREE.Texture {
  if (cloudTexture) return cloudTexture;
  const made = makeCanvas(1024, 512);
  if (!made) return (cloudTexture = blankTexture());
  const { c, ctx } = made;

  // Wrap-around clouds: blobs near the left/right edges are mirrored so the
  // layer tiles seamlessly around the poles.
  const blobs = 190;
  for (let i = 0; i < blobs; i++) {
    const x = Math.random() * 1024;
    const y = 40 + Math.random() * 432;
    const r = 18 + Math.random() * 64;
    const a = 0.05 + Math.random() * 0.16;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(0.6, `rgba(255,255,255,${a * 0.5})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (x < 90) {
      ctx.beginPath();
      ctx.arc(x + 1024, y, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (x > 934) {
      ctx.beginPath();
      ctx.arc(x - 1024, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  cloudTexture = new THREE.CanvasTexture(c);
  cloudTexture.colorSpace = THREE.SRGBColorSpace;
  cloudTexture.wrapS = THREE.RepeatWrapping;
  return cloudTexture;
}

/* -------------------------------------------------------------------------- */
/* Fallback Earth                                                             */
/* -------------------------------------------------------------------------- */

let fallbackEarth: THREE.Texture | null = null;

/**
 * Procedural stand-in (ocean + blob continents) used only when the shipped
 * day map fails to load. Not pretty, but the simulation still runs.
 */
export function makeFallbackEarthTexture(): THREE.Texture {
  if (fallbackEarth) return fallbackEarth;
  const made = makeCanvas(1024, 512);
  if (!made) return (fallbackEarth = blankTexture());
  const { c, ctx } = made;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#0a2a45");
  grad.addColorStop(0.45, "#0f4c75");
  grad.addColorStop(1, "#082138");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  ctx.fillStyle = "rgba(61,107,53,0.95)";
  for (let i = 0; i < 24; i++) {
    const cx = Math.random() * 1024;
    const cy = 60 + Math.random() * 392;
    const rx = 30 + Math.random() * 90;
    const ry = 18 + Math.random() * 46;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  fallbackEarth = new THREE.CanvasTexture(c);
  fallbackEarth.colorSpace = THREE.SRGBColorSpace;
  return fallbackEarth;
}

/* -------------------------------------------------------------------------- */
/* Binary digit strip for the RF beam                                         */
/* -------------------------------------------------------------------------- */

let digitTexture: THREE.Texture | null = null;

/**
 * A strip of glowing 0/1 glyphs on transparent background. Sampled by the
 * beam shader along the beam length; two offset passes make the digits
 * appear to stream up and down.
 */
export function makeDigitTexture(): THREE.Texture {
  if (digitTexture) return digitTexture;
  const made = makeCanvas(512, 64);
  if (!made) return (digitTexture = blankTexture());
  const { c, ctx } = made;

  ctx.clearRect(0, 0, 512, 64);
  ctx.font = "700 44px ui-monospace, 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const glyphs = 16;
  const cell = 512 / glyphs;
  for (let i = 0; i < glyphs; i++) {
    const bit = Math.random() < 0.5 ? "0" : "1";
    const x = cell * i + cell / 2;
    ctx.shadowColor = "rgba(255,122,26,0.9)";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "rgba(255,226,190,0.98)";
    ctx.fillText(bit, x, 32);
    ctx.shadowBlur = 0;
    ctx.fillText(bit, x, 32);
  }

  digitTexture = new THREE.CanvasTexture(c);
  digitTexture.colorSpace = THREE.SRGBColorSpace;
  digitTexture.minFilter = THREE.LinearFilter;
  digitTexture.generateMipmaps = false;
  return digitTexture;
}

/* -------------------------------------------------------------------------- */
/* Satellite tooltip                                                           */
/* -------------------------------------------------------------------------- */

const tooltipCache = new Map<number, THREE.Texture>();

/** Small dark card with a satellite's readouts, shown as a billboard sprite. */
export function makeTooltipTexture(satId: number): THREE.Texture {
  const cached = tooltipCache.get(satId);
  if (cached) return cached;

  const made = makeCanvas(256, 112);
  if (!made) return blankTexture();
  const { c, ctx } = made;
  const sat = SATS[satId];

  ctx.clearRect(0, 0, 256, 112);
  ctx.fillStyle = "rgba(4,10,20,0.82)";
  roundRect(ctx, 2, 2, 252, 108, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(61,219,217,0.5)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, 2, 2, 252, 108, 10);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 17px ui-monospace, 'JetBrains Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillText(`SAT #${String(sat.id).padStart(3, "0")}`, 14, 26);

  ctx.font = "500 13px ui-monospace, 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  const lines = [
    `ALT  ${Math.round(sat.aKm - 6371)} km`,
    `SPD  ${(sat.aKm * sat.n).toFixed(2)} km/s`,
    `LINKS  4`,
  ];
  lines.forEach((line, i) => ctx.fillText(line, 14, 50 + i * 20));

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tooltipCache.set(satId, tex);
  return tex;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* -------------------------------------------------------------------------- */
/* Soft glow sprite                                                           */
/* -------------------------------------------------------------------------- */

let glowTexture: THREE.Texture | null = null;

/** Radial white glow for the gateway and internet node. */
export function makeGlowTexture(): THREE.Texture {
  if (glowTexture) return glowTexture;
  const made = makeCanvas(128, 128);
  if (!made) return (glowTexture = blankTexture());
  const { c, ctx } = made;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.25, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  glowTexture = new THREE.CanvasTexture(c);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}
