import { useEffect, useState } from "react";
import { NAV } from "@/lib/content";
import { Link, useRoute } from "@/lib/router";
import { cn } from "@/utils/cn";

function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="relative flex h-8 w-8 items-center justify-center rounded-[10px] border border-signal/40 bg-gradient-to-br from-signal/20 to-beam/10">
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
          Starlink
        </span>
        <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.2em] text-faint">
          Field guide
        </span>
      </span>
    </span>
  );
}

export function SiteHeader() {
  const { path } = useRoute();
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 12);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, y / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [path]);

  useEffect(() => {
    setOpen(false);
  }, [path]);

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
        <div className="page-shell flex h-16 items-center justify-between gap-6">
          <Link to="/" ariaLabel="Starlink Field Guide — home" className="shrink-0">
            <Wordmark />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active = path === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "relative rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors",
                    active
                      ? "text-white"
                      : "text-muted hover:text-white",
                  )}
                >
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-px h-px bg-gradient-to-r from-transparent via-signal to-transparent" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/explorer"
              className="hidden items-center gap-2 rounded-full border border-signal/40 bg-signal/10 px-4 py-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-signal transition-all hover:border-signal hover:bg-signal/20 hover:text-white lg:inline-flex"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-signal opacity-70 animate-blink" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-signal" />
              </span>
              Live 3D model
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
            className="h-px bg-gradient-to-r from-signal/60 to-beam/60 transition-[width] duration-150"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Mobile sheet */}
      <div
        className={cn(
          "overflow-hidden border-b border-white/10 bg-[#04060d]/97 backdrop-blur-xl transition-all duration-300 md:hidden",
          open ? "max-h-96" : "max-h-0 border-transparent",
        )}
      >
        <nav className="page-shell flex flex-col py-3">
          {NAV.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center justify-between border-b border-white/5 py-3.5 text-sm",
                path === item.path ? "text-signal" : "text-ink",
              )}
            >
              {item.label}
              <span className="font-mono text-[10px] text-faint">↗</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
