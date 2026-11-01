import { ArrowRight, GraduationCap } from "lucide-react";
import { NETWORK_PAGES, networkPage } from "@/lib/network/nav";
import { QUIZZES } from "@/lib/network/copy";
import { Eyebrow, Pill, Reveal } from "@/components/site/primitives";
import { Link } from "@/lib/router";
import { LabNav, LessonHero } from "@/components/NetworkLab/ui/LessonPage";
import { Quiz } from "@/components/NetworkLab/ui/Quiz";
import { SimNote } from "@/components/NetworkLab/ui/primitives";

const PAGE = networkPage("home");

const BASICS = [
  {
    term: "সার্ভার",
    en: "Server",
    body: "যে কম্পিউটার বা সিস্টেম নেটওয়ার্কের মাধ্যমে অন্যদের সার্ভিস বা রিসোর্স সরবরাহ করে।",
  },
  {
    term: "ক্লায়েন্ট",
    en: "Client",
    body: "যে ডিভাইস বা সফটওয়্যার কোনো সার্ভিস ব্যবহারের জন্য request করে।",
  },
  {
    term: "মিডিয়া",
    en: "Media",
    body: "যে মাধ্যমে ডাটা চলে — তামার কেবল, অপটিক্যাল ফাইবার বা বেতার তরঙ্গ।",
  },
  {
    term: "NIC",
    en: "Network Interface Card",
    body: "কম্পিউটারকে নেটওয়ার্কে যুক্ত করার হার্ডওয়্যার ইন্টারফেস।",
  },
  {
    term: "রিসোর্স",
    en: "Resource",
    body: "যা একাধিক ডিভাইস ভাগ করে নেয় — ফাইল, প্রিন্টার, স্টোরেজ বা সার্ভিস।",
  },
  {
    term: "প্রোটোকল",
    en: "Protocol",
    body: "কমিউনিকেশনের নিয়ম ও conventions — কে, কীভাবে, কোন ফরম্যাটে কথা বলবে।",
  },
];

/** Lab home: what a network is, and the menu into every lesson. */
export function NetworkIndex() {
  return (
    <>
      <LabNav path={PAGE.path} />
      <LessonHero
        page={PAGE}
        lede="সহজ বাংলায়, হাতে-কলমে কম্পিউটার নেটওয়ার্ক শেখার ল্যাব। প্রতিটি ধারণার জন্য আছে ব্যাখ্যা, ক্লিক করা যায় এমন ডায়াগ্রাম, ছোট সিমুলেশন আর কুইজ।"
        objectives={[
          "সার্ভার ও ক্লায়েন্ট",
          "মিডিয়া",
          "NIC",
          "রিসোর্স",
          "ইউজার",
          "প্রোটোকল",
          "চ্যালেঞ্জ মোড",
        ]}
      />

      <section className="page-shell py-10 md:py-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <Reveal>
            <Eyebrow>শুরু করা যাক</Eyebrow>
            <h2 className="bangla-heading mt-3 text-[clamp(1.4rem,3.4vw,2rem)] font-semibold leading-snug text-white">
              কম্পিউটার নেটওয়ার্ক কী?
            </h2>
            <p className="bangla mt-4 text-[14px] leading-relaxed text-muted">
              দুই বা তার বেশি কম্পিউটার যখন একে অপরের সঙ্গে যুক্ত হয়ে ডাটা আদান-প্রদান করতে পারে,
              তখন তাকে বলে কম্পিউটার নেটওয়ার্ক। উদ্দেশ্য একটাই — তথ্য ও সার্ভিস ভাগ করে নেওয়া।
              তোমাদের স্কুলের কম্পিউটার ল্যাব, বাসার Wi-Fi, এমনকি ইন্টারনেটও বড় পরিসরের নেটওয়ার্ক।
            </p>
            <p className="bangla mt-3 text-[14px] leading-relaxed text-muted">
              একটি নেটওয়ার্কে সাধারণত থাকে: যারা সার্ভিস চায় (ক্লায়েন্ট), যারা সার্ভিস দেয়
              (সার্ভার), কোন পথে ডাটা যাবে সেই মাধ্যম (মিডিয়া), কম্পিউটারকে নেটওয়ার্কে যুক্ত করার
              হার্ডওয়্যার (NIC), পথ দেখানোর যন্ত্র (সুইচ বা রাউটার), আর যা ভাগ করা হয় সেই রিসোর্স।
              সবকিছু নিয়ম মেনে চলে — সেই নিয়মের নাম প্রোটোকল।
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Pill tone="cyan">বাংলায় ব্যাখ্যা</Pill>
              <Pill tone="violet">ইন্টারঅ্যাক্টিভ ডায়াগ্রাম</Pill>
              <Pill tone="amber">কুইজ ও চ্যালেঞ্জ</Pill>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <ul className="grid gap-2.5">
              {BASICS.map((item) => (
                <li
                  key={item.term}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5"
                >
                  <p className="bangla text-[13.5px] font-semibold text-white">
                    {item.term}
                    <span className="ml-2 font-mono text-[9.5px] font-normal uppercase tracking-[0.14em] text-signal">
                      {item.en}
                    </span>
                  </p>
                  <p className="bangla mt-1 text-[12.5px] leading-relaxed text-muted">{item.body}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="page-shell pb-10" aria-labelledby="net-pages-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2
            id="net-pages-title"
            className="bangla-heading text-[clamp(1.3rem,3vw,1.8rem)] font-semibold text-white"
          >
            ল্যাবের পৃষ্ঠাসমূহ
          </h2>
          <p className="bangla flex items-center gap-2 text-[12px] text-faint">
            <GraduationCap size={14} />
            উপরের ক্রমে পড়লে ধারণাগুলো একটার পর একটা বসে যাবে
          </p>
        </div>

        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NETWORK_PAGES.filter((item) => item.id !== "home").map((item, index) => (
            <li key={item.path}>
              <Reveal delay={index * 40} as="div" className="h-full">
                <Link
                  to={item.path}
                  className="panel panel-hover group flex h-full flex-col gap-2 p-4"
                  ariaLabel={`${item.title} — ${item.en}`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="bangla text-[14.5px] font-medium leading-snug text-white group-hover:text-signal">
                      {item.title}
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.16em] text-faint">
                      {item.num}
                    </span>
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                    {item.en}
                  </span>
                  <span className="bangla text-[12.5px] leading-relaxed text-muted">{item.blurb}</span>
                  <span className="mt-auto flex items-center gap-1.5 pt-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint transition-colors group-hover:text-signal">
                    শুরু করো <ArrowRight size={12} />
                  </span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section className="page-shell pb-12">
        <Reveal>
          <Quiz
            title="শুরু করার আগে ছোট যাচাই"
            intro="এই প্রশ্নগুলোর উত্তর দিতে পারলে তুমি প্রস্তুত। না পারলে চিন্তা নেই — প্রতিটি উত্তরের ব্যাখ্যা সঙ্গে সঙ্গে দেখানো হয়।"
            questions={QUIZZES.guided}
          />
        </Reveal>
        <Reveal delay={60} className="mt-5">
          <SimNote />
        </Reveal>
      </section>
    </>
  );
}
