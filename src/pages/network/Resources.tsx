import { networkPage } from "@/lib/network/nav";
import { QUIZZES } from "@/lib/network/copy";
import { Callout, Definition, RealExample, SimNote } from "@/components/NetworkLab/ui/primitives";
import { LabFooterNav, LabNav, LessonBlock, LessonHero } from "@/components/NetworkLab/ui/LessonPage";
import { Quiz } from "@/components/NetworkLab/ui/Quiz";
import { ResourceVisual } from "@/components/NetworkLab/ResourceVisual";

const PAGE = networkPage("resources");

export function NetworkResources() {
  return (
    <>
      <LabNav path={PAGE.path} />
      <LessonHero
        page={PAGE}
        lede="নেটওয়ার্কের আসল লাভ হলো ভাগ করে নেওয়া। কী কী ভাগ করা যায় আর request দিলে কী ঘটে — তিনটি উদাহরণ দিয়ে দেখো।"
        objectives={["শেয়ার্ড প্রিন্টার", "শেয়ার্ড ফাইল", "ইমেইল সার্ভিস", "রিসোর্স বন্ধ হলে কী হয়"]}
      />

      <LessonBlock index="০১" label="সহজ ব্যাখ্যা" title="সহজ ব্যাখ্যা: রিসোর্স কী?">
        <Definition
          term="নেটওয়ার্ক রিসোর্স"
          en="Resource"
          body="যা একটি নেটওয়ার্কের একাধিক ডিভাইস ভাগ করে ব্যবহার করে — ফাইল, প্রিন্টার, স্টোরেজ, অ্যাপ্লিকেশন, ডাটা বা কোনো নেটওয়ার্ক সার্ভিস।"
        />
        <Callout tone="violet" title="রিসোর্স কেবল হার্ডওয়্যার নয়">
          <p className="bangla">
            প্রিন্টার হার্ডওয়্যার রিসোর্স, নোটের ফাইল ডাটা রিসোর্স, আর ইমেইল সার্ভিস একটি চলমান
            প্রোগ্রাম হলেও রিসোর্স। অর্থাৎ রিসোর্স মানে শুধু যন্ত্র নয় — যা শেয়ার করা যায় তাই
            রিসোর্স।
          </p>
        </Callout>
      </LessonBlock>

      <LessonBlock
        index="০২"
        label="ইন্টারঅ্যাক্টিভ সিমুলেশন"
        title="তিনটি রিসোর্স, তিনটি উদাহরণ"
        aside={
          <span className="bangla text-[11.5px] text-faint">
            রিসোর্স বদলাও · বন্ধ করে দেখো কী হয়
          </span>
        }
      >
        <ResourceVisual />
      </LessonBlock>

      <LessonBlock index="০৩" label="বাস্তব উদাহরণ" title="বাস্তব উদাহরণ">
        <RealExample title="একটি প্রিন্টার, ত্রিশ জন শিক্ষার্থী">
          ল্যাবে একটিমাত্র প্রিন্টার আছে, কিন্তু সবাই ব্যবহার করে। কেউ ছাপাতে চাইলে তার কম্পিউটার
          প্রিন্ট সার্ভারে request পাঠায়; সার্ভার request গুলোকে সারিবদ্ধ (queue) করে একটি একটি করে
          প্রিন্টারে পাঠায়। প্রিন্টার নেটওয়ার্কে শেয়ার করা আছে বলেই এটি সম্ভব।
        </RealExample>
        <Callout tone="red" title="রিসোর্স unavailable হলে">
          <p className="bangla">
            প্রিন্টারে কাগজ না থাকলে, ফাইলটি শেয়ার ফোল্ডারে না থাকলে বা সার্ভিস বন্ধ থাকলে সার্ভার
            ব্যর্থতার বার্তা ফেরত দেয় (যেমন “পাওয়া যায়নি”)। এতে নেটওয়ার্ক নষ্ট হয় না — শুধু ওই
            নির্দিষ্ট কাজটি হয় না।
          </p>
        </Callout>
      </LessonBlock>

      <LessonBlock index="০৪" label="কুইজ" title="নিজে যাচাই করো">
        <Quiz questions={QUIZZES.resources} />
        <SimNote />
      </LessonBlock>

      <LabFooterNav path={PAGE.path} />
    </>
  );
}
