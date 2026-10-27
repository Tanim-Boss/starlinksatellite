import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

/** Shared chip/slider styling for the dish lab's instruments. */
export const controlBase =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted transition-colors hover:border-signal/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:cursor-not-allowed disabled:opacity-35";

export function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/[0.06] py-1.5 last:border-0">
      <dt className="text-[10.5px] leading-tight text-faint">{label}</dt>
      <dd className={cn("text-right font-mono text-[11px] leading-tight tabular-nums", tone ?? "text-ink")}>
        {value}
      </dd>
    </div>
  );
}

export function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5">
      <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-faint">{label}</div>
      <div className="mt-0.5 font-mono text-[12px] text-ink tabular-nums">{value}</div>
    </div>
  );
}

export function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex-1 rounded-lg px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors",
        active ? "bg-signal/15 text-signal" : "text-faint hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
