import { useEffect } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Home } from "@/pages/Home";
import { HowItWorks } from "@/pages/HowItWorks";
import { Beam } from "@/pages/Beam";
import { Explorer } from "@/pages/Explorer";
import { Numbers } from "@/pages/Numbers";
import { Faq } from "@/pages/Faq";
import { LINK } from "@/lib/links";
import { scrollToSection, useRoute } from "@/lib/router";

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

export default function App() {
  const route = useRoute();

  // Scroll to top on page change, or to the requested section after render.
  useEffect(() => {
    if (route.section) {
      const t = window.setTimeout(() => scrollToSection(route.section as string), 40);
      return () => window.clearTimeout(t);
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [route.path, route.section]);

  let page;
  switch (route.path) {
    case "/":
      page = <Home />;
      break;
    case "/how-it-works":
      page = <HowItWorks />;
      break;
    case "/beam":
      page = <Beam />;
      break;
    case "/explorer":
      page = <Explorer />;
      break;
    case "/numbers":
      page = <Numbers />;
      break;
    case "/faq":
      page = <Faq />;
      break;
    default:
      page = <NotFound />;
  }

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
        {page}
      </main>

      <SiteFooter />
      <div className="noise-overlay" aria-hidden />
    </div>
  );
}
