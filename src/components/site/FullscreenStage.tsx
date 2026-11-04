import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";

/**
 * Full-screen support for the simulations.
 *
 * Uses the standard Fullscreen API. Browsers that do not expose it (or that
 * refuse the request — an iframe without `allow="fullscreen"`, an untrusted
 * gesture) fall back to a fixed overlay that covers the viewport, so the
 * control always does something. `hasNative` reports which mode is in use.
 *
 * The stage's inner scene container carries the `fs-fill` class so the CSS in
 * index.css can stretch it in either mode.
 */

export function useFullscreen<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasNative, setHasNative] = useState(false);

  // Detect support after mount: refs are empty during render.
  useEffect(() => {
    const el = ref.current;
    setHasNative(typeof el?.requestFullscreen === "function" && document.fullscreenEnabled === true);
  }, []);

  // Track native fullscreen changes (also catches Esc and browser UI exits).
  useEffect(() => {
    const onChange = () => {
      const el = ref.current;
      setIsFullscreen(Boolean(el && document.fullscreenElement === el));
    };
    document.addEventListener("fullscreenchange", onChange);
    onChange();
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Esc also leaves the fallback overlay.
  useEffect(() => {
    if (hasNative || !isFullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasNative, isFullscreen]);

  const toggle = useCallback(async () => {
    const el = ref.current;
    if (!el) return;

    if (typeof el.requestFullscreen !== "function" || document.fullscreenEnabled !== true) {
      setIsFullscreen((value) => !value);
      return;
    }

    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      // The request was refused (permissions policy, not a user gesture):
      // still honour the click with the overlay fallback.
      setIsFullscreen((value) => !value);
    }
  }, []);

  return { ref, isFullscreen, toggle, hasNative };
}

/** Classes to put on the stage wrapper element. */
export function fsStageClass(isFullscreen: boolean, hasNative: boolean, className?: string) {
  return cn("fs-stage", isFullscreen && !hasNative && "is-fs", className);
}

/** The chip-style button used on the simulation stages. */
export function FullscreenButton({
  onClick,
  active,
  className,
}: {
  onClick: () => void;
  active: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={active ? "Exit full view (Esc)" : "Show the simulation full screen"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em] backdrop-blur transition-colors",
        active
          ? "border-signal/45 bg-signal/15 text-signal"
          : "border-white/12 bg-[#040a14]/70 text-muted hover:border-white/30 hover:text-white",
        className,
      )}
    >
      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" aria-hidden>
        {active ? (
          <path
            d="M4.5 1.5v3h-3M7.5 1.5v3h3M4.5 10.5v-3h-3M7.5 10.5v-3h3"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M1.5 4.5v-3h3M10.5 4.5v-3h-3M1.5 7.5v3h3M10.5 7.5v3h-3"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
      {active ? "Exit full view" : "Full view"}
    </button>
  );
}
