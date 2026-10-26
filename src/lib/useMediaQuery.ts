import { useCallback, useEffect, useState } from "react";

/**
 * Read a media query when the browser supports it. `matchMedia` is missing in
 * some embedded/older browsers and can throw in restricted webviews; neither
 * case should prevent the guide itself from rendering.
 */
function getMediaQueryList(query: string): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  try {
    return window.matchMedia(query);
  } catch {
    return null;
  }
}

/** SSR-safe media query hook with a safe default for limited browser APIs. */
export function useMediaQuery(query: string, fallback = false): boolean {
  const get = useCallback(() => getMediaQueryList(query)?.matches ?? fallback, [query, fallback]);
  const [matches, setMatches] = useState(get);

  useEffect(() => {
    const mq = getMediaQueryList(query);
    if (!mq) {
      setMatches(fallback);
      return;
    }

    const onChange = () => setMatches(mq.matches);
    onChange();

    // addEventListener replaced the older MediaQueryList listener API, but a
    // number of embedded browsers still only implement addListener.
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }

    mq.addListener?.(onChange);
    return () => mq.removeListener?.(onChange);
  }, [query, fallback]);

  return matches;
}

export function useReducedMotion(): boolean {
  // If the preference cannot be queried, default to the less animated state.
  return useMediaQuery("(prefers-reduced-motion: reduce)", true);
}
