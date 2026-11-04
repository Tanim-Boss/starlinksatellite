import { Cable, CircleCheck, Factory, Globe, Layers, Network, School, TriangleAlert, Waypoints } from "lucide-react";
import { networkPage } from "@/lib/network/nav";
import { QUIZZES } from "@/lib/network/copy";
import { toBn } from "@/lib/format";
import {
  TOPOLOGIES,
  TOPOLOGY_META,
  TOPOLOGY_ORDER,
  topologyFacts,
} from "@/lib/network/topology";
import { Callout, Definition, RealExample } from "@/components/NetworkLab/ui/primitives";
import {
  LabFooterNav,
  LabNav,
  LessonBlock,
  LessonHero,
} from "@/components/NetworkLab/ui/LessonPage";
import { Quiz } from "@/components/NetworkLab/ui/Quiz";
import { TopologySim } from "@/components/NetworkLab/TopologySim";

const PAGE = networkPage("topology");

const EXPERIMENTS = [
  {
    title: "বাসের তার কাটো",
    body:
      "বাস বেছে নিয়ে যেকোনো সেগমেন্টে ক্লিক করো, তারপর প্যাকেট পাঠাও। কাটা প্রান্তে terminator নেই, তাই সংকেত ফিরে আসে (echo) — পুরো বাস অচল।",
  },
  {
    title: "terminator খুলে ফেলো",
    body:
      "বাসের দুই মাথার যেকোনো terminator-এ ক্লিক করো। terminator সংকেত শুষে নেয়; এটি না থাকলে তারের প্রান্ত প্রতিফলক আয়নার মতো কাজ করে।",
  },
  {
    title: "স্টারের কেন্দ্র বন্ধ করো",
    body:
      "স্টারে switch-এ ক্লিক করলে সব ক্লায়েন্ট একসঙ্গে বিচ্ছিন্ন হয়ে যায়। কিন্তু একটি PC বন্ধ করলে বাকিরা আগের মতোই কথা বলে।",
  },
  {
    title: "রিং ভাঙো",
    body:
      "রিংয়ে একটি PC বন্ধ করো বা একটি তার কাটো, তারপর একই দিকের পাশের ডিভাইসে প্যাকেট পাঠাও। বৃত্ত এক জায়গায় ভাঙলেই এক দিকের পথ বন্ধ।",
  },
  {
    title: "ট্রি-র root বন্ধ করো",
    body:
      "tree-তে root/core switch বন্ধ করলে শাখাগুলো আলাদা দ্বীপে ভেঙে যায়। কেবল একটি শাখা switch বন্ধ করলে অন্য শাখা ঠিক থাকে।",
  },
  {
    title: "মেশে দুটি তার কাটো",
    body:
      "ফুল মেশে একটি তার কাটলেও সবাই সংযুক্ত থাকে। পার্শিয়াল মেশে দুটি গুরুত্বপূর্ণ তার কাটলে কিছু জোড়া বিচ্ছিন্ন হয়ে যায় — খরচ ও নির্ভরযোগ্যতার পার্থক্য এখানেই।",
  },
];

export function NetworkTopology() {
  return (
    <>
      <LabNav path={PAGE.path} />
      <LessonHero
        page={PAGE}
        lede="একই কয়েকটি কম্পিউটার হরেক ভাবে সাজানো যায় — কোন আকার কত খরচে, কতটা টেকসই আর কোথায় কাজে লাগে, তা নিজে তার কেটে, ডিভাইস বন্ধ করে আর প্যাকেট পাঠিয়ে দেখো।"
        objectives={[
          "বাস · রিং · স্টার",
          "ট্রি · ফুল ও পার্শিয়াল মেশ",
          "হাইব্রিড",
          "ডিভাইস বাদ দেওয়া",
          "তার কাটা ও terminator",
          "কার কাছে কার প্যাকেট",
        ]}
      />

      {/* ------------------------------------------------------------- 0১ */}
      <LessonBlock
        index="০১"
        label="সহজ ব্যাখ্যা"
        title="টোপোলজি কী?"
        aside={<span className="bangla text-[11.5px] text-faint">সাজানোর আকারই টোপোলজি</span>}
      >
        <Definition
          term="টোপোলজি"
          en="Network Topology"
          body="কম্পিউটার, সুইচ আর তারগুলো কোন আকারে সাজানো আছে — রেখা, বৃত্ত, তারকা, গাছ বা জালের মতো — সেই গঠনটির নাম টোপোলজি। ডিভাইস কতগুলো তা নয়, তারা কীভাবে জোড়া তা-ই ঠিক করে নেটওয়ার্কের খরচ, গতি ও ভরসার মাত্রা।"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="bangla text-[13px] font-semibold text-white">একই ডিভাইস, ভিন্ন গঠন</p>
            <p className="bangla mt-2 text-[12.5px] leading-relaxed text-muted">
              ছয়টি কম্পিউটার একই তার দিয়ে জুড়লে বাস; একটি switch-এর চারপাশে জুড়লে স্টার; পরস্পরকে
              বৃত্তে জুড়লে রিং; প্রত্যেকে প্রত্যেকের সঙ্গে জুড়লে ফুল মেশ। ডিভাইস একই, কিন্তু তারের
              পরিমাণ, খরচ আর একটি জায়গা নষ্ট হলে কী হয় — সব বদলে যায়।
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="bangla text-[13px] font-semibold text-white">
              ভৌত আর 논리 — দুই চেহারা
            </p>
            <p className="bangla mt-2 text-[12.5px] leading-relaxed text-muted">
              <span className="text-signal">Physical topology</span> হলো তার দিয়ে সত্যি সত্যি কীভাবে
              জোড়া। <span className="text-signal">Logical topology</span> হলো ডাটা আসলে কোন পথে
              চলে। বাসার Wi-Fi router-এর সঙ্গে সব ডিভাইস ভৌতভাবে স্টার, কিন্তু ইন্টারনেটে বেরোনোর
              সময় সবাই router-এর পেছনের একই পথ (logical bus) ব্যবহার করে।
            </p>
          </div>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOPOLOGY_ORDER.map((id) => {
            const meta = TOPOLOGY_META[id];
            const facts = topologyFacts(TOPOLOGIES[id]);
            return (
              <li key={id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <p className="bangla text-[13.5px] font-semibold text-white">
                  {meta.title}
                  <span className="ml-2 font-mono text-[9px] font-normal uppercase tracking-[0.14em] text-signal">
                    {meta.en}
                  </span>
                </p>
                <p className="bangla mt-1 text-[11.5px] leading-relaxed text-faint">{meta.tagline}</p>
                <p className="bangla mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
                  {toBn(facts.devices)} ডিভাইস · {toBn(facts.links)} লিংক · সর্বোচ্চ {toBn(facts.maxHops)} hop
                </p>
              </li>
            );
          })}
        </ul>

        <Callout
          tone="amber"
          title="টার্মিনেটর আসলে কী?"
          icon={<TriangleAlert size={14} />}
        >
          <p>
            coaxial বাসের দুই মাথায় ছোট একটি ৫০ ওহমের resistor বসানো থাকে — এটাই terminator। তারের
            ভেতরে চলা বৈদ্যুতিক সংকেত যখন প্রান্তে পৌঁছায়, terminator সেটিকে শুষে নেয়। না থাকলে সংকেত
            দেয়ালে ধাক্কা খাওয়া শব্দের মতো ফিরে আসে (reflection/echo), আসল ডাটার সঙ্গে মিশে গিয়ে
            পুরো তারের ডাটা নষ্ট করে। তাই বাসে একটি তার কাটা মানে শুধু দুই ভাগ হওয়া নয় — দুই কাটা
            প্রান্তই terminatorহীন হয়ে পুরো নেটওয়ার্ক অচল করে দেয়।
          </p>
        </Callout>
      </LessonBlock>

      {/* ------------------------------------------------------------- 0২ */}
      <LessonBlock
        index="০২"
        label="ইন্টারঅ্যাক্টিভ সিমুলেশন"
        title="টোপোলজি ল্যাব — নিজে ভাঙো, নিজে সারাও"
        aside={
          <span className="bangla text-[11.5px] text-faint">
            ডিভাইস বন্ধ করো · তার কাটো · প্যাকেট পাঠাও
          </span>
        }
      >
        <TopologySim />
      </LessonBlock>

      {/* ------------------------------------------------------------- 0৩ */}
      <LessonBlock index="০৩" label="পরীক্ষা করো" title="ছয়টি পরীক্ষা, ছয়টি শিক্ষা">
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EXPERIMENTS.map((item, index) => (
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

      {/* ------------------------------------------------------------- 0৪ */}
      <LessonBlock
        index="০৪"
        label="তুলনা"
        title="সুবিধা, অসুবিধা ও বাস্তব ব্যবহার"
        aside={<span className="bangla text-[11.5px] text-faint">এক নজরে সাতটি গঠন</span>}
      >
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <caption className="sr-only">
              সাতটি টোপোলজির ডিভাইস, লিংক, সর্বোচ্চ hop, খরচ ও নির্ভরযোগ্যতার তুলনা
            </caption>
            <thead>
              <tr className="bg-white/[0.04]">
                {["টোপোলজি", "ডিভাইস", "লিংক", "সর্বোচ্চ hop", "খরচ", "নির্ভরযোগ্যতা"].map((head) => (
                  <th
                    key={head}
                    scope="col"
                    className="bangla px-3 py-2.5 text-[11px] font-medium text-faint"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TOPOLOGY_ORDER.map((id) => {
                const meta = TOPOLOGY_META[id];
                const facts = topologyFacts(TOPOLOGIES[id]);
                return (
                  <tr key={id} className="border-t border-white/[0.07]">
                    <th scope="row" className="bangla px-3 py-2.5 text-[12.5px] font-medium text-white">
                      {meta.title}
                      <span className="ml-1.5 font-mono text-[8.5px] uppercase tracking-[0.12em] text-faint">
                        {meta.en}
                      </span>
                    </th>
                    <td className="px-3 py-2.5 font-mono text-[11.5px] text-muted">
                      {toBn(facts.devices)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11.5px] text-muted">
                      {toBn(facts.links)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11.5px] text-muted">
                      {toBn(facts.maxHops)}
                    </td>
                    <td className="bangla px-3 py-2.5 text-[11.5px] text-muted">{meta.cost}</td>
                    <td className="bangla px-3 py-2.5 text-[11.5px] text-muted">{meta.reliability}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {TOPOLOGY_ORDER.map((id) => {
            const meta = TOPOLOGY_META[id];
            return (
              <article
                key={id}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5"
              >
                <header className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="bangla text-[15px] font-semibold text-white">
                    {meta.title}
                    <span className="ml-2 font-mono text-[9px] font-normal uppercase tracking-[0.14em] text-signal">
                      {meta.en}
                    </span>
                  </h3>
                  <span className="bangla text-[10.5px] text-faint">{meta.tagline}</span>
                </header>

                <p className="bangla mt-2 text-[12.5px] leading-relaxed text-muted">{meta.how}</p>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-signal/25 bg-signal/[0.05] p-3">
                    <p className="bangla flex items-center gap-1.5 text-[11.5px] font-semibold text-signal">
                      <CircleCheck size={12} /> সুবিধা
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {meta.pros.map((pro) => (
                        <li key={pro} className="bangla flex gap-1.5 text-[11.5px] leading-relaxed text-muted">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-signal" />
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-[#f87171]/25 bg-[#f87171]/[0.05] p-3">
                    <p className="bangla flex items-center gap-1.5 text-[11.5px] font-semibold text-[#fca5a5]">
                      <TriangleAlert size={12} /> অসুবিধা
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {meta.cons.map((con) => (
                        <li key={con} className="bangla flex gap-1.5 text-[11.5px] leading-relaxed text-muted">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#f87171]" />
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-2.5 rounded-xl border border-laser/25 bg-laser/[0.05] p-3">
                  <p className="bangla text-[11.5px] font-semibold text-laser">বাস্তবে কোথায় ব্যবহার</p>
                  <ul className="mt-1.5 space-y-1">
                    {meta.uses.map((use) => (
                      <li key={use} className="bangla flex gap-1.5 text-[11.5px] leading-relaxed text-muted">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-laser" />
                        {use}
                      </li>
                    ))}
                  </ul>
                  <p className="bangla mt-2 text-[11px] leading-relaxed text-faint">
                    <span className="mr-1 font-mono text-[8.5px] uppercase tracking-[0.12em] text-laser">
                      উদাহরণ
                    </span>
                    {meta.example}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </LessonBlock>

      {/* ------------------------------------------------------------- 0৫ */}
      <LessonBlock index="০৫" label="বাস্তব ব্যবহার" title="চারপাশে কোথায় কোন গঠন দেখছি">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              icon: <School size={15} />,
              title: "স্কুল ও কলেজের ল্যাব",
              body: "একটি সুইচের সঙ্গে ২০–৩০টি কম্পিউটার = স্টার। কয়েকটি ফ্লোর থাকলে প্রতিটি ফ্লোরে একটি সুইচ, উপরে একটি মূল সুইচ = ট্রি। কোনো কম্পিউটারের তার খুলে গেলে শুধু সেটিই থামে, পুরো ল্যাব নয়।",
            },
            {
              icon: <Network size={15} />,
              title: "বাসা ও ছোট অফিস",
              body: "Wi-Fi router-ই কেন্দ্র — মোবাইল, ল্যাপটপ, টিভি সব তারার পাপড়ির মতো যুক্ত। router বন্ধ হলে ইন্টারনেটও বন্ধ, যদিও ডিভাইসগুলো নিজেরা ঠিক থাকে।",
            },
            {
              icon: <Globe size={15} />,
              title: "ISP ও ইন্টারনেট ব্যাকবোন",
              body: "কোর রাউটারগুলো একটি পার্শিয়াল মেশ — প্রতিটি রাউটার সবার সঙ্গে নয়, কেবল দরকারি জায়গায় যুক্ত। এরপর গ্রাহকের দিকে বিতরণ নেটওয়ার্ক ট্রি আকারে নামে, আর গ্রাহকের ঘরে শেষ ধাপ স্টার।",
            },
            {
              icon: <Factory size={15} />,
              title: "শিল্প, যানবাহন ও মেট্রো ফাইবার",
              body: "গাড়ির ভেতরে CAN bus-এ একই তারে ইঞ্জিন, ব্রেক ও সেন্সর কথা বলে। কারখানার পুরনো ফিল্ডবাসও বাস। অন্যদিকে শহরের অপটিক্যাল ফাইবার ও স্টোরেজ নেটওয়ার্কে রিং (প্রায়ই dual ring) দেখা যায়।",
            },
            {
              icon: <Waypoints size={15} />,
              title: "হাইব্রিড = বাস্তবের নেটওয়ার্ক",
              body: "কোনো বড় নেটওয়ার্কই এক টোপোলজিতে চলে না। ক্যাম্পাসে star, শহরে fiber ring, ইন্টারনেটে partial mesh — একসঙ্গেই থাকে। তাই ডিজাইন করতে হয় অংশে অংশে।",
            },
            {
              icon: <Cable size={15} />,
              title: "টার্মিনেটর কোথায় দেখেছি",
              body: "পুরনো ভিডিও/টিভি তারের শেষ প্রান্তের ছোট ধাতব ক্যাপ, বা CCTV-র coaxial লাইনের শেষে বসানো ৭৫ ওহমের terminator। নেটওয়ার্কের বাসে ব্যবহৃত হয় ৫০ ওহমের terminator।",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <p className="bangla flex items-center gap-2 text-[13px] font-semibold text-white">
                <span className="grid h-7 w-7 place-items-center rounded-lg border border-signal/30 bg-signal/[0.08] text-signal">
                  {item.icon}
                </span>
                {item.title}
              </p>
              <p className="bangla mt-2 text-[12.5px] leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>

        <RealExample title="ঢাকার একটি ইন্টারনেট সংযোগ, ধাপে ধাপে">
          তোমার বাসার router একটি স্টার নেটওয়ার্ক চালায়। সেই router ISP-এর একটি সুইচে যায়, সেটি
          শহরের বিতরণ নেটওয়ার্কের (ট্রি) একটি শাখা, আর কোর রাউটারগুলো পার্শিয়াল মেশে যুক্ত। বিদেশি
          সার্ভারে যেতে হলে ডাটা আরও কয়েকটি নেটওয়ার্ক পেরোয় — সাবমেরিন কেবল, আন্তর্জাতিক ব্যাকবোন,
          তারপর সার্ভার ডেটা সেন্টারের স্টার-ট্রি। অর্থাৎ তোমার একটি ক্লিকের পিছনে স্টার, ট্রি, রিং
          আর মেশ — সবই আছে।
        </RealExample>

        <Callout
          tone="violet"
          title="আকাশেও একটি পার্শিয়াল মেশ"
          icon={<Layers size={14} />}
        >
          <p>
            Starlink-এর প্রতিটি স্যাটেলাইট কয়েকটি কাছাকাছি স্যাটেলাইটের সঙ্গে লেজার লিংকে যুক্ত —
            প্রত্যেকে সবার সঙ্গে নয়। ফলে মহাকাশে একটি বিশাল পার্শিয়াল মেশ তৈরি হয়, আর ডাটা একাধিক
            স্যাটেলাইট ও গ্রাউন্ড স্টেশন পেরিয়ে গন্তব্যে পৌঁছায়। উপরে একটি স্যাটেলাইট নষ্ট হলেও
            বিকল্প পথ থাকে — এই সাইটের স্যাটেলাইট সিমুলেশনেও সেই লেজার মেশ দেখা যায়।
          </p>
        </Callout>
      </LessonBlock>

      {/* ------------------------------------------------------------- 0৬ */}
      <LessonBlock index="০৬" label="কুইজ" title="নিজে যাচাই করো">
        <Quiz
          title="টোপোলজি যাচাই"
          intro="উত্তর দিলেই ব্যাখ্যা দেখা যাবে। ভুল হলে চিন্তা নেই — সিমুলেশনে ফিরে পরীক্ষাটি করে দেখো।"
          questions={QUIZZES.topology}
        />
      </LessonBlock>

      <LabFooterNav path={PAGE.path} />
    </>
  );
}
