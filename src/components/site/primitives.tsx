import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/utils/cn";

/* -------------------------------------------------------------------------- */
/* Scroll reveal                                                              */
/* -------------------------------------------------------------------------- */

export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    // Safety net: reveal anyway after a moment, so content is never trapped
    // invisible by an observer that never fires.
    const fallback = window.setTimeout(() => setShown(true), 1400);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  const Component = Tag as "div";

  return (
    <Component
      ref={ref}
      className={cn("reveal", shown && "is-in", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Component>
  );
}

/* -------------------------------------------------------------------------- */
/* Typography / section furniture                                             */
/* -------------------------------------------------------------------------- */

export function Section({
  id,
  children,
  className,
  grid = false,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  grid?: boolean;
}) {
  return (
    <section id={id} className={cn("relative py-20 md:py-28", className)}>
      {grid && <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" aria-hidden />}
      <div className="page-shell relative">{children}</div>
    </section>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("eyebrow", className)}>{children}</span>;
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
  className,
  id,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: "left" | "center";
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        "max-w-3xl scroll-mt-28",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-4 text-[clamp(1.85rem,4vw,2.9rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-white">
        {title}
      </h2>
      {lede && (
        <p className="mt-5 text-[15px] leading-relaxed text-muted md:text-[17px] md:leading-[1.7]">
          {lede}
        </p>
      )}
    </div>
  );
}

export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-4 text-[15px] leading-relaxed text-muted", className)}>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Bits                                                                       */
/* -------------------------------------------------------------------------- */

export function Pill({
  children,
  tone = "cyan",
  className,
}: {
  children: ReactNode;
  tone?: "cyan" | "violet" | "amber" | "slate";
  className?: string;
}) {
  const tones = {
    cyan: "border-signal/35 bg-signal/10 text-signal",
    violet: "border-laser/35 bg-laser/10 text-laser",
    amber: "border-warn/35 bg-warn/10 text-warn",
    slate: "border-white/12 bg-white/5 text-muted",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={cn("h-3.5 w-3.5", className)} aria-hidden>
      <path
        d="M2.5 8h10M9 4.5 12.5 8 9 11.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LinkArrow({
  href,
  children,
  onClick,
  className,
}: {
  href: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={cn(
        "group inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-signal transition-colors hover:text-white",
        className,
      )}
    >
      {children}
      <ArrowIcon className="transition-transform duration-300 group-hover:translate-x-1" />
    </a>
  );
}

/* Small numbered chapter tag: "03" with a rule */
export function ChapterNum({ n, className }: { n: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-faint",
        className,
      )}
    >
      <span className="text-signal/80">{n}</span>
      <span className="h-px w-7 bg-white/15" />
    </span>
  );
}
