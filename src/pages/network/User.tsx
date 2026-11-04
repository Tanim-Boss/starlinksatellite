import { networkPage } from "@/lib/network/nav";
import { QUIZZES } from "@/lib/network/copy";
import { Callout, Definition, RealExample } from "@/components/NetworkLab/ui/primitives";
import { LabFooterNav, LabNav, LessonBlock, LessonHero } from "@/components/NetworkLab/ui/LessonPage";
import { Quiz } from "@/components/NetworkLab/ui/Quiz";
import { UserChain } from "@/components/NetworkLab/UserChain";

const PAGE = networkPage("user");

export function NetworkUser() {
  return (
    <>
      <LabNav path={PAGE.path} />
      <LessonHero
        page={PAGE}
        lede="একটি ওয়েবসাইট দেখার পেছনে মানুষ থেকে সার্ভার পর্যন্ত পুরো চেইন। প্রতিটি ধাপে ক্লিক করলে দেখবে সেখানে আসলে কে কী করছে।"
        objectives={["ইউজার বনাম ক্লায়েন্ট", "৮ ধাপের চেইন", "request ও response"]}
      />

      <LessonBlock index="০১" label="সহজ ব্যাখ্যা" title="সহজ ব্যাখ্যা: ইউজার কে?">
        <div className="grid gap-3 md:grid-cols-2">
          <Definition
            term="ইউজার"
            en="User"
            body="মানুষ বা ব্যবহারকারী, যিনি নেটওয়ার্ক ব্যবহার করে কিছু করতে চান। ইউজার সরাসরি নেটওয়ার্কে ডাটা পাঠান না — ডিভাইস ও সফটওয়্যারের মাধ্যমে পাঠান।"
          />
          <Definition
            term="ক্লায়েন্ট"
            en="Client"
            body="প্রসঙ্গভেদে ক্লায়েন্ট ডিভাইস (ল্যাপটপ, মোবাইল) অথবা request পাঠানো সফটওয়্যার (ব্রাউজার, ইমেইল অ্যাপ)।"
          />
        </div>
        <Callout tone="amber" title="ইউজার ও ক্লায়েন্ট এক নয়">
          <p className="bangla">
            ইউজার হলো মানুষ; ক্লায়েন্ট হলো যন্ত্র বা সফটওয়্যার। তুমি (ইউজার) যখন মোবাইলে
            ব্রাউজার খোলো, তখন ব্রাউজার ক্লায়েন্ট সফটওয়্যার আর ফোনটি ক্লায়েন্ট ডিভাইস। একই মানুষ
            ভিন্ন ডিভাইস ব্যবহার করলে ক্লায়েন্ট বদলায়, ইউজার নয়।
          </p>
        </Callout>
      </LessonBlock>

      <LessonBlock
        index="০২"
        label="ইন্টারঅ্যাক্টিভ সিমুলেশন"
        title="ইউজার → ব্রাউজার → নেটওয়ার্ক → সার্ভার → ফিরে আসা"
        aside={
          <span className="bangla text-[11.5px] text-faint">
            প্রতিটি ধাপে ক্লিক করো · চেইন চালাও
          </span>
        }
      >
        <UserChain />
      </LessonBlock>

      <LessonBlock index="০৩" label="বাস্তব উদাহরণ" title="বাস্তব উদাহরণ">
        <RealExample title="অনলাইনে ক্লাসের ভিডিও দেখা">
          তুমি (ইউজার) মোবাইলে ব্রাউজারে একটি লিংকে ট্যাপ করলে। ব্রাউজার (ক্লায়েন্ট সফটওয়্যার)
          request তৈরি করল, মোবাইল (ক্লায়েন্ট ডিভাইস) সেটি Wi-Fi দিয়ে পাঠাল, নেটওয়ার্ক request
          সার্ভারে পৌঁছে দিল, সার্ভার ভিডিওর পেজ পাঠাল, আর ব্রাউজার সেটি স্ক্রিনে দেখাল। পুরো কাজে
          তুমি শুধু একটি ট্যাপ করেছিলে।
        </RealExample>
        <Callout tone="cyan" title="এক ক্লায়েন্টে একাধিক ইউজারও হতে পারে">
          <p className="bangla">
            ল্যাবের একটি কম্পিউটার সকালে এক শ্রেণির শিক্ষার্থী, দুপুরে অন্য শ্রেণির শিক্ষার্থী
            ব্যবহার করে। ক্লায়েন্ট ডিভাইস একই, ইউজার ভিন্ন। আবার এক ইউজারের ল্যাপটপ ও মোবাইল — দুটি
            আলাদা ক্লায়েন্ট ডিভাইস।
          </p>
        </Callout>
      </LessonBlock>

      <LessonBlock index="০৪" label="কুইজ" title="নিজে যাচাই করো">
        <Quiz questions={QUIZZES.user} />
      </LessonBlock>

      <LabFooterNav path={PAGE.path} />
    </>
  );
}
