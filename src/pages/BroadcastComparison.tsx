import { lazy, Suspense } from "react";
import { Eyebrow, Reveal } from "@/components/site/primitives";
import { COMPARISON_COPY } from "@/components/SatelliteComparison/copy";

/** Keep the reusable 3D experience out of the article/page entry chunk. */
const SatelliteComparison = lazy(() => import("@/components/SatelliteComparison"));

function ComparisonLoading() {
  return (
    <div className="flex h-full min-h-[620px] items-center justify-center rounded-2xl border border-white/10 bg-[#03050a] text-center">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-signal">Loading the comparison</p>
        <div className="mx-auto mt-3 h-[3px] w-48 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-linear-to-r from-[#ff7a1a] to-[#64d8ff]" />
        </div>
      </div>
    </div>
  );
}

export function BroadcastComparison() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/[0.06] pt-28 md:pt-36">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" aria-hidden />
        <div className="pointer-events-none absolute -right-24 top-8 h-80 w-80 rounded-full bg-[#ff7a1a]/[0.07] blur-3xl" aria-hidden />
        <div className="page-shell relative pb-8">
          <Reveal>
            <Eyebrow>{COMPARISON_COPY.eyebrow}</Eyebrow>
            <h1 className="mt-5 max-w-4xl text-[clamp(2.1rem,5.2vw,3.8rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-white">
              Broadcast TV Satellite
              <br />
              <span className="text-gradient">vs Starlink.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-muted md:text-[16px]">
              {COMPARISON_COPY.subtitle}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                "6 guided stages",
                "GEO · 35,786 km",
                "LEO · ~550 km",
                "78-second tour",
              ].map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.11em] text-muted">
                  {item}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section id="comparison" className="relative scroll-mt-24 py-7 md:py-9">
        <div className="page-shell">
          <div className="overflow-hidden rounded-[18px] border border-white/[0.09] bg-[#02040a] shadow-[0_28px_100px_rgba(0,0,0,.3)]">
            <div className="h-[min(84vh,940px)] min-h-[720px] w-full max-[760px]:h-[86vh] max-[760px]:min-h-[760px]">
              <Suspense fallback={<ComparisonLoading />}>
                <SatelliteComparison />
              </Suspense>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
              Keyboard: ← / → stages · 1–6 jump · T tour · Space pause
            </p>
            <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-faint">
              600 LEO satellites drawn · the operational constellation is much larger
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
