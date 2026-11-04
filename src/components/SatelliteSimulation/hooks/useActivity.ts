import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Tracks whether the wrapped element is on-screen and the tab is visible.
 *
 * Used to pause the render loop: an off-screen WebGL canvas should cost
 * nothing, and a hidden tab should never spin a rAF loop in the background.
 * Both signals are ANDed together, and the element must actually be
 * intersecting — a zero-area element reports as intersecting, which is why
 * the ratio check is included.
 */
export function useActivity<T extends Element>(): {
  ref: RefObject<T | null>;
  active: boolean;
} {
  const ref = useRef<T>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // No IO support: stay active and let the tab-visibility check alone
      // decide. The Canvas pause is a performance nicety, never a requirement.
      setActive(!document.hidden);
      const onVis = () => setActive(!document.hidden);
      document.addEventListener("visibilitychange", onVis);
      return () => document.removeEventListener("visibilitychange", onVis);
    }

    let intersecting = false;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          intersecting = entry.isIntersecting && entry.intersectionRatio > 0;
        }
        setActive(intersecting && !document.hidden);
      },
      { threshold: [0, 0.25, 1] },
    );
    io.observe(el);

    const onVis = () => setActive(intersecting && !document.hidden);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return { ref, active };
}
