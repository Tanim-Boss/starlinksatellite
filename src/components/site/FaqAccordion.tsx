import { useRef, useState } from "react";
import { FAQ } from "@/lib/content";
import { cn } from "@/utils/cn";

export function FaqAccordion({
  limit,
  defaultOpen = 0,
}: {
  limit?: number;
  defaultOpen?: number;
}) {
  const items = limit ? FAQ.slice(0, limit) : FAQ;
  const [open, setOpen] = useState<number | null>(defaultOpen);

  return (
    <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
      {items.map((item, i) => (
        <FaqRow
          key={item.q}
          q={item.q}
          a={item.a}
          n={i}
          open={open === i}
          onToggle={() => setOpen(open === i ? null : i)}
        />
      ))}
    </div>
  );
}

function FaqRow({
  q,
  a,
  n,
  open,
  onToggle,
}: {
  q: string;
  a: string;
  n: number;
  open: boolean;
  onToggle: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="group flex w-full items-start gap-4 py-5 text-left"
        >
          <span className="mt-0.5 font-mono text-[10px] text-faint">
            {String(n + 1).padStart(2, "0")}
          </span>
          <span
            className={cn(
              "flex-1 text-[15px] font-medium transition-colors md:text-base",
              open ? "text-signal" : "text-ink group-hover:text-white",
            )}
          >
            {q}
          </span>
          <span
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-300",
              open
                ? "border-signal/40 bg-signal/10 text-signal"
                : "border-white/15 text-faint group-hover:border-white/35 group-hover:text-muted",
            )}
            aria-hidden
          >
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
              {open ? (
                <path d="M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              ) : (
                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              )}
            </svg>
          </span>
        </button>
      </h3>
      <div
        ref={bodyRef}
        style={{ maxHeight: open ? `${bodyRef.current?.scrollHeight ?? 1000}px` : 0 }}
        className={cn(
          "overflow-hidden transition-[max-height,opacity] duration-300 ease-out",
          open ? "opacity-100" : "opacity-0",
        )}
      >
        <p className="max-w-3xl pb-6 pl-8 pr-8 text-[13.5px] leading-relaxed text-muted md:text-sm md:leading-[1.75]">
          {a}
        </p>
      </div>
    </div>
  );
}
