import { cn } from "@/utils/cn";

/** Small building blocks shared by the two handover labs. */

export const controlBase =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted transition-colors hover:border-signal/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:cursor-not-allowed disabled:opacity-35";

export function StatusRow({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  tone?: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] py-2 last:border-0">
      <span className="pt-0.5 text-[10.5px] leading-tight text-faint">{label}</span>
      <span className={cn("text-right font-mono text-[11px] leading-tight", tone ?? "text-ink")}>
        {value}
        {sub && <span className="mt-0.5 block text-[9px] text-faint">{sub}</span>}
      </span>
    </div>
  );
}

export function QualityBar({ value, tone }: { value: number; tone: string }) {
  return (
    <span className="block h-1 w-full overflow-hidden rounded-full bg-white/10">
      <span
        className={cn("block h-full rounded-full transition-[width] duration-200", tone)}
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </span>
  );
}

export function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em] transition-colors",
        active
          ? "border-signal/40 bg-signal/10 text-signal"
          : "border-white/10 text-faint hover:border-white/25 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
