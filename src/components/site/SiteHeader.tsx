import { useEffect, useRef, useState, type ReactNode } from "react";
import { HOME_NAV, NAV_GROUPS } from "@/lib/content";
import { Link, useRoute } from "@/lib/router";
import { cn } from "@/utils/cn";

function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="relative flex h-8 w-8 items-center justify-center rounded-[10px] border border-signal/40 bg-linear-to-br from-signal/20 to-beam/10">
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
      <span className="leading-none">
        <span className="block text-[13px] font-semibold tracking-[0.02em] text-white">
          Learning Lab
        </span>
        <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.2em] text-faint">
          Satellite · Network
        </span>
      </span>
    </span>
  );
}

/**
 * One top-level menu: a button that opens a panel of that project's pages.
 * Works with the mouse (hover or click) and with the keyboard (Enter/Space to
 * open, Tab into the list, Escape to close).
 */
function NavMenu({
  label,
  bn,
  to,
  active,
  children,
}: {
  label: string;
  bn: string;
  to: string;
  active: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setOpen(false);
  }, [to]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  return (
    <div
      className="relative flex items-center"
      ref={wrapRef}
      onPointerEnter={() => {
        window.clearTimeout(closeTimer.current);
        setOpen(true);
      }}
      onPointerLeave={() => {
        // A short grace period so moving the pointer into the panel does not
        // slam it shut.
        closeTimer.current = window.setTimeout(() => setOpen(false), 140);
      }}
    >
      <Link
        to={to}
        className={cn(
          "relative rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors",
          active ? "text-white" : "text-muted hover:text-white",
        )}
        ariaLabel={`${label} — ${bn}`}
      >
        {label}
        {active && (
          <span className="pointer-events-none absolute inset-x-3 -bottom-px h-px bg-linear-to-r from-transparent via-signal to-transparent" />
        )}
      </Link>

      {/* Separate from the link: an interactive control cannot live inside <a>. */}
      <button
        type="button"
        aria-expanded={open}
        aria-label={`${label} পৃষ্ঠাগুলো দেখাও`}
        onClick={() => setOpen((value) => !value)}
        className="-ml-1.5 rounded-full p-1.5 text-faint transition-colors hover:text-signal"
      >
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" aria-hidden>
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("transition-transform duration-200", open && "rotate-180")}
          />
        </svg>
      </button>

      <div
        hidden={!open}
        className="absolute left-0 top-[calc(100%+10px)] z-50 w-[min(24rem,80vw)] overflow-hidden rounded-2xl border border-white/10 bg-[#070c16]/97 p-2 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl"
      >
        <p className="bangla px-3 pb-2 pt-2 text-[11.5px] text-faint">{bn}</p>
        <div className="max-h-[60vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const { path } = useRoute();
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Scroll handlers fire dozens of times a second. Reading layout and
    // re-rendering the nav on every event is what makes a long page feel
    // heavy, so measure at most once per frame and only update the bar when
    // the rounded percentage actually changes.
    let frame = 0;
    const read = () => {
      frame = 0;
      const y = window.scrollY;
      setScrolled(y > 12);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const next = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      setProgress((previous) => (Math.abs(previous - next) < 0.005 ? previous : next));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [path]);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  // Cross-link the two projects: from the network lab offer the satellite one,
  // and the other way round.
  const inNetwork = path.startsWith("/network");
  const cross = inNetwork
    ? { to: "/satellite", label: "Satellite lab" }
    : { to: "/network", label: "নেটওয়ার্ক ল্যাব" };

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          "transition-colors duration-300",
          scrolled
            ? "border-b border-white/[0.08] bg-[#04060d]/88 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="page-shell flex h-16 items-center justify-between gap-4">
          <Link to="/" ariaLabel="Learning Lab — হোম" className="shrink-0">
            <Wordmark />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            <Link
              to={HOME_NAV.path}
              className={cn(
                "rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors",
                path === HOME_NAV.path ? "text-white" : "text-muted hover:text-white",
              )}
            >
              {HOME_NAV.label}
            </Link>
            {NAV_GROUPS.map((group) => (
              <NavMenu
                key={group.id}
                label={group.label}
                bn={group.bn}
                to={group.path}
                active={path === group.path || group.children.some((child) => child.path === path)}
              >
                {group.children.map((child) => (
                  <Link
                    key={child.path}
                    to={child.path}
                    className={cn(
                      "block rounded-xl px-3 py-2 transition-colors hover:bg-white/[0.06]",
                      path === child.path ? "bg-white/[0.05]" : "",
                    )}
                  >
                    <span
                      className={cn(
                        "bangla block text-[13px] leading-snug",
                        path === child.path ? "text-signal" : "text-ink",
                      )}
                    >
                      {child.label}
                    </span>
                    {child.note && (
                      <span className="bangla mt-0.5 block text-[11px] leading-snug text-faint">
                        {child.note}
                      </span>
                    )}
                  </Link>
                ))}
              </NavMenu>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to={cross.to}
              className={cn(
                "hidden items-center gap-2 rounded-full border px-4 py-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] transition-all lg:inline-flex",
                inNetwork
                  ? "border-[#ff7a1a]/40 bg-[#ff7a1a]/10 text-[#ffb27a] hover:border-[#ff7a1a] hover:bg-[#ff7a1a]/20 hover:text-white"
                  : "border-signal/40 bg-signal/10 text-signal hover:border-signal hover:bg-signal/20 hover:text-white",
              )}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-blink rounded-full bg-current opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
              </span>
              {cross.label}
            </Link>

            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-ink transition-colors hover:border-white/35 md:hidden"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden>
                {open ? (
                  <path
                    d="M5 5l10 10M15 5L5 15"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                ) : (
                  <path
                    d="M3 6h14M3 10h14M3 14h14"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
        <div className="h-px w-full bg-white/[0.04]">
          <div
            className="h-px bg-linear-to-r from-signal/60 to-beam/60 transition-[width] duration-150"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Mobile sheet */}
      <div
        className={cn(
          "overflow-hidden border-b border-white/10 bg-[#04060d]/97 backdrop-blur-xl transition-all duration-300 md:hidden",
          open ? "max-h-[80vh] overflow-y-auto" : "max-h-0 border-transparent",
        )}
      >
        <nav className="page-shell flex flex-col py-3" aria-label="Mobile navigation">
          <Link
            to={HOME_NAV.path}
            onClick={() => setOpen(false)}
            className={cn(
              "bangla flex items-center justify-between border-b border-white/5 py-3.5 text-sm",
              path === HOME_NAV.path ? "text-signal" : "text-ink",
            )}
          >
            {HOME_NAV.label}
            <span className="font-mono text-[10px] text-faint">↗</span>
          </Link>
          {NAV_GROUPS.map((group) => (
            <div key={group.id} className="border-b border-white/5">
              <Link
                to={group.path}
                onClick={() => setOpen(false)}
                className={cn(
                  "bangla flex items-center justify-between py-3.5 text-sm font-medium",
                  path === group.path ? "text-signal" : "text-white",
                )}
              >
                {group.bn} <span className="font-mono text-[10px] text-faint">{group.label}</span>
              </Link>
              <div className="pb-3 pl-3">
                {group.children.map((child) => (
                  <Link
                    key={child.path}
                    to={child.path}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "bangla block border-l border-white/10 py-2 pl-3 text-[12.5px] leading-snug",
                      path === child.path ? "border-signal/60 text-signal" : "text-muted",
                    )}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </header>
  );
}
