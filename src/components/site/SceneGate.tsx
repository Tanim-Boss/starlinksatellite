import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { resetWebGLSupport, supportsWebGL } from "@/lib/webgl";
import { cn } from "@/utils/cn";
import { ErrorBoundary } from "./ErrorBoundary";

/* -------------------------------------------------------------------------- */
/* Deferred mounting                                                          */
/* -------------------------------------------------------------------------- */

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * True once the element has come near the viewport *and* the browser has a
 * spare moment. Keeps the three.js + WebGL start-up (and the ~700 kB of engine
 * code behind it) off the critical path, so text, images and navigation paint
 * first instead of waiting behind a canvas that may be below the fold.
 */
function useReadyToRender(ref: RefObject<HTMLElement | null>, rootMargin: string) {
  const [inView, setInView] = useState(false);
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    // Safety net: a hidden or zero-height ancestor must not strand the scene.
    const fallback = window.setTimeout(() => setInView(true), 1500);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, [ref, rootMargin]);

  useEffect(() => {
    if (!inView) return;
    const w = window as IdleWindow;
    let cancelled = false;
    let raf = 0;
    let cancel: (() => void) | undefined;

    const start = () => {
      if (!cancelled) setIdle(true);
    };

    // One frame for the first paint, then an idle slot (with a hard timeout so
    // a busy page still gets its canvas).
    raf = requestAnimationFrame(() => {
      if (typeof w.requestIdleCallback === "function") {
        const handle = w.requestIdleCallback(start, { timeout: 700 });
        cancel = () => w.cancelIdleCallback?.(handle);
      } else {
        const handle = window.setTimeout(start, 60);
        cancel = () => window.clearTimeout(handle);
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      cancel?.();
    };
  }, [inView]);

  return inView && idle;
}

/* -------------------------------------------------------------------------- */
/* Placeholders                                                               */
/* -------------------------------------------------------------------------- */

/** Shown while the engine is on its way in. */
function SceneLoading({ caption, poster }: { caption: string; poster?: ReactNode }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#04070f]"
      aria-hidden
    >
      {poster ?? (
        <div className="flex flex-col items-center gap-3">
          <svg viewBox="0 0 44 44" className="h-10 w-10" fill="none">
            <circle cx="22" cy="22" r="9" stroke="#3ddbd9" strokeOpacity="0.5" strokeWidth="1.2" />
            <ellipse
              cx="22"
              cy="22"
              rx="18"
              ry="7"
              stroke="#9fe8ff"
              strokeOpacity="0.35"
              strokeWidth="1"
              transform="rotate(-24 22 22)"
            />
            <circle cx="22" cy="22" r="2.2" fill="#3ddbd9" fillOpacity="0.7" />
          </svg>
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-faint">{caption}</span>
        </div>
      )}
    </div>
  );
}

/** Shown when the page cannot have a 3D scene at all, or it stopped working. */
function SceneUnavailable({
  title,
  body,
  onRetry,
}: {
  title: string;
  body: string;
  onRetry?: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#04070f] px-6 py-8">
      <div className="max-w-sm text-center">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-warn">3D view off</p>
        <p className="mt-2 text-[13px] font-medium leading-snug text-ink">{title}</p>
        <p className="mt-2 text-[11.5px] leading-relaxed text-muted">{body}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-full border border-signal/40 bg-signal/10 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-signal transition-colors hover:border-signal hover:bg-signal/20 hover:text-white"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Gate                                                                       */
/* -------------------------------------------------------------------------- */

interface SceneGateProps {
  /** The `<Canvas>` (and its scene) to mount. */
  children: ReactNode;
  /** Extra classes for the sizing wrapper. */
  className?: string;
  /** Caption under the loading mark. */
  caption?: string;
  /** Custom loading art (e.g. a globe silhouette behind the hero). */
  poster?: ReactNode;
  /** Copy for the "no WebGL here" state. */
  unavailableTitle?: string;
  unavailableBody?: string;
  /** How far outside the viewport the scene may be before it starts. */
  rootMargin?: string;
}

/**
 * Mounts a three.js canvas only when it is actually needed, and never lets it
 * break the page: while it loads it shows a placeholder, if WebGL is missing it
 * shows a short explanation, and if the scene throws or the GPU drops the
 * context it is swapped out instead of blanking the site. Both failure states
 * offer a retry, so a lost context no longer means reloading the page.
 *
 * Render it inside a `relative` element with a real height — it fills that box.
 */
export function SceneGate({
  children,
  className,
  caption = "Preparing the 3D view…",
  poster,
  unavailableTitle = "This device could not start the 3D model.",
  unavailableBody = "The scene needs WebGL, which this browser has turned off or cannot provide. Everything else on this page — the figures, the numbers and the text — still works.",
  rootMargin = "240px",
}: SceneGateProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const ready = useReadyToRender(ref, rootMargin);

  // Probe after mount, never during render: the check touches the DOM and
  // creates a throwaway GL context.
  useEffect(() => {
    setWebgl(supportsWebGL());
  }, []);

  // A GPU reset, a driver update or too many live contexts kills the canvas
  // silently. Listen for it so the box can offer a retry instead of sitting
  // black until the visitor thinks to reload the page.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onLost = (event: Event) => {
      event.preventDefault();
      setContextLost(true);
    };
    const onRestored = () => {
      setContextLost(false);
      setAttempt((value) => value + 1);
    };
    el.addEventListener("webglcontextlost", onLost, true);
    el.addEventListener("webglcontextrestored", onRestored, true);
    return () => {
      el.removeEventListener("webglcontextlost", onLost, true);
      el.removeEventListener("webglcontextrestored", onRestored, true);
    };
  }, []);

  const retry = useCallback(() => {
    resetWebGLSupport();
    setWebgl(supportsWebGL());
    setContextLost(false);
    setAttempt((value) => value + 1);
  }, []);

  return (
    <div ref={ref} className={cn("absolute inset-0 overflow-hidden", className)}>
      {webgl === false ? (
        <SceneUnavailable title={unavailableTitle} body={unavailableBody} onRetry={retry} />
      ) : contextLost ? (
        <SceneUnavailable
          title="The 3D view lost its graphics context."
          body="The graphics driver reset, which happens after a long session, a GPU switch or a driver update. The rest of the page is unaffected."
          onRetry={retry}
        />
      ) : ready ? (
        <ErrorBoundary
          key={attempt}
          label="3D scene"
          fallback={<SceneUnavailable title={unavailableTitle} body={unavailableBody} onRetry={retry} />}
        >
          {children}
        </ErrorBoundary>
      ) : (
        <SceneLoading caption={caption} poster={poster} />
      )}
    </div>
  );
}
