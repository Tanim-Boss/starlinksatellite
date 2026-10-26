import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";

/**
 * Full-view support for the simulations.
 *
 * Uses the native Fullscreen API when the browser has one; otherwise (iOS
 * Safari) it falls back to a fixed overlay that covers the viewport. The
 * stage's inner scene container should carry the `fs-fill` class so the CSS
 * in index.css can stretch it to the full height in either mode.
 */

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => void;
};

export function useFullscreen<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasNative, setHasNative] = useState(true);

  // Detect support once, after mount.
  useEffect(() => {
    const el = ref.current as FullscreenElement | null;
    if (!el) return;
    const native =
      typeof el.requestFullscreen === "function" || typeof el.webkitRequestFullscreen === "function";
    setHasNative(native);
  }, []);

  // Track native fullscreen changes (also catches Esc / browser UI exits).
  useEffect(() => {
    const doc = document as FullscreenDocument;
    const onChange = () => {
      const el = ref.current;
      setIsFullscreen(Boolean(el && (document.fullscreenElement === el || doc.webkitFullscreenElement === el)));
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  // Esc also leaves the fallback overlay.
  useEffect(() => {
    if (hasNative || !isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasNative, isFullscreen]);

  const toggle = useCallback(() => {
    const el = ref.current as FullscreenElement | null;
    if (!el) return;
    const doc = document as FullscreenDocument;
    const request = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
    if (request) {
      if (document.fullscreenElement || doc.webkitFullscreenElement) {
        (document.exitFullscreen ?? doc.webkitExitFullscreen)?.call(document);
      } else {
        try {
          const result = request() as unknown as Promise<void> | undefined;
          result?.catch?.(() => setIsFullscreen((v) => !v));
        } catch {
          setIsFullscreen((v) => !v);
        }
      }
      return;
    }
    setIsFullscreen((v) => !v);
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
