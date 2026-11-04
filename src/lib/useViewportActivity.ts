import { useEffect, useState, type RefObject } from "react";

/**
 * True while `ref` is near the viewport *and* the tab is visible.
 *
 * Animated figures use this to park their requestAnimationFrame loop when
 * nobody can see them. On a long page (the overview and the nine-chapter
 * explainer each mount several animated SVGs) looping every figure at 60 fps
 * forever is enough main-thread work to make scrolling stutter and to make the
 * page feel like it has not rendered properly.
 *
 * Defaults to `true` when the browser has no IntersectionObserver: figures then
 * behave exactly as before rather than freezing.
 */
export function useViewportActive(
  ref: RefObject<HTMLElement | null>,
  rootMargin = "160px",
): boolean {
  const [inView, setInView] = useState(true);
  const [visible, setVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState !== "hidden",
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setInView(entry.isIntersecting);
      },
      { rootMargin, threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onChange = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onChange);
    onChange();
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return inView && visible;
}
