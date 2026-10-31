import * as THREE from "three";

function makeCanvas(width: number, height: number) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  return context ? { canvas, context } : null;
}

/** A small, deterministic alpha texture for the beam's scrolling 0/1 shader. */
export function makeBinaryTexture(): THREE.CanvasTexture | null {
  const made = makeCanvas(512, 96);
  if (!made) return null;
  const { canvas, context } = made;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = "700 36px ui-monospace, SFMono-Regular, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.shadowColor = "rgba(255, 145, 71, 0.92)";
  context.shadowBlur = 12;
  let seed = 7331;
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 16; col += 1) {
      seed = (seed * 16807) % 2147483647;
      const bit = seed % 2 === 0 ? "0" : "1";
      context.fillStyle = row === 0 ? "rgba(255,247,233,0.96)" : "rgba(255,194,139,0.92)";
      context.fillText(bit, 16 + col * 32, 24 + row * 48);
    }
  }
  context.shadowBlur = 0;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

/**
 * Low-contrast procedural cloud layer. The local day/night maps are the Earth
 * surface; this translucent texture supplies a separate drifting cloud shell.
 */
export function makeCloudTexture(): THREE.CanvasTexture | null {
  const made = makeCanvas(1024, 512);
  if (!made) return null;
  const { canvas, context } = made;
  context.clearRect(0, 0, canvas.width, canvas.height);
  let seed = 1947;
  const random = () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };

  context.filter = "blur(10px)";
  for (let index = 0; index < 190; index += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const rx = 16 + random() * 58;
    const ry = 6 + random() * 19;
    const gradient = context.createRadialGradient(x, y, 0, x, y, rx);
    gradient.addColorStop(0, `rgba(255,255,255,${0.12 + random() * 0.14})`);
    gradient.addColorStop(0.55, "rgba(220,236,255,0.08)");
    gradient.addColorStop(1, "rgba(210,228,255,0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(x, y, rx, ry, (random() - 0.5) * 0.9, 0, Math.PI * 2);
    context.fill();
  }
  context.filter = "none";

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  return texture;
}
