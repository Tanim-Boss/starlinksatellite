import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export const controlBase =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted transition-colors hover:border-signal/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:cursor-not-allowed disabled:opacity-35";

export function Row({
  label,
  value,
  tone,
  mono = true,
}: {
  label: string;
  value: ReactNode;
  tone?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/[0.06] py-1.5 last:border-0">
      <dt className="text-[10.5px] leading-tight text-faint">{label}</dt>
      <dd className={cn(mono && "font-mono", "text-right text-[11px] leading-tight", tone ?? "text-ink")}>
        {value}
      </dd>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[18px] w-8 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-35",
        checked ? "bg-signal/80" : "bg-white/15",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all",
          checked ? "left-[16px]" : "left-0.5",
        )}
      />
    </button>
  );
}

export function LiveDot({ tone = "bg-signal", pulse = false }: { tone?: string; pulse?: boolean }) {
  return (
    <span className="relative flex h-1.5 w-1.5">
      {pulse && <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-60 animate-blink", tone)} />}
      <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", tone)} />
    </span>
  );
}

export function MiniStat({
  label,
  value,
  tone = "text-ink",
}: {
  label: string;
  value: ReactNode;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5">
      <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-faint">{label}</div>
      <div className={cn("mt-0.5 font-mono text-[12px]", tone)}>{value}</div>
    </div>
  );
}
