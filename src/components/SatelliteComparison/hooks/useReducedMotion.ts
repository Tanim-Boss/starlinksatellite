import { useEffect, useState } from "react";

/** Standalone, SSR-safe reduced-motion preference for the reusable component. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      setReduced(true);
      return;
    }
    let query: MediaQueryList;
    try {
      query = window.matchMedia("(prefers-reduced-motion: reduce)");
    } catch {
      setReduced(true);
      return;
    }

    const update = () => setReduced(query.matches);
    update();
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    }
    query.addListener?.(update);
    return () => query.removeListener?.(update);
  }, []);

  return reduced;
}
