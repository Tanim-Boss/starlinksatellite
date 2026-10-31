/**
 * Route chunk prefetching.
 *
 * The app is code-split, which makes the first paint fast but leaves a short
 * wait the first time a page is opened. Text-heavy routes are prefetched during
 * an idle slot; the two interactive 3D routes are only prefetched when a
 * visitor hovers or focuses their link.
 */

const LIGHT_ROUTES = ["/how-it-works", "/faq"] as const;

type Preloadable = () => Promise<unknown>;

const loaders: Record<string, Preloadable> = {
  "/": () => import("@/pages/OrbitLab"),
  "/how-it-works": () => import("@/pages/HowItWorks"),
  "/simulation": () => import("@/pages/SatelliteSim"),
  "/comparison": () => import("@/pages/BroadcastComparison"),
  "/faq": () => import("@/pages/Faq"),
};

/** Starts fetching a route chunk. Safe to call repeatedly; the browser caches. */
export function preloadRoute(path: string): void {
  const load = loaders[path];
  if (!load) return;
  // A failed prefetch is not an error: the real navigation will retry and the
  // error boundary has the final say.
  void load().catch(() => {});
}

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * Warms the text-heavy pages once the current page has settled. The 3D
 * simulations are excluded so visitors who never open them do not download
 * the WebGL scene chunks.
 */
export function preloadLightRoutes(): () => void {
  if (typeof window === "undefined") return () => {};
  const w = window as IdleWindow;
  let cancelled = false;
  let handle: number | undefined;

  const run = () => {
    if (cancelled) return;
    for (const path of LIGHT_ROUTES) preloadRoute(path);
  };

  const timer = window.setTimeout(() => {
    if (typeof w.requestIdleCallback === "function") {
      handle = w.requestIdleCallback(run, { timeout: 2500 });
    } else {
      run();
    }
  }, 1000);

  return () => {
    cancelled = true;
    window.clearTimeout(timer);
    if (handle !== undefined) {
      w.cancelIdleCallback?.(handle);
      window.clearTimeout(handle);
    }
  };
}
