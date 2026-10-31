import { FaqAccordion } from "@/components/site/FaqAccordion";
import { CHAPTERS, SOURCES } from "@/lib/content";
import { Eyebrow, LinkArrow, Reveal, Section } from "@/components/site/primitives";
import { Link } from "@/lib/router";
import { NextPageCTA } from "@/components/home/HomeSections";

export function Faq() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/[0.06] pt-28 md:pt-36">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" aria-hidden />
        <div className="page-shell relative pb-12">
          <Reveal>
            <Eyebrow>FAQ</Eyebrow>
            <h1 className="mt-5 max-w-3xl text-[clamp(2.2rem,5.4vw,3.8rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-white">
              Questions, answered.
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted md:text-[17px]">
              The things people actually want to know about satellite internet — without the
              marketing.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="page-shell py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-16">
          <aside>
            <div className="lg:sticky lg:top-28">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
                Jump to a chapter
              </p>
              <nav className="mt-4 space-y-0.5">
                {CHAPTERS.slice(0, 5).map((c) => (
                  <Link
                    key={c.id}
                    to="/how-it-works"
                    section={c.id}
                    className="flex items-baseline gap-2.5 rounded-md px-2 py-1.5 text-[12px] text-muted transition-colors hover:text-signal"
                  >
                    <span className="font-mono text-[9px] text-faint">{c.num}</span>
                    {c.short}
                  </Link>
                ))}
                <Link
                  to="/how-it-works"
                  className="mt-1 flex items-center gap-1.5 px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-signal hover:text-white"
                >
                  All chapters →
                </Link>
              </nav>
              <div className="mt-8 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <p className="text-[11.5px] leading-relaxed text-muted">
                  This site is an independent explainer. It is not affiliated with SpaceX and does
                  not use live telemetry.
                </p>
                <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
                  Figures as of October 2026
                </p>
              </div>
            </div>
          </aside>

          <div>
            <Reveal>
              <h2 className="sr-only">Frequently asked questions</h2>
              <FaqAccordion defaultOpen={0} />
            </Reveal>

            <Reveal delay={80} className="mt-12">
              <div className="rounded-2xl border border-white/[0.08] bg-[#060b16] p-6">
                <h2 className="text-sm font-semibold text-white">Sources & how to check us</h2>
                <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-muted">
                  Constellation counts and altitudes move constantly. For anything where precision
                  matters, go to the primary sources — the independent satellite census from
                  Jonathan McDowell is the usual reference for launch and orbit counts, and FCC
                  filings are where the orbital parameters and spectrum actually live.
                </p>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {SOURCES.map((s) => (
                    <li key={s.href}>
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="group block rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition-colors hover:border-signal/40"
                      >
                        <span className="flex items-center gap-1.5 text-[12.5px] text-ink group-hover:text-signal">
                          {s.label}
                          <span className="text-[9px] text-faint">↗</span>
                        </span>
                        <span className="mt-1 block text-[11px] leading-relaxed text-faint">
                          {s.note}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <div className="mt-8 flex flex-wrap gap-6">
              <LinkArrow href="#/how-it-works">Read the full explainer</LinkArrow>
              <LinkArrow href="#/comparison">Compare the satellite systems</LinkArrow>
            </div>
          </div>
        </div>
      </div>

      <Section className="pb-16 pt-0">
        <Reveal>
          <NextPageCTA
            eyebrow="One more thing"
            title="See the broadcast-to-internet difference."
            body="Follow a guided 3D comparison from a fixed GEO television dish to a moving LEO constellation."
            to="/comparison"
            cta="Open the comparison"
          />
        </Reveal>
      </Section>
    </>
  );
}
