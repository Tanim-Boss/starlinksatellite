import { HOME_NAV, NAV_GROUPS, SOURCES } from "@/lib/content";
import { Link } from "@/lib/router";

export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/[0.08] bg-[#03050b]">
      <div className="page-shell py-14 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1.2fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-signal/40 bg-signal/10">
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
                  <circle cx="12" cy="12" r="3.1" fill="#3ddbd9" />
                  <ellipse
                    cx="12"
                    cy="12"
                    rx="9.4"
                    ry="4.2"
                    fill="none"
                    stroke="#9fe8ff"
                    strokeWidth="1.1"
                    strokeOpacity="0.85"
                    transform="rotate(-24 12 12)"
                  />
                  <circle cx="19.4" cy="8.4" r="1.25" fill="#fbbf24" />
                </svg>
              </span>
              <span className="text-sm font-semibold text-white">Orbital Learning Lab</span>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted">
              Two interactive teaching projects in one site: a 3D satellite-internet field guide,
              and a Bangla visual learning lab for computer networks.
            </p>
            <p className="bangla mt-5 max-w-sm text-[12.5px] leading-relaxed text-muted">
              সব সিমুলেশন শিক্ষামূলক — কোনো লাইভ টেলিমেট্রি, আসল সার্ভার বা প্রকৃত নেটওয়ার্ক
              ট্রাফিক ব্যবহার করা হয় না।
            </p>
            <p className="mt-5 font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-faint">
              Not affiliated with SpaceX. Satellite figures approximate, as of October 2026.
            </p>
          </div>

          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
              Projects & pages
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link
                  to={HOME_NAV.path}
                  className="bangla text-sm text-muted transition-colors hover:text-signal"
                >
                  {HOME_NAV.label}
                </Link>
              </li>
              {NAV_GROUPS.map((group) => (
                <li key={group.id}>
                  <Link
                    to={group.path}
                    className="bangla block text-[12.5px] font-semibold text-white transition-colors hover:text-signal"
                  >
                    {group.bn}
                  </Link>
                  <ul className="mt-2 space-y-1.5 border-l border-white/10 pl-3">
                    {group.children.map((item) => (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          className="bangla text-[12px] leading-snug text-muted transition-colors hover:text-signal"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
              Sources & further reading
            </h3>
            <ul className="mt-4 space-y-3">
              {SOURCES.map((s) => (
                <li key={s.href}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group block"
                  >
                    <span className="flex items-center gap-1.5 text-sm text-ink transition-colors group-hover:text-signal">
                      {s.label}
                      <span className="text-[10px] text-faint">↗</span>
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-faint">
                      {s.note}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="hairline my-10" />

        <div className="flex flex-col gap-3 text-[11px] text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            Built as an educational visualisation · orbital model uses published shell parameters,
            not live telemetry.
          </p>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex items-center gap-1.5 self-start font-mono uppercase tracking-[0.16em] text-muted transition-colors hover:text-signal"
          >
            Back to top <span aria-hidden>↑</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
