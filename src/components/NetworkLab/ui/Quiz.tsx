import { useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import type { Question } from "@/lib/network/copy";
import { toBn } from "@/lib/format";
import { cn } from "@/utils/cn";
import { Button } from "./primitives";

/**
 * The short comprehension quiz at the end of every lesson.
 *
 * Answering is immediate feedback: pick an option, see whether it was right
 * and why. Native radio inputs keep it keyboard and screen-reader friendly,
 * and the score line is announced as it changes.
 */
export function Quiz({
  title = "ছোট কুইজ",
  intro,
  questions,
  className,
}: {
  title?: string;
  intro?: string;
  questions: Question[];
  className?: string;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const answered = questions.filter((question) => answers[question.id]);
  const correct = answered.filter(
    (question) => answers[question.id] === question.answer,
  ).length;
  const done = answered.length === questions.length;

  const answer = (questionId: string, optionId: string) =>
    setAnswers((previous) => ({ ...previous, [questionId]: optionId }));

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/12 bg-white/[0.02] p-4 md:p-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="bangla font-mono text-[9.5px] uppercase tracking-[0.18em] text-signal">
            নিজে যাচাই করো
          </p>
          <h3 className="bangla mt-1.5 text-[17px] font-semibold text-white">{title}</h3>
          {intro && (
            <p className="bangla mt-1.5 text-[12.5px] leading-relaxed text-muted">{intro}</p>
          )}
        </div>
        <p className="bangla font-mono text-[10px] uppercase tracking-[0.14em] text-faint" aria-live="polite">
          {answered.length > 0 ? `সঠিক ${toBn(correct)} / ${toBn(questions.length)}` : `${toBn(questions.length)} টি প্রশ্ন`}
        </p>
      </div>

      <ol className="mt-5 space-y-5">
        {questions.map((question, questionIndex) => {
          const chosen = answers[question.id];
          const isCorrect = chosen === question.answer;
          return (
            <li key={question.id}>
              <fieldset>
                <legend className="bangla text-[13.5px] font-medium leading-relaxed text-ink">
                  <span className="mr-2 font-mono text-[10px] text-faint">
                    {toBn(questionIndex + 1)}.
                  </span>
                  {question.prompt}
                </legend>
                <div className="mt-2.5 grid gap-2">
                  {question.options.map((option) => {
                    const selected = chosen === option.id;
                    const reveal = Boolean(chosen);
                    const rightAnswer = reveal && option.id === question.answer;
                    return (
                      <label
                        key={option.id}
                        className={cn(
                          "bangla flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-2.5 text-[12.5px] leading-relaxed transition-colors",
                          selected
                            ? isCorrect
                              ? "border-signal/60 bg-signal/10 text-white"
                              : "border-[#f87171]/50 bg-[#f87171]/10 text-white"
                            : "border-white/10 bg-white/[0.02] text-muted hover:border-white/25 hover:text-ink",
                          rightAnswer && !selected && "border-signal/40 bg-signal/[0.06] text-ink",
                        )}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={option.id}
                          checked={selected}
                          onChange={() => answer(question.id, option.id)}
                          className="mt-1 h-3.5 w-3.5 shrink-0 accent-[#3ddbd9]"
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {chosen && (
                <p
                  role="status"
                  className={cn(
                    "bangla mt-2.5 flex items-start gap-2 rounded-xl border p-3 text-[12.5px] leading-relaxed",
                    isCorrect
                      ? "border-signal/40 bg-signal/[0.07] text-ink"
                      : "border-[#f87171]/40 bg-[#f87171]/[0.07] text-ink",
                  )}
                >
                  {isCorrect ? (
                    <Check size={14} className="mt-0.5 shrink-0 text-signal" />
                  ) : (
                    <X size={14} className="mt-0.5 shrink-0 text-[#f87171]" />
                  )}
                  <span>
                    <strong className="mr-1.5 font-semibold">
                      {isCorrect ? "ঠিক উত্তর!" : "এবার ভুল হলো।"}
                    </strong>
                    {question.explain}
                  </span>
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/[0.07] pt-4">
        <p className="bangla text-[12.5px] text-muted" aria-live="polite">
          {!answered.length
            ? "উপরের প্রশ্নগুলোর উত্তর দাও — সঙ্গে সঙ্গে ব্যাখ্যা দেখা যাবে।"
            : done
              ? correct === questions.length
                ? `দারুণ! ${toBn(correct)}টি প্রশ্নের ${toBn(correct)}টিই ঠিক হয়েছে।`
                : `${toBn(correct)}টি ঠিক, ${toBn(questions.length - correct)}টি ভুল। ব্যাখ্যাগুলো একবার পড়ে নাও।`
              : `এখনো ${toBn(questions.length - answered.length)}টি প্রশ্ন বাকি।`}
        </p>
        <Button
          variant="quiet"
          className="ml-auto"
          onClick={() => setAnswers({})}
          disabled={!answered.length}
          ariaLabel="কুইজ আবার শুরু করো"
          icon={<RotateCcw size={13} />}
        >
          আবার চেষ্টা করো
        </Button>
      </div>
    </div>
  );
}
