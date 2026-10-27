import { lazy, Suspense, useEffect, useLayoutEffect, useRef } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ErrorBoundary } from "@/components/site/ErrorBoundary";
import { PAGE_META } from "@/lib/content";
import { LINK } from "@/lib/links";
import { preloadLightRoutes } from "@/lib/preload";
import { scrollToSectionWhenReady, scrollToTop, useRoute } from "@/lib/router";

/*
 * Pages are split into their own chunks. The entry bundle now contains the
 * shell (header, footer, router, copy) and the current route only; the 3D
 * scenes behind /explorer, /antenna and /steering, and the diagrams on the
 * overview and the explainer, arrive after the first paint instead of
 * blocking it. Before this, every visitor downloaded every page and three.js
 * before the tab showed anything, which is why the long pages felt like they
 * needed reloading on a slow connection.
 */
const Home = lazy(() => import("@/pages/Home").then((m) => ({ default: m.Home })));
const HowItWorks = lazy(() => import("@/pages/HowItWorks").then((m) => ({ default: m.HowItWorks })));
const DishLab = lazy(() => import("@/pages/DishLab").then((m) => ({ default: m.DishLab })));
const BeamSteering = lazy(() =>
  import("@/pages/BeamSteering").then((m) => ({ default: m.BeamSteering })),
);
const Explorer = lazy(() => import("@/pages/Explorer").then((m) => ({ default: m.Explorer })));
const Numbers = lazy(() => import("@/pages/Numbers").then((m) => ({ default: m.Numbers })));
const Faq = lazy(() => import("@/pages/Faq").then((m) => ({ default: m.Faq })));


function NotFound() {
  return (
    <section className="page-shell flex min-h-[70vh] flex-col items-start justify-center pt-28">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">404 · lost in orbit</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
        This page isn&apos;t in the constellation.
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
        The link you followed doesn&apos;t exist. Head back to the overview, or start with how the
        system works.
      </p>
      <div className="mt-7 flex gap-3">
        <a
          href={LINK.home}
          className="rounded-full bg-signal px-5 py-2.5 text-[13px] font-semibold text-[#04121a] hover:bg-white"
        >
          Back to the start
        </a>
        <a
          href={LINK.howItWorks}
          className="rounded-full border border-white/15 px-5 py-2.5 text-[13px] text-ink hover:border-signal/50 hover:text-signal"
        >
          How it works
        </a>
      </div>
    </section>
  );
}

/** Skeleton for a route chunk that is still on its way. Never a blank screen. */
function RouteLoading({ label }: { label?: string }) {
  return (
    <div className="page-shell flex min-h-[60vh] flex-col justify-center gap-4 pt-24" aria-busy>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-signal/80">
        {label ?? "Opening the guide"} <span className="animate-blink">·</span>
      </p>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-signal/70" />
      </div>
      <p className="max-w-sm text-[12px] leading-relaxed text-faint">
        Loading this page&apos;s figures. The text appears first; the 3D scenes wait until they are
        needed.
      </p>
    </div>
  );
}

/**
 * Last-resort screen for a page that throws while rendering. Without it React
 * unmounts the whole app and the reader gets a blank tab; with it they keep the
 * header, the footer and a way out.
 */
function PageFallback({ path }: { path: string }) {
  return (
    <section className="page-shell flex min-h-[70vh] flex-col items-start justify-center pt-28">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-warn">
        signal lost · {path}
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
        This view failed to render.
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
        An interactive feature failed while this page was starting. Reloading may clear it. The 3D
        model is optional, so this does not necessarily mean WebGL is blocked; use the navigation
        above to continue if the problem persists.
      </p>
      <div className="mt-7 flex gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full bg-signal px-5 py-2.5 text-[13px] font-semibold text-[#04121a] hover:bg-white"
        >
          Reload the page
        </button>
        <a
          href={LINK.home}
          className="rounded-full border border-white/15 px-5 py-2.5 text-[13px] text-ink hover:border-signal/50 hover:text-signal"
        >
          Back to the start
        </a>
      </div>
    </section>
  );
}

function renderRoute(path: string) {
  switch (path) {
    case "/":
      return <Home />;
    case "/how-it-works":
      return <HowItWorks />;
    case "/antenna":
      return <DishLab />;
    case "/steering":
      return <BeamSteering />;
    case "/explorer":
      return <Explorer />;
    case "/numbers":
      return <Numbers />;
    case "/faq":
      return <Faq />;
    default:
      return <NotFound />;
  }
}

export default function App() {
  const route = useRoute();

  // Hash routing should always start at the top (or at the deep-linked
  // chapter). Browsers otherwise restore the previous scroll position on
  // reload, which lands visitors halfway down a page they have never seen.
  useLayoutEffect(() => {
    if (typeof history !== "undefined" && "scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

  // Keep the tab title and the meta description in step with the route.
  useEffect(() => {
    const meta = PAGE_META[route.path];
    document.title = meta?.title ?? "Page not found — How Starlink Works";
    const description = document.querySelector('meta[name="description"]');
    if (meta && description) description.setAttribute("content", meta.description);
  }, [route.path]);

  // Warm the text-heavy pages once the first screen is idle. They are small;
  // this is what makes the nav feel instant without delaying the first paint.
  useEffect(() => preloadLightRoutes(), []);

  // Scroll to the deep-linked section, or back to the top on a page change.
  // The target is retried for a moment because the route (and its figures) may
  // still be loading when the effect runs.
  const lastPath = useRef(route.path);
  useEffect(() => {
    const pathChanged = lastPath.current !== route.path;
    lastPath.current = route.path;

    if (route.section) {
      // A deep link into another page jumps; a chapter click on the page you
      // are already reading scrolls smoothly.
      return scrollToSectionWhenReady(route.section, pathChanged ? "instant" : undefined);
    }
    scrollToTop();
    return;
  }, [route.path, route.section]);

  return (
    <div className="relative min-h-screen bg-void text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-signal focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#04121a]"
      >
        Skip to content
      </a>

      <SiteHeader />

      <main id="main" key={route.path} className="page-enter">
        <ErrorBoundary
          key={`boundary-${route.path}`}
          label={`page ${route.path}`}
          fallback={<PageFallback path={route.path} />}
        >
          <Suspense fallback={<RouteLoading />}>{renderRoute(route.path)}</Suspense>
        </ErrorBoundary>
      </main>

      <SiteFooter />
      <div className="noise-overlay" aria-hidden />
    </div>
  );
}
