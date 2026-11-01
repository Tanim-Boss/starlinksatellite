import { useState } from "react";
import { Monitor, Server, User, Wifi, ArrowRight } from "lucide-react";
import { USER_CHAIN } from "@/lib/network/copy";
import { toBn } from "@/lib/format";
import { cn } from "@/utils/cn";
import { Callout, SimNote } from "./ui/primitives";
import { StepControls, useStepPlayer } from "./ui/StepPlayer";

/*
 * User → browser → client device → network → server → response → browser → user.
 *
 * Rendered as a chain of buttons rather than a diagram: the idea is the
 * sequence and who is who at each point, and every link in the chain must be
 * clickable on a phone too.
 */

const ICONS = [User, Monitor, Monitor, Wifi, Server, ArrowRight, Monitor, User];

export function UserChain({ className }: { className?: string }) {
  const player = useStepPlayer(USER_CHAIN.length, 2600);
  const [selected, setSelected] = useState(0);
  const node = USER_CHAIN[selected];

  return (
    <div className={cn("space-y-4", className)}>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {USER_CHAIN.map((item, index) => {
          const Icon = ICONS[index] ?? User;
          const isCurrent = player.index === index;
          const isPicked = selected === index;
          return (
            <li key={item.id} className="relative">
              <button
                type="button"
                onClick={() => setSelected(index)}
                aria-current={isPicked ? "true" : undefined}
                className={cn(
                  "bangla flex h-full w-full flex-col gap-1.5 rounded-2xl border p-3.5 text-left transition-colors",
                  isPicked
                    ? "border-signal/60 bg-signal/[0.1]"
                    : "border-white/10 bg-white/[0.02] hover:border-white/25",
                  isCurrent && "ring-1 ring-warn/60",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <Icon
                    size={15}
                    className={isPicked ? "text-signal" : isCurrent ? "text-warn" : "text-faint"}
                  />
                  <span className="font-mono text-[9px] tracking-[0.16em] text-faint">
                    {toBn(index + 1)}
                  </span>
                </span>
                <span className="text-[13px] font-medium leading-snug text-white">{item.label}</span>
                <span className="font-mono text-[9px] uppercase leading-snug tracking-[0.12em] text-faint">
                  {item.en}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-3">
          <StepControls player={player} label="চেইন অ্যানিমেশন" />
          <div
            className="rounded-2xl border border-signal/30 bg-signal/[0.06] p-4"
            aria-live="polite"
          >
            <p className="bangla font-mono text-[9.5px] uppercase tracking-[0.16em] text-signal">
              ধাপ {toBn(player.index + 1)} / {toBn(USER_CHAIN.length)} · {node.en}
            </p>
            <h3 className="bangla mt-1.5 text-[16px] font-semibold text-white">{node.label}</h3>
            <p className="bangla mt-2 text-[13px] leading-relaxed text-muted">{node.body}</p>
            <button
              type="button"
              onClick={() => setSelected(player.index)}
              className="bangla mt-3 rounded-full border border-white/15 px-3 py-1.5 text-[11.5px] text-muted transition-colors hover:border-signal/50 hover:text-signal"
            >
              এই ধাপের বিস্তারিত দেখো
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <Callout tone="cyan" title="ইউজার আর ক্লায়েন্ট এক নয়" icon={<User size={14} />}>
            <p className="bangla">
              ইউজার হলো মানুষ — যে কিছু করতে চায়। ক্লায়েন্ট হলো সেই ডিভাইস বা সফটওয়্যার, যে
              ইউজারের হয়ে নেটওয়ার্কে request পাঠায়। একই মানুষ ভিন্ন ভিন্ন ডিভাইস থেকে ভিন্ন ভিন্ন
              ক্লায়েন্ট হিসেবে কাজ করাতে পারে।
            </p>
          </Callout>
          <Callout tone="violet" title="পুরো চেইনটি একবার পড়ো">
            <p className="net-code">
              User → Browser → Client device → Network → Web server → Response → Browser → User
            </p>
            <p className="bangla">
              লক্ষ্য করো: নেটওয়ার্ক ও সার্ভার মাঝখানে, কিন্তু শুরু ও শেষ দুই জায়গাতেই আছে ইউজার।
              নেটওয়ার্কের সব কাজ মানুষের প্রয়োজনেই হয়।
            </p>
          </Callout>
          <SimNote />
        </div>
      </div>

      <p className="bangla sr-only" aria-live="polite">
        নির্বাচিত ধাপ: {node.label}
      </p>
    </div>
  );
}
