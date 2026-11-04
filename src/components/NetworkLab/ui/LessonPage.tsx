import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, House } from "lucide-react";
/* The lab's stylesheet: Bengali webfont, SVG diagram furniture, keyframes.
   Imported here (the shell every lab page renders) the way OrbitLab imports
   its own lab.css from LabShell. */
import "../network.css";
import { NETWORK_PAGES, networkNeighbours, type NetworkPage } from "@/lib/network/nav";
import { Eyebrow } from "@/components/site/primitives";
import { Link } from "@/lib/router";
import { cn } from "@/utils/cn";

/**
 * Sticky strip that keeps every lab page one tap away. The wrapper supplies the
 * height of the fixed site header so the strip is never painted behind it.
 */
export function LabNav({ path }: { path: string }) {
  return (
    <div className="pt-16">
      <nav
        aria-label="কম্পিউটার নেটওয়ার্ক ল্যাবের পৃষ্ঠাসমূহ"
        className="sticky top-16 z-30 border-b border-white/[0.07] bg-[#04060d]/92 backdrop-blur-xl"
      >
        <ul className="page-shell flex gap-1.5 overflow-x-auto py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NETWORK_PAGES.map((page) => {
            const active = page.path === path;
            return (
              <li key={page.path} className="shrink-0">
                <Link
                  to={page.path}
                  className={cn(
                    "bangla flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] whitespace-nowrap transition-colors",
                    active
                      ? "border-signal/60 bg-signal/12 text-signal"
                      : "border-white/10 text-muted hover:border-white/25 hover:text-white",
                  )}
                >
                  <span className="font-mono text-[9px] tracking-[0.14em] text-faint">
                    {page.num}
                  </span>
                  {page.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function LessonHero({
  page,
  lede,
  objectives,
}: {
  page: NetworkPage;
  lede: string;
  objectives?: string[];
}) {
  return (
    <header className="relative overflow-hidden border-b border-white/[0.06] pt-10 pb-8 md:pt-14 md:pb-10">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" aria-hidden />
      <div className="page-shell relative">
        <Eyebrow>
          {page.num} · {page.en}
        </Eyebrow>
        <h1 className="bangla-heading mt-4 max-w-3xl text-[clamp(1.75rem,4.6vw,2.9rem)] font-semibold leading-[1.25] tracking-[-0.01em] text-white">
          {page.title}
        </h1>
        <p className="bangla mt-4 max-w-2xl text-[14px] leading-relaxed text-muted md:text-[15.5px]">
          {lede}
        </p>
        {objectives && objectives.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {objectives.map((objective) => (
              <li
                key={objective}
                className="bangla rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11.5px] text-muted"
              >
                {objective}
              </li>
            ))}
          </ul>
        )}
      </div>
    </header>
  );
}

/**
 * The four-part rhythm every lesson follows: explanation, then the interactive
 * figure, then a real-life example, then a quiz. The label is printed so a
 * student always knows which part they are in.
 */
export function LessonBlock({
  index,
  label,
  title,
  children,
  aside,
  className,
}: {
  index: string;
  label: string;
  title?: string;
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("page-shell py-10 md:py-12", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="bangla flex items-center gap-3 text-[clamp(1.15rem,2.6vw,1.5rem)] font-semibold leading-snug text-white">
          <span className="font-mono text-[10px] tracking-[0.2em] text-signal">{index}</span>
          {title ?? label}
        </h2>
        {aside}
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function LabFooterNav({ path }: { path: string }) {
  const { prev, next } = networkNeighbours(path);

  return (
    <nav
      aria-label="পাঠের পরবর্তী ও আগের পৃষ্ঠা"
      className="page-shell grid gap-4 border-t border-white/[0.07] py-10 sm:grid-cols-2"
    >
      {prev ? (
        <Link
          to={prev.path}
          className="panel panel-hover group flex items-center gap-3 p-4"
          ariaLabel={`আগের পৃষ্ঠা: ${prev.title}`}
        >
          <ArrowLeft size={16} className="shrink-0 text-faint transition-colors group-hover:text-signal" />
          <span className="min-w-0">
            <span className="bangla block font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
              আগের পৃষ্ঠা
            </span>
            <span className="bangla mt-1 block truncate text-[13.5px] text-white group-hover:text-signal">
              {prev.title}
            </span>
          </span>
        </Link>
      ) : (
        <Link
          to="/network"
          className="panel panel-hover group flex items-center gap-3 p-4"
          ariaLabel="নেটওয়ার্ক ল্যাবের হোম"
        >
          <House size={16} className="shrink-0 text-faint transition-colors group-hover:text-signal" />
          <span className="bangla mt-0.5 block text-[13.5px] text-white group-hover:text-signal">
            ল্যাবের হোম পেজ
          </span>
        </Link>
      )}

      {next && (
        <Link
          to={next.path}
          className="panel panel-hover group flex items-center justify-end gap-3 p-4 text-right sm:col-start-2"
          ariaLabel={`পরবর্তী পৃষ্ঠা: ${next.title}`}
        >
          <span className="min-w-0">
            <span className="bangla block font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
              পরবর্তী পৃষ্ঠা
            </span>
            <span className="bangla mt-1 block truncate text-[13.5px] text-white group-hover:text-signal">
              {next.title}
            </span>
          </span>
          <ArrowRight size={16} className="shrink-0 text-faint transition-colors group-hover:text-signal" />
        </Link>
      )}
    </nav>
  );
}
