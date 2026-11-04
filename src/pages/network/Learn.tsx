import { useState, type ComponentType } from "react";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { GUIDED_STEPS, QUIZZES } from "@/lib/network/copy";
import { findNetworkPage, networkPage } from "@/lib/network/nav";
import { toBn } from "@/lib/format";
import { cn } from "@/utils/cn";
import { Eyebrow } from "@/components/site/primitives";
import { Link } from "@/lib/router";
import { LabFooterNav, LabNav, LessonHero } from "@/components/NetworkLab/ui/LessonPage";
import { Quiz } from "@/components/NetworkLab/ui/Quiz";
import { Button, RealExample, SimNote } from "@/components/NetworkLab/ui/primitives";
import { EmailScenario } from "@/components/NetworkLab/EmailScenario";
import { MediaVisual } from "@/components/NetworkLab/MediaVisual";
import { NicVisual } from "@/components/NetworkLab/NicVisual";
import { ResourceVisual } from "@/components/NetworkLab/ResourceVisual";
import { UserChain } from "@/components/NetworkLab/UserChain";
import { ProtocolVisual } from "@/components/NetworkLab/ProtocolVisual";
import { NetworkDiagram } from "@/components/NetworkLab/NetworkDiagram";

const PAGE = networkPage("learn");

/** The interactive figure that belongs to each guided step. */
const VISUALS: Record<string, ComponentType<{ className?: string }>> = {
  "server-client": EmailScenario,
  media: MediaVisual,
  nic: NicVisual,
  resources: ResourceVisual,
  user: UserChain,
  protocol: ProtocolVisual,
  playground: NetworkDiagram,
};

export function NetworkLearn() {
  const [index, setIndex] = useState(0);
  const step = GUIDED_STEPS[index];
  const Visual = VISUALS[step.id] ?? NetworkDiagram;
  const topicPage = findNetworkPage(step.id);
  const questions = QUIZZES[step.id] ?? QUIZZES.guided;

  return (
    <>
      <LabNav path={PAGE.path} />
      <LessonHero
        page={PAGE}
        lede="সাত ধাপের গাইডেড কোর্স। প্রতিটি ধাপে আছে সহজ ব্যাখ্যা, হাতে-কলমে ডায়াগ্রাম, বাস্তব উদাহরণ আর দুই-তিনটি প্রশ্ন।"
        objectives={["সার্ভার-ক্লায়েন্ট", "মিডিয়া", "NIC", "রিসোর্স", "ইউজার", "প্রোটোকল", "সম্পূর্ণ সিমুলেশন"]}
      />

      <section className="page-shell py-8">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="গাইডেড ধাপসমূহ">
          {GUIDED_STEPS.map((item, stepIndex) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setIndex(stepIndex)}
              aria-current={stepIndex === index ? "step" : undefined}
              className={cn(
                "bangla flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] transition-colors",
                stepIndex === index
                  ? "border-signal bg-signal/15 text-signal"
                  : "border-white/10 text-muted hover:border-white/25 hover:text-white",
              )}
            >
              <span className="font-mono text-[9px] tracking-[0.14em] text-faint">
                {toBn(stepIndex + 1)}
              </span>
              {item.title}
            </button>
          ))}
        </div>

        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-linear-to-r from-signal to-beam transition-[width] duration-300"
            style={{ width: `${((index + 1) / GUIDED_STEPS.length) * 100}%` }}
          />
        </div>
        <p className="bangla mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-faint" aria-live="polite">
          ধাপ {toBn(index + 1)} / {toBn(GUIDED_STEPS.length)} · {step.en}
        </p>
      </section>

      <section className="page-shell pb-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <div className="space-y-4">
            <div>
              <Eyebrow>ধাপ {toBn(index + 1)} · {step.en}</Eyebrow>
              <h2 className="bangla-heading mt-3 text-[clamp(1.4rem,3.2vw,2rem)] font-semibold leading-snug text-white">
                {step.title}
              </h2>
              <ul className="mt-4 space-y-3">
                {step.explanation.map((line) => (
                  <li key={line} className="bangla flex gap-2.5 text-[13.5px] leading-relaxed text-muted">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <RealExample title={step.exampleLabel}>{step.example}</RealExample>

            {topicPage && (
              <Link
                to={topicPage.path}
                className="bangla inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[12.5px] text-ink transition-colors hover:border-signal/50 hover:text-signal"
              >
                <BookOpen size={14} />
                এই অংশের পূর্ণ পৃষ্ঠা খোলো
              </Link>
            )}

            <div className="flex flex-wrap gap-2 border-t border-white/[0.07] pt-4">
              <Button
                variant="ghost"
                onClick={() => setIndex((current) => Math.max(0, current - 1))}
                disabled={index === 0}
                ariaLabel="আগের ধাপে যাও"
                icon={<ArrowLeft size={13} />}
              >
                আগের ধাপ
              </Button>
              <Button
                variant="primary"
                onClick={() => setIndex((current) => Math.min(GUIDED_STEPS.length - 1, current + 1))}
                disabled={index === GUIDED_STEPS.length - 1}
                ariaLabel="পরবর্তী ধাপে যাও"
              >
                পরবর্তী ধাপ
                <ArrowRight size={13} />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.015] p-3 md:p-4">
              <Visual key={step.id} />
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell pb-10">
        <Quiz
          key={step.id}
          title={`ধাপ ${toBn(index + 1)}: ${step.title} — ছোট প্রশ্ন`}
          intro="উত্তর দিলেই ব্যাখ্যা দেখা যাবে। ভুল হলেও সমস্যা নেই — ব্যাখ্যা পড়ে আবার চেষ্টা করো।"
          questions={questions}
        />
        <SimNote className="mt-4" />
      </section>

      <LabFooterNav path={PAGE.path} />
    </>
  );
}
