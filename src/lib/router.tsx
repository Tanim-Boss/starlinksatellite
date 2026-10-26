import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import { preloadRoute } from "./preload";

/**
 * Tiny hash router. Routes look like `#/how-it-works` and optional in-page
 * targets `#/how-it-works@lasers`. Using the hash keeps the site a static
 * bundle with no server-side routing, so deep links still work anywhere it is
 * hosted (including file://).
 *
 * The current route lives in a tiny external store (read through
 * `useSyncExternalStore`) rather than in per-component state. Every consumer —
 * the app, the header, the pages — sees the same value, and a link click can
 * force a re-read even in webviews that do not deliver `hashchange`.
 */

export interface Route {
  /** Always starts with "/". */
  path: string;
  /** Optional element id to scroll to after the page renders. */
  section: string | null;
}

const HOME: Route = { path: "/", section: null };

function normalizePath(raw: string): string {
  if (!raw || raw === "/") return "/";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  // `/how-it-works/` and `/how-it-works` are the same page.
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") || "/" : withSlash;
}

export function readHash(location?: Pick<Location, "hash">): Route {
  const source = location ?? (typeof window === "undefined" ? null : window.location);
  if (!source) return HOME;
  const raw = source.hash.replace(/^#/, "");
  if (!raw || raw === "/") return HOME;
  const at = raw.indexOf("@");
  const path = at === -1 ? raw : raw.slice(0, at);
  const section = at === -1 ? "" : raw.slice(at + 1);
  let decoded = section;
  try {
    decoded = decodeURIComponent(section);
  } catch {
    /* keep the raw id if it is not valid percent-encoding */
  }
  return { path: normalizePath(path), section: decoded || null };
}

let currentRoute: Route = typeof window === "undefined" ? HOME : readHash();
const listeners = new Set<() => void>();
let listening = false;

function sameRoute(a: Route, b: Route) {
  return a.path === b.path && a.section === b.section;
}

function notify() {
  for (const listener of listeners) listener();
}

/** Re-reads the location and notifies subscribers if the route changed. */
export function refreshRoute(): void {
  const next = readHash();
  if (sameRoute(next, currentRoute)) return;
  currentRoute = next;
  notify();
}

function startListening() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("hashchange", refreshRoute);
  // Some embedded browsers fire popstate but not hashchange when the hash is
  // changed through the history APIs.
  window.addEventListener("popstate", refreshRoute);
}

function subscribe(listener: () => void) {
  startListening();
  listeners.add(listener);
  // Pick up a hash that changed between module evaluation and subscription.
  refreshRoute();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("hashchange", refreshRoute);
      window.removeEventListener("popstate", refreshRoute);
      listening = false;
    }
  };
}

function getSnapshot(): Route {
  return currentRoute;
}

function getServerSnapshot(): Route {
  return HOME;
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function href(path: string, section?: string): string {
  return `#${path}${section ? `@${section}` : ""}`;
}

function prefersReducedMotion(): boolean {
  try {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  } catch {
    return true;
  }
}

/**
 * Runs a scroll with the page's smooth-scroll preference temporarily off.
 *
 * `behavior: "auto"` honours `html { scroll-behavior: smooth }`, so a route
 * change that must jump to the top (or to a deep-linked chapter) would
 * otherwise animate through the whole previous page — which looks exactly like
 * a page that failed to render. Overriding the CSS property for the duration of
 * the call avoids depending on the newer `"instant"` enum value as well.
 */
function scrollImmediately(run: () => void) {
  const html = document.documentElement;
  const previous = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";
  try {
    run();
  } finally {
    html.style.scrollBehavior = previous;
  }
}

/** Jumps to the top of the page without animation. */
export function scrollToTop() {
  scrollImmediately(() => window.scrollTo({ top: 0, behavior: "auto" }));
}

/**
 * Scrolls to an element that already exists. Returns false when it does not.
 * `"instant"` is a jump; the default animates unless reduced motion is set.
 */
export function scrollToSection(section: string, behavior?: ScrollBehavior): boolean {
  const el = document.getElementById(section);
  if (!el) return false;
  const jumping = behavior === "instant" || prefersReducedMotion();
  const apply = () =>
    el.scrollIntoView({ behavior: jumping ? "auto" : "smooth", block: "start" });
  if (jumping) scrollImmediately(apply);
  else apply();
  return true;
}

/**
 * Waits for a section to exist before scrolling to it.
 *
 * Pages are code-split and charts mount progressively, so the element named in
 * `#/how-it-works@lasers` is not always in the DOM on the next frame. Retrying
 * for a moment turns a deep link (or a chapter click) that used to land at the
 * top of the page — and made people reload — into a reliable scroll.
 */
export function scrollToSectionWhenReady(
  section: string,
  behavior?: ScrollBehavior,
  timeoutMs = 2500,
): () => void {
  if (typeof window === "undefined") return () => {};
  if (scrollToSection(section, behavior)) return () => {};

  const start = performance.now();
  let frame = 0;
  let cancelled = false;

  const tick = () => {
    if (cancelled) return;
    if (scrollToSection(section, behavior)) return;
    if (performance.now() - start > timeoutMs) return;
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    cancelAnimationFrame(frame);
  };
}

interface LinkProps {
  to: string;
  section?: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  /**
   * Route whose chunk should be fetched on hover/focus. Defaults to `to`, so
   * pointing at a nav item starts its download before the click.
   */
  preload?: string | false;
}

/** In-site link that keeps hash-routing semantics and scrolls to sections. */
export function Link({ to, section, className, children, onClick, ariaLabel, preload }: LinkProps) {
  const target = preload === false ? null : (preload ?? (section ? null : to));
  const prefetch = useCallback(() => {
    if (target) preloadRoute(target);
  }, [target]);

  const handlePrefetch = useCallback(() => {
    prefetch();
  }, [prefetch]);
  const handleClick = useCallback(() => {
    onClick?.();
    // The browser applies the hash after this handler. Re-read it on the next
    // turn: if hashchange was throttled or dropped (common in in-app
    // browsers), this still swaps the page instead of requiring a reload.
    window.setTimeout(() => {
      refreshRoute();
      if (readHash().path === to && section) scrollToSectionWhenReady(section);
    }, 0);
  }, [to, section, onClick]);

  return (
    <a
      href={href(to, section)}
      className={className}
      aria-label={ariaLabel}
      onClick={handleClick}
      onPointerEnter={handlePrefetch}
      onFocus={handlePrefetch}
    >
      {children}
    </a>
  );
}
