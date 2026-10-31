let cachedSupport: boolean | null = null;

/** Probe the WebGL context itself and release it immediately. */
export function supportsWebGL(): boolean {
  if (cachedSupport !== null) return cachedSupport;
  if (typeof document === "undefined") return true;

  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    cachedSupport = Boolean(gl);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    cachedSupport = false;
  }
  return cachedSupport;
}
