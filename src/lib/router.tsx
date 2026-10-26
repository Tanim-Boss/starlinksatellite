import { useCallback, useEffect, useState, type ReactNode } from "react";

/**
 * Tiny hash router. Routes look like `#/how-it-works` and optional in-page
 * targets `#/how-it-works@lasers`. Using the hash keeps the site a static
 * bundle with no server-side routing, so deep links still work anywhere it is
 * hosted (including file://).
 */

export interface Route {
  /** Always starts with "/". */
  path: string;
  /** Optional element id to scroll to after the page renders. */
  section: string | null;
}

function readHash(): Route {
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw || raw === "/") return { path: "/", section: null };
  const [path, section] = raw.split("@");
  return { path: path.startsWith("/") ? path : `/${path}`, section: section || null };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    typeof window === "undefined" ? { path: "/", section: null } : readHash(),
  );

  useEffect(() => {
    const onChange = () => setRoute(readHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}

export function href(path: string, section?: string): string {
  return `#${path}${section ? `@${section}` : ""}`;
}

export function scrollToSection(section: string) {
  const el = document.getElementById(section);
  if (!el) return false;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  return true;
}

/** Navigate to a route, optionally scrolling to an element id inside it. */
export function navigate(path: string, section?: string) {
  const next = href(path, section);
  if (window.location.hash === next) {
    if (section) scrollToSection(section);
    else window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  window.location.hash = next;
}

export function useNavigate() {
  return useCallback((path: string, section?: string) => navigate(path, section), []);
}

interface LinkProps {
  to: string;
  section?: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}

/** In-site link that keeps hash-routing semantics and scrolls to sections. */
export function Link({ to, section, className, children, onClick, ariaLabel }: LinkProps) {
  return (
    <a
      href={href(to, section)}
      className={className}
      aria-label={ariaLabel}
      onClick={() => {
        onClick?.();
        if (to === readHash().path && section) {
          // Same page: the hash may not change, so scroll manually.
          requestAnimationFrame(() => scrollToSection(section));
        }
      }}
    >
      {children}
    </a>
  );
}
