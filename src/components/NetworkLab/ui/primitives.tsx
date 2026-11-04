import type { ReactNode } from "react";
import { TriangleAlert, BookOpen, Info } from "lucide-react";
import { SIMULATION_NOTE, type InfoCard } from "@/lib/network/copy";
import { cn } from "@/utils/cn";

/* -------------------------------------------------------------------------- */
/* Controls                                                                   */
/* -------------------------------------------------------------------------- */

type ButtonVariant = "primary" | "ghost" | "quiet" | "danger";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-signal text-[#04121a] font-semibold hover:bg-white disabled:bg-signal/25 disabled:text-[#04121a]/60",
  ghost: "border border-white/15 text-ink hover:border-signal/60 hover:text-signal",
  quiet: "border border-white/10 bg-white/[0.03] text-muted hover:text-white hover:border-white/25",
  danger: "border border-[#f87171]/40 bg-[#f87171]/10 text-[#fca5a5] hover:bg-[#f87171]/20 hover:text-white",
};

export function Button({
  children,
  onClick,
  variant = "ghost",
  disabled,
  ariaLabel,
  ariaPressed,
  className,
  icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  ariaLabel?: string;
  ariaPressed?: boolean;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      className={cn(
        "bangla inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-[13px] leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-70",
        BUTTON_STYLES[variant],
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export interface ChoiceOption {
  id: string;
  label: string;
  hint?: string;
}

/** Small labelled group of mutually exclusive buttons. */
export function ChoiceGroup({
  label,
  options,
  value,
  onChange,
  className,
  size = "md",
}: {
  label: string;
  options: ChoiceOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="bangla font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">
        {label}
      </span>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((option) => {
          const active = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.id)}
              title={option.hint}
              className={cn(
                "bangla rounded-full border transition-colors",
                size === "sm" ? "px-3 py-1.5 text-[12px]" : "px-3.5 py-2 text-[12.5px]",
                active
                  ? "border-signal bg-signal/15 text-signal"
                  : "border-white/12 bg-white/[0.02] text-muted hover:border-white/30 hover:text-white",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** On/off switch with a visible Bangla state label. */
export function Switch({
  checked,
  onChange,
  onLabel,
  offLabel,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  onLabel: string;
  offLabel: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="bangla flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-left transition-colors hover:border-white/25"
    >
      <span className="min-w-0">
        <span className={cn("block text-[12.5px] leading-snug", checked ? "text-white" : "text-muted")}>
          {checked ? onLabel : offLabel}
        </span>
        {description && (
          <span className="mt-0.5 block text-[11px] leading-snug text-faint">{description}</span>
        )}
      </span>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border transition-colors",
          checked ? "border-signal/60 bg-signal/30" : "border-white/15 bg-white/[0.06]",
        )}
      >
        <span
          className={cn(
            "absolute top-[2px] h-3.5 w-3.5 rounded-full transition-all",
            checked ? "left-[18px] bg-signal" : "left-[2px] bg-muted",
          )}
        />
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Text furniture                                                             */
/* -------------------------------------------------------------------------- */

export function Callout({
  tone = "cyan",
  title,
  children,
  icon,
  className,
}: {
  tone?: "cyan" | "violet" | "amber" | "red" | "slate";
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  const tones = {
    cyan: "border-signal/35 bg-signal/[0.07]",
    violet: "border-laser/35 bg-laser/[0.07]",
    amber: "border-warn/35 bg-warn/[0.07]",
    red: "border-[#f87171]/40 bg-[#f87171]/[0.08]",
    slate: "border-white/12 bg-white/[0.03]",
  } as const;

  return (
    <aside className={cn("rounded-2xl border p-4 md:p-5", tones[tone], className)}>
      <h4 className="bangla flex items-center gap-2 text-[13px] font-semibold text-white">
        {icon ?? <Info size={14} className="shrink-0 text-current" />}
        {title}
      </h4>
      <div className="bangla mt-2 space-y-2 text-[12.5px] leading-relaxed text-muted">{children}</div>
    </aside>
  );
}

/** The disclaimer every simulation shows, so nothing reads as a live network. */
export function SimNote({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "bangla flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11.5px] leading-relaxed text-faint",
        className,
      )}
    >
      <TriangleAlert size={13} className="mt-0.5 shrink-0 text-warn" />
      <span>{SIMULATION_NOTE}</span>
    </p>
  );
}

/** A definition box: Bangla term, English term, one-line meaning. */
export function Definition({
  term,
  en,
  body,
  className,
}: {
  term: string;
  en: string;
  body: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-signal/25 bg-signal/[0.06] p-4 md:p-5",
        className,
      )}
    >
      <p className="bangla text-[14.5px] font-semibold text-white">
        {term}
        <span className="ml-2 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-signal">
          {en}
        </span>
      </p>
      <p className="bangla mt-2 text-[13px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}

/** Real-life example strip used at the end of every lesson block. */
export function RealExample({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-laser/30 bg-laser/[0.06] p-4 md:p-5">
      <p className="bangla flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-laser">
        <BookOpen size={13} /> {title}
      </p>
      <p className="bangla mt-2 text-[13px] leading-relaxed text-muted">{children}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Component info panel                                                       */
/* -------------------------------------------------------------------------- */

export function InfoPanel({ card }: { card: InfoCard | undefined }) {
  if (!card) {
    return (
      <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-4">
        <p className="bangla text-[12.5px] leading-relaxed text-faint">
          ডায়াগ্রামের যেকোনো অংশে (সার্ভার, ক্লায়েন্ট, সুইচ, NIC, কেবল, প্রিন্টার…) ক্লিক করলে এখানে
          তার নাম, কাজ ও বাস্তব উদাহরণ দেখা যাবে।
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-signal/35 bg-signal/[0.06] p-4 md:p-5"
      aria-live="polite"
    >
      <p className="bangla text-[15px] font-semibold text-white">
        {card.title}
        <span className="ml-2 font-mono text-[9.5px] font-normal uppercase tracking-[0.14em] text-signal">
          {card.en}
        </span>
      </p>
      <p className="bangla mt-1 text-[11.5px] uppercase tracking-[0.1em] text-faint">{card.role}</p>
      <p className="bangla mt-3 text-[13px] leading-relaxed text-muted">{card.work}</p>
      <p className="bangla mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[12.5px] leading-relaxed text-ink">
        <span className="mr-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-signal">
          উদাহরণ
        </span>
        {card.example}
      </p>
      <ul className="mt-3 space-y-1.5">
        {card.points.map((point) => (
          <li key={point} className="bangla flex gap-2 text-[12.5px] leading-relaxed text-muted">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-signal" />
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step list                                                                  */
/* -------------------------------------------------------------------------- */

export function StepList({
  steps,
  index,
  onPick,
  className,
}: {
  steps: { title: string; where?: string }[];
  index: number;
  onPick?: (i: number) => void;
  className?: string;
}) {
  return (
    <ol className={cn("space-y-1.5", className)}>
      {steps.map((step, i) => {
        const active = i === index;
        const done = i < index;
        return (
          <li key={step.title}>
            {onPick ? (
              <button
                type="button"
                onClick={() => onPick(i)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "bangla flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
                  active
                    ? "border-signal/50 bg-signal/10"
                    : "border-transparent hover:border-white/15 hover:bg-white/[0.03]",
                )}
              >
                <StepNumber n={i + 1} active={active} done={done} />
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-[12.5px] leading-snug",
                      active ? "text-white" : "text-muted",
                    )}
                  >
                    {step.title}
                  </span>
                  {step.where && (
                    <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                      {step.where}
                    </span>
                  )}
                </span>
              </button>
            ) : (
              <div
                aria-current={active ? "step" : undefined}
                className={cn(
                  "bangla flex items-start gap-3 rounded-xl border px-3 py-2",
                  active ? "border-signal/50 bg-signal/10" : "border-transparent",
                )}
              >
                <StepNumber n={i + 1} active={active} done={done} />
                <span
                  className={cn(
                    "block text-[12.5px] leading-snug",
                    active ? "text-white" : "text-muted",
                  )}
                >
                  {step.title}
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StepNumber({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <span
      className={cn(
        "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border font-mono text-[9.5px]",
        active
          ? "border-signal bg-signal text-[#04121a]"
          : done
            ? "border-signal/40 text-signal"
            : "border-white/15 text-faint",
      )}
    >
      {done ? "✓" : n}
    </span>
  );
}
