import { networkPage } from "@/lib/network/nav";
import { QUIZZES } from "@/lib/network/copy";
import { Callout, Definition, RealExample, SimNote } from "@/components/NetworkLab/ui/primitives";
import { LabFooterNav, LabNav, LessonBlock, LessonHero } from "@/components/NetworkLab/ui/LessonPage";
import { Quiz } from "@/components/NetworkLab/ui/Quiz";
import { NicVisual } from "@/components/NetworkLab/NicVisual";

const PAGE = networkPage("nic");

export function NetworkNic() {
  return (
    <>
      <LabNav path={PAGE.path} />
      <LessonHero
        page={PAGE}
        lede="কম্পিউটারের ভেতরের ডাটা কীভাবে নেটওয়ার্কে বের হয়? NIC সেই হার্ডওয়্যার ইন্টারফেস — কোথায় থাকে ও কী করে, দেখো।"
        objectives={["হার্ডওয়্যার ডায়াগ্রাম", "৫ ধাপের যাত্রা", "Ethernet বনাম Wi-Fi"]}
      />

      <LessonBlock index="০১" label="সহজ ব্যাখ্যা" title="সহজ ব্যাখ্যা: NIC কী?">
        <Definition
          term="নেটওয়ার্ক ইন্টারফেস কার্ড"
          en="NIC — Network Interface Card"
          body="নেটওয়ার্কে সংযোগ স্থাপনের জন্য ব্যবহৃত হার্ডওয়্যার ইন্টারফেস। এটি সফটওয়্যারের ডাটাকে মিডিয়ার সংকেতে বদলায়, আর আগত সংকেতকে আবার ডাটায়।"
        />
        <Callout tone="cyan" title="NIC কোথায় থাকে?">
          <p className="bangla">
            আধুনিক কম্পিউটারে NIC সাধারণত মাদারবোর্ডের সঙ্গেই integrated থাকে — আলাদা কার্ড লাগে
            না। ল্যাপটপ ও মোবাইলে এটি wireless adapter হিসেবে থাকে। পুরনো ডেস্কটপে আলাদা কার্ড
            বসাতে হতো।
          </p>
        </Callout>
        <Callout tone="amber" title="প্রতিটি NIC-এর নিজস্ব ঠিকানা">
          <p className="bangla">
            প্রতিটি NIC-এর একটি অনন্য ঠিকানা থাকে, যাকে MAC address বলে। সুইচ এই ঠিকানা দেখেই
            ঠিক করে কোন ডাটা কোন কম্পিউটারে যাবে।
          </p>
        </Callout>
      </LessonBlock>

      <LessonBlock
        index="০২"
        label="ইন্টারঅ্যাক্টিভ সিমুলেশন"
        title="ডাটা কম্পিউটার থেকে বের হওয়ার পাঁচ ধাপ"
        aside={
          <span className="bangla text-[11.5px] text-faint">
            Ethernet / Wi-Fi বদলে দেখো
          </span>
        }
      >
        <NicVisual />
      </LessonBlock>

      <LessonBlock index="০৩" label="বাস্তব উদাহরণ" title="বাস্তব উদাহরণ">
        <RealExample title="ল্যাপটপের Wi-Fi বন্ধ করে দেখো">
          ল্যাপটপের Wi-Fi বন্ধ করলে ব্রাউজার আর কোনো পেজ খুলতে পারে না, অথচ কম্পিউটারের বাকি সব
          ঠিকই চলে — ফাইল খোলে, লেখা লেখা যায়। কারণ তখন NIC (এখানে Wi-Fi adapter) নেটওয়ার্কে
          সংকেত পাঠাতে পারছে না। আবার Wi-Fi চালু করলেই সংযোগ ফিরে আসে।
        </RealExample>
        <Callout tone="violet" title="সফটওয়্যার একা যথেষ্ট নয়">
          <p className="bangla">
            ব্রাউজার ডাটা তৈরি করতে পারে, অপারেটিং সিস্টেম তা প্যাকেটে সাজাতে পারে, কিন্তু সংকেতে
            বদলে তারে বা তরঙ্গে পাঠানোর কাজটি হার্ডওয়্যারের — অর্থাৎ NIC-এর। তাই NIC না থাকলে
            নেটওয়ার্ক সংযোগও নেই।
          </p>
        </Callout>
      </LessonBlock>

      <LessonBlock index="০৪" label="কুইজ" title="নিজে যাচাই করো">
        <Quiz questions={QUIZZES.nic} />
        <SimNote />
      </LessonBlock>

      <LabFooterNav path={PAGE.path} />
    </>
  );
}
