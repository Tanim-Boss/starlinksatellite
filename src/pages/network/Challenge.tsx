import { networkPage } from "@/lib/network/nav";
import { CHALLENGE_ITEMS } from "@/lib/network/copy";
import { Callout, SimNote } from "@/components/NetworkLab/ui/primitives";
import { LabFooterNav, LabNav, LessonBlock, LessonHero } from "@/components/NetworkLab/ui/LessonPage";
import { ScenarioChallenges, SequenceChallenge } from "@/components/NetworkLab/ChallengeBoard";

const PAGE = networkPage("challenge");

export function NetworkChallenge() {
  return (
    <>
      <LabNav path={PAGE.path} />
      <LessonHero
        page={PAGE}
        lede="শেখা শেষ? এবার যাচাই। একটি সম্পূর্ণ ডাউনলোডের পথ সঠিক ক্রমে সাজাও, তারপর কয়েকটি “যদি এমন হতো” পরিস্থিতির উত্তর দাও।"
        objectives={["ক্রম সাজানো", "৫টি পরিস্থিতি", "ব্যাখ্যাসহ ফলাফল"]}
      />

      <LessonBlock index="০১" label="ক্রম সাজাও" title="ফাইল ডাউনলোডের পথ">
        <SequenceChallenge />
        <div className="overflow-hidden rounded-2xl border border-white/12">
          <table className="w-full border-collapse text-left">
            <caption className="bangla border-b border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-left text-[12.5px] font-semibold text-white">
              প্রতিটি অংশের কাজ এক নজরে
            </caption>
            <thead>
              <tr className="bg-white/[0.02]">
                <th scope="col" className="bangla px-3 py-2 text-[11.5px] font-medium text-faint">
                  অংশ
                </th>
                <th scope="col" className="bangla px-3 py-2 text-[11.5px] font-medium text-faint">
                  ইংরেজি
                </th>
                <th scope="col" className="bangla px-3 py-2 text-[11.5px] font-medium text-faint">
                  কাজ
                </th>
              </tr>
            </thead>
            <tbody>
              {CHALLENGE_ITEMS.map((item) => (
                <tr key={item.id} className="border-t border-white/[0.06]">
                  <th scope="row" className="bangla px-3 py-2 text-[12px] font-medium text-ink">
                    {item.label}
                  </th>
                  <td className="bangla px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-signal">
                    {item.en}
                  </td>
                  <td className="bangla px-3 py-2 text-[12px] text-muted">{item.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LessonBlock>

      <LessonBlock index="০২" label="পরিস্থিতি" title="যদি এমন হতো তাহলে কী হতো?">
        <ScenarioChallenges />
      </LessonBlock>

      <LessonBlock index="০৩" label="শেষ কথা" title="সব মিলিয়ে">
        <div className="grid gap-3 md:grid-cols-2">
          <Callout tone="cyan" title="কাজগুলো আলাদা, তাই ভুলও আলাদা">
            <p className="bangla">
              NIC, মিডিয়া, সুইচ/রাউটার, সার্ভার, রিসোর্স ও প্রোটোকল — প্রতিটির কাজ ভিন্ন। সমস্যা
              দেখা দিলে কোন অংশে হয়েছে তা আলাদা করে ভাবতে হয়: কেবল খোলা মানে মিডিয়ার সমস্যা,
              আর 404 মানে রিসোর্স বা সার্ভারের সমস্যা।
            </p>
          </Callout>
          <Callout tone="violet" title="বাস্তব নেটওয়ার্কে পথ ভিন্ন হতে পারে">
            <p className="bangla">
              এখানে পথটি সরল করে দেখানো। বাস্তবে একাধিক সুইচ, একাধিক রাউটার ও ভিন্ন topology
              থাকতে পারে, তখন ডাটা আরও কয়েক ধাপে সার্ভারে পৌঁছায়। কিন্তু ধারণা একই — request যায়,
              সার্ভার কাজ করে, response ফিরে আসে।
            </p>
          </Callout>
        </div>
        <SimNote />
      </LessonBlock>

      <LabFooterNav path={PAGE.path} />
    </>
  );
}
