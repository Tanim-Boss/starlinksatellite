import * as THREE from "three";

/**
 * Small procedural textures for the dish lab.
 *
 * All of them are generated once and cached: the binary labels are the only
 * ones created on demand (there are at most 16 distinct four-bit words), so
 * steering the beam never allocates a texture per frame.
 */

function canvas(size: number): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
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
/* Contact shadow                                                             */
/* -------------------------------------------------------------------------- */

let shadowTexture: THREE.Texture | null = null;

/** A soft, dark ellipse so the tripod sits on the ground instead of floating. */
export function makeShadowTexture(): THREE.Texture {
  if (shadowTexture) return shadowTexture;
  const made = canvas(256);
  if (!made) return (shadowTexture = blankTexture());
  const { c, ctx } = made;
  const g = ctx.createRadialGradient(128, 128, 6, 128, 128, 128);
  g.addColorStop(0, "rgba(0,0,0,0.92)");
  g.addColorStop(0.45, "rgba(0,0,0,0.55)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  shadowTexture = new THREE.CanvasTexture(c);
  return shadowTexture;
}

/* -------------------------------------------------------------------------- */
/* Ground sheen                                                               */
/* -------------------------------------------------------------------------- */

let sheenTexture: THREE.Texture | null = null;

/** A faint pool of cold light where the terminal stands. */
export function makeSheenTexture(): THREE.Texture {
  if (sheenTexture) return sheenTexture;
  const made = canvas(512);
  if (!made) return (sheenTexture = blankTexture());
  const { c, ctx } = made;
  const g = ctx.createRadialGradient(256, 256, 10, 256, 256, 256);
  g.addColorStop(0, "rgba(116,168,214,0.24)");
  g.addColorStop(0.35, "rgba(76,120,168,0.10)");
  g.addColorStop(0.7, "rgba(40,70,110,0.03)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  sheenTexture = new THREE.CanvasTexture(c);
  sheenTexture.colorSpace = THREE.SRGBColorSpace;
  return sheenTexture;
}

/* -------------------------------------------------------------------------- */
/* Solar array                                                                */
/* -------------------------------------------------------------------------- */

let solarTexture: THREE.Texture | null = null;

/** Blue photovoltaic cells with copper interconnects, drawn as a grid. */
export function makeSolarTexture(): THREE.Texture {
  if (solarTexture) return solarTexture;
  if (typeof document === "undefined") return (solarTexture = blankTexture());
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d");
  if (!ctx) return (solarTexture = blankTexture());

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#0a2a5c");
  grad.addColorStop(0.5, "#071c40");
  grad.addColorStop(1, "#040f24");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // Cells.
  const cols = 16;
  const rows = 8;
  const cw = 512 / cols;
  const ch = 256 / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const tone = 0.55 + 0.45 * Math.abs(Math.sin((x * 12.9898 + y * 78.233) * 0.7));
      ctx.fillStyle = `rgba(${Math.round(28 + 26 * tone)}, ${Math.round(80 + 40 * tone)}, ${Math.round(
        150 + 50 * tone,
      )}, 0.95)`;
      ctx.fillRect(x * cw + 1.6, y * ch + 1.6, cw - 3.2, ch - 3.2);
    }
  }

  // Interconnect lines.
  ctx.strokeStyle = "rgba(190,205,225,0.30)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= cols; x++) {
    ctx.beginPath();
    ctx.moveTo(x * cw, 0);
    ctx.lineTo(x * cw, 256);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(220,180,120,0.22)";
  for (let y = 0; y <= rows; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * ch);
    ctx.lineTo(512, y * ch);
    ctx.stroke();
  }

  solarTexture = new THREE.CanvasTexture(c);
  solarTexture.colorSpace = THREE.SRGBColorSpace;
  solarTexture.anisotropy = 4;
  return solarTexture;
}

/* -------------------------------------------------------------------------- */
/* Selection reticle                                                          */
/* -------------------------------------------------------------------------- */

let reticleTexture: THREE.Texture | null = null;

/** Thin ring with four ticks, used as a billboard around the tracked satellite. */
export function makeReticleTexture(): THREE.Texture {
  if (reticleTexture) return reticleTexture;
  const made = canvas(256);
  if (!made) return (reticleTexture = blankTexture());
  const { c, ctx } = made;
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(128, 128, 104, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 5;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112);
    ctx.lineTo(128 + Math.cos(a) * 124, 128 + Math.sin(a) * 124);
    ctx.stroke();
  }
  reticleTexture = new THREE.CanvasTexture(c);
  reticleTexture.colorSpace = THREE.SRGBColorSpace;
  return reticleTexture;
}

/* -------------------------------------------------------------------------- */
/* Binary phase words                                                         */
/* -------------------------------------------------------------------------- */

const codeTextures = new Map<string, THREE.Texture>();

/**
 * One canvas per distinct four-bit word. The word is drawn in a warm amber so
 * it reads as part of the wavefront, not as UI pasted over the scene.
 */
export function makeCodeTexture(code: string): THREE.Texture {
  const cached = codeTextures.get(code);
  if (cached) return cached;
  if (typeof document === "undefined") return blankTexture();

  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 96;
  const ctx = c.getContext("2d");
  if (!ctx) return blankTexture();

  ctx.clearRect(0, 0, 256, 96);
  ctx.font = "600 58px 'JetBrains Mono', ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(255,106,20,0.95)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "rgba(255,214,168,0.98)";
  ctx.fillText(code, 128, 52);
  // A second pass without the blur keeps the glyphs crisp under the glow.
  ctx.shadowBlur = 0;
  ctx.fillText(code, 128, 52);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  codeTextures.set(code, tex);
  return tex;
}
