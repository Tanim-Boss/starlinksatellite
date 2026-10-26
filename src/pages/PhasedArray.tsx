import { PhasedArrayLab } from "@/components/antenna/PhasedArrayLab";
import { SciencePanel } from "@/components/antenna/SciencePanel";
import { NextPageCTA } from "@/components/home/HomeSections";
import { Eyebrow, LinkArrow, Pill, Reveal } from "@/components/site/primitives";
import { Link } from "@/lib/router";
import { ARRAY_N } from "@/lib/phasedArray";

const BADGES = [
  `${ARRAY_N} × ${ARRAY_N} elements`,
  "12 GHz · d = λ/2",
  "3 moving satellites",
  "3 visualisation modes",
  "7-step experiment",
  "no moving parts",
];

const READ_KEYS = [
  {
    tag: "01",
    title: "Cyan means reinforced",
    body: "Where waves arrive in step, the field adds and the sheet glows cyan. Warm, dim regions are directions where the array cancels itself.",
  },
  {
    tag: "02",
    title: "The cone is a label, not an edge",
    body: "The glowing beam is a simplified envelope around the array factor's main lobe. A real radio beam has no hard visible edge, and this one is drawn far wider than it really is.",
  },
  {
    tag: "03",
    title: "Amber is the true line of sight",
    body: "The dashed amber line points at the selected satellite. The cyan cone is where the beam is steered. Alignment means the two directions coincide within 2.5°.",
  },
];

export function PhasedArray() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/[0.06] pt-28 md:pt-36">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" aria-hidden />
        <div
          className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-signal/[0.08] blur-3xl"
          aria-hidden
        />
        <div className="page-shell relative pb-8">
          <Reveal>
            <Eyebrow>Beam lab · interactive</Eyebrow>
            <h1 className="mt-5 max-w-4xl text-[clamp(2.1rem,5.2vw,3.7rem)] font-semibold leading-[1.03] tracking-[-0.03em] text-white">
              Steering a radio beam
              <br />
              <span className="text-gradient">across the sky.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-muted md:text-[15.5px]">
              A flat panel, 256 antenna elements, and no moving parts. Change the relative phase of
              each element and the beam moves — because the waves interfere. This is the trick behind
              a Starlink-style terminal, built as a physics-based teaching model you can steer.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {BADGES.map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted"
                >
                  {b}
                </span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
              <Link to="/antenna" section="lab">
                <span className="group inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-signal transition-colors hover:text-white">
                  Jump to the simulator
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
              <LinkArrow href="#/antenna@science">Read the physics</LinkArrow>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-warn/20 bg-warn/[0.04] px-4 py-2.5">
              <Pill tone="amber">Educational simulation</Pill>
              <p className="text-[10.5px] leading-relaxed text-muted">
                Not a live Starlink control system, not telemetry, and not proprietary firmware. The
                phase model is textbook array theory; the scene, satellite tracks and visual scale
                are simplified and labelled as such.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <PhasedArrayLab />

      <section className="border-t border-white/[0.06] py-10 md:py-12">
        <div className="page-shell">
          <div className="grid gap-3 md:grid-cols-3">
            {READ_KEYS.map((k) => (
              <div
                key={k.tag}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] text-signal/80">{k.tag}</span>
                  <span className="h-px flex-1 bg-white/10" />
                  <span className="font-mono text-[7.5px] uppercase tracking-[0.12em] text-faint">
                    how to read it
                  </span>
                </div>
                <h3 className="mt-2 text-[12.5px] font-medium text-white">{k.title}</h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{k.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SciencePanel />

      <section className="pb-16 md:pb-20">
        <div className="page-shell">
          <Reveal>
            <NextPageCTA
              eyebrow="Next"
              title="See where the beam lands in the constellation."
              body="The 3D explorer zooms out from this one panel to the full shell: thousands of satellites on real shell parameters, the ground stations they talk to, and the laser links between them."
              to="/explorer"
              cta="Open the 3D explorer"
            />
          </Reveal>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <LinkArrow href="#/how-it-works@terminal">Read about the terminal</LinkArrow>
            <LinkArrow href="#/antenna@assumptions">Assumptions &amp; limits</LinkArrow>
          </div>
        </div>
      </section>
    </>
  );
}
