import { useEffect, useRef, useState } from "react";

/** True only while the scene is in view and the browser tab is visible. */
export function useActivity(rootMargin = "120px") {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState !== "hidden",
  );

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.find((candidate) => candidate.target === element);
        if (entry) setInView(entry.isIntersecting);
      },
      { rootMargin, threshold: 0 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin]);

  useEffect(() => {
    const update = () => setTabVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", update);
    update();
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  return { ref, active: inView && tabVisible };
}
