import { networkPage } from "@/lib/network/nav";
import { COMPONENT_INFO, QUIZZES } from "@/lib/network/copy";
import { Callout, RealExample, SimNote } from "@/components/NetworkLab/ui/primitives";
import { LabFooterNav, LabNav, LessonBlock, LessonHero } from "@/components/NetworkLab/ui/LessonPage";
import { Quiz } from "@/components/NetworkLab/ui/Quiz";
import { NetworkDiagram } from "@/components/NetworkLab/NetworkDiagram";

const PAGE = networkPage("playground");

const SHOWN = ["client", "server", "switch", "nic", "media", "resource"] as const;

export function NetworkPlayground() {
  return (
    <>
      <LabNav path={PAGE.path} />
      <LessonHero
        page={PAGE}
        lede="একটি ছোট নেটওয়ার্ক নিজেই চালিয়ে দেখো: কোন ক্লায়েন্ট থেকে request যাবে, কে পথ দেখাবে, সার্ভার কী করবে, আর রেসপন্স কীভাবে ফিরবে।"
        objectives={[
          "অংশে ক্লিক করে কাজ দেখা",
          "প্যাকেট পাঠানো",
          "কেবল খোলা ও যুক্ত করা",
          "ক্লায়েন্ট অফলাইন করা",
          "Wi-Fi ও wired বদলানো",
        ]}
      />

      <LessonBlock
        index="০১"
        label="সহজ ব্যাখ্যা"
        title="সহজ ব্যাখ্যা: নেটওয়ার্কের অংশগুলো"
        aside={<span className="bangla text-[11.5px] text-faint">প্রতিটি অংশের কাজ আলাদা</span>}
      >
        <p className="bangla max-w-3xl text-[14px] leading-relaxed text-muted">
          একটি নেটওয়ার্ক কয়েকটি ভিন্ন ভিন্ন কাজের অংশ মিলে তৈরি। কেউ ডাটা চায়, কেউ দেয়, কেউ পথ
          দেখায়, কেউ ডাটা বহন করে, আর কেউ কম্পিউটারকে নেটওয়ার্কে যুক্ত রাখে। নিচের কার্ডগুলোতে
          প্রতিটি অংশের কাজ এক নজরে:
        </p>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SHOWN.map((id) => {
            const card = COMPONENT_INFO.find((item) => item.id === id);
            if (!card) return null;
            return (
              <li key={id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <p className="bangla text-[13.5px] font-semibold text-white">
                  {card.title}
                  <span className="ml-2 font-mono text-[9px] font-normal uppercase tracking-[0.14em] text-signal">
                    {card.en}
                  </span>
                </p>
                <p className="bangla mt-1 text-[11.5px] uppercase tracking-[0.08em] text-faint">
                  {card.role}
                </p>
                <p className="bangla mt-2 text-[12.5px] leading-relaxed text-muted">{card.work}</p>
              </li>
            );
          })}
        </ul>
      </LessonBlock>

      <LessonBlock
        index="০২"
        label="ইন্টারঅ্যাক্টিভ ডায়াগ্রাম"
        title="ইন্টারঅ্যাক্টিভ নেটওয়ার্ক — নিজে চালাও"
        aside={
          <span className="bangla text-[11.5px] text-faint">
            ক্লিক করো · প্যাকেট পাঠাও · সংযোগ খোলো
          </span>
        }
      >
        <NetworkDiagram />
        <SimNote />
      </LessonBlock>

      <LessonBlock
        index="০৩"
        label="পরীক্ষা করো"
        title="এই চারটি পরীক্ষা করে দেখো"
      >
        <ol className="grid gap-3 sm:grid-cols-2">
          {[
            {
              title: "কেবল খুলে দাও",
              body:
                "যেকোনো একটি ক্লায়েন্টের সংযোগ বিচ্ছিন্ন করে রিকোয়েস্ট পাঠাও। দেখবে প্যাকেট চলার পথই থাকে না — সার্ভার বা অন্য ক্লায়েন্টের কিছু হয় না।",
            },
            {
              title: "একটি ক্লায়েন্ট বন্ধ করো",
              body:
                "ক্লায়েন্ট বন্ধ করলে তার NIC-ও বন্ধ। তখন request তৈরিই হয় না, কিন্তু বাকি নেটওয়ার্ক ঠিকই চলে।",
            },
            {
              title: "Wi-Fi ও wired বদলাও",
              body:
                "একই ক্লায়েন্টকে Wi-Fi-তে নিয়ে যাও। পথ একই থাকে, বদলায় শুধু মিডিয়া — সংকেত তখন বেতার তরঙ্গে চলে।",
            },
            {
              title: "রিসোর্স বন্ধ করো",
              body:
                "প্রিন্টার বা ফাইল বন্ধ করে রিকোয়েস্ট পাঠাও। request ঠিকই সার্ভারে পৌঁছাবে, কিন্তু ফিরবে ব্যর্থতার বার্তা।",
            },
          ].map((item, index) => (
            <li key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <p className="bangla flex items-center gap-2 text-[13px] font-semibold text-white">
                <span className="grid h-5 w-5 place-items-center rounded-full border border-signal/40 font-mono text-[9.5px] text-signal">
                  {index + 1}
                </span>
                {item.title}
              </p>
              <p className="bangla mt-2 text-[12.5px] leading-relaxed text-muted">{item.body}</p>
            </li>
          ))}
        </ol>
      </LessonBlock>

      <LessonBlock index="০৪" label="বাস্তব উদাহরণ" title="বাস্তব উদাহরণ">
        <RealExample title="স্কুলের কম্পিউটার ল্যাব">
          তোমাদের ল্যাবে ৩০টি কম্পিউটার একটি সুইচের সঙ্গে ইথারনেট কেবলে যুক্ত, আর শিক্ষকের কম্পিউটারটি
          Wi-Fi-তে। সবাই একটি ফাইল সার্ভার থেকে নোট নামায় এবং একটিমাত্র প্রিন্টারে ছাপায়। এখানে
          শিক্ষার্থীদের কম্পিউটার ক্লায়েন্ট, ফাইল সার্ভার সার্ভার, কেবল ও Wi-Fi হলো মিডিয়া, সুইচ পথ
          দেখায়, আর প্রিন্টার ও নোটের ফাইল হলো শেয়ার্ড রিসোর্স।
        </RealExample>
        <Callout tone="amber" title="একটি কথা মনে রেখো">
          <p className="bangla">
            সার্ভার ও ক্লায়েন্ট ভূমিকা, যন্ত্র নয়। যে কম্পিউটার এখন ফাইল দিচ্ছে সে সার্ভার; সে-ই যদি
            প্রিন্ট সার্ভিস চায়, তখন সে ক্লায়েন্ট। তাই এক নেটওয়ার্কে একাধিক সার্ভার ও ক্লায়েন্ট
            থাকতে পারে।
          </p>
        </Callout>
      </LessonBlock>

      <LessonBlock index="০৫" label="কুইজ" title="নিজে যাচাই করো">
        <Quiz questions={QUIZZES.playground} />
      </LessonBlock>

      <LabFooterNav path={PAGE.path} />
    </>
  );
}
