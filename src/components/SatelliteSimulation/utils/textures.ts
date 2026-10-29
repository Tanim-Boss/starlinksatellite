import * as THREE from "three";
import { SATS } from "../hooks/useSimDriver";
import { WORLD_LAND_PATH } from "@/lib/worldPath";

/**
 * Procedural canvas textures for the simulation.
 *
 * The Earth day/night maps ship in `/public/textures/` (see config.ts);
 * everything here is generated so the component works with zero external
 * assets. Textures are built when their owning component mounts and disposed
 * by that component, never rebuilt per frame.
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
/* Fallback Earth                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Geographic stand-in used only if the shipped day map fails to load. The
 * local Natural Earth outlines keep continents in the correct locations.
 */
export function makeFallbackEarthTexture(): THREE.Texture {
  const made = makeCanvas(1024, 512);
  if (!made) return blankTexture();
  const { c, ctx } = made;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#0a2a45");
  grad.addColorStop(0.45, "#0f4c75");
  grad.addColorStop(1, "#082138");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  if (typeof Path2D !== "undefined") {
    ctx.save();
    ctx.scale(1024 / 1000, 512 / 500);
    ctx.fillStyle = "#6f8455";
    ctx.fill(new Path2D(WORLD_LAND_PATH));
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* -------------------------------------------------------------------------- */
/* Binary digit strip for the RF beam                                         */
/* -------------------------------------------------------------------------- */

/**
 * A strip of glowing 0/1 glyphs on transparent background. Sampled by the
 * beam shader along the beam length; two offset passes make the digits
 * appear to stream up and down.
 */
export function makeDigitTexture(): THREE.Texture {
  const made = makeCanvas(512, 64);
  if (!made) return blankTexture();
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

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

/* -------------------------------------------------------------------------- */
/* Satellite tooltip                                                           */
/* -------------------------------------------------------------------------- */

/** Small dark card with a satellite's readouts, shown as a billboard sprite. */
export function makeTooltipTexture(satId: number): THREE.Texture {
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

/** Radial white glow for the gateway and internet node. */
export function makeGlowTexture(): THREE.Texture {
  const made = makeCanvas(128, 128);
  if (!made) return blankTexture();
  const { c, ctx } = made;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.25, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
