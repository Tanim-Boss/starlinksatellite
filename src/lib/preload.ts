/**
 * Route chunk prefetching.
 *
 * The app is code-split, which makes the first paint fast but leaves a short
 * wait the first time a page is opened. These helpers close that gap without
 * giving the benefit back: the text-heavy pages are prefetched during an idle
 * slot, and the two heavy interactive pages (which pull three.js) are only
 * prefetched when the visitor hovers or focuses their link.
 */

const LIGHT_ROUTES = ["/how-it-works", "/numbers", "/faq"] as const;

type Preloadable = () => Promise<unknown>;

const loaders: Record<string, Preloadable> = {
  "/": () => import("@/pages/Home"),
  "/how-it-works": () => import("@/pages/HowItWorks"),
  "/antenna": () => import("@/pages/DishLab"),
  "/explorer": () => import("@/pages/Explorer"),
  "/numbers": () => import("@/pages/Numbers"),
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
 * Warms the three text-heavy pages once the current page has settled.
 * Explorer and the dish lab are excluded on purpose: they carry three.js and
 * should not be downloaded for visitors who never open them.
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
