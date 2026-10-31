import { useEffect, useState } from "react";

/**
 * WebGL capability probe, shared by every 3D stage on the site.
 *
 * three.js renders with WebGL 2 only (WebGL 1 support was removed in r163), so
 * the probe asks for a WebGL 2 context — legacy `experimental-webgl` fallbacks
 * only delay the answer. Some browsers and locked-down environments expose the
 * API but refuse the context, so the probe requests a real context and releases
 * it again instead of trusting `typeof WebGL2RenderingContext`.
 *
 * The result is cached for the session: creating a throwaway context is not
 * free, and calling this during render must stay cheap.
 */

let cached: boolean | null = null;

/** True when this browser can hand out a WebGL 2 context. */
export function supportsWebGL(): boolean {
  if (cached !== null) return cached;
  if (typeof document === "undefined") return true;

  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    cached = Boolean(gl);
    // Release the probe context immediately; browsers cap the number of live
    // contexts, and a real stage is about to ask for one.
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    cached = false;
  }

  return cached;
}

/** Drops the cached answer so a retry can ask the browser a second time. */
export function resetWebGLSupport(): void {
  cached = null;
}

/**
 * Reactive form of the probe for components that decide whether to render a
 * `<Canvas>`. Probing happens after mount — not during render — so React can
 * discard or re-run the render without creating throwaway GL contexts.
 *
 * `null` means "not measured yet".
 */
export function useWebGLSupport(): boolean | null {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setSupported(supportsWebGL());
  }, []);

  return supported;
}
