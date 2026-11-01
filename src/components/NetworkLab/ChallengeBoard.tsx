import { useState } from "react";
import { Check, RotateCcw, Trophy, Undo2, X } from "lucide-react";
import {
  CHALLENGE_ACCEPTED,
  CHALLENGE_FAILURE,
  CHALLENGE_INTRO,
  CHALLENGE_ITEMS,
  CHALLENGE_SCENARIOS,
  CHALLENGE_SUCCESS,
  CHALLENGE_TIP,
} from "@/lib/network/copy";
import { toBn } from "@/lib/format";
import { cn } from "@/utils/cn";
import { Button, Callout } from "./ui/primitives";
import { Quiz } from "./ui/Quiz";

/*
 * Challenge mode.
 *
 * Part one asks for the order in which the parts of a network act when a file
 * is downloaded; part two is a set of what-if scenarios. Both give an
 * explanation after every answer, because guessing the order is not the point.
 */

export function SequenceChallenge({ className }: { className?: string }) {
  const [sequence, setSequence] = useState<string[]>([]);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);

  const remaining = CHALLENGE_ITEMS.filter((item) => !sequence.includes(item.id));
  const ordered = sequence
    .map((id) => CHALLENGE_ITEMS.find((item) => item.id === id))
    .filter((item): item is (typeof CHALLENGE_ITEMS)[number] => Boolean(item));

  const add = (id: string) => {
    setSequence((current) => [...current, id]);
    setResult(null);
  };

  const remove = (id: string) => {
    setSequence((current) => current.filter((item) => item !== id));
    setResult(null);
  };

  const check = () => {
    const accepted = CHALLENGE_ACCEPTED.some(
      (option) => option.length === sequence.length && option.every((id, index) => id === sequence[index]),
    );
    setResult(accepted ? "correct" : "wrong");
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Callout tone="violet" title="চ্যালেঞ্জ" icon={<Trophy size={14} />}>
        <p className="bangla">{CHALLENGE_INTRO}</p>
      </Callout>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-white/12 bg-white/[0.02] p-4">
          <p className="bangla font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">
            তোমার সাজানো ক্রম
          </p>
          {ordered.length === 0 ? (
            <p className="bangla mt-3 rounded-xl border border-dashed border-white/12 p-3 text-[12.5px] text-faint">
              এখনো কিছু সাজাওনি। ডান দিকের তালিকা থেকে একটি একটি করে অংশ বেছে নাও।
            </p>
          ) : (
            <ol className="mt-3 space-y-1.5">
              {ordered.map((item, index) => (
                <li key={item.id}>
                  <div
                    className={cn(
                      "bangla flex items-center justify-between gap-3 rounded-xl border px-3 py-2",
                      result === "correct"
                        ? "border-signal/50 bg-signal/10"
                        : "border-white/10 bg-white/[0.03]",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-signal/40 font-mono text-[9.5px] text-signal">
                        {toBn(index + 1)}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[12.5px] text-white">{item.label}</span>
                        <span className="block text-[11px] text-faint">{item.role}</span>
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      aria-label={`${item.label} ক্রম থেকে সরিয়ে দাও`}
                      className="shrink-0 rounded-full border border-white/10 p-1 text-faint transition-colors hover:border-[#f87171]/50 hover:text-[#fca5a5]"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={check} disabled={sequence.length === 0}>
              ক্রমটি পরীক্ষা করো
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setSequence((current) => current.slice(0, -1));
                setResult(null);
              }}
              disabled={sequence.length === 0}
              ariaLabel="শেষের অংশটি সরাও"
              icon={<Undo2 size={13} />}
            >
              একটি পিছিয়ে
            </Button>
            <Button
              variant="quiet"
              onClick={() => {
                setSequence([]);
                setResult(null);
              }}
              disabled={sequence.length === 0}
              ariaLabel="ক্রম আবার সাজাও"
              icon={<RotateCcw size={13} />}
            >
              আবার সাজাও
            </Button>
          </div>

          <p className="bangla mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-faint" aria-live="polite">
            {result === "correct"
              ? "ফলাফল: সঠিক"
              : result === "wrong"
                ? "ফলাফল: ক্রম মেলেনি"
                : `${toBn(sequence.length)} / ${toBn(CHALLENGE_ITEMS.length)} টি অংশ সাজানো হয়েছে`}
          </p>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-white/12 bg-white/[0.02] p-4">
            <p className="bangla font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint">
              বাকি অংশগুলো — বেছে নাও
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {remaining.length === 0 ? (
                <p className="bangla text-[12.5px] text-faint">সব অংশ সাজানো শেষ।</p>
              ) : (
                remaining.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => add(item.id)}
                    className={cn(
                      "bangla rounded-full border border-white/12 bg-white/[0.02] px-3.5 py-2 text-[12.5px] text-muted transition-colors hover:border-signal/50 hover:text-signal",
                    )}
                  >
                    {item.label}
                  </button>
                ))
              )}
            </div>
          </div>

          {result === "correct" && (
            <Callout tone="cyan" title="ক্রমটি ঠিক আছে" icon={<Check size={14} />}>
              <p className="bangla">{CHALLENGE_SUCCESS}</p>
            </Callout>
          )}
          {result === "wrong" && (
            <Callout tone="red" title="ক্রমটি মেলেনি" icon={<X size={14} />}>
              <p className="bangla">{CHALLENGE_FAILURE}</p>
            </Callout>
          )}

          <Callout tone="slate" title="মনে রাখো">
            <p className="bangla">{CHALLENGE_TIP}</p>
          </Callout>
        </div>
      </div>
    </div>
  );
}

export function ScenarioChallenges({ className }: { className?: string }) {
  return (
    <Quiz
      className={className}
      title="যদি এমন হতো তাহলে?"
      intro="প্রতিটি পরিস্থিতিতে নেটওয়ার্কের কোন অংশ কী করবে — বেছে নাও। উত্তর দিলেই ব্যাখ্যা দেখা যাবে।"
      questions={CHALLENGE_SCENARIOS}
    />
  );
}
